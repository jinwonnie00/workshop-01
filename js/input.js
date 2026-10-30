// Input: 카메라(두 손 인식)와 마우스 입력
// 담당: naey080820

window.Input = (function () {
  let mouseX = 0.5;
  let onMouseMove = null;

  function removeMouse() {
    if (onMouseMove) {
      window.removeEventListener('mousemove', onMouseMove);
      onMouseMove = null;
    }
  }

  return {
    start(mode) {
      if (mode === 'mouse') {
        removeMouse();
        mouseX = 0.5;
        onMouseMove = function (e) {
          mouseX = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
        };
        window.addEventListener('mousemove', onMouseMove);
        return Promise.resolve();
      }
      return Promise.reject('지원하지 않는 모드입니다: ' + mode);
    },

    getHandX() {
      return mouseX;
    },

    stop() {
      removeMouse();
    },

    getVideo() {
      return null;
    }
  };
})();
