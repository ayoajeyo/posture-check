// 거북목(CVA)·척추 균형(ATR)·기울기 판정 — js/logic/judge.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { scolJudge, romJudge, scoreBand } = require("../js/logic/judge.js");

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

// ── romJudge (index.html 에서 옮김) ──
const FLEX180 = { normal: 180 }, EXT0 = { normal: 0 }, CVA2 = { grade: "cva", normal: 55 };

test("ROM: 정상값 대비 % 로 판정 — 90% 이상 양호, 70~90 주의, 70 미만 개선 필요", () => {
  assert.equal(romJudge(FLEX180, 180).cls, "good");
  assert.equal(romJudge(FLEX180, 180).pct, 100);
  assert.equal(romJudge(FLEX180, 200).pct, 100, "정상보다 커도 100 상한");
  assert.equal(romJudge(FLEX180, 162).cls, "good");   // 90%
  assert.equal(romJudge(FLEX180, 161).cls, "warn");   // 89%
  assert.equal(romJudge(FLEX180, 126).cls, "warn");   // 70%
  assert.equal(romJudge(FLEX180, 125).cls, "crit");   // 69%
  assert.equal(romJudge(FLEX180, 126).pct, 70);
});

test("ROM 신전(정상 0°): 5° 이내 완전히 펴짐, 15° 까지 주의, 과신전 10° 이내 정상", () => {
  assert.equal(romJudge(EXT0, 0).cls, "good");
  assert.equal(romJudge(EXT0, 5).cls, "good");
  assert.equal(romJudge(EXT0, 6).cls, "warn");
  assert.equal(romJudge(EXT0, 15).cls, "warn");
  assert.equal(romJudge(EXT0, 16).cls, "crit");
  assert.equal(romJudge(EXT0, 15).pct, 50);           // 100 - 15/30*100
  assert.equal(romJudge(EXT0, 40).pct, 0, "0 아래로 내려가지 않음");
  assert.equal(romJudge(EXT0, -8).cls, "good");       // 과신전 8°
  assert.equal(romJudge(EXT0, -12).cls, "warn");      // 과신전 12°
  assert.equal(romJudge(EXT0, -12).pct, 100);
});

test("ROM: 거북목·척추 균형은 scolJudge 로 위임, 값 없으면 미측정", () => {
  assert.deepEqual(romJudge(CVA2, 56), scolJudge(CVA2, 56));
  assert.equal(romJudge(FLEX180, null).txt, "미측정");
  assert.equal(romJudge(FLEX180, null).pct, 0);
});

// ── scoreBand (index.html 에서 옮김) ──
test("종합 점수: 90 매우 좋음 · 75 양호 · 60 주의 · 그 아래 개선 필요 (경계값 포함)", () => {
  assert.deepEqual(scoreBand(90), { cls: "st-good", label: "매우 좋음" });
  assert.deepEqual(scoreBand(89.9), { cls: "st-good", label: "양호" });
  assert.deepEqual(scoreBand(75), { cls: "st-good", label: "양호" });
  assert.deepEqual(scoreBand(74.9), { cls: "st-warn", label: "주의" });
  assert.deepEqual(scoreBand(60), { cls: "st-warn", label: "주의" });
  assert.deepEqual(scoreBand(59.9), { cls: "st-crit", label: "개선 필요" });
  assert.deepEqual(scoreBand(0), { cls: "st-crit", label: "개선 필요" });
});
