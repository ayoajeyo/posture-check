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
