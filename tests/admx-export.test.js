// 관리자 측정 수정 기록 엑셀 — index.html 의 함수를 그대로 꺼내 실행 (v265 같은 날 1·2차 엑셀 섞임·가짜 수정 전 재발 방지)
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
const ctx = {
  ROM_ALL: [{ k: "fhp", n: "거북목", moves: [{ k: "cva", n: "두개척추각(CVA)" }] }, { k: "neck", n: "목", moves: [{ k: "flex", n: "굴곡" }] }],
  ROM_GD: {}, admxBodyRegrid: () => Promise.resolve(),
};
vm.createContext(ctx);
vm.runInContext(grab("  var ADMX_LEG =", "  /* v202 엑셀 사진 보완") + grab("  function admxEdited(x){", "  function admxExport(){"), ctx);

const P = (x, y) => ({ x, y });
const rom = (o) => Object.assign({ kind: "rom", joint: "neck", move: "flex", side: "C", h: 1440 }, o);
const prep = (x) => vm.runInContext("admxPrep", ctx)([x]).then(() => x);

test("점을 옮기지 않았으면 사진은 '수정 전' 칸에만, 각도는 한 값", async () => {
  const x = await prep(rom({ before: { img: "B", pts: [P(1, 2), P(3, 4)], val: 33 }, after: { img: "A", pts: [P(1, 2), P(3, 4)], val: 33 } }));
  assert.equal(x.before.img, "B");
  assert.equal(x.after.img, null);
  const r = ctx.admxRow(x);
  assert.equal(r.k, "33° (수정 없음)");
  assert.equal(r.ia, "– (수정 없음)");
});

test("관리자 보관 자료가 없는 기록: 수정 전을 지어내지 않고 저장된 사진 1장만", async () => {
  const x = await prep(rom({ legacy: true, before: { pts: [P(5, 6)], none: true }, after: { img: "SAVED", pts: [P(5, 6)], val: 74 } }));
  assert.equal(x.before.img, "SAVED");
  assert.equal(x.after.img, null);
  const r = ctx.admxRow(x);
  assert.equal(r.k, "74°");                 // 수정했는지 모르므로 '수정 없음'이라고 단정하지 않음
  assert.equal(r.ia, "–");
  assert.match(r.h, /수정 여부 알 수 없음/);
  assert.doesNotMatch(r.h + r.k + r.ia, /수정 없음|다시 만든/);
});

test("실제로 점을 옮긴 기록만 수정 전·후 사진 둘 다", async () => {
  const x = await prep(rom({ joint: "fhp", move: "cva", before: { img: "B", pts: [P(10, 10), P(20, 20)], val: 52 }, after: { img: "A", pts: [P(10, 10), P(22, 20)], val: 53 } }));
  assert.equal(x.before.img, "B");
  assert.equal(x.after.img, "A");
  assert.equal(ctx.admxRow(x).k, "52° → 53°");
});

test("자동 인식 실패(손으로 찍음)는 '수정 없음'이라고 쓰지 않음", async () => {
  const x = await prep(rom({ before: { fail: true }, after: { img: "A", pts: [P(1, 1)], val: 40 } }));
  assert.equal(x.after.img, "A");
  const r = ctx.admxRow(x);
  assert.match(r.h, /자동 인식 실패/);
  assert.equal(r.ib, "–");                  // 수정 전 사진이 없으면 수정 전 좌표도 비움
});

test("엑셀 회차 선택은 회차 번호만 봄 — 같은 날 1차·2차 거북목이 섞이지 않음", () => {
  assert.match(html, /if\(selR !== "all"\) L = L\.filter\(function\(x\)\{ return String\(x\.round\) === selR; \}\);/);
  assert.doesNotMatch(grab("  function admxExport(){", "wb.creator"), /days\[day\(x\)\]/);
});

test("가짜 '수정 전'을 만들던 admxRomRegen 이 다시 생기지 않음", () => {
  assert.doesNotMatch(html, /admxRomRegen|regen: true/);
});

test("관리자 모드: 화면에 좌표를 띄우지 않고(창·점 옆 라벨), 엑셀용 좌표 저장은 유지", () => {
  assert.doesNotMatch(html, /admPanel|admCoord|admRender/);
  assert.match(html, /if\(ADM\.on\) admxSaveBody\(rec\)/);
  assert.match(html, /if\(ADM\.on\) admxSaveRom\(rec, val\)/);
  assert.match(html, /pts: admxRound\(romS\.pts\)/);                  // ROM 점 좌표 보관
  assert.match(html, /var pts = function\(\)\{ var o = \{\}; Object\.keys\(s\.points\)/);   // 체형분석 점 좌표 보관
});

// 발목 배측·저측굴곡 = 점 4개(1선 시작·끝, 2선 시작·끝) + 파란 보조선 — 엑셀 1선·2선 문구가 이 순서와 맞아야 함
ctx.ROM_ALL.push({ k: "ankle", n: "발목", moves: ["dorsi", "plantar"].map((k) => ({ k, n: k, kind: "aux" })) });
for (const move of ["dorsi", "plantar"]) {
  test("발목 " + move + ": 엑셀 1선·2선·각도축 문구와 좌표 이름표가 4점 방식과 맞음", async () => {
    const g = html.match(new RegExp('"ankle\\|' + move + '": (\\{.*?\\}),\\r?\\n'));
    assert.ok(g, "ROM_GD 발목 문구를 못 찾음");
    ctx.ROM_GD["ankle|" + move] = vm.runInContext("(" + g[1] + ")", ctx);
    const names = ["외측 복사뼈", "비골두", "발뒤꿈치(발바닥 면)", "제5 MTP(발바닥 면)"];
    const x = await prep(rom({ joint: "ankle", move, side: "R", names,
      before: { img: "B", pts: [P(1, 1), P(2, 2), P(3, 3), P(4, 4)], val: 10 }, after: { img: "A", pts: [P(1, 1), P(2, 2), P(3, 3), P(5, 4)], val: 12 } }));
    const r = ctx.admxRow(x);
    assert.match(r.e, /시작점\(외측 복사뼈\)/);              // 1선
    assert.match(r.e, /끝점\(비골두\)/);
    assert.doesNotMatch(r.e, /발뒤꿈치/);
    assert.match(r.f, /시작점\(발뒤꿈치/);                    // 2선
    assert.match(r.f, /끝점\(제5 MTP\)/);
    assert.doesNotMatch(r.f, /비골두|외측 복사뼈/);
    assert.match(r.g, /1선과 생성된 보조선/);                 // 각도축
    assert.doesNotMatch(r.e + r.f, /①선|②선/);               // 앱 안내용 괄호 설명은 엑셀에 안 넣음
    for (const lab of ["1선 시작점(외측 복사뼈)", "1선 끝점(비골두)", "2선 시작점(발뒤꿈치", "2선 끝점(제5 MTP"]) {
      assert.ok(r.ib.includes(lab) && r.ia.includes(lab), "좌표 이름표 없음: " + lab);
    }
    assert.doesNotMatch(r.ib + r.ia, /점4|각도축\(|2선 끝점\(비골두/);
    assert.doesNotMatch(r.ib + r.ia, /\([^)]*\(/);          // 좌표 이름표에 괄호가 겹치지 않음
    assert.ok(r.ib.includes("2선 시작점(발뒤꿈치 · 발바닥 면)") && r.ib.includes("2선 끝점(제5 MTP · 발바닥 면)"));
  });
}
