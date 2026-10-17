// v291 같은 날 1차·2차 측정을 '측정 비우기' 한 뒤 다시 측정하면 1차 ROM 이 2차로 붙던 문제
// index.html 의 poseRounds·mbBuildSessions 를 그대로 꺼내 실행 (가짜 데이터: 홍길동)
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
vm.runInContext(grab("  function fmtDate(ts){", "\n  }\n") + "\n  }\n", ctx);
vm.runInContext(grab("  function romGrpOf(jk){", "\n") + "\n", ctx);
vm.runInContext(grab("  function poseRounds(rs){", "  function sessRndTxt("), ctx);
vm.runInContext(grab("  function mbDay(t){", "  function mbRomInfo("), ctx);
const poseRounds = vm.runInContext("poseRounds", ctx);
const build = vm.runInContext("mbBuildSessions", ctx);

const D = (h, m) => new Date(2026, 9, 15, h, m || 0).getTime();   // 2026.10.15
const body = (id, at, o) => Object.assign({ id, memberId: "m-hong", at, score: 70, f: [{ key: "x" }], sd: [{ key: "y" }] }, o || {});
const wiped = (id, at, o) => body(id, at, Object.assign({ score: null, f: null, sd: null, wipedAt: D(20) }, o || {}));
const rom = (id, joint, round, at) => ({ id, memberId: "m-hong", joint, side: "L", move: "flex", round, at, value: 100 });
const ROMS = [rom("r1a", "shoulder", 1, D(10, 5)), rom("s1", "scol", 1, D(10, 8)), rom("f1", "fhp", 1, D(10, 12)),
              rom("r2a", "shoulder", 2, D(15, 5)), rom("s2", "scol", 2, D(15, 8)), rom("f2", "fhp", 2, D(15, 12))];
const byKey = (S) => JSON.parse(JSON.stringify(Object.fromEntries(S.map((s) => [s.key, s.roms.map((x) => x.id).sort()]))));   // 다른 실행 공간(vm)의 배열이라 글자로 바꿔 비교
const plain = (o) => JSON.parse(JSON.stringify(o));

test("비운 체형 기록도 저장된 회차 번호(rf·rs)를 인정한다", () => {
  const PR = poseRounds([wiped("b1", D(10), { rf: 1, rs: 1 }), wiped("b2", D(15), { rf: 2, rs: 2 })]);
  assert.deepEqual([PR.b1.f, PR.b1.s, PR.b2.f, PR.b2.s], [1, 1, 2, 2]);
  assert.deepEqual(plain(PR._next), { f: 3, s: 3 }, "새 측정은 3차여야 한다 (1차를 다시 쓰면 안 됨)");
});

test("두 기록을 비운 뒤 2차만 다시 측정해도 1차 ROM 은 1차에 붙는다", () => {
  const rs = [wiped("b1", D(10), { rf: 1, rs: 1 }), body("b2", D(15), { rf: 2, rs: 2, score: 80 })];
  const S = byKey(build(rs, ROMS));
  assert.deepEqual(S.b1, ["f1", "r1a", "s1"]);
  assert.deepEqual(S.b2, ["f2", "r2a", "s2"]);
});

test("예전 앱이 2차 기록에 1차 번호(rf 1)를 덮어쓴 데이터도 바르게 묶고, 2차 번호로 고쳐 센다", () => {
  const rs = [wiped("b1", D(10), { rf: 1, rs: 1 }), body("b2", D(15), { rf: 1, rs: 1, score: 80 })];
  const PR = poseRounds(rs);
  assert.deepEqual([PR.b1.f, PR.b2.f, PR.b2.s], [1, 2, 2], "같은 번호가 겹치면 나중 기록을 다음 번호로");
  assert.deepEqual(plain(PR._next), { f: 3, s: 3 });
  const S = byKey(build(rs, ROMS));
  assert.deepEqual(S.b1, ["f1", "r1a", "s1"]);
  assert.deepEqual(S.b2, ["f2", "r2a", "s2"]);
});

test("회차 번호가 없는 예전 기록은 지금처럼 날짜 순으로 센다", () => {
  const PR = poseRounds([body("a", D(9)), body("b", D(11)), body("c", D(12), { sd: null })]);
  assert.deepEqual([PR.a.f, PR.b.f, PR.c.f, PR.a.s, PR.b.s, PR.c.s], [1, 2, 3, 1, 2, null]);
});

test("정면만 찍은 기록은 측면 회차가 없다 (비운 뒤에도)", () => {
  const PR = poseRounds([wiped("a", D(9), { rf: 1 })]);
  assert.equal(PR.a.f, 1);
  assert.equal(PR.a.s, null);
});

test("이전 기록에 측면만 나중에 추가해 정면·측면 번호가 엇갈려도 저장된 번호를 바꾸지 않는다 (v126)", () => {
  const PR = poseRounds([body("a", D(9), { rf: 1, rs: 2 }), body("b", D(11), { rf: 2, rs: 1 })]);
  assert.deepEqual([PR.a.f, PR.a.s, PR.b.f, PR.b.s], [1, 2, 2, 1]);
});

test("겹친 번호 뒤에 저장된 기록도 시간 순서대로 이어 센다 (예전 앱이 만든 번호)", () => {
  // 1차 비움(rf1) → 2차를 다시 재며 rf1 로 덮어씀 → 그 뒤 새 3차는 _next=2 를 받음
  const PR = poseRounds([wiped("b1", D(9), { rf: 1, rs: 1 }), body("b2", D(11), { rf: 1, rs: 1 }), body("b3", D(13), { rf: 2, rs: 2 })]);
  assert.deepEqual([PR.b1.f, PR.b2.f, PR.b3.f], [1, 2, 3]);
  assert.deepEqual([PR.b1.s, PR.b2.s, PR.b3.s], [1, 2, 3]);
});

// v296 1차에 잰 체형분석이 3차로 밀리던 문제
//  다시 저장할 때 정면이 미완성이면 정면 회차 번호(rf)가 지워졌고(v291 보호는 비운 기록에만),
//  나중에 정면을 다시 저장하자 '다음 회차' 번호(3)를 받아 1차가 비고 3차가 됐다
test("1차 기록이 맨 뒤 번호(3)를 받아 1차가 비면, 그 사이 번호가 모두 나중 기록일 때 1차로 되돌려 센다", () => {
  const rs = [body("b1", D(9), { rf: 3, rs: 1, score: 81 }), wiped("b2", D(15), { rf: 2, rs: 2 })];
  const PR = poseRounds(rs);
  assert.deepEqual([PR.b1.f, PR.b2.f, PR.b1.s, PR.b2.s], [1, 2, 1, 2]);
  assert.deepEqual(plain(PR._next), { f: 3, s: 3 }, "다음 측정은 3차");
  const S = byKey(build(rs, ROMS));
  assert.deepEqual(S.b1, ["f1", "r1a", "s1"], "1차 ROM 은 1차 체형분석과 함께");
});

test("정면·측면 모두 3으로 밀린 기록도 1차로 되돌린다", () => {
  const PR = poseRounds([body("b1", D(9), { rf: 3, rs: 3 }), wiped("b2", D(15), { rf: 2, rs: 2 })]);
  assert.deepEqual([PR.b1.f, PR.b1.s, PR.b2.f, PR.b2.s], [1, 1, 2, 2]);
});

test("중간 회차를 지워 생긴 빈 번호는 그대로 둔다 (번호가 시간 순서대로면 당기지 않음)", () => {
  const PR = poseRounds([body("a", D(9), { rf: 1, rs: 1 }), body("c", D(13), { rf: 3, rs: 3 })]);
  assert.deepEqual([PR.a.f, PR.c.f, PR.a.s, PR.c.s], [1, 3, 1, 3]);
  assert.deepEqual(plain(PR._next), { f: 4, s: 4 });
});

test("빈 번호 사이에 이 기록보다 먼저 잰 기록이 있으면 당기지 않는다", () => {
  // 1차를 지운 회원: 2차(9시) · 3차(13시) 는 시간 순서가 맞으므로 그대로
  const PR = poseRounds([body("b", D(9), { rf: 2 }), body("c", D(13), { rf: 3 })]);
  assert.deepEqual([PR.b.f, PR.c.f], [2, 3]);
});

test("당겨진 기록을 다시 저장하기 전에 새로 잰 3차는 3차로 남는다 (겹침으로 4차가 되지 않음)", () => {
  // 1차 기록은 아직 저장 번호가 3, 새 측정은 화면에 보인 '다음 3차' 로 rf 3 저장
  const PR = poseRounds([body("b1", D(9), { rf: 3, rs: 1 }), wiped("b2", D(11), { rf: 2, rs: 2 }), body("n", D(15), { rf: 3, rs: 3 })]);
  assert.deepEqual([PR.b1.f, PR.b2.f, PR.n.f], [1, 2, 3]);
  assert.deepEqual([PR.b1.s, PR.b2.s, PR.n.s], [1, 2, 3]);
  assert.deepEqual(plain(PR._next), { f: 4, s: 4 });
});

test("밀린 기록이 둘이어도 빈 번호 없이 당긴다", () => {
  const PR = poseRounds([body("a", D(9), { rf: 3 }), body("b", D(11), { rf: 4 }), body("c", D(13), { rf: 2 })]);
  assert.deepEqual([PR.a.f, PR.b.f, PR.c.f], [1, 3, 2], "가장 먼저 잰 a 가 1차, a 가 비운 3을 b 가 이어 씀 (c 의 저장 번호 2는 그대로)");
  assert.equal(PR._next.f, 4, "빈 번호 없이 다음은 4차");
});

// keepRounds: saveMeasurement 가 기록을 새로 만들어 저장할 때 이번에 저장하지 않은 쪽의 회차 번호를 이어받음
const keepRounds = vm.runInContext("keepRounds", ctx);
test("다시 저장할 때 정면이 빠져도 정면 회차 번호(rf)는 남는다", () => {
  const rec = keepRounds({ id: "b1", f: null, sd: [1], rs: 1 }, { id: "b1", rf: 1, rs: 1 }, { f: 1, s: 1 });
  assert.equal(rec.rf, 1);
  assert.equal(rec.rs, 1);
});
test("이번에 저장하는 쪽 번호는 덮어쓰지 않는다", () => {
  const rec = keepRounds({ id: "b1", f: [1], rf: 2, sd: null }, { id: "b1", rf: 1, rs: 1 }, { f: 1, s: 1 });
  assert.equal(rec.rf, 2);
  assert.equal(rec.rs, 1);
});
test("계산된 번호(겹침을 바로잡은 값)를 저장된 번호보다 먼저 쓴다", () => {
  const rec = keepRounds({ id: "b2", f: [1], rf: 2, sd: null }, { id: "b2", rf: 1, rs: 1 }, { f: 2, s: 2 });
  assert.equal(rec.rs, 2);
});
test("새 기록(옛 기록 없음)은 그대로", () => {
  const rec = keepRounds({ id: "n", f: [1], rf: 3, sd: null }, null, null);
  assert.equal(rec.rf, 3);
  assert.equal(rec.rs, undefined);
});
