// Sound: 효과음 재생
// 담당: naey080820

window.Sound = (function () {
  const FILES = {
    ghost: 'assets/sfx/ghost.wav',
    gameover: 'assets/sfx/gameover.wav'
  };
  const clips = {};

  function load(name) {
    return new Promise(function (resolve) {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('canplaythrough', function () {
          clips[name] = audio;
          resolve();
        }, { once: true });
        // 파일이 없어도 게임은 계속되어야 하므로 실패해도 이행한다
        audio.addEventListener('error', function () { resolve(); }, { once: true });
        audio.src = FILES[name];
        audio.load();
      } catch (e) {
        resolve();
      }
    });
  }

  return {
    preload() {
      return Promise.all(Object.keys(FILES).map(load)).then(function () {});
    },

    unlock() {
      Object.keys(clips).forEach(function (name) {
        const audio = clips[name];
        try {
          audio.muted = true;
          const p = audio.play();
          const done = function () {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
          };
          if (p && p.then) {
            p.then(done, function () { audio.muted = false; });
          } else {
            done();
          }
        } catch (e) {
          audio.muted = false;
        }
      });
    },

    play(name) {
      try {
        const audio = clips[name];
        if (!audio) return;
        audio.currentTime = 0;
        const p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
  };
})();
