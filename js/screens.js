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

  var startCallback = function () {};
  var restartCallback = function () {};

  document.getElementById('btn-camera').addEventListener('click', function () {
    startCallback('camera');
  });
  document.getElementById('btn-mouse').addEventListener('click', function () {
    startCallback('mouse');
  });
  document.getElementById('btn-restart').addEventListener('click', function () {
    restartCallback();
  });

  return {
    show(name) {
      if (!Object.keys(screens).includes(name)) {
        throw new Error('알 수 없는 화면: ' + name);
      }
      Object.keys(screens).forEach(function (key) {
        screens[key].hidden = key !== name;
      });
    },
    setScore(n) {
      var next = '점수 ' + n;
      if (scoreEl.textContent !== next) scoreEl.textContent = next;
    },
    setLives(n) {
      var next = '♥'.repeat(Math.max(0, n));
      if (livesEl.textContent !== next) livesEl.textContent = next;
    },
    setMessage(text) {
      if (messageEl.textContent !== text) messageEl.textContent = text;
      if (messageEl.hidden === !!text) messageEl.hidden = !text;
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
