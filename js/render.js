// Render: 캔버스에 그리기
// 담당: josepinfile

window.Render = (function () {
  var WIDTH = 800;
  var HEIGHT = 600;
  var ITEM_SIZE = 64;
  var HAND_W = 160;
  var HAND_H = 100;
  var HAND_Y = 540; // 담는 영역의 중심 y

  var canvas = null;
  var ctx = null;
  var images = {};
  var background = null; // 배경은 한 번만 그려 두고 매 프레임 복사한다

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('이미지를 불러오지 못했습니다: ' + src)); };
      img.src = src;
    });
  }

  // 검정 바탕 + 위쪽 붉은 그라데이션 + 점 질감
  function makeBackground() {
    var buffer = document.createElement('canvas');
    buffer.width = WIDTH;
    buffer.height = HEIGHT;
    var bctx = buffer.getContext('2d');

    bctx.fillStyle = '#0A0A0A';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    var gradient = bctx.createLinearGradient(0, 0, 0, HEIGHT * 0.6);
    gradient.addColorStop(0, '#E8261C');
    gradient.addColorStop(1, 'rgba(232, 38, 28, 0)');
    bctx.fillStyle = gradient;
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    bctx.fillStyle = 'rgba(10, 10, 10, 0.35)';
    for (var y = 6; y < HEIGHT; y += 12) {
      for (var x = ((y / 12) % 2) * 6 + 3; x < WIDTH; x += 12) {
        bctx.beginPath();
        bctx.arc(x, y, 1.5, 0, Math.PI * 2);
        bctx.fill();
      }
    }
    return buffer;
  }

  // 화면에 보이는 크기에 맞춰 캔버스 해상도를 정하고, 800×600 논리 좌표를 확대/축소한다
  function fitCanvas() {
    var shown = canvas.clientWidth || WIDTH;
    var pixelWidth = Math.round(shown * (window.devicePixelRatio || 1));
    var pixelHeight = Math.round(pixelWidth * HEIGHT / WIDTH);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  }

  return {
    init(canvas_) {
      canvas = canvas_;
      ctx = canvas.getContext('2d');
      background = makeBackground();
      return Promise.all([
        loadImage('assets/candy.svg'),
        loadImage('assets/ghost.svg'),
        loadImage('assets/hand.svg')
      ]).then(function (loaded) {
        images.candy = loaded[0];
        images.ghost = loaded[1];
        images.hand = loaded[2];
      });
    },
    draw(state) {
      if (!ctx) return;
      fitCanvas();
      ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);

      state.items.forEach(function (item) {
        var img = images[item.type];
        if (!img) return;
        ctx.drawImage(img, item.x - ITEM_SIZE / 2, item.y - ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE);
      });

      if (typeof state.handX === 'number') {
        ctx.drawImage(images.hand, state.handX - HAND_W / 2, HAND_Y - HAND_H / 2, HAND_W, HAND_H);
      }
    }
  };
})();
