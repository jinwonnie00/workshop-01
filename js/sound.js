// Sound: 효과음과 배경 음악 재생
// 담당: naey080820

window.Sound = (function () {
  const FILES = {
    ghost: 'assets/sfx/ghost.wav',
    gameover: 'assets/sfx/gameover.wav'
  };
  const BGM_FILE = 'assets/sfx/bgm.mp3';
  const BGM_VOLUME = 0.3; // 효과음(1.0)보다 작게
  const BGM_FADE_S = 0.3;
  const LOAD_TIMEOUT_MS = 5000;
  const buffers = {};
  let ctx = null;
  let loading = null;
  let bgmBuffer = null;
  let bgmLoading = null;
  let bgmSource = null;
  let bgmGain = null;
  let bgmWanted = false; // 불러오는 중에 startBgm()이 불렸는지 (그 뒤 stopBgm()이 불리면 false)

  // 사용자 동작 전에는 만들지 않아서 자동재생 경고가 뜨지 않는다 (unlock·play에서 처음 만든다)
  function getContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    return ctx;
  }

  function load(url) {
    // 디코딩만 하므로 소리를 낼 수 있는 AudioContext 없이 OfflineAudioContext를 쓴다
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(function (data) {
        const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        return new AC(1, 1, 44100).decodeAudioData(data);
      })
      .catch(function (e) {
        // 실패해도 게임은 계속되어야 하므로 null로 이행하되 원인은 남긴다
        console.warn('[Sound] ' + url + ' 불러오기 실패:', e);
        return null;
      });
  }

  function loadEffect(name) {
    return load(FILES[name]).then(function (buffer) {
      if (buffer) buffers[name] = buffer;
    });
  }

  function loadBgm() {
    if (!bgmLoading) {
      bgmLoading = load(BGM_FILE).then(function (buffer) {
        bgmBuffer = buffer;
      });
    }
    return bgmLoading;
  }

  function beginBgm() {
    try {
      const c = getContext();
      if (!c || !bgmBuffer || bgmSource) return;
      if (c.state === 'suspended') c.resume().catch(function () {});
      bgmGain = c.createGain();
      bgmGain.gain.value = BGM_VOLUME;
      bgmGain.connect(c.destination);
      bgmSource = c.createBufferSource();
      bgmSource.buffer = bgmBuffer;
      bgmSource.loop = true;
      bgmSource.connect(bgmGain);
      bgmSource.start(0);
    } catch (e) {
      bgmSource = null;
    }
  }

  return {
    preload() {
      // 배경 음악은 파일이 커서 기다리지 않는다 (시작 화면이 늦어지지 않게)
      loadBgm();
      if (!loading) {
        let timer;
        const all = Promise.all(Object.keys(FILES).map(loadEffect));
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
    },

    startBgm() {
      bgmWanted = true;
      if (bgmSource) return;
      if (bgmBuffer) {
        beginBgm();
        return;
      }
      // 아직 불러오는 중이면 끝난 뒤에 시작한다. 그 사이 stopBgm()이 불렸으면 시작하지 않는다
      loadBgm().then(function () {
        if (bgmWanted) beginBgm();
      });
    },

    stopBgm() {
      bgmWanted = false;
      if (!bgmSource) return;
      const source = bgmSource;
      const gain = bgmGain;
      // 바로 비워서, 소리가 줄어드는 동안 startBgm()이 불려도 새로 시작할 수 있게 한다
      bgmSource = null;
      bgmGain = null;
      try {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + BGM_FADE_S);
        source.stop(t + BGM_FADE_S);
      } catch (e) {
        try { source.stop(); } catch (e2) {}
      }
    }
  };
})();
