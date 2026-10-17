// v305 누워서 재는 고관절·무릎 굴곡: 자동 인식이 바닥에 펴 둔 반대쪽 다리의 무릎·발목을 잡던 문제 (관리자 엑셀 수정 기록에서 확인)
// 재는 다리 = 무릎이 뚜렷하게 더 굽은 다리. index.html 의 romBentSide 를 그대로 꺼내 실행 (가짜 좌표)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/\r\n/g, "\n");
const grab = (start, end) => {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "index.html 에서 못 찾음: " + start);
  return html.slice(i, j);
};
const ctx = {};
vm.createContext(ctx);
vm.runInContext(grab("  function romBentSide(L){", "  function romPickSide(L){"), ctx);
const bent = vm.runInContext("romBentSide", ctx);

// MediaPipe 번호: 23·24 고관절, 25·26 무릎, 27·28 발목 (짝수 = 오른쪽)
const pose = (left, right, v = 0.9) => {
  const L = [];
  [[23, 25, 27], [24, 26, 28]].forEach((ix, s) => ix.forEach((i, k) => { const p = (s ? right : left)[k]; L[i] = { x: p[0], y: p[1], v }; }));
  return L;
};
const straight = [[200, 500], [600, 500], [1000, 500]];   // 바닥에 펴 둔 다리 (180°)
const bentLeg = [[200, 500], [450, 150], [600, 450]];     // 무릎을 세운 다리

test("오른쪽 다리를 구부리고 왼쪽은 펴 두었으면 R", () => {
  assert.equal(bent(pose(straight, bentLeg)), "R");
});

test("왼쪽 다리를 구부렸으면 L", () => {
  assert.equal(bent(pose(bentLeg, straight)), "L");
});

test("두 다리 굽은 정도가 비슷하면 판단하지 않는다 (null)", () => {
  const bent2 = [[200, 500], [460, 160], [610, 440]];
  assert.equal(bent(pose(bentLeg, bent2)), null);
});

test("다리 점을 거의 못 찾았으면 (확신 낮음) 판단하지 않는다", () => {
  assert.equal(bent(pose(straight, bentLeg, 0.1)), null);
});

test("다리 점이 빠져 있으면 판단하지 않는다", () => {
  const L = pose(straight, bentLeg); delete L[28];
  assert.equal(bent(L), null);
});
