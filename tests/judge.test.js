// 거북목(CVA)·척추 균형(ATR)·기울기 판정 — js/logic/judge.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { scolJudge } = require("../js/logic/judge.js");

const CVA = { grade: "cva" }, ATR = { grade: "atr" }, TILT = {};
const cls = (mv, v) => scolJudge(mv, v).cls;

test("값이 없으면 미측정", () => {
  assert.deepEqual(scolJudge(CVA, null), { cls: "", txt: "미측정", pct: 0 });
  assert.equal(scolJudge(ATR, undefined).txt, "미측정");
});

test("거북목 CVA: 55° 이상 정상, 50~55 경계, 45~50 주의, 45 미만 심함", () => {
  assert.equal(cls(CVA, 60), "good");
  assert.equal(cls(CVA, 55), "good");       // 경계값 포함
  assert.equal(cls(CVA, 54.9), "warn");
  assert.equal(cls(CVA, 50), "warn");
  assert.equal(scolJudge(CVA, 49.9).pct, 45);
  assert.equal(scolJudge(CVA, 45).pct, 45);
  assert.equal(scolJudge(CVA, 44.9).pct, 25);
  assert.equal(cls(CVA, 44.9), "crit");
});

test("척추 균형 ATR: 5° 미만 정상, 5~7 관찰, 7 이상 상담", () => {
  assert.equal(cls(ATR, 4.9), "good");
  assert.equal(cls(ATR, 5), "warn");        // 5는 관찰 쪽
  assert.equal(cls(ATR, 6.9), "warn");
  assert.equal(cls(ATR, 7), "crit");
  assert.equal(scolJudge(ATR, 7).pct, 30);
});

test("기울기(그 밖의 동작): 10 미만 정상, 10~25 약간, 25~40 큼, 40 이상", () => {
  assert.equal(cls(TILT, 9.9), "good");
  assert.equal(cls(TILT, 10), "warn");
  assert.equal(scolJudge(TILT, 25).pct, 35);
  assert.equal(scolJudge(TILT, 40).pct, 15);
});

test("0도와 음수도 숫자로 판정한다 (0을 미측정으로 보지 않음)", () => {
  assert.equal(cls(ATR, 0), "good");
  assert.equal(cls(TILT, -3), "good");
});
