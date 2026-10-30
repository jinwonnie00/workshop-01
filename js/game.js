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

  // 시작값 (난이도 상승은 이슈 #9에서 다룸)
  var FALL_SPEED = 160; // px/s
  var SPAWN_INTERVAL = 0.9; // 초
  var GHOST_RATIO = 0.25;

  // 탭이 멈췄다 돌아올 때 낙하물이 한꺼번에 몰리거나 영역을 뛰어넘지 않게 한다
  var MAX_DT = 0.1;

  var items;
  var spawnTimer;
  var handX;

  function spawn() {
    var half = ITEM_SIZE / 2;
    items.push({
      type: Math.random() < GHOST_RATIO ? 'ghost' : 'candy',
      x: half + Math.random() * (WIDTH - ITEM_SIZE),
      y: -half
    });
  }

  // 이번 프레임에 이동한 구간(prevY~y)이 담는 영역을 지나갔고, 가로도 겹치면 담은 것
  function isCaught(item, prevY) {
    var top = CATCH_Y - CATCH_H / 2;
    var bottom = CATCH_Y + CATCH_H / 2;
    if (item.y < top || prevY > bottom) return false;
    return Math.abs(item.x - handX) <= CATCH_W / 2;
  }

  window.Game = {
    reset() {
      items = [];
      spawnTimer = 0;
      handX = WIDTH / 2;
    },

    update(dt, inputX) {
      if (dt > MAX_DT) dt = MAX_DT;
      // 일시정지(inputX가 null)는 이슈 #5에서 다룸. 지금은 마지막 위치를 유지한다.
      if (typeof inputX === 'number') handX = inputX * WIDTH;

      spawnTimer += dt;
      while (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer -= SPAWN_INTERVAL;
        spawn();
      }

      var alive = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var prevY = item.y;
        item.y += FALL_SPEED * dt;
        if (isCaught(item, prevY)) continue; // 점수·목숨 처리는 이슈 #3에서 다룸
        if (item.y - ITEM_SIZE / 2 > HEIGHT) continue; // 화면 밖
        alive.push(item);
      }
      items = alive;
    },

    getState() {
      return {
        score: 0,
        lives: 3,
        paused: false,
        over: false,
        handX: handX,
        items: items.map(function (it) {
          return { type: it.type, x: it.x, y: it.y };
        })
      };
    },

    on(eventName, callback) {}
  };

  window.Game.reset();
})();
