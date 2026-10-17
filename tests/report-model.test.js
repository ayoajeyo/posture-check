// 리포트 문서 데이터 모델 — js/logic/report-model.js (가짜 데이터: 홍길동)
const test = require("node:test");
const assert = require("node:assert/strict");
const J = require("../js/logic/judge.js");
const TL = require("../js/logic/report-timeline.js");
const RM = require("../js/logic/report-model.js");

const CATALOG = [
  { k: "shoulder", n: "어깨", moves: [{ k: "flex", n: "굴곡", normal: 180 }, { k: "abd", n: "외전", normal: 180 }] },
  { k: "knee", n: "무릎", moves: [{ k: "flex", n: "굴곡", normal: 140 }, { k: "ext", n: "신전", normal: 0 }] },
  { k: "scol", n: "척추 균형", single: true, moves: [{ k: "atr", n: "척추 균형", grade: "atr" }] },
  { k: "fhp", n: "거북목", single: true, moves: [{ k: "cva", n: "거북목", grade: "cva" }] },
];
const T0 = Date.parse("2026-07-03T10:00:00+09:00"), DAY = 86400000;
const rom = (joint, side, move, value, at) => ({ joint, side, move, value, at });
const sess = (key, dayOff, rec, roms) => ({ key, at: T0 + dayOff * DAY, day: new Date(T0 + dayOff * DAY).toISOString().slice(0, 10), rec, roms: roms || [] });
const body = (score) => ({ score, f: [], sd: [] });

// 시안과 같은 3회차: 점수 58→69→74 · CVA 44→49→52 · ATR 8→6→4 · ROM 어깨 굴곡 좌 128→150→158 우 150→165→172 · 어깨 외전 좌 140→158→170 · 무릎 굴곡 좌 110→–→128
const S3 = [
  sess("r1", 0, body(58), [rom("fhp", "C", "cva", 44, T0), rom("scol", "C", "atr", 8, T0), rom("shoulder", "L", "flex", 128, T0), rom("shoulder", "R", "flex", 150, T0), rom("shoulder", "L", "abd", 140, T0), rom("knee", "L", "flex", 110, T0)]),
  sess("r2", 35, body(69), [rom("fhp", "C", "cva", 49, T0 + 35 * DAY), rom("scol", "C", "atr", 6, T0 + 35 * DAY), rom("shoulder", "L", "flex", 150, T0 + 35 * DAY), rom("shoulder", "R", "flex", 165, T0 + 35 * DAY), rom("shoulder", "L", "abd", 158, T0 + 35 * DAY)]),
  sess("r3", 70, body(74), [rom("fhp", "C", "cva", 52, T0 + 70 * DAY), rom("scol", "C", "atr", 4, T0 + 70 * DAY), rom("shoulder", "L", "flex", 158, T0 + 70 * DAY), rom("shoulder", "R", "flex", 172, T0 + 70 * DAY), rom("shoulder", "L", "abd", 170, T0 + 70 * DAY), rom("knee", "L", "flex", 128, T0 + 70 * DAY)]),
];
// computeReport() 결과 모양 (3차 체형)
const BODY3 = {
  score: 74,
  f: [
    { key: "earlobe", name: "귓볼", title: "귓볼 기울기", value: "0.8°", foot: "우 ↑", grade: { cls: "g-good", label: "정상 범위" } },
    { key: "shoulder", name: "어깨", title: "어깨 기울기", value: "1.8°", foot: "좌 ↑", grade: { cls: "g-warn", label: "약간 비대칭" } },
    { key: "ankle", name: "발목", title: "발목 기울기", value: "0.0°", foot: "수평", grade: { cls: "g-good", label: "정상 범위" } },
  ],
  sd: [
    { key: "ear", name: "귀", title: "귀 편위", value: "2.4cm", num: 2.4, pct: 1.6, foot: "전방 이동", grade: { cls: "g-good", label: "정상 정렬" } },   // 판정은 몸 높이 대비 % (2% 미만 정상)
    { key: "trochanter", name: "고관절", title: "고관절 편위", value: "0.6cm", num: 0.6, pct: 0.4, foot: "후방 이동", grade: { cls: "g-good", label: "정상 정렬" } },
  ],
};
const doc3 = () => RM.buildReportDoc({ tl: TL.buildTimeline(S3, CATALOG, J), body: BODY3, J });

test("01 종합 결과: 4항목 결과·정상 기준·판정·1차 대비", () => {
  const d = doc3();
  assert.equal(d.multi, true); assert.equal(d.cur.n, 3); assert.equal(d.base.n, 1);
  assert.deepEqual(d.summary.map((s) => s.k), ["score", "cva", "atr", "romAvg"]);
  const [sc, cva, atr, ra] = d.summary;
  assert.equal(sc.txt, "74점"); assert.equal(sc.ref, "75점 이상"); assert.equal(sc.cls, "warn"); assert.equal(sc.judge, "주의"); assert.equal(sc.deltaTxt, "▲ 16점"); assert.equal(sc.better, true);
  assert.equal(cva.txt, "52°"); assert.equal(cva.judge, "경계"); assert.equal(cva.deltaTxt, "▲ 8°");
  assert.equal(atr.txt, "4°"); assert.equal(atr.cls, "good"); assert.equal(atr.judge, "정상"); assert.equal(atr.deltaTxt, "▼ 4°"); assert.equal(atr.better, true, "척추 균형은 줄어야 개선");
  assert.equal(ra.txt, "92%"); assert.equal(ra.cls, "good"); assert.equal(ra.sub, "4개 동작 · 정상 대비 평균"); assert.equal(ra.deltaTxt, "▲ 14%p");
});

test("01 소견: 모두 좋아짐 + 정상 들어온 항목 + 기준까지 남은 양", () => {
  const d = doc3();
  assert.equal(d.note, "세 번의 측정 동안 네 항목이 모두 좋아졌습니다. 척추 균형과 관절 가동범위는 정상 범위이고, 체형 정렬 점수(74점)와 거북목 각도(52°)는 정상 기준까지 각각 1점·3°가 남았습니다.");
});

test("01 소견: 첫 측정이면 비교 문장 없이 현재 상태만", () => {
  const d = RM.buildReportDoc({ tl: TL.buildTimeline([S3[0]], CATALOG, J), body: { score: 58, f: BODY3.f, sd: BODY3.sd }, J });
  assert.equal(d.multi, false);
  assert.equal(d.summary[0].deltaTxt, "");
  assert.match(d.note, /^첫 측정입니다\./);
  assert.match(d.note, /다음 측정에서 변화를 비교합니다\.$/);
});

test("02 변화 그래프: 측정값이 있는 항목만, 정상 띠와 축 범위가 값을 포함", () => {
  const d = doc3();
  assert.deepEqual(d.trend.map((t) => t.k), ["score", "cva", "atr", "romAvg"]);
  const cva = d.trend[1];
  assert.deepEqual(cva.values, [44, 49, 52]); assert.deepEqual(cva.ok, [55, 65]); assert.ok(cva.min <= 44 && cva.max >= 55);
  const atr = d.trend[2]; assert.deepEqual(atr.ok, [0, 5]); assert.equal(atr.min, 0);
  const S = S3.map((s) => Object.assign({}, s, { rec: null }));   // 체형 없음 → 점수 그래프 없음
  const d2 = RM.buildReportDoc({ tl: TL.buildTimeline(S, CATALOG, J), body: null, J });
  assert.deepEqual(d2.trend.map((t) => t.k), ["cva", "atr", "romAvg"]);
  assert.equal(d2.summary.some((s) => s.k === "score"), false, "체형 없으면 요약표에도 점수 행이 없다");
});

test("03 체형 정렬: 값·방향·판정 — 정면은 좌↑/우↑, 측면은 앞/뒤", () => {
  const b = doc3().body;
  assert.equal(b.front.cls, "warn"); assert.equal(b.front.label, "약간 비대칭");
  assert.deepEqual(b.front.rows.map((r) => [r.n, r.v, r.dir, r.cls]), [["귓볼", 0.8, 1, "good"], ["어깨", 1.8, -1, "warn"], ["발목", 0, 0, "good"]]);
  assert.deepEqual([b.front.t1, b.front.t2, b.front.u], [1.5, 3, "°"]);
  assert.deepEqual(b.side.rows.map((r) => [r.n, r.v, r.dir]), [["귀", 2.4, 1], ["고관절", 0.6, -1]]);
  assert.deepEqual([b.side.t1, b.side.t2, b.side.u, b.side.left, b.side.right], [3, 6, "cm", "뒤", "앞"], "측면 경계는 몸 높이 2%·4% 를 이 회원의 cm 로 환산 (1.6% = 2.4cm → 1% = 1.5cm)");
  assert.equal(b.side.cls, "good"); assert.equal(b.side.label, "정상 정렬");
  assert.equal(b.front.rows[1].valTxt, "1.8° 좌↑"); assert.equal(b.side.rows[1].valTxt, "0.6cm 뒤"); assert.equal(b.front.rows[2].valTxt, "0°");
});

test("03 체형 정렬: 저장 기록 모양(slim · grade 없이 cls 만)도 그린다", () => {
  const slim = { score: 61,
    f: [{ key: "earlobe", name: "귓볼", title: "귓볼 기울기", value: "0.8°", num: 0.8, foot: "우 ↑", cls: "g-good" }, { key: "pelvis", name: "골반", title: "골반 기울기", value: "3.4°", num: 3.4, foot: "좌 ↑", cls: "g-crit" }],
    sd: [{ key: "ear", name: "귀", title: "귀 편위", value: "2.4cm", num: 2.4, foot: "전방 이동", cls: "g-warn" }] };
  const b = RM.buildReportDoc({ tl: TL.buildTimeline([S3[0]], CATALOG, J), body: slim, J }).body;
  assert.deepEqual(b.front.rows.map((r) => [r.n, r.v, r.dir, r.cls]), [["귓볼", 0.8, 1, "good"], ["골반", 3.4, -1, "crit"]]);
  assert.equal(b.front.cls, "crit"); assert.equal(b.front.label, "비대칭 큼");
  assert.equal(b.side.cls, "warn"); assert.equal(b.side.label, "약간 벗어남");
  assert.deepEqual([b.side.t1, b.side.t2], [3, 6], "pct 가 없으면 150cm 기준 환산");
});

test("08 판정 기준 문장은 모듈 상수에서 (화면·이미지 공통)", () => {
  assert.equal(RM.CRITERIA.length, 6); assert.equal(RM.CRITERIA[3][0], "거북목 CVA"); assert.match(RM.DISCLAIMER, /진단을 대신하지 않습니다/);
});

test("04 ROM: 동작별 좌/우 막대 — 선택 회차 값·%·1차 값·판정·좌우 차이", () => {
  const rows = doc3().rom.rows;
  assert.deepEqual(rows.map((r) => r.label), ["어깨 굴곡", "어깨 외전", "무릎 굴곡"]);
  const sf = rows[0];
  assert.deepEqual(sf.sides.map((s) => [s.side, s.aVal, s.bVal, s.pct, s.cls]), [["좌", 128, 158, 88, "warn"], ["우", 150, 172, 96, "good"]]);
  assert.equal(sf.cls, "warn"); assert.equal(sf.judge, "주의"); assert.equal(sf.diff, 14); assert.equal(sf.diffTxt, "좌우 차이 14°"); assert.equal(sf.diffBig, true);
  assert.equal(rows[1].diffTxt, "한쪽만 측정"); assert.equal(rows[1].sides.length, 1);
  assert.deepEqual(rows[2].sides[0].aVal, 110, "2차에 없어도 1차 값이 ○");
  assert.equal(rows[0].sub, "정상 180°");
});

test("04 ROM: 선택 회차에 없는 동작은 빼고, 신전(정상 0°)은 % 로 막대", () => {
  const S = [sess("a", 0, null, [rom("knee", "L", "ext", 12, T0), rom("shoulder", "L", "abd", 100, T0)]), sess("b", 30, null, [rom("knee", "L", "ext", 3, T0 + 30 * DAY)])];
  const rows = RM.buildReportDoc({ tl: TL.buildTimeline(S, CATALOG, J), body: null, J }).rom.rows;
  assert.deepEqual(rows.map((r) => r.label), ["무릎 신전"]);
  assert.equal(rows[0].sides[0].pct, 100); assert.equal(rows[0].sides[0].cls, "good"); assert.equal(rows[0].sub, "정상 0° (완전히 펴짐)");
  assert.equal(rows[0].sides[0].aPct, 60, "1차 12° 부족 = 60%");
});

test("05 구간 띠: CVA·ATR 구간과 ○1차 ●선택 회차, 설명 문장", () => {
  const z = doc3().zones;
  assert.deepEqual(z.map((x) => x.k), ["cva", "atr"]);
  const cva = z[0];
  assert.equal(cva.value, 52); assert.equal(cva.prev, 44); assert.equal(cva.prevN, 1); assert.equal(cva.judge, "경계");
  assert.deepEqual(cva.spec.zones.map((q) => [q.from, q.to, q.cls]), [[35, 45, "crit"], [45, 50, "crit"], [50, 55, "warn"], [55, 70, "good"]]);
  assert.equal(cva.text, "55° 이상이 정상입니다. 1차 '매우 많이 나옴'에서 '경계'까지 올라왔고, 3°를 더 회복하면 정상 범위입니다.");
  const atr = z[1];
  assert.deepEqual(atr.spec.zones.map((q) => [q.from, q.to, q.cls]), [[0, 5, "good"], [5, 7, "warn"], [7, 12, "crit"]]);
  assert.equal(atr.text, "5° 미만이 정상입니다. 1차 '상담 권장' 구간에서 정상 범위로 들어왔습니다.");
});

test("05 구간 띠: 값이 축을 벗어나면 축을 넓힌다", () => {
  const S = [sess("a", 0, null, [rom("scol", "C", "atr", 15, T0), rom("fhp", "C", "cva", 30, T0)])];
  const z = RM.buildReportDoc({ tl: TL.buildTimeline(S, CATALOG, J), body: null, J }).zones;
  assert.ok(z[0].spec.min <= 30); assert.ok(z[1].spec.max >= 15); assert.equal(z[1].prev, null);
  assert.equal(z[1].text, "5° 미만이 정상입니다. 지금은 '상담 권장' 구간입니다.");
});

test("06 사진 후보: 체형 정면·측면 먼저, 그다음 04 표와 같은 부위 순서 (전부, 변화 큰 순 아님)", () => {
  const p = doc3().photos;
  assert.deepEqual(p.slice(0, 2).map((x) => x.kind), ["body-front", "body-side"]);
  assert.deepEqual(p.filter((x) => x.kind === "rom").map((x) => x.key), ["shoulder|L|flex", "shoulder|R|flex", "shoulder|L|abd", "knee|L|flex", "fhp|C|cva", "scol|C|atr"]);
  assert.ok(p.every((x) => x.mag === undefined), "변화 크기 정렬값은 더 쓰지 않는다");
  assert.ok(p.every((x) => x.bVal != null), "사진 카드마다 선택 회차 수치가 같이 간다");
  const f = p.find((x) => x.key === "fhp|C|cva");
  assert.deepEqual([f.aN, f.bN, f.aVal, f.bVal, f.deltaTxt, f.better], [1, 3, 44, 52, "▲ 8°", true]);
});

test("06 사진 후보: 1회차뿐이면 그 회차 항목이 전부 단일 사진(비교 없음)으로", () => {
  const p = RM.buildReportDoc({ tl: TL.buildTimeline([S3[0]], CATALOG, J), body: null, J }).photos;
  const romP = p.filter((x) => x.kind === "rom");
  assert.equal(romP.length, 6);
  assert.ok(romP.every((x) => x.aN === null && x.bN === 1 && x.bVal != null));
});

// 비교 기준 회차 선택 (baseKey) — 기본은 1차, 고르면 01·04·05·06·07 의 ○값·변화·문장이 그 회차 기준
const docBase = (baseKey) => RM.buildReportDoc({ tl: TL.buildTimeline(S3, CATALOG, J), body: BODY3, J, baseKey });

test("비교 기준 2차: 요약·ROM·구간·사진·기록표가 2차 → 3차 기준으로", () => {
  const d = docBase("r2");
  assert.equal(d.base.n, 2); assert.equal(d.cur.n, 3);
  const [sc, cva, atr] = d.summary;
  assert.deepEqual([sc.deltaTxt, sc.baseN, cva.deltaTxt, atr.deltaTxt], ["▲ 5점", 2, "▲ 3°", "▼ 2°"]);
  const sf = d.rom.rows[0]; assert.deepEqual([sf.sides[0].aVal, sf.sides[0].aN], [150, 2]);
  assert.equal(d.rom.rows[2].sides[0].aVal, null, "2차에 없는 무릎 굴곡은 비교 없이 선택 회차 값만");
  assert.deepEqual([d.zones[0].prev, d.zones[0].prevN], [49, 2]);
  assert.equal(d.zones[1].text, "5° 미만이 정상입니다. 2차 '관찰 필요' 구간에서 정상 범위로 들어왔습니다.");
  const f = d.photos.find((x) => x.key === "fhp|C|cva"); assert.deepEqual([f.aN, f.aVal, f.deltaTxt], [2, 49, "▲ 3°"]);
  assert.equal(d.history.rows[0].deltaTxt, "▲ 5점");
  assert.deepEqual(d.history.cols.map((c) => c.n), [1, 2, 3], "기록표 열은 전 회차 그대로");
  assert.doesNotMatch(d.note, /1차/); assert.match(d.note, /^두 번의 측정 동안/);
});

test("비교 기준: 없거나 모르는 키·선택 회차 자신이면 1차 (기존과 같음)", () => {
  const ref = doc3();
  [undefined, "없는키", "r3"].forEach((k) => {
    const d = docBase(k);
    assert.equal(d.base.n, 1); assert.equal(d.summary[0].deltaTxt, ref.summary[0].deltaTxt); assert.equal(d.note, ref.note);
  });
});

test("비교 기준 2차: 나빠진 항목이 있으면 소견에 '2차보다'", () => {
  const S = S3.map((s) => s.key !== "r3" ? s : Object.assign({}, s, { roms: s.roms.map((r) => r.move === "cva" ? Object.assign({}, r, { value: 48 }) : r) }));
  const d = RM.buildReportDoc({ tl: TL.buildTimeline(S, CATALOG, J), body: BODY3, J, baseKey: "r2" });
  assert.match(d.note, /^2차보다 좋아진 항목은 /); assert.match(d.note, /나빠진 항목은 거북목 각도입니다/);
});

test("07 기록표: 회차 열 + 항목 행 + 1차→선택 회차 변화", () => {
  const h = doc3().history;
  assert.deepEqual(h.cols.map((c) => c.n), [1, 2, 3]);
  assert.deepEqual(h.rows.map((r) => r.label), ["체형 정렬 점수", "거북목 CVA", "척추 균형 ATR", "어깨 굴곡 (좌)", "어깨 굴곡 (우)", "어깨 외전 (좌)", "무릎 굴곡 (좌)"]);
  assert.deepEqual(h.rows[6].txt, ["110°", "–", "128°"]);
  assert.equal(h.rows[2].deltaTxt, "▼ 4°"); assert.equal(h.rows[2].better, true);
  assert.equal(h.rows[0].deltaTxt, "▲ 16점");
});

test("숫자 표기: 소수는 한 자리, .0 은 뗀다", () => {
  assert.equal(RM.fmtNum(6.14), "6.1"); assert.equal(RM.fmtNum(4.0), "4"); assert.equal(RM.fmtNum(0.85), "0.9");
});
