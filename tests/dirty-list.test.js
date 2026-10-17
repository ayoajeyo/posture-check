// v301 "저장하지 않은 측정이 있어요" 확인창에 무엇이 저장되지 않았는지 목록을 보여 준다
// index.html 의 sessDiffList 를 그대로 꺼내 실행 (가짜 값)
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
vm.runInContext(grab("  function sessDiffList(saved, now){", "\n  }\n") + "\n  }\n", ctx);
vm.runInContext(grab("  function sigKeep(saved, before, after, same){", "\n  }\n") + "\n  }\n", ctx);
const diff = (a, b) => JSON.parse(JSON.stringify(vm.runInContext("sessDiffList", ctx)(a, b)));

// sessSig 와 같은 모양: JSON [정면, 측면] + "|" + 키 · 한 쪽 = [사진 길이, 가로, 세로, 측정점[[이름,x,y]…], 회전×10, 중심선]
const side = (pts, rot, cx) => [1000, 800, 1200, pts || [["ear", 10, 20]], rot || 0, cx == null ? 400 : cx];
const sig = (f, s, ht) => JSON.stringify([f, s]) + "|" + (ht || "");

test("같으면 빈 목록", () => {
  assert.deepEqual(diff(sig(side(), null, "170"), sig(side(), null, "170")), []);
});

test("한 번도 저장하지 않았으면 사진이 있는 쪽을 알려 준다", () => {
  assert.deepEqual(diff(null, sig(side(), side(), "")), ["정면 사진·측정점 (아직 저장 안 함)", "측면 사진·측정점 (아직 저장 안 함)"]);
});

test("바뀐 것만 골라 알려 준다", () => {
  assert.deepEqual(diff(sig(side(), side(), "170"), sig(side([["ear", 11, 20]]), side(), "170")), ["정면 측정점 위치"]);
  assert.deepEqual(diff(sig(side(), null, "170"), sig(side(null, 5), null, "172")), ["정면 기울기 보정", "키 170 → 172cm"]);
  assert.deepEqual(diff(sig(side(), null, ""), sig(side(), side(), "")), ["측면 사진·측정점 (아직 저장 안 함)"]);
  assert.deepEqual(diff(sig(side(), null, ""), sig(side(null, 0, 410), null, "")), ["정면 중심선"]);
});

test("사진을 새로 바꿨으면 '사진' 으로", () => {
  const f2 = side(); f2[0] = 2000;
  assert.deepEqual(diff(sig(side(), null, ""), sig(f2, null, "")), ["정면 사진"]);
});

// v301 회원을 바꿀 때(setMember) 저장된 기록을 보던 중이었으면 '저장 안 됨' 으로 바꾸지 않는다
test("회원을 바꿔도 저장된 그대로였으면 깨끗한 상태 유지", () => {
  const keep = vm.runInContext("sigKeep", ctx);
  assert.equal(keep("S1", "S1", "S2"), "S2", "저장된 그대로 → 바뀐 지문(키 칸 등)을 새 기준으로");
  assert.equal(keep("S1", "S9", "S2"), null, "고친 게 있으면 그대로 '저장 안 됨'");
  assert.equal(keep(null, "S1", "S2"), null, "회원 없이 찍은 사진(한 번도 저장 안 함)은 '저장 안 됨'");
  assert.equal(keep("S1", null, null), null, "사진이 없으면 지문 없음");
  assert.equal(keep("[1]|170", "[1]|170", "[1]|172", true), "[1]|170", "같은 회원이면 키는 저장한 값 기준 → 키가 바뀌면 '저장 안 됨' 으로 보인다");
  assert.equal(keep("[1]|170", "[1]|170", "[1]|172", false), "[1]|172", "다른 회원으로 바꾸면 그 회원 키가 기준");
});
