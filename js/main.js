// main: 모듈 연결
// 담당: jinwonnie00

(function () {
  const ready = Promise.resolve(Render.init(document.getElementById('game-canvas')));
  let startId = 0; // 가장 최근의 시작 요청. 취소된 옛 요청의 결과는 무시한다
  let frameId = null;
  let last = null;

  function frame(now) {
    const dt = last === null ? 0 : (now - last) / 1000;
    last = now;

    Game.update(dt, Input.getHandX());
    const state = Game.getState();
    Render.draw(state);
    Screens.setScore(state.score);
    Screens.setLives(state.lives);
    Screens.setMessage(state.paused ? '두 손을 보여주세요' : '');

    frameId = state.over ? null : requestAnimationFrame(frame);
  }

  function play() {
    Game.reset();
    Screens.show('play');
    if (frameId !== null) cancelAnimationFrame(frameId);
    last = null;
    frameId = requestAnimationFrame(frame);
  }

  Screens.onStart(function (mode) {
    const id = ++startId;
    Sound.unlock(); // 클릭 안에서 불러야 한다
    Screens.setMessage(mode === 'camera' ? '카메라를 준비하고 있습니다' : '');
    ready.then(function () {
      if (id !== startId) return;
      return Input.start(mode).then(function () {
        if (id === startId) play();
      }, function (e) {
        if (id === startId) Screens.setMessage(e + '. 마우스로 시작해 주세요');
      });
    }).catch(function (e) {
      // 이미지 로딩이나 화면 전환 실패는 마우스로 시작해도 해결되지 않는다
      if (id !== startId) return;
      console.error(e);
      Input.stop();
      Screens.setMessage('게임을 시작하지 못했습니다. 새로고침해 주세요');
    });
  });

  Screens.onRestart(play);

  Game.on('catchGhost', function () {
    Sound.play('ghost');
  });

  Game.on('gameover', function () {
    Screens.showFinalScore(Game.getState().score);
    Screens.show('end');
    setTimeout(function () { Sound.play('gameover'); }, 300);
  });

  Sound.preload();
})();
