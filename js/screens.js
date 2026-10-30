// Screens: 화면 전환과 표시
// 담당: josepinfile

window.Screens = (function () {
  var screens = {
    start: document.getElementById('screen-start'),
    play: document.getElementById('screen-play'),
    end: document.getElementById('screen-end')
  };
  var scoreEl = document.getElementById('hud-score');
  var livesEl = document.getElementById('hud-lives');
  var messageEl = document.getElementById('message');

  var startCallback = null;
  var restartCallback = null;

  document.getElementById('btn-camera').addEventListener('click', function () {
    if (startCallback) startCallback('camera');
  });
  document.getElementById('btn-mouse').addEventListener('click', function () {
    if (startCallback) startCallback('mouse');
  });
  document.getElementById('btn-restart').addEventListener('click', function () {
    if (restartCallback) restartCallback();
  });

  return {
    show(name) {
      if (!screens[name]) return;
      Object.keys(screens).forEach(function (key) {
        screens[key].hidden = key !== name;
      });
    },
    setScore(n) {
      scoreEl.textContent = '점수 ' + n;
    },
    setLives(n) {
      livesEl.textContent = '♥'.repeat(Math.max(0, n));
    },
    setMessage(text) {
      messageEl.textContent = text;
      messageEl.hidden = !text;
    },
    onStart(callback) {
      startCallback = callback;
    },
    onRestart(callback) {
      restartCallback = callback;
    },
    showFinalScore(n) {}
  };
})();
