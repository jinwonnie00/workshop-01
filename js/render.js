// Render: 캔버스에 그리기
// 담당: josepinfile

window.Render = (function () {
  var WIDTH = 800;
  var HEIGHT = 600;
  var ITEM_SIZE = 64;
  var HAND_W = 160;
  var HAND_H = 100;
  var HAND_Y = 540; // 담는 영역의 중심 y
  var GRADIENT_END = HEIGHT * 0.6; // 붉은 그라데이션이 끝나는 y
  var MAX_PIXEL_WIDTH = 4096; // 캔버스 크기가 걷잡을 수 없이 커지는 것을 막는 상한

  var canvas = null;
  var ctx = null;
  var images = {};
  var sprites = {}; // 현재 크기로 미리 그려 둔 이미지
  var background = null; // 현재 크기로 한 번만 그려 두고 매 프레임 복사한다
  var lastState = null;

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('이미지를 불러오지 못했습니다: ' + src)); };
      img.src = src;
    });
  }

  function makeOffscreen(width, height) {
    var buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    return buffer;
  }

  // 검정 바탕 + 위쪽 붉은 그라데이션 + 점 질감 (800×600 논리 좌표를 scale배로 그린다)
  function makeBackground(scale) {
    var buffer = makeOffscreen(canvas.width, canvas.height);
    var bctx = buffer.getContext('2d');
    bctx.scale(scale, scale);

    bctx.fillStyle = '#0A0A0A';
    bctx.fillRect(0, 0, WIDTH, HEIGHT);

    var gradient = bctx.createLinearGradient(0, 0, 0, GRADIENT_END);
    gradient.addColorStop(0, '#E8261C');
    gradient.addColorStop(1, 'rgba(232, 38, 28, 0)');
    bctx.fillStyle = gradient;
    bctx.fillRect(0, 0, WIDTH, GRADIENT_END);

    // 그라데이션 아래는 점 색이 바탕과 같아 보이지 않으므로 위쪽에만 그린다
    bctx.fillStyle = 'rgba(10, 10, 10, 0.35)';
    for (var y = 6; y < GRADIENT_END; y += 12) {
      for (var x = ((y / 12) % 2) * 6 + 3; x < WIDTH; x += 12) {
        bctx.beginPath();
        bctx.arc(x, y, 1.5, 0, Math.PI * 2);
        bctx.fill();
      }
    }
    return buffer;
  }

  // SVG는 래스터화 비용이 있어서 현재 크기로 한 번만 그려 두고 복사한다
  function makeSprite(img, width, height, scale) {
    var buffer = makeOffscreen(Math.ceil(width * scale), Math.ceil(height * scale));
    buffer.getContext('2d').drawImage(img, 0, 0, buffer.width, buffer.height);
    return buffer;
  }

  function makeSprites(scale) {
    if (images.candy) sprites.candy = makeSprite(images.candy, ITEM_SIZE, ITEM_SIZE, scale);
    if (images.ghost) sprites.ghost = makeSprite(images.ghost, ITEM_SIZE, ITEM_SIZE, scale);
    if (images.hand) sprites.hand = makeSprite(images.hand, HAND_W, HAND_H, scale);
  }

  // 화면에 보이는 크기에 맞춰 캔버스 해상도를 정하고, 그 크기로 배경과 이미지를 다시 만든다.
  // 보이는 폭은 CSS(style.css의 #game-canvas width)가 정한다고 가정한다.
  // CSS에 폭이 없으면 캔버스 속성 크기가 그대로 보이는 폭이 되어 해상도가 계속 커진다.
  function fitCanvas() {
    var shown = canvas.getBoundingClientRect().width || WIDTH;
    var pixelWidth = Math.min(Math.round(shown * (window.devicePixelRatio || 1)), MAX_PIXEL_WIDTH);
    var pixelHeight = Math.round(pixelWidth * HEIGHT / WIDTH);
    if (canvas.width === pixelWidth && canvas.height === pixelHeight && background) return;

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    var scale = pixelWidth / WIDTH;
    background = makeBackground(scale);
    makeSprites(scale);
    if (lastState) Render.draw(lastState); // 프레임 반복이 멈춰 있어도 새 크기로 다시 그린다
  }

  return {
    init(canvas_) {
      canvas = canvas_;
      ctx = canvas.getContext('2d');
      fitCanvas();
      // 창 크기가 바뀔 때만 다시 계산한다 (매 프레임 크기를 읽으면 강제 레이아웃이 생길 수 있다)
      new ResizeObserver(fitCanvas).observe(canvas);
      return Promise.all([
        loadImage('assets/candy.svg'),
        loadImage('assets/ghost.svg'),
        loadImage('assets/hand.svg')
      ]).then(function (loaded) {
        images.candy = loaded[0];
        images.ghost = loaded[1];
        images.hand = loaded[2];
        makeSprites(canvas.width / WIDTH);
      });
    },
    draw(state) {
      lastState = state;
      if (!ctx || !background) return;
      var scale = canvas.width / WIDTH;
      ctx.drawImage(background, 0, 0);

      state.items.forEach(function (item) {
        var sprite = sprites[item.type];
        if (!sprite) return;
        ctx.drawImage(sprite, (item.x - ITEM_SIZE / 2) * scale, (item.y - ITEM_SIZE / 2) * scale);
      });

      if (sprites.hand && typeof state.handX === 'number') {
        ctx.drawImage(sprites.hand, (state.handX - HAND_W / 2) * scale, (HAND_Y - HAND_H / 2) * scale);
      }
    }
  };
})();
