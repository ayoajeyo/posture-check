// v302 격자 배경에서 사람에 맞닿은 커튼이 지워지지 않던 문제
// 사람 분리 모델이 커튼을 '옷'(확신 약 0.7)으로 봐서 사람과 한 덩어리가 됐다 → 확신이 큰 곳 중 측정 부위에 닿은 덩어리 둘레만 사람으로 인정
// index.html 의 romStrongNear 를 그대로 꺼내 실행 (가짜 격자 데이터)
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
const ctx = {};
vm.createContext(ctx);
vm.runInContext(grab("  function romDilate(M, w, h, r){", "  function romMaskMerge("), ctx);
const near = vm.runInContext("romStrongNear", ctx);

const W = 40, H = 20;
const grid = (fn) => { const a = new Uint8Array(W * H); for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(fn(x, y)) a[y * W + x] = 1; return a; };
const at = (m, x, y) => m[y * W + x];

test("측정 부위에 닿은 확신 큰 덩어리(다리) 둘레만 남고, 떨어진 확신 큰 조각(커튼 얼룩)은 빠진다", () => {
  const S = grid((x, y) => (x >= 25 && x <= 30) || (x <= 4 && y >= 5 && y <= 8));   // 다리 · 커튼 위 밝은 얼룩
  const K = grid((x, y) => x === 27 && y === 10);                                   // 측정선(다리 위)
  const N = near(S, K, W, H, 2);
  assert.equal(at(N, 27, 3), 1, "다리");
  assert.equal(at(N, 23, 10), 1, "다리 둘레 2칸 (옷·경계)");
  assert.equal(at(N, 22, 10), 0, "둘레 밖");
  assert.equal(at(N, 2, 6), 0, "측정 부위에 안 닿은 커튼 얼룩");
});

test("측정 부위에 닿은 확신 큰 덩어리가 없으면 null (예전처럼 거르지 않음)", () => {
  const S = grid((x) => x <= 4);
  const K = grid((x, y) => x === 27 && y === 10);
  assert.equal(near(S, K, W, H, 2), null);
});

test("K 없이 부르면 확신 큰 덩어리 전부를 씨앗으로 (측정 부위에 안 닿은 다른 쪽 다리도 남는다)", () => {
  const S = grid((x, y) => (x >= 25 && x <= 30) || (x >= 10 && x <= 13 && y <= 6));   // 측정하는 다리 · 떨어진 다른 다리
  const N = near(S, null, W, H, 2);
  assert.equal(at(N, 11, 3), 1, "다른 다리");
  assert.equal(at(N, 11, 8), 1, "세로로도 2칸 넓힘");
  assert.equal(at(N, 11, 9), 0);
  assert.equal(at(N, 19, 10), 0, "둘 사이 배경");
});
