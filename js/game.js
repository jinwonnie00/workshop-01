// Game: 게임 상태와 규칙
// 담당: josepinfile

(function () {
  // 논리 좌표: 가로 800 × 세로 600
  var WIDTH = 800;
  var HEIGHT = 600;
  var ITEM_SIZE = 64;

  // 담는 영역: 가로 120 × 세로 40, 중심 y = 540 고정
  var CATCH_W = 120;
  var CATCH_H = 40;
  var CATCH_Y = 540;

  // 시작값 (난이도 상승은 이슈 #4에서 다룸)
  var FALL_SPEED = 160; // px/s
  var SPAWN_INTERVAL = 0.9; // 초
  var GHOST_RATIO = 0.25;
  var START_LIVES = 3;

  // 긴 프레임은 MAX_STEP 이하로 나눠 처리해서 낙하물이 담는 영역을 뛰어넘지 않게 한다.
  // 420px/s에서도 한 번에 21px 이동이라 40px 영역을 지나치지 않는다.
  var MAX_STEP = 0.05;
  // 탭이 멈췄다 돌아올 때 낙하물이 한꺼번에 몰리지 않게 한 번에 처리하는 시간의 상한
  var MAX_FRAME = 0.25;

  var items;
  var spawnTimer;
  var catchX; // 담는 영역의 가로 중심 (논리 좌표 0~800)
  var score;
  var lives;
  var over;
  var paused; // 두 손이 안 보이면(handX가 null) true. 숫자가 다시 오면 false
  var listeners = {}; // reset()해도 유지된다
  var pending; // 이번 update에서 일어난 이벤트. 상태 갱신이 끝난 뒤에 알린다
  var epoch = 0; // reset()마다 늘어난다. 이전 판의 남은 이벤트를 걸러내는 데 쓴다

  function spawn() {
    var half = ITEM_SIZE / 2;
    items.push({
      type: Math.random() < GHOST_RATIO ? 'ghost' : 'candy',
      x: half + Math.random() * (WIDTH - ITEM_SIZE),
      y: -half
    });
  }

  // 낙하물의 중심이 담는 영역 안에 있으면 담은 것
  function isCaught(item) {
    return Math.abs(item.x - catchX) <= CATCH_W / 2 &&
      Math.abs(item.y - CATCH_Y) <= CATCH_H / 2;
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

  function step(dt) {
    spawnTimer += dt;
    while (spawnTimer >= SPAWN_INTERVAL) {
      spawnTimer -= SPAWN_INTERVAL;
      spawn();
    }

    var alive = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.y += FALL_SPEED * dt;
      if (!over && isCaught(item)) {
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
      if (item.y - ITEM_SIZE / 2 > HEIGHT) continue; // 화면 밖
      alive.push(item);
    }
    items = alive;
  }

  window.Game = {
    reset() {
      items = [];
      spawnTimer = 0;
      catchX = WIDTH / 2;
      score = 0;
      lives = START_LIVES;
      over = false;
      paused = false;
      pending = [];
      epoch += 1;
    },

    update(dt, handX) {
      if (over) return; // 게임 오버 뒤에는 손 위치를 포함해 아무것도 바꾸지 않는다
      if (handX === null) {
        // 두 손이 안 보이면 시간도 손도 낙하물도 움직이지 않는다
        paused = true;
        return;
      }
      // 숫자가 아닌 값(undefined, NaN 등)은 입력이 없는 것으로 보고 마지막 위치와 일시정지 상태를 그대로 둔다.
      // 0~1을 벗어난 숫자는 화면 끝으로 맞춘다.
      if (Number.isFinite(handX)) {
        paused = false;
        catchX = Math.min(1, Math.max(0, handX)) * WIDTH;
      }
      if (!(dt > 0)) return; // NaN, 0, 음수
      if (dt > MAX_FRAME) dt = MAX_FRAME;

      // 같은 길이로 나눠야 소수점 오차로 의미 없는 단계가 한 번 더 돌지 않는다
      var n = Math.ceil(dt / MAX_STEP);
      for (var i = 0; i < n && !over; i++) step(dt / n);

      // 상태 갱신이 끝난 뒤에 알린다. 콜백 안에서 reset()을 부르면 새 판이 시작되므로
      // 이전 판의 남은 이벤트는 알리지 않는다. (같은 이벤트의 나머지 콜백에는 알린다)
      var events = pending;
      var startEpoch = epoch;
      pending = [];
      for (var j = 0; j < events.length && epoch === startEpoch; j++) emit(events[j]);
    },

    getState() {
      return {
        score: score,
        lives: lives,
        paused: paused,
        over: over,
        handX: catchX,
        items: items.map(function (it) {
          return { type: it.type, x: it.x, y: it.y };
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
