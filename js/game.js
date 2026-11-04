// Game: 게임 상태와 규칙
// 담당: josepinfile

(function () {
  // 논리 좌표: 가로 800 × 세로 600
  var WIDTH = 800;
  var HEIGHT = 600;
  var ITEM_SIZE = 96; // 그림이 잘 보이도록 64에서 1.5배로 키웠다

  // 잡는 영역: 가로 180 × 세로 120, 중심 y = 540 고정. 쥐는 순간을 맞히기 쉽도록 세로를 넉넉히 둔다
  var CATCH_W = 180; // 손 그림(180)과 같은 비율로 넓혔다
  var CATCH_H = 120;
  var CATCH_Y = 540;

  // 난이도: 시작값에서 DIFFICULTY_SECONDS에 걸쳐 직선으로 변하고, 이후에는 끝값으로 고정된다
  var DIFFICULTY_SECONDS = 90;
  var FALL_SPEED_START = 160; // px/s
  var FALL_SPEED_END = 420;
  var SPAWN_INTERVAL_START = 0.9; // 초
  var SPAWN_INTERVAL_END = 0.4;
  var GHOST_RATIO_START = 0.25;
  var GHOST_RATIO_END = 0.5;
  var START_LIVES = 3;
  // 그림 종류 수 (assets/candy-1.png ~ candy-5.png 등)
  var CANDY_SKINS = 5;
  var GHOST_SKINS = 4;
  var FAKE_SKINS = 3;
  var FAKE_RATIO = 0.4; // 유령 중 사탕인 척하는 유령의 비율

  // 긴 프레임은 MAX_STEP 이하로 나눠 처리해서 등장 간격과 낙하가 고르게 진행되게 한다.
  var MAX_STEP = 0.05;
  // 탭이 멈췄다 돌아올 때 낙하물이 한꺼번에 몰리지 않게 한 번에 처리하는 시간의 상한
  var MAX_FRAME = 0.25;

  var items;
  var spawnTimer;
  var elapsed; // 실제로 진행된 플레이 시간(초). 일시정지와 게임 오버 뒤의 시간은 더하지 않는다
  var catchX; // 잡는 영역의 가로 중심 (논리 좌표 0~800)
  var score;
  var lives;
  var over;
  var paused; // 손이 안 보이면(handX가 null) true. 숫자가 다시 오면 false
  var fist; // 마지막으로 받은 주먹 여부
  var prevFist; // 앞 프레임의 주먹 여부. reset() 직후에는 null이라 첫 값으로는 잡지 않는다
  var listeners = {}; // reset()해도 유지된다
  var pending; // 이번 update에서 일어난 이벤트. 상태 갱신이 끝난 뒤에 알린다
  var epoch = 0; // reset()마다 늘어난다. 이전 판의 남은 이벤트를 걸러내는 데 쓴다

  function difficulty(start, end) {
    var progress = Math.min(elapsed / DIFFICULTY_SECONDS, 1);
    return start + (end - start) * progress;
  }

  function pick(count) {
    return 1 + Math.floor(Math.random() * count);
  }

  function spawn() {
    var half = ITEM_SIZE / 2;
    var type = Math.random() < difficulty(GHOST_RATIO_START, GHOST_RATIO_END) ? 'ghost' : 'candy';
    // 판정은 type(candy/ghost)만 본다. 사탕인 척하는 유령(fake)은 ghost로 센다.
    // 유령 중 FAKE_RATIO는 fake 그림으로 나온다.
    var skin = type === 'candy'
      ? 'candy-' + pick(CANDY_SKINS)
      : (Math.random() < FAKE_RATIO ? 'fake-' + pick(FAKE_SKINS) : 'ghost-' + pick(GHOST_SKINS));
    items.push({
      type: type,
      skin: skin,
      x: half + Math.random() * (WIDTH - ITEM_SIZE),
      y: -half
    });
  }

  // 낙하물의 중심이 잡는 영역 안에 있으면 잡을 수 있다
  function inCatchArea(item) {
    return Math.abs(item.x - catchX) <= CATCH_W / 2 &&
      Math.abs(item.y - CATCH_Y) <= CATCH_H / 2;
  }

  // 주먹을 쥐는 순간 잡는 영역 안의 낙하물을 모두 잡는다. 게임이 끝나면 나머지는 잡지 않는다
  function grab() {
    var alive = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!over && inCatchArea(item)) {
        if (item.type === 'candy') {
          score += 1;
          pending.push('catchCandy');
        } else {
          lives -= 1;
          pending.push('catchGhost');
          if (lives <= 0) {
            over = true;
            pending.push('gameover');
          }
        }
        continue;
      }
      alive.push(item);
    }
    items = alive;
  }

  function emit(eventName) {
    var list = (listeners[eventName] || []).slice();
    for (var i = 0; i < list.length; i++) {
      // 콜백 하나가 예외를 던져도 나머지 콜백과 뒤따르는 이벤트(gameover)는 알려야 한다
      try {
        list[i]();
      } catch (err) {
        console.error('Game.on("' + eventName + '") 콜백에서 오류:', err);
      }
    }
  }

  // 낙하물은 손에 닿아도 잡지 않으면 그냥 지나간다
  function step(dt) {
    elapsed += dt;
    spawnTimer += dt;
    var interval;
    while (spawnTimer >= (interval = difficulty(SPAWN_INTERVAL_START, SPAWN_INTERVAL_END))) {
      spawnTimer -= interval;
      spawn();
    }
    var speed = difficulty(FALL_SPEED_START, FALL_SPEED_END);

    var alive = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.y += speed * dt;
      if (item.y - ITEM_SIZE / 2 > HEIGHT) continue; // 화면 밖
      alive.push(item);
    }
    items = alive;
  }

  // 상태 갱신이 끝난 뒤에 알린다. 콜백 안에서 reset()을 부르면 새 판이 시작되므로
  // 이전 판의 남은 이벤트는 알리지 않는다. (같은 이벤트의 나머지 콜백에는 알린다)
  function flush() {
    var events = pending;
    var startEpoch = epoch;
    pending = [];
    for (var j = 0; j < events.length && epoch === startEpoch; j++) emit(events[j]);
  }

  window.Game = {
    reset() {
      items = [];
      spawnTimer = 0;
      elapsed = 0;
      catchX = WIDTH / 2;
      score = 0;
      lives = START_LIVES;
      over = false;
      paused = false;
      fist = false;
      prevFist = null;
      pending = [];
      epoch += 1;
    },

    update(dt, handX, fist_) {
      if (over) return; // 게임 오버 뒤에는 손 위치를 포함해 아무것도 바꾸지 않는다
      if (handX === null) {
        // 손이 안 보이면 시간도 손도 낙하물도 움직이지 않는다. 주먹 여부도 보지 않는다
        paused = true;
        return;
      }
      // 숫자가 아닌 값(undefined, NaN 등)은 입력이 없는 것으로 보고 마지막 위치와 일시정지 상태를 그대로 둔다.
      // 0~1을 벗어난 숫자는 화면 끝으로 맞춘다.
      if (Number.isFinite(handX)) {
        paused = false;
        catchX = Math.min(1, Math.max(0, handX)) * WIDTH;
      }
      if (paused) return; // 숫자가 아닌 값으로는 일시정지가 풀리지 않는다

      // 편 손(false) → 주먹(true)으로 바뀌는 순간에만 잡는다. 쥔 채로 있으면 더 잡지 않는다.
      // 낙하물을 움직이기 전에 잡아서, 화면에 보이던 위치 그대로 판정한다.
      fist = fist_ === true;
      if (fist && prevFist === false) grab();
      prevFist = fist;

      if (dt > 0 && !over) { // NaN, 0, 음수는 시간을 진행하지 않는다
        if (dt > MAX_FRAME) dt = MAX_FRAME;
        // 같은 길이로 나눠야 소수점 오차로 의미 없는 단계가 한 번 더 돌지 않는다
        var n = Math.ceil(dt / MAX_STEP);
        for (var i = 0; i < n; i++) step(dt / n);
      }

      flush();
    },

    getState() {
      return {
        score: score,
        lives: lives,
        paused: paused,
        fist: fist,
        over: over,
        handX: catchX,
        items: items.map(function (it) {
          return { type: it.type, skin: it.skin, x: it.x, y: it.y };
        })
      };
    },

    on(eventName, callback) {
      if (typeof callback !== 'function') return;
      (listeners[eventName] = listeners[eventName] || []).push(callback);
    }
  };

  window.Game.reset();
})();
