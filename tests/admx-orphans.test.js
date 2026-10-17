// v304 관리자 엑셀: 원래 측정 기록이 지워진 보관 자료 때문에 회원 목록에 같은 이름이 두 번 나오던 문제 (가짜: 홍길동)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const grab = (start, end) => { const i = html.indexOf(start), j = html.indexOf(end, i); assert.ok(i >= 0 && j > i, "못 찾음: " + start); return html.slice(i, j); };
const ctx = {}; vm.createContext(ctx);
vm.runInContext(grab("  function admxOrphans(L, members){", "  // v265 회차 번호가"), ctx);
const orphans = vm.runInContext("admxOrphans", ctx);
const M = [{ id: "m-hong", name: "홍길동" }, { id: "m-kim1", name: "김철수" }, { id: "m-kim2", name: "김철수" }, { id: "m-x", name: "이영희", deleted: true }];

test("원래 기록이 지워진 보관 자료는 같은 이름 회원에 붙고 회차는 '삭제된 기록'", () => {
  const L = [{ id: "admx:records:gone:front", member: "홍길동", mid: null, rec0: null }];
  orphans(L, M);
  assert.equal(L[0].mid, "m-hong");
  assert.equal(L[0].round, "del");
});

test("동명이인·지운 회원·회원 이름 없음·원래 기록이 있는 자료는 건드리지 않는다", () => {
  const L = [
    { id: "a", member: "김철수", mid: null, rec0: null },
    { id: "b", member: "이영희", mid: null, rec0: null },
    { id: "c", member: "", mid: null, rec0: null },
    { id: "d", member: "홍길동", mid: "m-hong", rec0: {}, round: 1 }
  ];
  orphans(L, M);
  assert.deepEqual(L.map((x) => [x.mid, x.round || null]), [[null, null], [null, null], [null, null], ["m-hong", 1]]);
});
