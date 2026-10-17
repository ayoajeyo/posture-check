// 보조선 방식 각도 계산 — index.html 의 romAuxGeo 를 그대로 꺼내 실행
// v273 목(굴곡·신전·측방굴곡)은 기준 0°(바르게 선 자세), 발목은 기준 90°(정강이⊥발바닥)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const grab = (start, end) => {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "index.html 에서 못 찾음: " + start);
  return html.slice(i, j);
};

const ctx = { MV: null, romMove: () => ctx.MV };
vm.createContext(ctx);
vm.runInContext(grab("  function romAuxGeo(P){", "  function romAuxPaint("), ctx);
const geo = (mv, P) => { ctx.MV = mv; return vm.runInContext("romAuxGeo", ctx)(P); };

const NECK = { sgn: 1, off: 0 };                 // 목: 바르게 선 자세가 0°
const ANKLE_D = { sgn: -1, off: 90 };            // 발목 배측굴곡
const P = (x, y) => ({ x, y });
// ①선 = 목관절(100,400) → 세로 기준선(100,0) = 화면 위쪽
const V1 = [P(100, 400), P(100, 0)];

test("목: 얼굴 선이 수직이면 0° (바르게 선 자세)", () => {
  const g = geo(NECK, [...V1, P(120, 300), P(120, 200)]);   // ②선 턱 앞 → 이마 앞 (수직 위)
  assert.equal(g.th, 0);
  assert.equal(g.val, 0);
});

test("목: 얼굴 선이 45° 기울면 45°", () => {
  const g = geo(NECK, [...V1, P(100, 300), P(170.71, 229.29)]);
  assert.equal(g.th, 45);
  assert.equal(g.val, 45);
});

test("목: 얼굴 선이 수평이면 90°", () => {
  const g = geo(NECK, [...V1, P(100, 300), P(200, 300)]);
  assert.equal(g.val, 90);
});

test("목: 보조선 방향은 ②선 방향과 같다 (보조선은 ①선 시작점을 지난다)", () => {
  const g = geo(NECK, [...V1, P(100, 300), P(170.71, 229.29)]);
  assert.ok(Math.abs(g.u2.x - 0.7071) < 0.001, "x 방향");
  assert.ok(Math.abs(g.u2.y + 0.7071) < 0.001, "y 방향");
});

test("발목은 전과 같이 직각(90°)이 0° — 기준값이 섞이지 않음", () => {
  const g = geo(ANKLE_D, [P(100, 300), P(100, 100), P(80, 320), P(180, 320)]);
  assert.equal(g.th, 90);
  assert.equal(g.val, 0);
});

test("발목 배측굴곡 20°: 사이각 70° → 90 − 70 = 20", () => {
  const g = geo(ANKLE_D, [P(100, 300), P(100, 100), P(100, 300), P(193.97, 265.8)]);
  assert.equal(g.th, 70);
  assert.equal(g.val, 20);
});

test("점이 모자라면 계산하지 않음 (null)", () => {
  assert.equal(geo(NECK, [P(1, 1), P(1, 0), P(2, 2)]), null);
  assert.equal(geo(NECK, null), null);
});

test("같은 자리를 두 번 찍어 선 길이가 0이면 계산하지 않음", () => {
  assert.equal(geo(NECK, [P(100, 400), P(100, 400), P(50, 50), P(60, 60)]), null);
  assert.equal(geo(NECK, [...V1, P(50, 50), P(50, 50)]), null);
});

// v273 옛 기록 호환: 예전 방식으로 저장한 목 기록(점 3개)은 예전 방식 그대로 열려야 한다
const ctx2 = {
  romS: { mv: "flex", pts: null },
  ROM_LM: {}, ROM_DERIV: {}, ROM_MID: {},
  NECK_JOINT: { k: "neck", kind: "dir", pts: ["neckj", "headtop", "vup"] },
  NECK_FLEX: { k: "flex", kind: "aux", vfix: true, off: 0, pts: ["neckj", "vup", "chinf", "headf"] },
};
ctx2.romJoint = () => ctx2.NECK_JOINT;
ctx2.romMove = () => ctx2.NECK_FLEX;
vm.createContext(ctx2);
vm.runInContext(grab("  function romAuxLegacy(mv){", "  function romIsLm(n){"), ctx2);
const pts3 = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
const pts4 = [{ x: 1, y: 1 }, { x: 1, y: 0 }, { x: 3, y: 3 }, { x: 4, y: 4 }];

test("옛 목 기록(점 3개): 옛 측정점·옛 계산 방식으로 열린다", () => {
  ctx2.romS.pts = pts3;
  assert.deepEqual(vm.runInContext("romPts()", ctx2), ["neckj", "headtop", "vup"]);
  assert.equal(vm.runInContext("romKind()", ctx2), "dir");       // 보조선 계산을 타지 않음
});

test("새 목 기록(점 4개): 보조선 방식으로 열린다", () => {
  ctx2.romS.pts = pts4;
  assert.deepEqual(vm.runInContext("romPts()", ctx2), ["neckj", "vup", "chinf", "headf"]);
  assert.equal(vm.runInContext("romKind()", ctx2), "aux");
});

test("사진만 열고 아직 점이 없을 때도 새 방식으로 본다 (빈 상태에서 깨지지 않음)", () => {
  ctx2.romS.pts = null;
  assert.equal(vm.runInContext("romKind()", ctx2), "aux");
  ctx2.romS.pts = pts4;
});

// 목 세 동작의 정의가 실제로 index.html 에 들어갔는지 (사람이 실수로 되돌리면 걸린다)
test("목 세 동작이 모두 보조선 방식 · 정상값 45°", () => {
  const seg = html.slice(html.indexOf('ROM_JOINTS.unshift({ k:"neck"'), html.indexOf('ROM_JOINTS.splice(3, 0, { k:"trunk"'));
  for (const [move, p2, p3] of [["flex", "chinf", "headf"], ["ext", "chinf", "headf"], ["lat", "chintip", "headtop"]]) {
    const line = seg.split("\n").find((l) => l.includes(`k:"${move}"`));
    assert.ok(line, move + " 동작을 찾지 못함");
    assert.match(line, /normal:45/, move + ": 정상값 45°");
    assert.match(line, /kind:"aux"/, move + ": 보조선 방식");
    assert.match(line, /off:0/, move + ": 바르게 선 자세가 0°");
    assert.match(line, new RegExp(`pts:\\["neckj","vup","${p2}","${p3}"\\]`), move + ": 측정점");
  }
});

// v273 회귀: 옛 기록(점 3개)에 romFixVUp 이 손대면 정수리 점이 세로선으로 덮여 각도가 0° 가 된다
const ctx3 = Object.assign({}, ctx2);
ctx3.romS = { mv: "flex", pts: null };
ctx3.romJoint = () => ctx2.NECK_JOINT;
ctx3.romMove = () => ctx2.NECK_FLEX;
vm.createContext(ctx3);
vm.runInContext(grab("  function romAuxLegacy(mv){", "  function romIsLm(n){"), ctx3);
vm.runInContext(grab("  function romFixVUp(){", "  function romDraw(){"), ctx3);

test("옛 기록(점 3개): 자동 세로선 고정이 정수리 점을 건드리지 않는다", () => {
  ctx3.romS.pts = [{ x: 100, y: 400 }, { x: 150, y: 120 }, { x: 100, y: 50 }];   // [1] = 정수리
  vm.runInContext("romFixVUp()", ctx3);
  assert.deepEqual(ctx3.romS.pts[1], { x: 150, y: 120 }, "정수리 점이 덮어써짐");
});

test("새 기록(점 4개): ①선 끝점이 목관절 바로 위로 고정된다", () => {
  ctx3.romS = { mv: "flex", pts: [{ x: 100, y: 400 }, { x: 999, y: 999 }, { x: 120, y: 300 }, { x: 120, y: 200 }], roll: null, w: 800, h: 600 };
  vm.runInContext("romFixVUp()", ctx3);
  // vm 안에서 만든 객체라 deepEqual 은 프로토타입까지 보므로 값으로 비교
  assert.equal(ctx3.romS.pts[1].x, 100, "①선 끝점 x = 목관절 x");
  assert.equal(ctx3.romS.pts[1].y, 0, "①선 끝점 y = 화면 맨 위");
});

/* v293 폰 기울기 보정(romRotA)이 들어간 사진에서도 ①선은 **화면 기준** 수직이어야 한다.
   화면 = 사진을 -roll 만큼 돌려 그린 것이므로, 사진 좌표에서는 보정각만큼 기울어 있어야 화면에서 수직이 된다. */
vm.runInContext(grab("  function romRotRef(d, roll){", "  function romAngleOf("), ctx3);
const screenVec = (V, E, roll) => {   // 사진 좌표 벡터를 화면 좌표로 (romPaint 의 romRotA 와 같은 회전)
  const a = -(roll || 0) * Math.PI / 180, x = E.x - V.x, y = E.y - V.y;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
};

for (const roll of [-1.3, 2.4]) {
  test("폰 기울기 " + roll + "° 보정 사진: ①선이 화면 기준 정확히 수직", () => {
    ctx3.romS = { mv: "flex", pts: [{ x: 300, y: 400 }, { x: 999, y: 999 }, { x: 320, y: 300 }, { x: 320, y: 200 }], roll: roll, w: 800, h: 600 };
    vm.runInContext("romFixVUp()", ctx3);
    const V = ctx3.romS.pts[0], E = ctx3.romS.pts[1], v = screenVec(V, E, roll);
    assert.ok(Math.abs(v.x) < 0.01, "화면에서 좌우로 치우치면 안 됨 (x=" + v.x.toFixed(2) + ")");
    assert.ok(v.y < -50, "화면 위쪽으로 그어져야 함");
    assert.ok(E.x >= 0 && E.x <= 800 && E.y >= 0 && E.y <= 600, "끝점이 사진 밖으로 나가면 안 됨");
    assert.ok(Math.abs(E.x - V.x) > 1, "사진 좌표에서는 보정각만큼 기울어 있어야 함");
  });
}

test("기울기 정보가 없는 사진(갤러리)은 사진 기준 수직 그대로", () => {
  ctx3.romS = { mv: "flex", pts: [{ x: 300, y: 400 }, { x: 999, y: 999 }, { x: 320, y: 300 }, { x: 320, y: 200 }], roll: null, w: 800, h: 600 };
  vm.runInContext("romFixVUp()", ctx3);
  assert.equal(ctx3.romS.pts[1].x, 300);
  assert.equal(ctx3.romS.pts[1].y, 0);
});
