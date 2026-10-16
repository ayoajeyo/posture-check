/* 거북목(CVA)·척추 균형(ATR)·기울기 판정 — 화면을 모르는 순수 함수 (테스트: tests/judge.test.js)
   브라우저: index.html 이 먼저 불러와 window.AYO_LOGIC 으로 씀 · Node: require 로 씀 */
(function(root){
  function scolJudge(mv, v){
    if(v == null) return { cls:"", txt:"미측정", pct:0 };
    if(mv.grade === "cva") return v >= 55 ? { cls:"good", txt:"정상 범위 (55° 이상)", pct:100 } : v >= 50 ? { cls:"warn", txt:"경계 (50–55°) · 목이 조금 앞으로 나와 있어요", pct:70 } : v >= 45 ? { cls:"crit", txt:"목이 앞으로 많이 나와 있어요 (50° 미만)", pct:45 } : { cls:"crit", txt:"목이 앞으로 매우 많이 나와 있어요 (45° 미만) · 전문가와 상담해 보세요", pct:25 };
    if(mv.grade === "atr") return v < 5 ? { cls:"good", txt:"정상 범위 (5° 미만)", pct:100 } : v < 7 ? { cls:"warn", txt:"관찰 필요 (5–7°) · 정기 재측정 권장", pct:60 } : { cls:"crit", txt:"7° 이상 · 전문가와 상담해 보세요", pct:30 };
    return v < 10 ? { cls:"good", txt:"정상 범위 (10° 미만)", pct:100 } : v < 25 ? { cls:"warn", txt:"기울기 약간 (10–25°)", pct:60 } : v < 40 ? { cls:"crit", txt:"기울기 큼 (25–40°) · 전문가와 상담해 보세요", pct:35 } : { cls:"crit", txt:"40° 이상 · 전문가와 상담해 보세요", pct:15 };
  }
  /* ROM 판정 — mv.grade 가 있으면(거북목·척추 균형) scolJudge 로 위임.
     normal 이 0 인 동작(팔꿈치·무릎 신전)은 '완전히 펴짐' 기준, 그 외는 정상값 대비 % (v2xx: index.html 에서 옮김) */
  function romJudge(mv, val){
    if(mv.grade) return scolJudge(mv, val);
    if(val == null) return { cls:"", txt:"미측정", pct:0 };
    if(mv.normal === 0){
      if(val < 0) return -val <= 10 ? { cls:"good", txt:"정상 (과신전 " + (-val) + "°)", pct:100 }
        : { cls:"warn", txt:"과신전 " + (-val) + "° · 정상보다 많이 젖혀짐", pct:100 };   // v125
      return val <= 5 ? { cls:"good", txt:"정상 (완전히 펴짐)", pct:100 }
        : { cls: val <= 15 ? "warn" : "crit", txt:"완전 신전까지 " + val + "° 부족", pct: Math.max(0, 100 - val / 30 * 100) };
    }
    var pct = Math.round(val / mv.normal * 100);
    if(pct >= 100) return { cls:"good", txt:"정상 범위 (정상의 " + pct + "%)", pct:100 };
    var lack = 100 - pct;
    return { cls: pct >= 90 ? "good" : pct >= 70 ? "warn" : "crit", txt:"정상 대비 " + pct + "% · " + lack + "% 부족", pct:pct };
  }
  /* 종합 체형 점수 판정 (0~100점). cls 는 화면 class 이름 그대로 (st-good 등) */
  function scoreBand(v){
    if(v >= 90) return { cls:"st-good", label:"매우 좋음" };
    if(v >= 75) return { cls:"st-good", label:"양호" };
    if(v >= 60) return { cls:"st-warn", label:"주의" };
    return { cls:"st-crit", label:"개선 필요" };
  }
  var api = { scolJudge: scolJudge, romJudge: romJudge, scoreBand: scoreBand };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AYO_LOGIC = Object.assign(root.AYO_LOGIC || {}, api);
})(this);
