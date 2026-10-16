// v274 측정 비우기 — 사진은 남기고 측정 결과만 비우는지 (index.html 의 함수를 그대로 꺼내 실행)
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
vm.runInContext(grab("  function wipeBodyPhotos(ph){", "  function wipeFresh(){"), ctx);
const wipePhotos = vm.runInContext("wipeBodyPhotos", ctx);
const wipeBody = vm.runInContext("wipeBodyRec", ctx);
const wipeRom = vm.runInContext("wipeRomRec", ctx);

const bodyPhotos = () => ({
  front: { img: "data:image/jpeg;base64,FRONT", w: 900, h: 1200, points: { ear: { x: 10, y: 20 }, sh: { x: 30, y: 40 } } },
  side: { img: "data:image/jpeg;base64,SIDE", w: 900, h: 1200, points: { ear: { x: 11, y: 21 } } },
});

test("체형분석: 사진은 그대로 두고 측정점만 비운다", () => {
  const r = wipePhotos(bodyPhotos());
  assert.equal(r.n, 2, "앞·옆 두 장 모두 처리");
  for (const m of ["front", "side"]) {
    assert.equal(r.v[m].img.startsWith("data:image/jpeg"), true, m + " 사진이 사라짐");
    assert.equal(r.v[m].w, 900);
    assert.equal(r.v[m].h, 1200);
    assert.deepEqual(Object.keys(r.v[m].points), [], m + " 측정점이 남음");
  }
});

test("체형분석: 원래 사진 묶음을 바꾸지 않는다 (복사본을 돌려준다)", () => {
  const src = bodyPhotos();
  wipePhotos(src);
  assert.equal(Object.keys(src.front.points).length, 2, "원본이 바뀌면 되돌릴 수 없다");
});

test("체형분석: 이미 비어 있으면 건드릴 것이 없다고 알린다", () => {
  const r = wipePhotos({ front: { img: "A", points: {} }, side: null });
  assert.equal(r.n, 0);
  assert.equal(r.v.front.img, "A");
});

test("체형분석 기록: 점수·판정만 비우고 회원·날짜·키는 남는다", () => {
  const rec = { id: "r1", memberId: "m1", at: 1700000000000, height: 170, score: 82,
    f: { tilt: 3 }, sd: { fhp: 51 }, groups: [{ name: "어깨" }], thumbs: { front: "T1" }, blob: true, blobAt: 99 };
  const c = wipeBody(rec);
  assert.equal(c.id, "r1"); assert.equal(c.memberId, "m1"); assert.equal(c.at, 1700000000000);
  assert.equal(c.height, 170, "키는 측정 결과가 아니라 입력값이라 남아야 함");
  assert.equal(c.blob, true); assert.equal(c.blobAt, 99, "사진 연결 정보는 유지");
  assert.equal(c.score, null); assert.equal(c.f, null); assert.equal(c.sd, null);
  assert.equal(c.groups.length, 0); assert.equal(c.thumbs, null);   // vm 안에서 만든 배열이라 길이로 비교
  assert.ok(c.wipedAt > 0, "언제 비웠는지 남긴다");
  assert.equal(rec.score, 82, "원본 기록을 직접 바꾸지 않는다");
});

test("ROM 기록: 점·각도만 비우고 사진과 촬영 정보는 남는다", () => {
  const rec = { id: "k1", memberId: "m1", at: 1700000000000, joint: "ankle", move: "plantar", side: "R",
    img: "data:image/jpeg;base64,PHOTO", imgK: 0.57, roll: -1.2, pts: [{ x: 1, y: 2 }], value: 47, pct: 94, refCustom: { a: 1 } };
  const c = wipeRom(rec);
  assert.equal(c.img.startsWith("data:image/jpeg"), true, "사진이 사라짐");
  assert.equal(c.imgK, 0.57); assert.equal(c.roll, -1.2, "기울기 보정은 사진에 딸린 값이라 유지");
  assert.equal(c.joint, "ankle"); assert.equal(c.move, "plantar"); assert.equal(c.side, "R");
  assert.equal(c.pts, null); assert.equal(c.value, null); assert.equal(c.pct, null); assert.equal(c.refCustom, null);
  assert.equal(rec.value, 47, "원본 기록을 직접 바꾸지 않는다");
});

test("사진 묶음이 없으면 null (사진 없는 예전 기록은 건너뛴다)", () => {
  assert.equal(wipePhotos(null), null);
  assert.equal(wipePhotos("문자열"), null);
});
