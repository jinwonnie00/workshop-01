# 사탕 받기 (Catch the Candy) — SPEC

하늘에서 떨어지는 것들 중 **사탕만 두 손에 담고, 유령은 피하는** 브라우저 게임.
카메라로 두 손을 인식해서 손을 움직이면 화면의 손도 움직인다.

- 팀: Leader `jinwonnie00` / Builder `josepinfile`, `naey080820`
- 제한 시간: 140분
- 범위 판단: **140분 안에 가능한 크기.** 서버·로그인·저장이 없는 한 화면짜리 순수 HTML/CSS/JS 게임이다. 가장 불확실한 부분은 카메라 손 인식이라 한 사람(naey080820)이 전담하고, 게임 쪽은 마우스로 먼저 만들어서 의존을 끊는다.

---

## 1. 게임 규칙

| 항목 | 규칙 |
|---|---|
| 조작 | 카메라에 **두 손이 보이면** "손 모음"으로 본다. 손 모양은 따지지 않는다. 담는 위치는 **두 손 손목의 가로 중간점**이다. |
| 마우스 모드 | 카메라 대신 마우스 가로 위치를 쓴다. 개발 테스트와 카메라 오류 대비용이다. |
| 낙하물 | 🍬 사탕(`candy`)과 👻 유령(`ghost`)이 위에서 아래로 떨어진다. |
| 사탕을 담으면 | +1점 |
| 유령을 담으면 | 목숨 -1 |
| 사탕을 놓치면 | 아무 일 없이 사라진다. 감점 없음 |
| 유령을 놓치면 | 아무 일 없이 사라진다. |
| 목숨 | 3개로 시작, 0이 되면 끝 |
| 손을 놓치면 (카메라) | 두 손이 안 보이면 게임이 **일시정지**되고 "두 손을 보여주세요"가 뜬다. 다시 보이면 이어진다. 마우스 모드에서는 일어나지 않는다. |

### 수치 (기본값, 테스트하며 조정)

화면은 가로 800 × 세로 600 논리 좌표로 그리고, 화면 크기에 맞게 확대/축소한다.

| 항목 | 시작값 | 90초 후 (이후 고정) |
|---|---|---|
| 낙하 속도 | 160 px/s | 420 px/s |
| 낙하물 등장 간격 | 0.9초 | 0.4초 |
| 유령 비율 | 25% | 50% |

- 값은 90초에 걸쳐 직선으로 변한다.
- 손(담는 영역): 가로 120px, 세로 40px, 세로 위치는 y = 540 고정. 가로만 움직인다.
- 충돌: 낙하물의 중심이 담는 영역 안에 들어오면 담은 것으로 본다.
- 낙하물 크기: 64 × 64px

---

## 2. 화면 흐름

```
[시작 화면] ──(버튼)──▶ [진행 화면] ──(목숨 0)──▶ [끝 화면]
     ▲                                              │
     └────────────────(다시 하기)────────────────────┘
```

1. **시작 화면**
   - 제목, 한 줄 설명("두 손을 모아 사탕을 받고, 유령은 피하세요")
   - 버튼 2개: `카메라로 시작`, `마우스로 시작`
   - 카메라로 시작을 누르면 카메라 권한 요청과 모델 로딩이 일어나고, 준비되면 진행 화면으로 넘어간다. 실패하면 시작 화면에 오류 문구를 보여 주고 마우스 모드를 안내한다.
2. **진행 화면**
   - 위쪽에 점수와 목숨(하트 3개), 배경에 낙하물, 아래쪽에 손
   - 카메라 모드에서는 작은 거울 화면(카메라 미리보기)을 구석에 보여 준다.
3. **끝 화면**
   - 이번 점수, `다시 하기` 버튼 하나. 누르면 **같은 조작 방식**으로 바로 진행 화면이 시작된다.
   - 점수는 저장하지 않는다.

---

## 3. 이번에 만들지 않을 것

- 점수 저장, 최고 점수, 랭킹
- 소리, 배경 음악
- 레벨/단계, 특수 아이템, 사탕 종류 여러 개
- 일시정지 버튼, 설정 화면
- 모바일 최적화 (PC 브라우저 기준)
- 서버, 로그인, 멀티플레이
- 손 모양의 엄격한 판정 (두 손이 보이기만 하면 됨)
- 게임 안에서 목숨 회복

---

## 4. 그래픽 스타일

레퍼런스: 빨강/검정 2색 + 크림 포인트, 납작한 실루엣, 하프톤 질감, 눈 모양 하나.

| 파일 | 내용 | 상태 |
|---|---|---|
| `assets/candy.svg` | 크림/빨강 줄무늬 포장 사탕, 128×128 | 완료 |
| `assets/ghost.svg` | 검정 실루엣 + 빨간 테두리 + 외눈, 128×128 | 완료 |
| `assets/hand.svg` | 두 손을 모은 크림색 손 아이콘 | 이슈 #2 |

- 색: 빨강 `#E8261C`, 검정 `#0A0A0A`, 크림 `#F2EBD8`
- 배경은 이미지 없이 캔버스에서 검정 바탕 + 위쪽 붉은 그라데이션 + 점 질감으로 그린다.
- 레퍼런스 원본은 `image *.svg`로 루트에 있다. 수정하지 않는다.

---

## 5. 담당 영역과 파일

**한 파일에 주인은 한 명.** 남의 파일은 고치지 않고, 필요하면 그 사람에게 이슈나 메시지로 요청한다.

| 담당 | 영역 | 파일 |
|---|---|---|
| **jinwonnie00** (Leader) | 뼈대, 스타일, 그래픽, 연결, 최종 점검 | `index.html`, `style.css`, `js/main.js`, `assets/*`, `SPEC.md`, `README.md` |
| **josepinfile** (Builder) | 게임 규칙, 그리기, 화면 흐름 | `js/game.js`, `js/render.js`, `js/screens.js` |
| **naey080820** (Builder) | 카메라와 손 인식, 마우스 입력 | `js/input.js` |

### 폴더 구조

```
workshop-01/
├── index.html
├── style.css
├── SPEC.md
├── README.md
├── assets/
│   ├── candy.svg
│   ├── ghost.svg
│   └── hand.svg
└── js/
    ├── main.js      (Leader)
    ├── game.js      (josepinfile)
    ├── render.js    (josepinfile)
    ├── screens.js   (josepinfile)
    └── input.js     (naey080820)
```

### 각 파일의 책임

- `index.html`: 캔버스, 카메라용 `<video>`, 화면 오버레이 DOM(시작/끝), 스크립트 불러오기 순서
- `style.css`: 오버레이와 버튼, 점수·목숨 표시 위치의 모양
- `js/main.js`: 시작 버튼과 모듈을 연결하고, 매 프레임 `Input` 값을 `Game`에 넘기는 반복문
- `js/game.js`: 게임 상태, 낙하물 생성/이동, 충돌, 점수, 목숨, 난이도, 일시정지. **그리기와 DOM은 모른다.**
- `js/render.js`: 상태를 받아 캔버스에 그리기. **상태를 바꾸지 않는다.**
- `js/screens.js`: 시작/진행/끝 화면 전환과 점수·목숨·안내 문구 표시
- `js/input.js`: 카메라(두 손 인식)와 마우스 중 하나를 골라 가로 위치를 내준다. **게임 규칙은 모른다.**

---

## 6. 서로 부를 때 쓰는 이름 (계약)

모든 모듈은 `window`에 이름 하나를 올리는 일반 스크립트다(`import` 안 씀). 아래 이름과 모양을 **바꾸려면 먼저 Leader에게 알린다.**

### `Input` (naey080820)

| 호출 | 하는 일 |
|---|---|
| `Input.start(mode)` | `mode`는 `'camera'` 또는 `'mouse'`. 카메라 권한과 모델을 준비하고, 준비되면 이행(`Promise`), 실패하면 거부(`reject`, 오류 메시지 문자열). |
| `Input.getHandX()` | 담는 위치의 가로값을 **0~1**로 돌려준다. 0이 화면 왼쪽. 카메라는 거울처럼 **좌우 반전해서** 준다. 두 손이 안 보이면 `null`. 마우스 모드는 항상 숫자. |
| `Input.stop()` | 카메라와 이벤트를 끈다. |
| `Input.getVideo()` | 거울 화면용 `<video>` 요소. 마우스 모드면 `null`. |

### `Game` (josepinfile)

| 호출 | 하는 일 |
|---|---|
| `Game.reset()` | 점수 0, 목숨 3, 낙하물 비우기, 난이도 처음으로 |
| `Game.update(dt, handX)` | `dt`는 초 단위. `handX`는 `Input.getHandX()` 값(숫자 또는 `null`). `null`이면 일시정지로 처리한다. |
| `Game.getState()` | 아래 모양의 객체를 돌려준다. |
| `Game.on(eventName, callback)` | 이벤트 `'catchCandy'`, `'catchGhost'`, `'gameover'` |

`Game.getState()`가 돌려주는 모양:

```js
{
  score: 0,
  lives: 3,
  paused: false,
  over: false,
  handX: 400,          // 논리 좌표(0~800)로 바꾼 값
  items: [ { type: 'candy' | 'ghost', x: 0, y: 0 } ]
}
```

### `Render` (josepinfile)

| 호출 | 하는 일 |
|---|---|
| `Render.init(canvas)` | 캔버스 준비와 `assets/*.svg` 불러오기. 이행(`Promise`)은 이미지가 모두 준비됐을 때. |
| `Render.draw(state)` | `Game.getState()` 결과를 그린다. |

### `Screens` (josepinfile)

| 호출 | 하는 일 |
|---|---|
| `Screens.show(name)` | `name`은 `'start'`, `'play'`, `'end'` |
| `Screens.setScore(n)` / `Screens.setLives(n)` | 진행 화면의 점수/목숨 표시 갱신 |
| `Screens.setMessage(text)` | 안내/오류 문구. 빈 문자열이면 숨김. (예: "두 손을 보여주세요") |
| `Screens.onStart(callback)` | 시작 버튼을 누르면 `callback('camera' | 'mouse')` |
| `Screens.onRestart(callback)` | 다시 하기를 누르면 `callback()` |
| `Screens.showFinalScore(n)` | 끝 화면에 점수 표시 |

### 연결 흐름 (`main.js`가 하는 일)

```
Screens.onStart(mode) → Input.start(mode) 성공 → Game.reset() → Screens.show('play') → 반복 시작
매 프레임: Game.update(dt, Input.getHandX()) → Render.draw(Game.getState()) → Screens.setScore/Lives
Game.on('gameover') → Screens.showFinalScore(score) → Screens.show('end')
Screens.onRestart() → Game.reset() → Screens.show('play')
```

### HTML 요소 id (index.html에서 정해 두고, 각자 이 이름으로 찾는다)

`game-canvas`, `camera-video`, `screen-start`, `screen-play`, `screen-end`, `btn-camera`, `btn-mouse`, `btn-restart`, `hud-score`, `hud-lives`, `message`, `final-score`

---

## 7. 만드는 방법과 실행

- 순수 HTML/CSS/JS, 빌드 도구 없음
- 카메라는 `localhost` 또는 HTTPS에서만 켜진다. **파일을 더블클릭해서 열면 안 된다.**
- 실행: `workshop-01` 폴더에서 `python3 -m http.server 8000` → 브라우저에서 `http://localhost:8000`
- 손 인식: MediaPipe의 손 인식(HandLandmarker)을 CDN으로 불러온다. **버전을 고정**해서 쓰고, 최대 손 개수는 2. 두 손이 모두 잡히면 두 손목 가로 좌표의 평균을 `1 - x`(거울 반전)로 돌려준다.

---

## 8. 이슈 목록 (먼저 할 것부터)

시간 배분 목표: 1~2번 20분 → 3~8번 병렬 70분 → 9~10번 연결 20분 → 11~12번 마무리 30분. (합계 140분)

| # | 담당 | 작업 | 끝났다는 기준 |
|---|---|---|---|
| 1 | jinwonnie00 | **뼈대**: `index.html`(위 id 포함), `style.css` 기본, `js/*.js` 빈 틀(위 계약 이름의 빈 함수), `README.md`에 실행법 | 로컬 서버로 열면 오류 없이 시작 화면이 보이고, 모두가 이 틀을 받아 작업할 수 있다 |
| 2 | jinwonnie00 | `assets/hand.svg` 만들기, 오버레이/버튼/HUD 스타일 | 손 아이콘이 어두운 배경에서 보이고, 시작/끝 화면이 레퍼런스 분위기를 낸다 |
| 3 | naey080820 | `Input` **마우스 모드** 먼저 완성 (`start('mouse')`, `getHandX`) | 게임 쪽이 바로 쓸 수 있다. (이 이슈가 3번이 아니라 가장 먼저 끝나야 한다) |
| 4 | josepinfile | `Game` 낙하물 생성, 이동, 화면 밖 제거, 담는 영역 충돌 | 콘솔에서 `Game.getState()`로 낙하물이 움직이고 담으면 사라진다 |
| 5 | josepinfile | `Game` 점수, 목숨, `gameover` 이벤트, `reset` | 유령 3번 담으면 `gameover`가 불린다 |
| 6 | josepinfile | `Render` 배경, 낙하물/손 그리기 (`assets` 이미지) | 상태가 화면에 그려진다 |
| 7 | naey080820 | `Input` **카메라 모드**: 카메라 켜기, 모델 로딩, 두 손 인식 → 중간점, 두 손이 안 보이면 `null`, `getVideo()` | `start('camera')` 후 두 손을 움직이면 `getHandX()`가 0~1로 따라온다 |
| 8 | josepinfile | `Game` 난이도 상승(90초 직선 증가), 일시정지(`handX`가 `null`) | 시간이 지나면 빨라지고, `null`이면 멈춘다 |
| 9 | josepinfile | `Screens` 시작/진행/끝 전환, 점수·목숨·안내 문구 | 버튼으로 화면이 전환되고 값이 표시된다 |
| 10 | jinwonnie00 | `main.js` 연결과 거울 화면(카메라 미리보기) 배치 | 시작 → 진행 → 끝 → 다시 하기가 마우스 모드로 끝까지 돈다 |
| 11 | 전원 | 카메라 모드로 통합 테스트와 수치 조정 (인식 끊김, 반응 속도, 난이도) | 세 명이 각자 카메라로 한 판씩 끝까지 한다 |
| 12 | jinwonnie00 | 최종 점검, `README.md` 정리, 시연 준비 | 처음 보는 사람이 README만 보고 실행한다 |

### 막히면

- 카메라 인식이 불안정하면 11번에서 "두 손이 보이면 됨" 기준을 그대로 두고 **떨림 완화(평균 내기)만** 넣는다. 그래도 안 되면 마우스 모드를 기본 시연 방식으로 쓴다.
- 시간이 모자라면 줄이는 순서: 난이도 상승(8번) 단순화 → 거울 화면 생략 → 하프톤 질감 생략.
