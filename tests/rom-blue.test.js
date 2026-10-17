// v300 남색 옷을 입고 찍은 ROM 사진의 격자 배경에서 몸(옷)이 지워지던 문제
// 파란 침대를 지우는 규칙이 남색 옷까지 지웠다 → 사람 분리 모델의 '옷' 분류, 또는 측정 부위 둘레가 이미 파랗다면 옷으로 본다
// index.html 의 romIsBlue · romBlueCloth 를 그대로 꺼내 실행 (화면 합성은 브라우저에서 따로 확인)
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
vm.runInContext(grab("  function romIsBlue(r, gg, b){", "  function romMaskMerge("), ctx);
const isBlue = vm.runInContext("romIsBlue", ctx);
const blueCloth = vm.runInContext("romBlueCloth", ctx);

test("남색(#1E2A4A)·파란 침대는 파란색, 검정·회색·피부는 아니다", () => {
  assert.equal(isBlue(0x1e, 0x2a, 0x4a), true, "남색 옷");
  assert.equal(isBlue(0x1f, 0x3f, 0x8f), true, "파란 침대");
  assert.equal(isBlue(0x22, 0x22, 0x22), false, "검정");
  assert.equal(isBlue(0x8a, 0x8a, 0x8a), false, "회색");
  assert.equal(isBlue(0xe2, 0xb4, 0x8f), false, "피부");
});

test("측정 부위 둘레 사람 영역의 12% 이상이 파랗다면 파란 옷", () => {
  assert.equal(blueCloth(30, 200), true);
  assert.equal(blueCloth(10, 200), false, "조금 섞인 것은 옷으로 보지 않음");
  assert.equal(blueCloth(5, 10), false, "표본이 너무 적으면 판단 안 함");
});
