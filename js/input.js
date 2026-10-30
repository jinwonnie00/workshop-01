// Input: 카메라(두 손 인식)와 마우스 입력
// 담당: naey080820

window.Input = (function () {
  const MEDIAPIPE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const MODEL_TIMEOUT_MS = 20000;

  let mode = null;
  let mouseX = 0.5;
  let onMouseMove = null;
  let stream = null;
  let landmarker = null;
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

  function closeLandmarker(l) {
    try { if (l) l.close(); } catch (e) {}
  }

  function getVideoElement() {
    return document.getElementById('camera-video') || document.createElement('video');
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

  // 권한창을 누르는 시간은 세지 않도록 모델 로딩에만 건다
  function withTimeout(promise) {
    let timer;
    const timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        reject('손 인식 준비가 너무 오래 걸립니다. 네트워크를 확인해 주세요');
      }, MODEL_TIMEOUT_MS);
    });
    return Promise.race([promise, timeout]).finally(function () { clearTimeout(timer); });
  }

  async function startCamera(id) {
    const cameraReq = openCamera();
    const modelReq = loadLandmarker();
    let ready;
    try {
      ready = await Promise.all([cameraReq, withTimeout(modelReq)]);
      if (id !== attempt) throw '카메라 시작이 취소되었습니다';
    } catch (e) {
      // 한쪽이 실패해도 성공한 쪽을 닫아서 카메라 표시등이 남지 않게 한다
      cameraReq.then(stopStream, noop);
      modelReq.then(closeLandmarker, noop);
      throw e;
    }
    stream = ready[0];
    landmarker = ready[1];

    const video = getVideoElement();
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (e) {
      if (id === attempt) stopAll();
      throw '카메라 영상을 재생하지 못했습니다';
    }
    if (id !== attempt) throw '카메라 시작이 취소되었습니다';
    mode = 'camera';
  }

  function stopAll() {
    attempt++;
    removeMouse();
    if (stream) {
      const video = getVideoElement();
      if (video.srcObject === stream) video.srcObject = null;
    }
    stopStream(stream);
    closeLandmarker(landmarker);
    stream = null;
    landmarker = null;
    mode = null;
  }

  return {
    start(requested) {
      stopAll();
      if (requested === 'mouse') {
        mouseX = 0.5;
        onMouseMove = function (e) {
          mouseX = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
        };
        window.addEventListener('mousemove', onMouseMove);
        mode = 'mouse';
        return Promise.resolve();
      }
      if (requested === 'camera') {
        return startCamera(attempt);
      }
      return Promise.reject('지원하지 않는 모드입니다: ' + requested);
    },

    getHandX() {
      // 카메라 모드의 두 손 인식은 #12 [B4]에서 채운다
      if (mode === 'camera') return null;
      return mouseX;
    },

    stop() {
      stopAll();
    },

    getVideo() {
      return mode === 'camera' ? getVideoElement() : null;
    }
  };
})();
