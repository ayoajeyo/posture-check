// v297 ROM·거북목·척추 편집 화면의 각도 표시칸이 측정점(예: 목 측방굴곡의 턱끝)을 가려 점을 고칠 수 없던 문제
// index.html 의 romLblPick 을 그대로 꺼내 실행 (화면 좌표, 가짜 측정점)
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
const ctx = {};
vm.createContext(ctx);
vm.runInContext(grab("  function romLblPick(o){", "  function romLblLive("), ctx);
const pick = vm.runInContext("romLblPick", ctx);

const W = 360, H = 360, bw = 125, bh = 54;
const rectOf = (b) => ({ x0: b.x - bw / 2, x1: b.x + bw / 2, y0: b.y - bh / 2, y1: b.y + bh / 2 });
const covers = (r, p, pad) => p.x > r.x0 - pad && p.x < r.x1 + pad && p.y > r.y0 - pad && p.y < r.y1 + pad;

// 아요가 보낸 목 측방굴곡 화면을 옮긴 배치: 목관절(아래) · 세로 기준선 끝(위, 자동) · 턱끝(표시칸 바로 아래) · 정수리(왼쪽 위)
const NECK = [{ x: 251, y: 335 }, { x: 251, y: 0 }, { x: 214, y: 254 }, { x: 57, y: 59 }];
const ANCHOR = { x: 211, y: 222 };   // 지금까지 표시칸이 놓이던 꼭짓점 옆 자리
const NECK_SEGS = [[NECK[0], NECK[1]], [NECK[2], NECK[3]]];

test("목 측방굴곡: 표시칸이 턱끝 점을 가리지 않는다", () => {
  const b = pick({ W, H, bw, bh, k: 1, a: ANCHOR, pts: NECK, segs: NECK_SEGS, loupe: false });
  const r = rectOf(b);
  NECK.forEach((p, i) => assert.ok(!covers(r, p, 12), "측정점 " + i + " 를 가림: " + JSON.stringify(b)));
  assert.ok(r.x0 >= 0 && r.x1 <= W && r.y0 >= 0 && r.y1 <= H, "화면 안에 있어야 한다");
});

test("점을 끄는 동안에는 돋보기가 뜨는 위쪽 모서리도 피한다", () => {
  const pts = [{ x: 180, y: 200 }, { x: 180, y: 60 }, { x: 120, y: 150 }];   // 꼭짓점 옆 자리는 꼭짓점과 겹침
  const b = pick({ W, H, bw, bh, k: 1, a: { x: 180, y: 175 }, pts, loupe: true });
  assert.ok(b.y + bh / 2 > 106, "돋보기 자리(위쪽 106px)와 겹침: " + JSON.stringify(b));
});

test("꼭짓점 옆이 비어 있으면 그 자리 그대로 (예전과 같은 자리)", () => {
  const pts = [{ x: 180, y: 300 }, { x: 330, y: 300 }];   // 꼭짓점 → 오른쪽 수평선
  const a = { x: 180, y: 200 };
  const b = pick({ W, H, bw, bh, k: 1, a, pts, loupe: false });
  assert.deepEqual([b.x, b.y], [a.x, a.y]);
});

test("화면이 2배 해상도(k=2)여도 모서리 여백·크기를 같은 비율로 계산한다", () => {
  const pts2 = NECK.map((p) => ({ x: p.x * 2, y: p.y * 2 }));
  const b = pick({ W: W * 2, H: H * 2, bw: bw * 2, bh: bh * 2, k: 2, a: { x: ANCHOR.x * 2, y: ANCHOR.y * 2 }, pts: pts2, loupe: false });
  const r = { x0: b.x - bw, x1: b.x + bw, y0: b.y - bh, y1: b.y + bh };
  pts2.forEach((p, i) => assert.ok(!covers(r, p, 24), "측정점 " + i + " 를 가림"));
});

test("점을 끄는 동안 직전 자리가 크게 나쁘지 않으면 옮기지 않는다 (튀지 않게)", () => {
  const pts = [{ x: 180, y: 200 }, { x: 180, y: 60 }];
  const first = pick({ W, H, bw, bh, k: 1, a: { x: 180, y: 190 }, pts, loupe: false });
  assert.equal(first.i, 1, "꼭짓점 옆은 점과 겹치므로 왼쪽 아래 모서리");
  const again = pick({ W, H, bw, bh, k: 1, a: { x: 180, y: 190 }, pts, loupe: false, prev: 2 });
  assert.equal(again.i, 2, "직전 자리(오른쪽 아래)가 비어 있으면 그대로");
  const blocked = pick({ W, H, bw, bh, k: 1, a: { x: 180, y: 190 }, pts: pts.concat([{ x: 300, y: 330 }]), loupe: false, prev: 2 });
  assert.notEqual(blocked.i, 2, "직전 자리에 점이 들어오면 옮긴다");
});

test("이름표가 점 왼쪽에 붙는 경우(화면 오른쪽 끝)도 피한다", () => {
  const pts = [{ x: 180, y: 120 }, { x: 120, y: 330 }];   // 왼쪽 아래 모서리 바로 오른쪽 위에 점 → 이름표가 왼쪽으로 넘어갈 수 있음
  const b = pick({ W, H, bw, bh, k: 1, a: { x: 180, y: 120 }, pts, loupe: false });
  assert.notEqual(b.i, 1, "왼쪽 아래 모서리는 그 점의 이름표와 겹칠 수 있다");
});
