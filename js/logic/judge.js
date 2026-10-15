/* 거북목(CVA)·척추 균형(ATR)·기울기 판정 — 화면을 모르는 순수 함수 (테스트: tests/judge.test.js)
   브라우저: index.html 이 먼저 불러와 window.AYO_LOGIC 으로 씀 · Node: require 로 씀 */
(function(root){
  function scolJudge(mv, v){
    if(v == null) return { cls:"", txt:"미측정", pct:0 };
    if(mv.grade === "cva") return v >= 55 ? { cls:"good", txt:"정상 범위 (55° 이상)", pct:100 } : v >= 50 ? { cls:"warn", txt:"경계 (50–55°) · 목이 조금 앞으로 나와 있어요", pct:70 } : v >= 45 ? { cls:"crit", txt:"목이 앞으로 많이 나와 있어요 (50° 미만)", pct:45 } : { cls:"crit", txt:"목이 앞으로 매우 많이 나와 있어요 (45° 미만) · 전문가와 상담해 보세요", pct:25 };
    if(mv.grade === "atr") return v < 5 ? { cls:"good", txt:"정상 범위 (5° 미만)", pct:100 } : v < 7 ? { cls:"warn", txt:"관찰 필요 (5–7°) · 정기 재측정 권장", pct:60 } : { cls:"crit", txt:"7° 이상 · 전문가와 상담해 보세요", pct:30 };
    return v < 10 ? { cls:"good", txt:"정상 범위 (10° 미만)", pct:100 } : v < 25 ? { cls:"warn", txt:"기울기 약간 (10–25°)", pct:60 } : v < 40 ? { cls:"crit", txt:"기울기 큼 (25–40°) · 전문가와 상담해 보세요", pct:35 } : { cls:"crit", txt:"40° 이상 · 전문가와 상담해 보세요", pct:15 };
  }
  var api = { scolJudge: scolJudge };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AYO_LOGIC = Object.assign(root.AYO_LOGIC || {}, api);
})(this);
