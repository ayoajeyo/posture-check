// v276 촬영 실루엣 좌우 맞춤 — index.html 의 SIL_ADJ 로 '화면에 그려지는 사람 영역'을 계산해 좌·우를 비교
// 실루엣 그림(guide/sil/*_v3.webp)의 사람 영역은 파일마다 고정이라 아래 값으로 둔다 (alpha>30 기준, 1080x1080 대비 비율)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const BOX = {   // x0, x1, y0, y1 (그림 대비 0~1)
  ankle_L_dorsi:   { x0: 0.150, x1: 1.000, y0: 0.444, y1: 0.818 },
  ankle_R_dorsi:   { x0: 0.000, x1: 0.679, y0: 0.313, y1: 0.725 },
  ankle_L_plantar: { x0: 0.090, x1: 1.000, y0: 0.459, y1: 0.851 },
  ankle_R_plantar: { x0: 0.000, x1: 0.782, y0: 0.282, y1: 0.736 },
  hip_L_flex:      { x0: 0.153, x1: 1.000, y0: 0.403, y1: 0.742 },
  hip_R_flex:      { x0: 0.000, x1: 0.853, y0: 0.391, y1: 0.797 },
  knee_L_ext:      { x0: 0.100, x1: 1.000, y0: 0.507, y1: 0.730 },
  knee_R_ext:      { x0: 0.000, x1: 1.000, y0: 0.560, y1: 0.805 },
  elbow_L_ext:     { x0: 0.080, x1: 0.629, y0: 0.278, y1: 1.000 },
  elbow_R_ext:     { x0: 0.267, x1: 0.869, y0: 0.216, y1: 1.000 },
  elbow_L_flex:    { x0: 0.309, x1: 0.608, y0: 0.260, y1: 1.000 },
  elbow_R_flex:    { x0: 0.270, x1: 0.710, y0: 0.285, y1: 1.000 },
};

// index.html 의 SIL_ADJ 에서 항목별 s·dx·dy 읽기
function adj(key) {
  const seg = html.slice(html.indexOf("var SIL_ADJ = {"), html.indexOf("function bodyGhostPrep"));
  const m = new RegExp(key + ":\\s*\\{([^}]*)\\}").exec(seg);
  if (!m) return { s: 1, dx: 0, dy: 0 };
  const num = (k) => { const q = new RegExp(k + ":\\s*(-?[\\d.]+)").exec(m[1]); return q ? parseFloat(q[1]) : (k === "s" ? 1 : 0); };
  return { s: num("s"), dx: num("dx"), dy: num("dy") };
}
// index.html 의 그리기 식과 같은 계산 (romFit → s 확대 → dx·dy 이동)
function drawn(key) {
  const B = BOX[key], a = adj(key);
  const f = (p) => 0.5 - a.s / 2 + a.dx * a.s + p * a.s;
  const g = (p) => 0.5 - a.s / 2 + a.dy * a.s + p * a.s;
  const w = (B.x1 - B.x0) * a.s, h = (B.y1 - B.y0) * a.s;
  return { x0: f(B.x0), x1: f(B.x1), w: w, h: h, area: Math.sqrt(w * h),   // 화면에서 차지하는 넓이
    cx: f((B.x0 + B.x1) / 2), cy: g((B.y0 + B.y1) / 2) };
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} ↔ ${b.toFixed(3)} (허용 ${tol})`);

for (const [l, r, 이름] of [["ankle_L_dorsi", "ankle_R_dorsi", "발목 배측굴곡"],
                            ["ankle_L_plantar", "ankle_R_plantar", "발목 저측굴곡"],
                            ["hip_L_flex", "hip_R_flex", "고관절 굴곡"],
                            ["knee_L_ext", "knee_R_ext", "무릎 신전"]]) {
  test(`${이름}: 좌·우 실루엣이 화면에서 같은 크기로 보인다`, () => {
    const L = drawn(l), R = drawn(r);
    // 좌·우 사진의 다리 각도가 달라 가로·세로를 동시에 맞출 수 없어 '차지하는 넓이'로 비교
    near(L.area, R.area, 0.02, "화면에서 차지하는 넓이");
  });
  test(`${이름}: 좌·우 실루엣이 좌우 대칭 위치에 보인다`, () => {
    const L = drawn(l), R = drawn(r);
    near(L.cx, 1 - R.cx, 0.02, "좌우 위치(대칭)");
    near(L.cy, R.cy, 0.02, "위아래 위치");
  });
}

test("무릎 신전: 발이 화면 안에 넉넉히 들어온다 (양쪽 10% 여백)", () => {
  const R = drawn("knee_R_ext"), L = drawn("knee_L_ext");
  near(1 - R.x1, 0.10, 0.02, "우측 발 쪽 여백");   // 우측은 오른쪽 끝이 발
  near(L.x0, 0.10, 0.02, "좌측 발 쪽 여백");       // 좌측은 왼쪽 끝이 발
});

// v282 팔꿈치: 팔이 긴 사람의 손목이 화면 밖으로 나가던 문제 — 손목 쪽 여백을 넓히고 좌·우 크기를 맞춤
// (그림이 아래에서 잘려 있어 y1 = 1.000 — 몸통은 화면 아래로 이어진다. 크기 비교는 '사람 높이'로 한다)
test("팔꿈치 신전: 손목 쪽 여백이 양쪽 모두 15% 이상 (팔이 길어도 손목이 화면 안)", () => {
  const R = drawn("elbow_R_ext"), L = drawn("elbow_L_ext");
  assert.ok(1 - R.x1 >= 0.15, `우측 손목 쪽 여백 ${(1 - R.x1).toFixed(3)} (0.15 이상이어야)`);
  assert.ok(L.x0 >= 0.15, `좌측 손목 쪽 여백 ${L.x0.toFixed(3)} (0.15 이상이어야)`);
});

test("팔꿈치 굴곡: 손목 쪽·몸통 쪽 여백이 모두 15% 이상", () => {
  const R = drawn("elbow_R_flex"), L = drawn("elbow_L_flex");
  assert.ok(1 - R.x1 >= 0.15, `우측 손목 쪽 여백 ${(1 - R.x1).toFixed(3)}`);   // 우측은 오른쪽 끝이 팔
  assert.ok(L.x0 >= 0.15, `좌측 손목 쪽 여백 ${L.x0.toFixed(3)}`);              // 좌측은 왼쪽 끝이 팔
  assert.ok(R.x0 >= 0.15, `우측 몸통 쪽 여백 ${R.x0.toFixed(3)}`);              // 옮기면서 줄어드는 쪽
  assert.ok(1 - L.x1 >= 0.15, `좌측 몸통 쪽 여백 ${(1 - L.x1).toFixed(3)}`);
});

/* v282 사람 크기는 그림 테두리(bbox)로 재면 안 된다 — 팔꿈치 4장은 아래가 잘려 있어
   테두리 높이 = '머리끝 → 그림 아래 가장자리' 다. 잘리지 않는 머리 폭으로 잰 실측값. */
const HEAD = { elbow_L_ext: 0.1426, elbow_R_ext: 0.1815, elbow_L_flex: 0.1463, elbow_R_flex: 0.1704 };
const personSize = (key) => HEAD[key] * adj(key).s;

test("팔꿈치: 같은 쪽의 굴곡·신전이 비슷한 사람 크기 (설 자리가 달라지지 않게)", () => {
  near(personSize("elbow_L_ext"), personSize("elbow_L_flex"), 0.008, "좌측 굴곡 ↔ 신전 사람 크기");
  near(personSize("elbow_R_ext"), personSize("elbow_R_flex"), 0.013, "우측 굴곡 ↔ 신전 사람 크기");
});

test("팔꿈치: 크기(s)는 건드리지 않는다 — 그림 테두리로 잰 잘못된 기준으로 맞추지 않게", () => {
  for (const k of Object.keys(HEAD)) assert.equal(adj(k).s, 1, k + " 에 s 가 들어갔다 (머리 폭 기준으로 다시 계산할 것)");
});

test("척추 균형 실루엣(v284): 조정값을 적용하면 옛 실루엣과 같은 등 폭·위치가 된다", () => {
  const A = adj("scol_C_atr"); assert.ok(A.s > 1, "scol_C_atr 조정값(s)이 있어야 한다");
  const OLD = { x0: 0.035, x1: 0.939, y0: 0.433 }, NEW = { x0: 0.219, x1: 0.803, y0: 0.444 };   // v3·v4 webp 의 사람 영역(알파>127) 범위, PIL 측정
  const f = (p, s, d) => 0.5 - s / 2 + (d || 0) * s + p * s, s = A.s || 1;
  near(f(NEW.x1, s, A.dx) - f(NEW.x0, s, A.dx), OLD.x1 - OLD.x0, 0.02, "등 폭이 옛것과 같다");
  near((f(NEW.x0, s, A.dx) + f(NEW.x1, s, A.dx)) / 2, (OLD.x0 + OLD.x1) / 2, 0.02, "가로 중심이 옛것과 같다");
  near(f(NEW.y0, s, A.dy), OLD.y0, 0.02, "등 윗선 높이가 옛것과 같다");
});
