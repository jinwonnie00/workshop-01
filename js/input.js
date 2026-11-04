// Input: 카메라(한 손 인식, 주먹 판정)와 마우스 입력
// 담당: naey080820

window.Input = (function () {
  const MEDIAPIPE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const MODEL_TIMEOUT_MS = 20000;
  const PLAY_TIMEOUT_MS = 10000;
  const HAND_STALE_MS = 500;
  const HAND_HOLD_MS = 300;
  const CANCELLED = '카메라 시작이 취소되었습니다';
  // 손 위치: 손목과 네 손가락 뿌리. 주먹을 쥐어도 거의 움직이지 않는 점들이다
  const PALM_POINTS = [0, 5, 9, 13, 17];
  // 주먹 판정: 검지~새끼 손가락의 [끝, 둘째 마디] 번호
  const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]];
  const FIST_MIN_FOLDED = 3; // 이 개수 이상 접히면 주먹
  const OPEN_MAX_FOLDED = 1; // 이 개수 이하로 접히면 편 손. 그 사이는 앞의 판정을 유지한다

  let active = null;
  let mouseX = 0.5;
  let mouseDown = false;
  let onMouseMove = null;
  let onMouseDown = null;
  let onMouseUp = null;
  let lastFist = false;
  let stream = null;
  let landmarker = null;
  let lastVideoTime = -1;
  let lastFrameAt = 0;
  let lastSeenX = null;
  let lastSeenAt = 0;
  let lastHandX = null;
  let warnedDetect = false;
  let modelLoading = null;
  let cancelStart = null;
  let attempt = 0;

  function noop() {}

  function removeMouse() {
    if (onMouseMove) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
      onMouseMove = null;
      onMouseDown = null;
      onMouseUp = null;
    }
    mouseDown = false;
  }

  function distance(a, b, aspect) {
    return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  }

  // 접힌 손가락 수로 주먹인지 정한다. 경계(2개)에서는 앞의 판정을 유지해서 깜빡이지 않게 한다
  function judgeFist(hand, aspect, previous) {
    const wrist = hand[0];
    let folded = 0;
    FINGERS.forEach(function (f) {
      if (distance(hand[f[0]], wrist, aspect) < distance(hand[f[1]], wrist, aspect)) folded++;
    });
    if (folded >= FIST_MIN_FOLDED) return true;
    if (folded <= OPEN_MAX_FOLDED) return false;
    return previous;
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
        numHands: 1
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

    // 이 브라우저에서 손 인식이 실제로 도는지 한 번 확인한다. 못 돌면 getHandX()가 영원히
    // null이 되어 게임이 "손을 보여주세요"에서 멈추므로, 여기서 실패로 알려 마우스 모드를 안내받게 한다.
    if (video.videoWidth > 0) {
      try {
        landmarker.detectForVideo(video, performance.now());
      } catch (e) {
        // 망가진 모델을 다음 시작에서 다시 쓰지 않도록 닫고 비운다
        const broken = landmarker;
        stopAll();
        modelLoading = null;
        try { broken.close(); } catch (closeError) {}
        throw '손 인식을 시작하지 못했습니다: ' + ((e && e.message) || e);
      }
    }
    active = 'camera';
  }

  // 영상 프레임이 바뀌었을 때만 인식하고, 같은 프레임에서는 앞의 결과를 그대로 돌려준다.
  // 손이 보이면 손바닥 중심(PALM_POINTS 평균)의 가로 좌표를 거울처럼 뒤집어 0~1로 돌려주고,
  // 안 보이면 null이다. 다만 인식이 한두 프레임 놓쳐도 게임이 바로 멈추지 않도록
  // 손을 마지막으로 본 값을 HAND_HOLD_MS 동안 유지한다 (prototype/hand-demo.html의 LOST_MS와 같은 방식).
  // 주먹 여부(lastFist)도 여기서 함께 갱신하고, 손이 안 보이면 마지막 값을 그대로 둔다.
  function detectHands() {
    const video = getVideoElement();
    const track = stream && stream.getVideoTracks()[0];
    // 카메라가 빠지거나 영상이 멈췄을 때 옛 손 위치가 계속 남지 않게 한다
    if (!landmarker || !video || !track || track.readyState !== 'live') return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;
    const now = performance.now();
    if (video.currentTime === lastVideoTime) {
      return now - lastFrameAt > HAND_STALE_MS ? null : lastHandX;
    }
    lastVideoTime = video.currentTime;
    lastFrameAt = now;
    let seenX = null;
    try {
      const hands = landmarker.detectForVideo(video, performance.now()).landmarks;
      if (hands.length >= 1) {
        const hand = hands[0];
        let sum = 0;
        PALM_POINTS.forEach(function (i) { sum += hand[i].x; });
        seenX = Math.min(1, Math.max(0, 1 - sum / PALM_POINTS.length));
        // 좌표는 가로·세로 각각 0~1이라 영상 비율을 곱해야 실제 거리를 비교할 수 있다
        lastFist = judgeFist(hand, video.videoWidth / video.videoHeight, lastFist);
      }
    } catch (e) {
      if (!warnedDetect) {
        warnedDetect = true;
        console.warn('[Input] 손 인식에 실패했습니다:', e);
      }
    }
    if (seenX !== null) {
      lastSeenX = seenX;
      lastSeenAt = now;
      lastHandX = seenX;
    } else {
      lastHandX = lastSeenX !== null && now - lastSeenAt <= HAND_HOLD_MS ? lastSeenX : null;
    }
    return lastHandX;
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
    lastVideoTime = -1;
    lastFrameAt = 0;
    lastSeenX = null;
    lastSeenAt = 0;
    lastHandX = null;
    lastFist = false;
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
          // 캔버스 양옆에 여백이 있을 수 있으므로 창이 아니라 캔버스를 기준으로 계산한다
          const rect = document.getElementById('game-canvas').getBoundingClientRect();
          mouseX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        };
        // 왼쪽 버튼을 누르고 있는 동안이 주먹이다. 창 밖에서 버튼을 떼면 mouseup이 안 올 수 있어 blur에서도 뗀다
        onMouseDown = function (e) {
          if (e.button === 0) mouseDown = true;
        };
        onMouseUp = function (e) {
          if (e.type === 'blur' || e.button === 0) mouseDown = false;
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('blur', onMouseUp);
        active = 'mouse';
        return Promise.resolve();
      }
      return startCamera(attempt);
    },

    getHandX() {
      // 마우스 모드만 항상 숫자다. 카메라는 손이 보일 때만 숫자이고, 멈췄거나 대기 중이면 null
      if (active === 'mouse') return mouseX;
      return active === 'camera' ? detectHands() : null;
    },

    isFist() {
      // 카메라는 getHandX()에서 인식한 결과를 돌려준다 (매 프레임 getHandX() 다음에 부른다)
      if (active === 'mouse') return mouseDown;
      return active === 'camera' ? lastFist : false;
    },

    stop() {
      stopAll();
    },

    getVideo() {
      return active === 'camera' ? getVideoElement() : null;
    }
  };
})();
