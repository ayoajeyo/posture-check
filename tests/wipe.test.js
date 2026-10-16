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
vm.runInContext(grab("  function wipeBodyPhotos(ph){", "  var wipeN = null, wipeBusy = false;"), ctx);
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

test("ROM 기록: 각도·선이 그려진 결과 그림(thumb)도 비운다 — 옛 측정 그림이 남으면 안 됨", () => {
  const c = wipeRom({ id: "k2", img: "data:image/jpeg;base64,PHOTO", thumb: "data:image/jpeg;base64,OLDDRAWING", value: 51, pts: [{ x: 1, y: 2 }] });
  assert.equal(c.thumb, null);
  assert.equal(c.img.startsWith("data:image/jpeg"), true, "원본 사진은 남아야 한다");
});

test("사진 묶음이 없으면 null (사진 없는 예전 기록은 건너뛴다)", () => {
  assert.equal(wipePhotos(null), null);
  assert.equal(wipePhotos("문자열"), null);
});

// v277 "비웠는데 그대로" 를 눈으로 확인하는 남은 기록 세기
const leftRec = vm.runInContext("wipeRecLeft", ctx);
const leftRom = vm.runInContext("wipeRomTodo", ctx);
const noPicRom = vm.runInContext("wipeRomNoPic", ctx);
const leftCnt = vm.runInContext("wipeLeftCount", ctx);

test("남은 기록 세기: 비우기 전 기록은 '남았다'고 센다", () => {
  assert.equal(leftRec({ score: 82 }), true);
  assert.equal(leftRec({ score: null, f: { tilt: 3 } }), true, "점수만 지워도 판정값이 남으면 남은 것");
  assert.equal(leftRec({ score: null, sd: { fhp: 51 } }), true);
  assert.equal(leftRec({ score: null, groups: [{ name: "어깨" }] }), true);
  assert.equal(leftRec({ score: null, thumbs: { front: "T" } }), true, "측정선 썸네일이 남으면 남은 것");
  assert.equal(leftRom({ value: 47, blob: true }), true);
  assert.equal(leftRom({ value: null, pts: [{ x: 1, y: 2 }], img: "data:..." }), true);
});

test("남은 기록 세기: 비운 기록은 '남지 않았다'고 센다", () => {
  assert.equal(leftRec(wipeBody({ id: "r1", score: 82, f: { a: 1 }, sd: { b: 2 }, groups: [{}], thumbs: { front: "T" } })), false);
  assert.equal(leftRom(wipeRom({ id: "k1", blob: true, value: 47, pts: [{ x: 1, y: 2 }], pct: 94, thumb: "T" })), false);
  assert.equal(leftRec(null), false);
  assert.equal(leftRom(undefined), false);
});

test("남은 기록 세기: 전체 건수도 같이 알려 준다 (기기에 기록이 없을 때 구분용)", () => {
  const n = leftCnt(
    [{ score: 82 }, { score: null, wipedAt: 1 }, { score: null, thumbs: { front: "T" } }],
    [{ value: 47, blob: true }, { value: null, pts: null, blob: true }],
    ["admx:roms:a", "admx:records:b"]
  );
  assert.equal(n.rec, 2); assert.equal(n.rom, 1); assert.equal(n.admx, 2);
  assert.equal(n.recAll, 3); assert.equal(n.romAll, 2);
});

test("남은 기록 세기: 기기에 기록이 하나도 없으면 전부 0 (동기화 전 상태를 구분할 수 있다)", () => {
  const n = leftCnt([], [], []);
  assert.equal(n.rec + n.rom + n.admx, 0);
  assert.equal(n.recAll, 0); assert.equal(n.romAll, 0);
});

// v277 🔴 회귀: 세는 기준과 비우는 기준이 갈리면 남은 건수가 영원히 0 이 되지 않는다
// (index.html 의 '사진 없는 예전 회차 각도만 수정' 경로가 delete upd.img 로 value 만 있는 행을 만든다)
test("사진 없는 ROM 기록은 '남은 건수' 에 들어가지 않는다 — 비우기 대상이 아니므로", () => {
  const noPic = { id: "k9", joint: "ankle", move: "plantar", value: 47 };   // img·blob 없음
  assert.equal(leftRom(noPic), false, "비울 수 없는 기록을 '남았다'고 세면 단추가 영원히 안 잠긴다");
  assert.equal(noPicRom(noPic), true, "대신 '사진이 없어 못 비움' 으로 따로 센다");
  const n = leftCnt([], [noPic, { value: 30, blob: true }], []);
  assert.equal(n.rom, 1); assert.equal(n.noPic, 1);
  assert.equal(n.rec + n.rom + n.admx, 1, "잠금 기준에 사진 없는 기록이 섞이지 않는다");
});

test("사진 없는 ROM 기록만 남으면 남은 건수 0 → 단추가 잠긴다", () => {
  const n = leftCnt([], [{ value: 47 }, { value: 51 }], []);
  assert.equal(n.rec + n.rom + n.admx, 0);
  assert.equal(n.noPic, 2);
  assert.equal(n.romAll, 2);
});

test("사진은 있고 값이 비어 있으면 양쪽 모두 0 (이미 비운 기록)", () => {
  const n = leftCnt([], [{ blob: true, value: null, pts: null }], []);
  assert.equal(n.rom, 0); assert.equal(n.noPic, 0);
});
