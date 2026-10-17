// v281 기준선(세로·가로)이 각도축을 따라가지 못해 기울어지던 문제
// 어깨 굴곡 좌측: 학습 보정이 어깨 관절(0번 점)만 옆으로 옮기고 ①선 끝점은 두고 가서
// 폰 기울기 보정이 있을 때 ①선이 약 1.2° 기울어졌다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/\r\n/g, "\n");   // 윈도우 PC(CRLF)에서도 같은 글자로 찾게
const grab = (start, end) => {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "index.html 에서 못 찾음: " + start);
  return html.slice(i, j);
};

const W = 1440, H = 2560;
const ctx = {
  console,
  rom: { side: "L" },
  ROM_LM: {}, ROM_DERIV: {}, ROM_MID: {},
  romGet: () => null,
  romJoint: () => ({ k: "shoulder", kind: "dir", pts: ["shj", "armend", "vdown"] }),
  romMove: () => ({ k: "flex", normal: 180 }),
  romSd: () => "L",
  romPts: () => ["shj", "armend", "vdown"],
  romS: null,
};
vm.createContext(ctx);
vm.runInContext(grab("  function romRotRef(d, roll){", "  function romAngleOf("), ctx);
vm.runInContext(grab("  var LEARN_ROM = ", "  function romSd(J, mv){"), ctx);
vm.runInContext(grab("  function romSynthA(name, V, D, L, W, H, roll){", "  var rom = { joint:"), ctx);
vm.runInContext(grab("  function romIsLm(n){", "  function romPtsLabel("), ctx);

// 어깨 관절(0) · 손목(1) · 세로 기준선 끝점(2)
const setup = (roll) => {
  const V = { x: 700, y: 760 }, D = { x: 250, y: 600 };
  const A = vm.runInContext("romSynthA", ctx)("vdown", V, D, null, W, H, roll);
  ctx.romS = { pts: [V, D, A], w: W, h: H, roll: roll, L: null, refCustom: null, autoPts: true };
  return { V, D, A };
};
// 화면은 사진을 -roll 만큼 돌려 보여 준다 → 화면에서의 ①선 기울기(수직 기준, 도)
const screenTilt = (roll) => {
  const [V, , A] = ctx.romS.pts;
  const r = -(roll || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const dx = A.x - V.x, dy = A.y - V.y;
  const rx = dx * c - dy * s, ry = dx * s + dy * c;
  return Math.abs(Math.atan2(rx, ry) * 180 / Math.PI);   // 0 이면 화면에서 정확히 수직
};

test("만들 때는 화면에서 정확히 수직이다 (폰 기울기가 있어도)", () => {
  for (const roll of [0, -0.6, 0.6, 1.5, -2.3]) {
    setup(roll);
    assert.ok(screenTilt(roll) < 0.01, `roll=${roll} 에서 기울기 ${screenTilt(roll)}°`);
  }
});

test("학습 보정이 어깨 관절을 옮겨도 ①선은 화면에서 수직을 지킨다", () => {
  for (const roll of [0, -0.6, 0.6, 1.5, -2.3]) {
    setup(roll);
    vm.runInContext("romLearnAdj()", ctx);
    const t = screenTilt(roll);
    assert.ok(t < 0.05, `roll=${roll} 에서 보정 뒤 ①선이 ${t.toFixed(2)}° 기울어짐 (수직이어야 함)`);
  }
});

test("학습 보정은 어깨 관절을 실제로 옮긴다 (보정이 사라지지 않았는지)", () => {
  setup(-0.6);
  const x0 = ctx.romS.pts[0].x;
  vm.runInContext("romLearnAdj()", ctx);
  assert.ok(Math.abs(ctx.romS.pts[0].x - x0 - (-1.4 / 100 * H)) < 0.01, "0번 점이 사진 높이의 -1.4% 만큼 움직여야 한다");
});

// v281 기준선 끝점을 사용자가 직접 옮겼으면(refMoved)·각도를 돌렸으면(refCustom) 자동으로 안 건드린다
const refAuto = () => vm.runInContext("romRefAuto()", ctx);
const refShift = (dx, dy) => vm.runInContext("romRefShift", ctx)(dx, dy);

test("사용자가 기준선을 손댔으면 따라 움직이지 않는다", () => {
  for (const flag of ["refMoved", "refCustom"]) {
    setup(-0.6);
    ctx.romS[flag] = flag === "refMoved" ? true : { x: 0.3, y: 0.95 };
    const before = { x: ctx.romS.pts[2].x, y: ctx.romS.pts[2].y };
    refShift(-30, 0);
    assert.equal(ctx.romS.pts[2].x, before.x, flag + " 인데 움직였다");
    assert.equal(ctx.romS.pts[2].y, before.y);
  }
});

test("기준점이 실제 관절이면 건드리지 않는다 (팔꿈치 신전처럼)", () => {
  setup(-0.6);
  ctx.ROM_LM.shoulder = 11;
  ctx.romPts = () => ["olec", "wrist", "shoulder"];
  assert.equal(refAuto(), false);
  const before = { x: ctx.romS.pts[2].x, y: ctx.romS.pts[2].y };
  refShift(-30, 0);
  assert.equal(ctx.romS.pts[2].x, before.x);
  delete ctx.ROM_LM.shoulder;
  ctx.romPts = () => ["shj", "armend", "vdown"];
});

test("점이 2개뿐인 동작(거북목)에서는 아무 일도 하지 않는다", () => {
  setup(-0.6);
  ctx.romS.pts = [{ x: 700, y: 760 }, { x: 250, y: 600 }];
  ctx.romPts = () => ["ear", "shoulder"];
  assert.equal(refAuto(), false);
  refShift(-30, 0);
  assert.equal(ctx.romS.pts.length, 2);
  ctx.romPts = () => ["shj", "armend", "vdown"];
});

test("각도축을 손으로 옮긴 뒤에도 ①선은 화면에서 수직이다", () => {
  for (const roll of [0, -0.6, 1.2]) {
    setup(roll);
    const d = { x: -60, y: 60 };
    ctx.romS.pts[0] = { x: ctx.romS.pts[0].x + d.x, y: ctx.romS.pts[0].y + d.y };
    refShift(d.x, d.y);
    const t = screenTilt(roll);
    assert.ok(t < 0.05, `roll=${roll} 에서 ${t.toFixed(2)}° 기울어짐`);
  }
});

// 리뷰 지적: 재합성(romSynthA) 방식이면 romS.L 유무로 가로 기준선 방향이 뒤집힐 수 있었다.
// 평행 이동은 방향을 건드리지 않으므로 L 과 무관하다 — 그 성질을 못으로 박아 둔다.
test("가로 기준선(hzside)도 방향이 그대로 유지된다 — 사진 정보(L) 유무와 무관", () => {
  ctx.romJoint = () => ({ k: "hip", kind: "dir", pts: ["hip", "femend", "hzside"] });
  ctx.romPts = () => ["hip", "femend", "hzside"];
  const dirOf = () => {
    const [V, , A] = ctx.romS.pts;
    return Math.atan2(A.y - V.y, A.x - V.x);
  };
  for (const L of [null, [{ x: 10, y: 10, v: 1 }]]) {
    setup(-0.6);
    ctx.romS.L = L;
    const d0 = dirOf();
    ctx.romS.pts[0] = { x: ctx.romS.pts[0].x - 40, y: ctx.romS.pts[0].y + 15 };
    refShift(-40, 15);
    assert.ok(Math.abs(dirOf() - d0) < 1e-9, "L=" + (L ? "있음" : "없음") + " 에서 방향이 바뀜");
  }
  ctx.romJoint = () => ({ k: "shoulder", kind: "dir", pts: ["shj", "armend", "vdown"] });
  ctx.romPts = () => ["shj", "armend", "vdown"];
});

/* v293 아요 보고: "화면 기준 위아래로 세로선이 그어지는 모든 항목" 점검.
   목(굴곡·신전·측방굴곡)은 romFixVUp 이 따로 그리고(tests/rom-aux.test.js),
   허리 측방굴곡·허리 굴곡·신전·고관절 회전처럼 기준점이 "vup" 인 항목은 이 함수가 그린다. */
test("vup(허리 측방굴곡 등) 기준선도 폰 기울기와 무관하게 화면에서 수직", () => {
  const V = { x: 520, y: 900 }, D = { x: 430, y: 300 };
  for (const roll of [0, -1.3, 2.4]) {
    const A = vm.runInContext("romSynthA", ctx)("vup", V, D, null, W, H, roll);
    const r = -roll * Math.PI / 180, dx = A.x - V.x, dy = A.y - V.y;
    const rx = dx * Math.cos(r) - dy * Math.sin(r), ry = dx * Math.sin(r) + dy * Math.cos(r);
    assert.ok(Math.abs(Math.atan2(rx, ry) * 180 / Math.PI) > 179.99, `roll=${roll}: 화면에서 수직이 아님`);
    assert.ok(A.x >= 0 && A.x <= W && A.y >= 0 && A.y <= H, "끝점이 사진 밖");
  }
});

/* v294 아요 보고: 고관절 굴곡의 가로 기준선이 좌·우가 뒤바뀐 쪽에 그어졌다.
   규칙(v103)은 "좌측 측정 = 화면 왼쪽 · 우측 측정 = 화면 오른쪽" 인데,
   누운 사진에서 어깨가 화면 밖이라 자동 인식이 엉뚱한 자리를 집으면 그 쪽으로 뒤집혔다. */
test("고관절 굴곡 가로 기준선: 좌측=화면 왼쪽 · 우측=화면 오른쪽 (어깨 인식·폰 기울기와 무관)", (t) => {
  const V = { x: 700, y: 1400 }, D = { x: 1100, y: 1380 };   // 고관절 → 무릎
  const saveJoint = ctx.romJoint, saveSide = ctx.rom.side;
  t.after(() => { ctx.romJoint = saveJoint; ctx.rom.side = saveSide; });   // 중간에 실패해도 다음 테스트가 오염되지 않게
  const shoulders = (sx) => { const a = []; a[11] = { x: sx, y: 1100, v: 0.9 }; a[12] = { x: sx, y: 1120, v: 0.9 }; return a; };
  // hzside 를 쓰는 동작 둘 다 같은 규칙이어야 한다 (고관절만 특별취급하던 v109 가 되돌아오면 걸린다)
  for (const J of [{ k: "hip", kind: "dir", pts: ["hip", "femend", "hzside"] }, { k: "shoulder", kind: "dir", pts: ["olec", "wrist", "hzside"] }]) {
    ctx.romJoint = () => J;
    for (const side of ["L", "R"]) {
      ctx.rom.side = side;
      const want = side === "R" ? 1 : -1;
      for (const sx of [80, 1360, null]) {     // 어깨가 왼쪽·오른쪽에 잡히거나, 못 잡히거나
        for (const roll of [0, -2, 2]) {       // 폰 기울기 보정이 있어도 좌우는 그대로
          const A = vm.runInContext("romSynthA", ctx)("hzside", V, D, sx == null ? null : shoulders(sx), W, H, roll);
          assert.equal(Math.sign(A.x - V.x), want, `${J.k} ${side}측 · 어깨 x=${sx} · 기울기 ${roll}: 기준선이 ${A.x > V.x ? "오른쪽" : "왼쪽"} 으로 갔다`);
        }
      }
      const flat = vm.runInContext("romSynthA", ctx)("hzside", V, D, shoulders(80), W, H, 0);
      assert.equal(Math.round(flat.y), Math.round(V.y), "폰 기울기가 없으면 기준선은 수평");
    }
  }
});
