// v299 회원 화면에서 회원(가짜: 홍길동)을 연 뒤 측정·리포트로 가면, 측정 화면에 열려 있던 다른 회원이 그대로 나오던 문제
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/\r\n/g, "\n"); // Windows(CRLF) 로 꺼낸 PC 에서도 같은 결과
const grab = (start, end) => {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "index.html 에서 못 찾음: " + start);
  return html.slice(i, j);
};
const ctx = {};
vm.createContext(ctx);
vm.runInContext('var MSR_VIEWS = ["analyze", "rom", "fhp", "scol"];', ctx);
vm.runInContext(grab("  function mbAdoptFor(v, from, viewed, cur, photoMid){", "\n  }\n") + "\n  }\n", ctx);
const adopt = vm.runInContext("mbAdoptFor", ctx);

const HONG = { id: "m-hong", name: "홍길동" }, KIM = { id: "m-kim", name: "김철수" };

test("회원 화면에서 연 회원으로 측정·ROM·거북목·척추·리포트 화면이 바뀐다", () => {
  ["analyze", "rom", "fhp", "scol", "report"].forEach((v) => {
    assert.equal(adopt(v, "members", HONG, KIM), HONG, v);
    assert.equal(adopt(v, "members", HONG, null), HONG, v + " (선택한 회원이 없을 때)");
  });
});

test("이미 같은 회원이면 바꾸지 않는다 (열어 둔 측정이 그대로)", () => {
  assert.equal(adopt("analyze", "members", HONG, HONG), null);
});

test("회원 목록만 보고(상세를 안 열고) 가거나, 다른 화면에서 오면 바꾸지 않는다", () => {
  assert.equal(adopt("analyze", "members", null, KIM), null);
  assert.equal(adopt("analyze", "dash", HONG, KIM), null);
  assert.equal(adopt("settings", "members", HONG, KIM), null, "측정·리포트가 아닌 화면");
});

test("같은 회원이어도 측정 화면에 다른 회원 사진이 열려 있으면 비우고 새로 시작한다", () => {
  assert.equal(adopt("analyze", "members", HONG, HONG, "m-kim"), HONG);
  assert.equal(adopt("analyze", "members", HONG, HONG, "m-hong"), null, "자기 사진이면 그대로");
  assert.equal(adopt("analyze", "members", HONG, HONG, null), null, "사진이 없으면 그대로");
});
