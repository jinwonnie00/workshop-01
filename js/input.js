// Input: 카메라(두 손 인식)와 마우스 입력
// 담당: naey080820

window.Input = (function () {
  const MEDIAPIPE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const MODEL_TIMEOUT_MS = 20000;
  const PLAY_TIMEOUT_MS = 10000;
  const CANCELLED = '카메라 시작이 취소되었습니다';

  let active = null;
  let mouseX = 0.5;
  let onMouseMove = null;
  let stream = null;
  let landmarker = null; // #12 [B4]에서 손 인식에 쓴다
  let modelLoading = null;
  let cancelStart = null;
  let attempt = 0;

  function noop() {}

  function removeMouse() {
    if (onMouseMove) {
      window.removeEventListener('mousemove', onMouseMove);
      onMouseMove = null;
    }
  }

  function stopStream(s) {
    if (s) s.getTracks().forEach(function (track) { track.stop(); });
  }

  function getVideoElement() {
    return document.getElementById('camera-video');
  }

  function describeCameraError(e) {
    const name = e && e.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return '카메라 권한이 거부되었습니다';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return '카메라를 찾을 수 없습니다';
    if (name === 'NotReadableError') return '카메라를 사용할 수 없습니다 (다른 앱이 쓰고 있을 수 있어요)';
    return '카메라를 켜지 못했습니다: ' + ((e && e.message) || e);
  }

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw '카메라는 localhost나 HTTPS에서만 쓸 수 있습니다';
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    } catch (e) {
      throw describeCameraError(e);
    }
  }

  async function loadLandmarker() {
    try {
      const vision = await import(MEDIAPIPE_URL + '/vision_bundle.mjs');
      const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_URL + '/wasm');
      return await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numHands: 2
      });
    } catch (e) {
      throw '손 인식 모델을 불러오지 못했습니다: ' + ((e && e.message) || e);
    }
  }

  // 모델은 한 번만 불러서 계속 쓴다. 로딩이 겹치면 라이브러리의 전역 상태가 꼬일 수 있어
  // 진행 중인 로딩을 함께 기다리고, 실패하면 다음 시작에서 다시 시도한다.
  function getModel() {
    if (!modelLoading) {
      modelLoading = loadLandmarker().catch(function (e) {
        modelLoading = null;
        throw e;
      });
    }
    return modelLoading;
  }

  // 권한창을 누르는 시간은 세지 않도록 모델 로딩과 영상 재생에만 건다
  function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () { reject(message); }, ms);
    });
    return Promise.race([promise, timeout]).finally(function () { clearTimeout(timer); });
  }

  async function startCamera(id) {
    const video = getVideoElement();
    if (!video) throw '#camera-video 요소를 찾을 수 없습니다';

    // stop()이나 새 start()가 오면 권한창 대기 중이어도 바로 끝낼 수 있게 한다
    const cancelled = new Promise(function (resolve, reject) {
      cancelStart = function () { reject(CANCELLED); };
    });
    const cameraReq = openCamera();
    let ready;
    try {
      ready = await Promise.race([
        Promise.all([
          cameraReq,
          withTimeout(getModel(), MODEL_TIMEOUT_MS, '손 인식 준비가 너무 오래 걸립니다. 네트워크를 확인해 주세요')
        ]),
        cancelled
      ]);
      if (id !== attempt) throw CANCELLED;
    } catch (e) {
      // 실패하거나 취소돼도 늦게 도착한 스트림을 닫아서 카메라 표시등이 남지 않게 한다
      cameraReq.then(stopStream, noop);
      // 옛 시도의 실패는 항상 취소로 알려서, 이미 다른 입력으로 잘 돌아가는 중에 거짓 오류가 뜨지 않게 한다
      throw id !== attempt ? CANCELLED : e;
    } finally {
      if (id === attempt) cancelStart = null;
    }
    stream = ready[0];
    landmarker = ready[1];

    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    try {
      await withTimeout(video.play(), PLAY_TIMEOUT_MS, '카메라 영상이 시작되지 않습니다');
    } catch (e) {
      if (id !== attempt) throw CANCELLED;
      stopAll();
      throw typeof e === 'string' ? e : '카메라 영상을 재생하지 못했습니다';
    }
    if (id !== attempt) throw CANCELLED;
    active = 'camera';
  }

  function stopAll() {
    attempt++;
    if (cancelStart) {
      const cancel = cancelStart;
      cancelStart = null;
      cancel();
    }
    removeMouse();
    const video = getVideoElement();
    if (video && stream && video.srcObject === stream) video.srcObject = null;
    stopStream(stream);
    stream = null;
    landmarker = null;
    active = null;
  }

  return {
    start(mode) {
      // 잘못된 모드는 현재 입력을 건드리지 않고 거부한다
      if (mode !== 'mouse' && mode !== 'camera') {
        return Promise.reject('지원하지 않는 모드입니다: ' + mode);
      }
      stopAll();
      if (mode === 'mouse') {
        mouseX = 0.5;
        onMouseMove = function (e) {
          mouseX = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
        };
        window.addEventListener('mousemove', onMouseMove);
        active = 'mouse';
        return Promise.resolve();
      }
      return startCamera(attempt);
    },

    getHandX() {
      // 마우스 모드만 항상 숫자다. 멈췄거나 카메라 대기 중이면 null (카메라 값은 #12 [B4]에서 채운다)
      return active === 'mouse' ? mouseX : null;
    },

    stop() {
      stopAll();
    },

    getVideo() {
      return active === 'camera' ? getVideoElement() : null;
    }
  };
})();
