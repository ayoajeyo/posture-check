// v298 측정 비우기 뒤 다시 재지 않은 ROM 기록(값 없음)이 회원 회차 상세에 'null°' 로 보이던 문제
// index.html 의 romValTxt · ssParseVal · cmpRomList 를 그대로 꺼내 실행 (가짜 데이터: 홍길동)
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
vm.runInContext(grab("  function romValTxt(v){", "\n") + "\n", ctx);
vm.runInContext(grab("  function ssParseVal(s){", "\n") + "\n", ctx);
// cmpRomList 가 부르는 mbRomInfo 는 가짜로 (항목 이름·분류만)
vm.runInContext("function mbRomInfo(x){ return { cat: 'rom', name: '어깨 외전', sd: x.side === 'R' ? '우측' : '좌측', ord: 1 }; }", ctx);
vm.runInContext(grab("  function cmpRomList(ss, want){", "  function cmpSections("), ctx);
const romValTxt = vm.runInContext("romValTxt", ctx);
const ssParseVal = vm.runInContext("ssParseVal", ctx);
const cmpRomList = vm.runInContext("cmpRomList", ctx);

test("값이 없으면 'null°' 대신 '측정 전'", () => {
  assert.equal(romValTxt(null), "측정 전");
  assert.equal(romValTxt(undefined), "측정 전");
  assert.equal(romValTxt(149), "149°");
  assert.equal(romValTxt(0), "0°");
});

test("회차 상세 수정 칸이 비어 있으면 0° 로 저장하지 않는다", () => {
  assert.equal(ssParseVal(""), null, "빈칸 → 저장 안 함 (전에는 0° 로 저장됐다)");
  assert.equal(ssParseVal("  "), null);
  assert.equal(ssParseVal("abc"), null);
  assert.equal(ssParseVal("149"), 149);
  assert.equal(ssParseVal("0"), 0);
  assert.equal(ssParseVal("-5"), 0);
  assert.equal(ssParseVal("88.6"), 89);
  assert.equal(ssParseVal("999"), 200, "입력칸 최대 200° 를 넘지 않는다");
});

test("전후 비교: 같은 항목에 비운 기록(값 없음)이 더 늦어도 측정값을 쓴다", () => {
  const roms = [
    { id: "a", memberId: "m-hong", joint: "shoulder", side: "R", move: "abd", round: 1, at: 100, value: 149 },
    { id: "b", memberId: "m-hong", joint: "shoulder", side: "R", move: "abd", round: 1, at: 200, value: null, wipedAt: 300 }
  ];
  const L = JSON.parse(JSON.stringify(cmpRomList({ roms }, "rom")));
  assert.equal(L.length, 1);
  assert.equal(L[0].value, "149°");
  assert.equal(L[0].num, 149);
});
