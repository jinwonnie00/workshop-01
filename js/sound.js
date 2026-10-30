// Sound: 효과음 재생
// 담당: naey080820

window.Sound = (function () {
  const FILES = {
    ghost: 'assets/sfx/ghost.wav',
    gameover: 'assets/sfx/gameover.wav'
  };
  const LOAD_TIMEOUT_MS = 5000;
  const buffers = {};
  let ctx = null;
  let loading = null;

  // 사용자 동작 전에는 만들지 않아서 자동재생 경고가 뜨지 않는다 (unlock·play에서 처음 만든다)
  function getContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    return ctx;
  }

  function load(name) {
    // 디코딩만 하므로 소리를 낼 수 있는 AudioContext 없이 OfflineAudioContext를 쓴다
    return fetch(FILES[name])
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(function (data) {
        const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        return new AC(1, 1, 44100).decodeAudioData(data);
      })
      .then(function (buffer) {
        buffers[name] = buffer;
      })
      .catch(function (e) {
        // 실패해도 게임은 계속되어야 하므로 이행하되 원인은 남긴다
        console.warn('[Sound] ' + FILES[name] + ' 불러오기 실패:', e);
      });
  }

  return {
    preload() {
      if (!loading) {
        let timer;
        const all = Promise.all(Object.keys(FILES).map(load));
        // 로딩이 멈춰도 시작 화면에서 게임이 멈추지 않도록 시간이 지나면 이행한다
        const timeout = new Promise(function (resolve) {
          timer = setTimeout(function () {
            console.warn('[Sound] 효과음 로딩이 ' + LOAD_TIMEOUT_MS + 'ms 안에 끝나지 않아 넘어갑니다');
            resolve();
          }, LOAD_TIMEOUT_MS);
        });
        loading = Promise.race([all, timeout]).then(function () {
          clearTimeout(timer);
        });
      }
      return loading;
    },

    unlock() {
      try {
        const c = getContext();
        if (!c) return;
        if (c.state === 'suspended') c.resume().catch(function () {});
        // 일부 브라우저(Safari)는 클릭 안에서 실제로 한 번 재생해야 잠금이 풀린다
        const silent = c.createBufferSource();
        silent.buffer = c.createBuffer(1, 1, 22050);
        silent.connect(c.destination);
        silent.start(0);
      } catch (e) {}
    },

    play(name) {
      try {
        const buffer = buffers[name];
        const c = getContext();
        if (!buffer || !c) return;
        if (c.state === 'suspended') c.resume().catch(function () {});
        // 호출마다 새 소스를 시작하므로 연속으로 잡아도 소리가 겹쳐서 난다
        const source = c.createBufferSource();
        source.buffer = buffer;
        source.connect(c.destination);
        source.start(0);
      } catch (e) {}
    }
  };
})();
