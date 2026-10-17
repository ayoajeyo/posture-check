// 리포트 좌·우 사진 몸 크기 맞추기 — js/logic/report-pair.js (가짜 좌표)
// 우측 사진은 그대로, 좌측만 우측 몸 크기에 맞춰 확대·축소 (원본은 손대지 않고 리포트 그림에서만)
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/logic/report-pair.js");

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, (msg || "") + " " + a + " ≠ " + b);

test("몸 크기: 3점 동작은 꼭짓점–①선 끝 + 꼭짓점–②선 끝 길이 (팔꿈치 = 위팔 + 아래팔)", () => {
  near(P.pairBodySize([{ x: 0, y: 0 }, { x: 0, y: 30 }, { x: 40, y: 0 }], ["olec", "wrist", "shoulder"]), 70);
});

test("몸 크기: 화면 기준선(세로·가로선) 끝은 몸이 아니라서 뺀다", () => {
  near(P.pairBodySize([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 0, y: 300 }], ["shj", "armend", "vdown"]), 50, "어깨: 팔 길이만");
  near(P.pairBodySize([{ x: 0, y: 0 }, { x: 30, y: 40 }, { x: 900, y: 0 }], ["hip", "femend", "hzside"]), 50, "고관절: 넙다리만");
});

test("몸 크기: 4점 동작은 ①선 + ②선 길이 (발목 = 정강이 + 발)", () => {
  near(P.pairBodySize([{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 10, y: 10 }, { x: 40, y: 10 }], ["malleolus", "fibhead", "heelsole", "mtp5"]), 70);
  near(P.pairBodySize([{ x: 50, y: 300 }, { x: 50, y: 0 }, { x: 50, y: 200 }, { x: 50, y: 100 }], ["neckj", "vup", "chintip", "headtop"]), 100, "목 측방굴곡: ①선 끝은 자동 세로선이라 빼고 턱끝–정수리만");
});

test("몸 크기: 점이 없거나 길이가 0이면 null (맞추지 않음)", () => {
  assert.equal(P.pairBodySize(null, ["olec", "wrist", "shoulder"]), null);
  assert.equal(P.pairBodySize([{ x: 1, y: 1 }, null, { x: 1, y: 1 }], ["olec", "wrist", "shoulder"]), null);
  assert.equal(P.pairBodySize([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 900 }], ["shj", "armend", "vdown"]), null);
});

test("기준점: 몸 측정점들의 가운데 (화면 기준선 끝은 빼고)", () => {
  assert.deepEqual(P.pairAnchor([{ x: 0, y: 0 }, { x: 0, y: 60 }, { x: 900, y: 900 }], ["shj", "armend", "vdown"]), { x: 0, y: 30 });
  assert.equal(P.pairAnchor([], []), null);
});

// 사진 한 장 정보: size = 원본 사진 속 몸 길이(px), w = 원본 사진 폭, cw·ch = 리포트 그림 폭·높이
const shot = (size, w, cw, ch) => ({ size, w: w || 1000, cw: cw || 480, ch: ch || 730 });

test("좌측 배율: 좌측이 작게 찍혔으면 확대(우측 ÷ 좌측), 크게 찍혔으면 축소", () => {
  near(P.pairZoom(shot(50), shot(60)), 1.2, "확대");
  near(P.pairZoom(shot(60), shot(50)), 50 / 60, "축소");
});

test("좌측 배율: 사진 크기가 달라도 사진 폭 대비 몸 크기로 비교", () => {
  near(P.pairZoom(shot(100, 2000), shot(60, 1000)), 1.2, "좌측 원본이 2배 큰 사진");
});

test("좌측 배율: 리포트 칸(3:4)에 넣을 때 옆이 잘리는 넓은 그림이면 그만큼 크게 보이는 것까지 계산", () => {
  // 넓은 그림(480×300)은 칸 높이에 맞춰져 4·480/(3·300) = 2.133… 배 크게 보인다
  near(P.pairZoom(shot(30, 1000, 480, 300), shot(60, 1000, 480, 730)), 60 / (30 * 4 * 480 / (3 * 300)), "0.9375 — 그냥 길이만 보면 2배 확대지만 실제로 보이는 크기는 좌측이 더 큼");
});

test("좌측 배율: 차이가 5% 미만이면 그대로(1), 최대 1.6배까지만", () => {
  assert.equal(P.pairZoom(shot(100), shot(104)), 1);
  assert.equal(P.pairZoom(shot(100), shot(96)), 1);
  near(P.pairZoom(shot(50), shot(100)), 1.6, "2배 차이도 1.6배까지만 확대");
  near(P.pairZoom(shot(100), shot(50)), 1 / 1.6, "축소도 1/1.6 까지만");
});

test("좌측 배율: 어느 한쪽 몸 크기를 모르면 그대로(1)", () => {
  assert.equal(P.pairZoom(shot(null), shot(60)), 1);
  assert.equal(P.pairZoom(shot(60), null), 1);
  assert.equal(P.pairZoom(null, shot(60)), 1);
});

test("보여 줄 영역: 확대는 기준점 가운데로, 사진 밖으로 나가지 않게", () => {
  const v = P.pairView(1000, 1200, 1.25, 500, 600);
  near(v.vw, 800); near(v.vh, 960); near(v.x0, 100); near(v.y0, 120);
  const e = P.pairView(1000, 1200, 1.25, 30, 1190);   // 기준점이 구석이면 사진 안쪽으로 밀어 넣음
  near(e.x0, 0); near(e.y0, 240);
});

test("보여 줄 영역: 축소는 사진을 가운데에 두고 둘레가 생김 (x0·y0 음수)", () => {
  const v = P.pairView(1000, 1200, 0.8, 30, 30);
  near(v.vw, 1250); near(v.vh, 1500); near(v.x0, -125); near(v.y0, -150);
});

test("보여 줄 영역: 배율 1 이면 사진 그대로", () => {
  assert.deepEqual(P.pairView(1000, 1200, 1, 10, 10), { x0: 0, y0: 0, vw: 1000, vh: 1200 });
});
