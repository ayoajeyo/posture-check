// 리포트 "한눈에 보기" — js/logic/report-timeline.js (가짜 데이터: 홍길동)
const test = require("node:test");
const assert = require("node:assert/strict");
const J = require("../js/logic/judge.js");
const TL = require("../js/logic/report-timeline.js");

// index.html 의 ROM_ALL 과 같은 모양의 작은 카탈로그
const CATALOG = [
  { k: "shoulder", n: "어깨", moves: [{ k: "flex", n: "굴곡", normal: 180 }, { k: "abd", n: "외전", normal: 180 }] },
  { k: "elbow", n: "팔꿈치", moves: [{ k: "flex", n: "굴곡", normal: 150 }, { k: "ext", n: "신전", normal: 0 }] },
  { k: "ankle", n: "발목", moves: [{ k: "dorsi", n: "배측굴곡", normal: 20 }] },
  { k: "scol", n: "척추 균형", single: true, moves: [{ k: "atr", n: "척추 균형", grade: "atr" }] },
  { k: "fhp", n: "거북목", single: true, moves: [{ k: "cva", n: "거북목", grade: "cva" }] },
];
const T0 = Date.parse("2026-07-03T10:00:00+09:00"), DAY = 86400000;
const rom = (joint, side, move, value, at) => ({ joint, side, move, value, at });
const bodyRec = (score, extra) => Object.assign({ score, f: [{ key: "shoulder", title: "어깨 기울기", value: "1.2°", cls: "g-warn" }], sd: [{ key: "fhp", title: "머리 전방", value: "4.1cm", cls: "g-crit" }] }, extra || {});
// mbBuildSessions 결과와 같은 모양 (내림차순으로 줘도 함수가 정렬한다)
const sess = (key, dayOff, rec, roms) => ({ key, at: T0 + dayOff * DAY, day: "2026-07-" + String(3 + dayOff).padStart(2, "0"), rec, roms: roms || [] });

// ① 체형 3회차 · ROM 2회차(2차엔 ROM 없음) · 거북목·척추는 1·3차만
const S1 = [
  sess("c", 56, bodyRec(69), [rom("shoulder", "L", "flex", 145, T0 + 56 * DAY), rom("fhp", "C", "cva", 51, T0 + 56 * DAY), rom("scol", "C", "atr", 6.1, T0 + 56 * DAY)]),
  sess("b", 28, bodyRec(63), []),
  sess("a", 0, bodyRec(58), [rom("shoulder", "L", "flex", 128, T0), rom("shoulder", "R", "flex", 140, T0), rom("fhp", "C", "cva", 46, T0), rom("scol", "C", "atr", 8.2, T0)]),
];

test("회차는 시간 오름차순 1차부터 번호가 붙고 날짜는 점 표기", () => {
  const tl = TL.buildTimeline(S1, CATALOG, J);
  assert.deepEqual(tl.rounds.map((r) => r.n), [1, 2, 3]);
  assert.deepEqual(tl.rounds.map((r) => r.key), ["a", "b", "c"]);
  assert.equal(tl.rounds[0].day, "2026.07.03");
});

test("회차마다 한 칸 — 없는 회차는 null (0 이 아님)", () => {
  const tl = TL.buildTimeline(S1, CATALOG, J);
  assert.deepEqual(tl.score, [58, 63, 69]);
  assert.deepEqual(tl.cva, [46, null, 51]);
  assert.deepEqual(tl.atr, [8.2, null, 6.1]);
  assert.deepEqual(tl.rom["shoulder|L|flex"].vals, [128, null, 145]);
  assert.deepEqual(tl.rom["shoulder|R|flex"].vals, [140, null, null], "3차에 우측을 안 쟀으면 null");
});

test("판정은 주입한 함수로 — 점수·거북목·척추·ROM 칸 색이 judge.js 와 같다", () => {
  const tl = TL.buildTimeline(S1, CATALOG, J);
  assert.deepEqual(tl.scoreCls, ["crit", "warn", "warn"]);
  assert.deepEqual(tl.cvaCls, ["crit", null, "warn"]);
  assert.deepEqual(tl.atrCls, ["crit", null, "warn"]);
  assert.equal(tl.rom["shoulder|L|flex"].cls[0], TL.normCls(J.romJudge({ normal: 180 }, 128).cls));
  assert.equal(tl.rom["shoulder|L|flex"].pct[0], 71);
});

test("② 비운 기록(score null)은 빈 칸 — 선이 끊긴다", () => {
  const S = [sess("a", 0, bodyRec(58)), sess("b", 28, { score: null, f: null, sd: null }), sess("c", 56, bodyRec(69))];
  const tl = TL.buildTimeline(S, CATALOG, J);
  assert.deepEqual(tl.score, [58, null, 69]);
  assert.equal(tl.scoreCls[1], null);
});

test("③ 거북목만 있는 날(체형 기록 없음)도 한 회차", () => {
  const S = [sess("a", 0, bodyRec(58)), sess("d:x", 10, null, [rom("fhp", "C", "cva", 48, T0 + 10 * DAY)])];
  const tl = TL.buildTimeline(S, CATALOG, J);
  assert.equal(tl.rounds.length, 2);
  assert.deepEqual(tl.score, [58, null]);
  assert.deepEqual(tl.cva, [null, 48]);
});

test("④ 한 회차에 같은 항목을 두 번 쟀으면 나중 것", () => {
  const S = [sess("a", 0, bodyRec(58), [rom("shoulder", "L", "flex", 120, T0), rom("shoulder", "L", "flex", 131, T0 + 600000)])];
  const tl = TL.buildTimeline(S, CATALOG, J);
  assert.deepEqual(tl.rom["shoulder|L|flex"].vals, [131]);
});

test("⑤ 선택한 회차까지만 자른다 (3차를 공유하면 4·5차가 섞이지 않게)", () => {
  const S = S1.concat([sess("d", 84, bodyRec(74)), sess("e", 112, bodyRec(79))]);
  const tl = TL.buildTimeline(S, CATALOG, J, { uptoKey: "c" });
  assert.equal(tl.rounds.length, 3);
  assert.deepEqual(tl.score, [58, 63, 69]);
  const all = TL.buildTimeline(S, CATALOG, J);
  assert.equal(all.rounds.length, 5);
});

test("ROM 평균: 측정한 항목(좌·우 별개)의 정상 대비 % 평균, 100 상한, 항목 수 포함", () => {
  const roms = [rom("shoulder", "L", "flex", 90, T0), rom("shoulder", "R", "flex", 200, T0), rom("fhp", "C", "cva", 46, T0), rom("scol", "C", "atr", 8, T0)];
  const a = TL.romAvgPct(roms, CATALOG, J.romJudge);
  assert.equal(a.n, 2, "거북목·척추 균형은 평균에서 제외");
  assert.equal(a.pct, 75, "(50 + 100 상한) / 2");
  assert.equal(TL.romAvgPct([], CATALOG, J.romJudge), null);
  assert.equal(TL.romAvgPct([rom("fhp", "C", "cva", 46, T0)], CATALOG, J.romJudge), null);
});

test("ROM 평균: 신전(정상 0°)은 romJudge 의 % 를 그대로 쓴다", () => {
  const a = TL.romAvgPct([rom("elbow", "L", "ext", 15, T0), rom("elbow", "L", "flex", 150, T0)], CATALOG, J.romJudge);
  assert.equal(a.pct, 75, "(50 + 100) / 2 — 신전 15° 부족 = 50%");
});

test("ROM 평균 판정 경계는 romJudge 와 같다 (90 양호 · 70 주의)", () => {
  assert.equal(TL.romAvgCls(90), "good"); assert.equal(TL.romAvgCls(89), "warn");
  assert.equal(TL.romAvgCls(70), "warn"); assert.equal(TL.romAvgCls(69), "crit");
  assert.equal(TL.romAvgCls(null), "");
});

test("KPI 4개: 최근값·1차 대비 변화·좋아진 방향 (척추 균형은 낮을수록 좋음)", () => {
  const k = TL.kpiOf(TL.buildTimeline(S1, CATALOG, J), J);
  assert.deepEqual(k.map((x) => x.k), ["score", "cva", "atr", "romAvg"]);
  assert.equal(k[0].latest, 69); assert.equal(k[0].delta, 11); assert.equal(k[0].better, true); assert.equal(k[0].judge, "주의");
  assert.equal(k[1].latest, 51); assert.equal(k[1].delta, 5); assert.equal(k[1].better, true);
  assert.equal(k[2].latest, 6.1); assert.equal(k[2].delta, -2.1); assert.equal(k[2].better, true, "ATR 이 줄면 좋아진 것");
  assert.equal(k[3].latest, 81, "3차 ROM 평균 = 어깨 굴곡 좌 145/180");
  assert.equal(k[3].n, 1);
});

test("KPI: 1차가 비어 있으면 값이 있는 첫 회차 대비 (baseN 으로 '2차 대비' 표시)", () => {
  const S = [sess("a", 0, { score: null }, []), sess("b", 28, bodyRec(63)), sess("c", 56, bodyRec(69))];
  const k = TL.kpiOf(TL.buildTimeline(S, CATALOG, J), J)[0];
  assert.equal(k.baseN, 2); assert.equal(k.delta, 6);
});

test("KPI: 회차가 하나면 변화 없이 값·판정만 (single)", () => {
  const k = TL.kpiOf(TL.buildTimeline([S1[2]], CATALOG, J), J);
  assert.equal(k[0].single, true); assert.equal(k[0].delta, null); assert.equal(k[0].latest, 58);
  assert.equal(k[3].latest, 75, "1차 ROM 평균 = (71 + 78) / 2 = 74.5 → 반올림 75");
  assert.equal(k[3].judge, "주의");
});

test("KPI: 값이 하나도 없으면 미측정", () => {
  const S = [sess("a", 0, null, [rom("fhp", "C", "cva", 46, T0)])];
  const k = TL.kpiOf(TL.buildTimeline(S, CATALOG, J), J);
  assert.equal(k[0].latest, null); assert.equal(k[0].judge, "미측정");
  assert.equal(k[3].n, 0); assert.equal(k[3].sub, "ROM 측정 없음");
});

test("상태표: 회차 5개 이하는 전부, 6개 이상은 1차 + 최근 4차", () => {
  const S6 = [0, 1, 2, 3, 4, 5].map((i) => sess("k" + i, i * 28, bodyRec(58 + i * 4)));
  const r5 = TL.statusRows(TL.buildTimeline(S6.slice(0, 5), CATALOG, J));
  assert.deepEqual(r5.cols, [0, 1, 2, 3, 4]); assert.equal(r5.gap, false);
  const r6 = TL.statusRows(TL.buildTimeline(S6, CATALOG, J));
  assert.deepEqual(r6.cols, [0, 2, 3, 4, 5]); assert.equal(r6.gap, true);
});

test("상태표: 행은 점수·거북목·척추·ROM(정해진 순서) · 칸은 값+단위+판정색 · 빈 행은 뺀다", () => {
  const r = TL.statusRows(TL.buildTimeline(S1, CATALOG, J));
  assert.deepEqual(r.rows.map((x) => x.label), ["종합 점수", "거북목 각도", "척추 균형", "어깨 굴곡 (좌)", "어깨 굴곡 (우)"]);
  assert.deepEqual(r.rows[0].cells[0], { txt: "58점", cls: "crit" });
  assert.equal(r.rows[1].cells[1], null);
  assert.deepEqual(r.rows[3].cells[2], { txt: "145°", cls: "warn" });
  const onlyRom = TL.statusRows(TL.buildTimeline([sess("a", 0, null, [rom("ankle", "L", "dorsi", 12, T0)])], CATALOG, J));
  assert.deepEqual(onlyRom.rows.map((x) => x.label), ["발목 배측굴곡 (좌)"], "ROM 만 잰 회원은 점수·거북목·척추 행이 없다");
});

test("상태표: 체형 세부 행은 detail 일 때만 (기본 숨김)", () => {
  const tl = TL.buildTimeline(S1, CATALOG, J);
  assert.equal(TL.statusRows(tl).rows.some((x) => x.body), false);
  const d = TL.statusRows(tl, { detail: true });
  const bodyRows = d.rows.filter((x) => x.body);
  assert.deepEqual(bodyRows.map((x) => x.label), ["어깨 기울기", "머리 전방"]);
  assert.deepEqual(bodyRows[0].cells[0], { txt: "1.2°", cls: "warn" });
});

test("아령 행: 최근 회차에 값이 있는 ROM 항목만 · 처음(있을 때만) → 최근 %", () => {
  const rows = TL.dumbbellRows(TL.buildTimeline(S1, CATALOG, J));
  assert.equal(rows.length, 1, "어깨 굴곡 우측은 3차에 없으므로 제외");
  assert.equal(rows[0].label, "어깨 굴곡 (좌)");
  assert.equal(rows[0].a, 71); assert.equal(rows[0].aN, 1); assert.equal(rows[0].b, 81); assert.equal(rows[0].bN, 3);
  const one = TL.dumbbellRows(TL.buildTimeline([S1[2]], CATALOG, J));
  assert.equal(one[0].a, null, "회차가 하나면 점 하나");
});

test("아령 행: 가장 이른 측정이 2차면 2차 대비", () => {
  const S = [sess("a", 0, bodyRec(58), []), sess("b", 28, null, [rom("ankle", "L", "dorsi", 9, T0 + 28 * DAY)]), sess("c", 56, null, [rom("ankle", "L", "dorsi", 15, T0 + 56 * DAY)])];
  const rows = TL.dumbbellRows(TL.buildTimeline(S, CATALOG, J));
  assert.equal(rows[0].aN, 2); assert.equal(rows[0].a, 45); assert.equal(rows[0].b, 75);
});

test("normCls: st-good · g-good · good 모두 good", () => {
  for (const c of ["st-good", "g-good", "good"]) assert.equal(TL.normCls(c), "good");
  assert.equal(TL.normCls("st-crit"), "crit"); assert.equal(TL.normCls(""), ""); assert.equal(TL.normCls(undefined), "");
});

test("아령 행 better: 신전(정상 0°)은 각도가 줄어도 정상 대비 % 가 오르면 개선", () => {
  const S = [
    sess("a", 0, null, [rom("elbow", "R", "ext", 15, T0)]),
    sess("b", 1, null, [rom("elbow", "R", "ext", 5, T0 + 86400000)]),
  ];
  const rows = TL.dumbbellRows(TL.buildTimeline(S, CATALOG, J));
  const r = rows.find((x) => x.key === "elbow|R|ext");
  assert.ok(r, "신전 행이 있다");
  assert.equal(r.better, true, "15° → 5° 는 개선");
  const S2 = [
    sess("a", 0, null, [rom("shoulder", "L", "flex", 150, T0)]),
    sess("b", 1, null, [rom("shoulder", "L", "flex", 130, T0 + 86400000)]),
  ];
  assert.equal(TL.dumbbellRows(TL.buildTimeline(S2, CATALOG, J))[0].better, false, "굴곡 150° → 130° 는 악화");
  const S3 = [sess("a", 0, null, [rom("shoulder", "L", "flex", 150, T0)])];
  assert.equal(TL.dumbbellRows(TL.buildTimeline(S3, CATALOG, J))[0].better, null, "처음 값이 없으면 null");
});

test("상태표 행 제한: maxRows 를 넘으면 최근 회차에 있는 항목을 먼저 남긴다 (기본 14행)", () => {
  const old = [], recent = [];
  CATALOG.filter((Jt) => !Jt.single).forEach((Jt) => Jt.moves.forEach((m) => { old.push(rom(Jt.k, "L", m.k, 30, T0)); old.push(rom(Jt.k, "R", m.k, 30, T0)); }));   // 1차: 5동작 × 좌우 = 10항목
  recent.push(rom("ankle", "L", "dorsi", 15, T0 + 86400000), rom("ankle", "R", "dorsi", 15, T0 + 86400000));   // 2차: 발목 2항목만
  const tl = TL.buildTimeline([sess("a", 0, { score: 60 }, old), sess("b", 1, { score: 70 }, recent)], CATALOG, J);
  assert.equal(TL.statusRows(tl).rows.length, 11, "기본 14행 안이면 전부 (점수 1 + ROM 10 · 거북목·척추 행은 값이 없어 빠짐)");
  const st = TL.statusRows(tl, { maxRows: 8 });
  assert.equal(st.rows.length, 8, "빈 행을 뺀 뒤에 8행을 채운다");
  assert.ok(st.rows.some((r) => r.key === "ankle|L|dorsi") && st.rows.some((r) => r.key === "ankle|R|dorsi"), "최근 회차 항목(발목, 카탈로그 맨 뒤)은 반드시 포함");
  assert.deepEqual(st.rows.slice(1).map((r) => r.key), st.rows.slice(1).map((r) => r.key).slice().sort((a, b) => tl.rom[a].ord - tl.rom[b].ord), "남긴 행은 카탈로그 순서");
  assert.equal(TL.statusRows(tl, { maxRows: 100 }).rows.length, 11, "제한이 크면 전부");
});
