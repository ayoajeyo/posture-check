/* 리포트 문서 데이터 모델 — 섹션 01~07 에 들어갈 숫자·문장·판정을 만드는 순수 함수 (화면·캔버스를 모름)
   브라우저: index.html 이 먼저 불러와 window.AYO_LOGIC 으로 씀 · Node: require (테스트: tests/report-model.test.js)

   입력 buildReportDoc({ tl, body, J, baseKey })
     tl   = report-timeline.js buildTimeline() 결과 (선택 회차까지 잘라서 줌 — 마지막 칸이 선택 회차)
     body = index.html computeReport() 결과 { score, f[], sd[] } 또는 null (선택 회차의 체형)
     J    = { romJudge, scolJudge, scoreBand }
   화면(HTML/SVG)과 공유 이미지(캔버스)가 이 결과 하나를 같이 그린다 — 수치·판정·순서가 둘 사이에서 어긋나지 않게. */
(function(root){
  "use strict";

  var CLS_RANK = { crit: 0, warn: 1, good: 2, "": 3 };
  function normCls(c){ c = String(c || ""); return c.indexOf("good") >= 0 ? "good" : c.indexOf("warn") >= 0 ? "warn" : c.indexOf("crit") >= 0 ? "crit" : ""; }
  function worstCls(list){ var w = ""; list.forEach(function(c){ if(c && (w === "" || CLS_RANK[c] < CLS_RANK[w])) w = c; }); return w; }
  function fmtNum(v){ if(v == null || !isFinite(v)) return "–"; var r = Math.round(v * 10) / 10; return String(r); }
  function firstIdx(a, from){ for(var i = from || 0; i < a.length; i++) if(a[i] != null) return i; return -1; }   // from = 비교 기준 회차 칸(그 회차부터 찾는다)
  function lastIdx(a){ for(var i = a.length - 1; i >= 0; i--) if(a[i] != null) return i; return -1; }
  function parseNum(s){ var m = /-?\d+(\.\d+)?/.exec(String(s == null ? "" : s)); return m ? parseFloat(m[0]) : null; }
  var CLS_TXT = { good: "정상", warn: "주의", crit: "개선 필요", "": "미측정" };
  var KOR_N = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
  function korN(n){ return KOR_N[n] || String(n); }
  function hasBatchim(w){ var c = String(w || "").replace(/[)\s°%점]+$/, "").slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 ? ((c - 0xAC00) % 28) !== 0 : false; }
  function joinKo(arr){   // "A와 B" · "A, B와 C" (와/과는 앞 단어 받침으로)
    if(arr.length < 2) return arr.join("");
    var head = arr.slice(0, -1), last = arr[arr.length - 1], pre = head[head.length - 1];
    return head.join(", ") + (hasBatchim(pre) ? "과 " : "와 ") + last;
  }
  function topic(w){ return /[)\d°%]$/.test(String(w)) ? "는" : hasBatchim(w) ? "은" : "는"; }   // 은/는

  /* 변화 문구: ▲ 16점 · ▼ 4° · 변화 없음. better 는 항목마다 방향이 다르다(척추 균형은 줄어야 개선) */
  function deltaOf(a, b, unit, hiBetter){
    if(a == null || b == null) return { delta: null, deltaTxt: "", better: null };
    var d = Math.round((b - a) * 10) / 10;
    if(d === 0) return { delta: 0, deltaTxt: "변화 없음", better: null };
    return { delta: d, deltaTxt: (d > 0 ? "▲ " : "▼ ") + fmtNum(Math.abs(d)) + unit, better: hiBetter ? d > 0 : d < 0 };
  }

  /* 판정 라벨 — judge.js 의 class 를 문서 어휘로 */
  function cvaLabel(v){ return v == null ? "미측정" : v >= 55 ? "정상" : v >= 50 ? "경계" : v >= 45 ? "많이 나옴" : "매우 많이 나옴"; }
  function atrLabel(v){ return v == null ? "미측정" : v < 5 ? "정상" : v < 7 ? "관찰 필요" : "상담 권장"; }
  function romAvgLabel(p){ return p == null ? "미측정" : p >= 90 ? "정상" : p >= 70 ? "주의" : "개선 필요"; }

  /* 01 요약표 4행 (측정한 항목만) */
  function summaryRows(tl, J, multi, bi){
    var N = tl.rounds.length, out = [];
    var mk = function(k, label, sub, series, unit, ref, judge, hiBetter, refV){
      var li = lastIdx(series); if(li !== N - 1) return;   // 선택 회차에 없는 항목은 요약에서 뺀다
      var v = series[li], fi = firstIdx(series, bi), base = fi < li ? series[fi] : null;
      var jd = judge(v), d = multi ? deltaOf(base, v, unit, hiBetter) : { delta: null, deltaTxt: "", better: null };
      out.push({ k: k, label: label, sub: sub, value: v, unit: unit, txt: fmtNum(v) + unit, ref: ref, refV: refV, hiBetter: hiBetter,
                 cls: jd.cls, judge: jd.label, base: base, baseN: base != null ? fi + 1 : null, delta: d.delta, deltaTxt: d.deltaTxt, better: d.better });
    };
    mk("score", "체형 정렬", "정면 5쌍 · 측면 4점", tl.score, "점", "75점 이상", function(v){ var b = J.scoreBand(v); return { cls: normCls(b.cls), label: b.label }; }, true, 75);
    mk("cva", "거북목", "두개척추각 CVA", tl.cva, "°", "55° 이상", function(v){ return { cls: normCls(J.scolJudge({ grade: "cva" }, v).cls), label: cvaLabel(v) }; }, true, 55);
    mk("atr", "척추 균형", "몸통 회전각 ATR", tl.atr, "°", "5° 미만", function(v){ return { cls: normCls(J.scolJudge({ grade: "atr" }, v).cls), label: atrLabel(v) }; }, false, 5);
    var avg = tl.romAvg.map(function(a){ return a ? a.pct : null; }), ln = lastIdx(avg), n = ln >= 0 && tl.romAvg[ln] ? tl.romAvg[ln].n : 0;
    mk("romAvg", "관절 가동범위", n + "개 동작 · 정상 대비 평균", avg, "%", "90% 이상", function(p){ return { cls: romAvgLabel(p) === "정상" ? "good" : romAvgLabel(p) === "주의" ? "warn" : "crit", label: romAvgLabel(p) }; }, true, 90);
    if(out.length){ var ra = out[out.length - 1]; if(ra.k === "romAvg" && ra.deltaTxt && ra.delta) ra.deltaTxt = ra.deltaTxt.replace(/%$/, "%p"); }
    return out;
  }
  var NOTE_NAME = { score: "체형 정렬 점수", cva: "거북목 각도", atr: "척추 균형", romAvg: "관절 가동범위" };
  function gapTxt(s){   // 정상 기준까지 남은 양
    var g = s.hiBetter ? s.refV - s.value : s.value - s.refV; if(g <= 0) return "";
    return fmtNum(g) + (s.unit === "%" ? "%p" : s.unit);
  }
  /* 01 소견 한 줄 — 규칙으로 조립 (담당자 자유 입력은 범위 밖) */
  function noteText(sum, N, multi, bi){
    bi = bi || 0; var bN = bi + 1;   // 비교 기준 회차 (기본 1차)
    if(!sum.length) return "";
    var good = sum.filter(function(s){ return s.cls === "good"; }), notGood = sum.filter(function(s){ return s.cls !== "good"; });
    var goodTxt = good.length ? (function(t){ return t + topic(t) + " 정상 범위"; })(joinKo(good.map(function(s){ return NOTE_NAME[s.k]; }))) : "";
    var gapTxts = notGood.map(function(s){ return gapTxt(s); }).filter(Boolean);
    var notTxt = notGood.length ? joinKo(notGood.map(function(s){ return NOTE_NAME[s.k] + "(" + s.txt + ")"; })) + "는 정상 기준까지 " + (notGood.length > 1 ? "각각 " : "") + gapTxts.join("·") + "가 남았습니다" : "";
    if(!multi){
      var parts = [];
      if(goodTxt) parts.push(goodTxt + "입니다");
      if(notTxt) parts.push(notTxt);
      return "첫 측정입니다. " + (parts.length ? parts.join(". ") + ". " : "") + "다음 측정에서 변화를 비교합니다.";
    }
    var cmp = sum.filter(function(s){ return s.better != null; }), up = cmp.filter(function(s){ return s.better; }), dn = cmp.filter(function(s){ return !s.better; });
    var first;
    if(cmp.length && up.length === cmp.length) first = korN(N - bi) + " 번의 측정 동안 " + (cmp.length === sum.length ? korN(cmp.length) + " 항목이 모두" : korN(cmp.length) + " 항목이") + " 좋아졌습니다.";
    else if(cmp.length && dn.length === cmp.length) first = bN + "차보다 " + joinKo(dn.map(function(s){ return NOTE_NAME[s.k]; })) + "가 나빠졌습니다.";
    else if(cmp.length) first = bN + "차보다 좋아진 항목은 " + joinKo(up.map(function(s){ return NOTE_NAME[s.k]; })) + ", 나빠진 항목은 " + joinKo(dn.map(function(s){ return NOTE_NAME[s.k]; })) + "입니다.";
    else first = bN + "차와 비교할 수 있는 항목이 없습니다.";
    var second = [goodTxt ? goodTxt + (notTxt ? "이고" : "입니다") : "", notTxt].filter(Boolean).join(", ");
    return (first + " " + (second ? second + "." : "")).replace(/\s+$/, "");
  }

  /* 02 변화 그래프 4개 (값이 있는 것만). 축 범위는 값과 정상 띠를 모두 담는다 */
  function trendSeries(tl){
    var out = [], put = function(k, title, unit, values, min, max, ok){
      if(!values.some(function(v){ return v != null; })) return;
      var vs = values.filter(function(v){ return v != null; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
      min = Math.min(min, Math.floor(lo / 5) * 5); max = Math.max(max, Math.ceil(hi / 5) * 5);
      out.push({ k: k, title: title, unit: unit, values: values, min: min, max: max, ok: [Math.max(min, ok[0]), Math.min(max, ok[1] == null ? max : ok[1])] });
    };
    put("score", "체형 정렬 점수", "점", tl.score, 40, 100, [75, 100]);
    put("cva", "거북목 CVA", "°", tl.cva, 35, 65, [55, null]);
    put("atr", "척추 균형 ATR", "°", tl.atr, 0, 12, [0, 5]);
    put("romAvg", "ROM 정상 대비", "%", tl.romAvg.map(function(a){ return a ? a.pct : null; }), 50, 100, [90, 100]);
    return out;
  }

  /* 03 체형 정렬 — computeReport() 의 f(정면 기울기 °)·sd(측면 편위 cm) → 0 기준 양방향 막대
     항목 모양은 두 가지: computeReport 결과 { grade:{cls,label}, pct } · 저장 기록(slim) { cls } — 둘 다 받는다 */
  function clsOf(x){ return normCls(x && x.grade ? x.grade.cls : x && x.cls); }
  function bodyRows(body){
    if(!body || (!body.f && !body.sd)) return null;
    var mk = function(list, o){
      if(!list || !list.length) return null;
      var rows = list.map(function(x){
        var foot = String(x.foot || ""), v = x.num != null ? x.num : parseNum(x.value), dir = 0;
        if(o.axis === "h"){ if(/좌/.test(foot)) dir = -1; else if(/우/.test(foot)) dir = 1; }
        else { if(/전방|앞/.test(foot)) dir = 1; else if(/후방|뒤/.test(foot)) dir = -1; }
        v = v == null ? 0 : Math.abs(v); if(v === 0) dir = 0;
        var cls = clsOf(x);   // computeReport 모양(grade.cls) 과 저장 기록 slim 모양(cls) 둘 다
        return { n: x.name || x.title, v: v, dir: dir, cls: cls, pct: x.pct != null ? x.pct : null, valTxt: fmtNum(v) + o.u + (dir ? " " + (dir < 0 ? o.left : o.right) : "") };
      });
      var w = null, wc = ""; list.forEach(function(x){ var c = clsOf(x); if(!w || CLS_RANK[c] < CLS_RANK[wc]){ w = x; wc = c; } });
      var t1 = o.t1, t2 = o.t2;
      if(o.axis === "v"){   // 측면 경계는 몸 높이 대비 %(2·4) — 이 회원의 cm 로 환산 (cm/% 비율은 어느 항목이나 같다)
        var ratio = null; rows.forEach(function(r){ if(ratio == null && r.pct > 0 && r.v > 0) ratio = r.v / r.pct; });
        if(ratio == null) ratio = 1.5;   // 비율을 모르면 귀~복사뼈 150cm 가정
        t1 = Math.round(o.t1 * ratio * 10) / 10; t2 = Math.round(o.t2 * ratio * 10) / 10;
      }
      var maxV = Math.max(t2 * 1.5, Math.max.apply(null, rows.map(function(r){ return r.v; })) * 1.15);
      return { rows: rows, cls: wc, label: w && w.grade && w.grade.label ? w.grade.label : (o.labels[wc] || CLS_TXT[wc]), t1: t1, t2: t2, max: Math.round(maxV * 10) / 10, u: o.u, left: o.left, right: o.right };
    };
    var front = mk(body.f, { axis: "h", t1: 1.5, t2: 3, u: "°", left: "좌↑", right: "우↑", labels: { good: "정상 범위", warn: "약간 비대칭", crit: "비대칭 큼" } });   // 라벨은 index.html THRESH 와 같은 말
    var side = mk(body.sd, { axis: "v", t1: 2, t2: 4, u: "cm", left: "뒤", right: "앞", labels: { good: "정상 정렬", warn: "약간 벗어남", crit: "많이 벗어남" } });
    return (front || side) ? { front: front, side: side } : null;
  }

  /* 04 ROM — 동작별 좌/우 막대. 선택 회차(마지막 칸)에 값이 있는 쪽만, ○ = 그 쪽의 가장 이른 회차 */
  function romRows(tl, bi){
    var N = tl.rounds.length, groups = {}, order = [];
    Object.keys(tl.rom).map(function(k){ return tl.rom[k]; }).sort(function(a, b){ return a.ord - b.ord; }).forEach(function(it){
      var li = lastIdx(it.vals); if(li !== N - 1) return;
      var p = it.key.split("|"), gk = p[0] + "|" + p[2];
      if(!groups[gk]){ groups[gk] = { key: gk, label: it.label.replace(/ \((좌|우)\)$/, ""), normal: it.normal, sub: it.normal > 0 ? "정상 " + it.normal + "°" : "정상 0° (완전히 펴짐)", sides: [] }; order.push(gk); }
      var fi = firstIdx(it.vals, bi), hasA = fi < li;
      groups[gk].sides.push({ side: it.side === "L" ? "좌" : it.side === "R" ? "우" : "", key: it.key,
        aVal: hasA ? it.vals[fi] : null, aPct: hasA ? it.pct[fi] : null, aN: hasA ? fi + 1 : null,
        bVal: it.vals[li], pct: it.pct[li], cls: it.cls[li], bN: li + 1, txt: fmtNum(it.vals[li]) + "°" });
    });
    return order.map(function(gk){
      var g = groups[gk], L = g.sides.find(function(s){ return s.side === "좌"; }), R = g.sides.find(function(s){ return s.side === "우"; });
      g.cls = worstCls(g.sides.map(function(s){ return s.cls; })); g.judge = CLS_TXT[g.cls];
      g.diff = (L && R) ? Math.round(Math.abs(L.bVal - R.bVal) * 10) / 10 : null; g.diffBig = g.diff != null && g.diff >= 10;
      g.diffTxt = g.diff != null ? "좌우 차이 " + fmtNum(g.diff) + "°" : (g.sides[0] && g.sides[0].side ? "한쪽만 측정" : "좌우 구분 없음");
      return g;
    });
  }

  /* 05 구간 띠 — CVA·ATR. 축은 값이 벗어나면 넓어진다 */
  var ZONE = {
    cva: { min: 35, max: 70, zones: [[35, 45, "crit", "매우 많이 나옴"], [45, 50, "crit", "많이 나옴"], [50, 55, "warn", "경계"], [55, 70, "good", "정상"]], ok: "55° 이상이 정상입니다." },
    atr: { min: 0, max: 12, zones: [[0, 5, "good", "정상"], [5, 7, "warn", "관찰 필요"], [7, 12, "crit", "상담 권장"]], ok: "5° 미만이 정상입니다." }
  };
  function zoneSpec(k, vals){
    var z = ZONE[k], min = z.min, max = z.max;
    vals.forEach(function(v){ if(v == null) return; if(v < min) min = Math.floor((v - 2) / 5) * 5; if(v > max) max = Math.ceil((v + 2) / 5) * 5; });
    var zones = z.zones.map(function(q, i){ return { from: i === 0 ? min : q[0], to: i === z.zones.length - 1 ? max : q[1], cls: q[2], label: q[3] }; });
    return { min: min, max: max, u: "°", zones: zones };
  }
  function zoneStrips(tl, J, multi, bi){
    var N = tl.rounds.length, out = [];
    var mk = function(k, title, sub, series, label, hiBetter, refV){
      var li = lastIdx(series); if(li !== N - 1) return;
      var v = series[li], fi = firstIdx(series, bi), prev = fi < li ? series[fi] : null, lab = label(v), cls = normCls(J.scolJudge({ grade: k }, v).cls);
      var d = multi ? deltaOf(prev, v, "°", hiBetter) : { delta: null, deltaTxt: "", better: null };
      var spec = zoneSpec(k, [v, prev]), text = ZONE[k].ok + " ";
      var gap = hiBetter ? refV - v : v - refV, gapT = fmtNum(Math.abs(gap)) + "°";
      if(prev != null && multi){
        var pl = label(prev);
        if(cls === "good") text += prev != null && label(prev) !== "정상" ? fi + 1 + "차 '" + pl + "' 구간에서 정상 범위로 들어왔습니다." : fi + 1 + "차에 이어 정상 범위를 유지하고 있습니다.";
        else if(pl !== lab) text += fi + 1 + "차 '" + pl + "'에서 '" + lab + "'" + (d.better ? "까지 올라왔고, " + gapT + "를 더 회복하면 정상 범위입니다." : "로 내려왔습니다. 정상 범위까지 " + gapT + "가 남았습니다.");
        else text += fi + 1 + "차와 같은 '" + lab + "' 구간입니다. " + gapT + "를 더 회복하면 정상 범위입니다.";
      } else text += cls === "good" ? "지금은 정상 범위입니다." : "지금은 '" + lab + "' 구간입니다.";
      out.push({ k: k, title: title, sub: sub, value: v, txt: fmtNum(v) + "°", cls: cls, judge: lab, prev: prev, prevN: prev != null ? fi + 1 : null,
                 delta: d.delta, deltaTxt: d.deltaTxt, better: d.better, spec: spec, text: text });
    };
    mk("cva", "거북목", "두개척추각 CVA", tl.cva, cvaLabel, true, 55);
    mk("atr", "척추 균형", "몸통 회전각 ATR", tl.atr, atrLabel, false, 5);
    return out;
  }

  /* 06 사진 후보 — 렌더러가 사진이 있는 것만 전부 그린다. 체형 정면·측면 먼저, 그다음 04 표와 같은 부위 순서, 거북목·척추 균형 (v307: 최대 6·변화 큰 순 → 전부·부위 순) */
  function photoItems(tl, multi, bi){
    var N = tl.rounds.length, out = [], ln = N - 1;
    var sc = tl.score, sfi = firstIdx(sc, bi), sli = lastIdx(sc);
    if(sli === ln){ var dS = multi && sfi < sli ? deltaOf(sc[sfi], sc[sli], "점", true) : { deltaTxt: "", better: null, delta: 0 };
      ["front", "side"].forEach(function(m){ out.push({ kind: "body-" + m, key: "body|" + m, label: m === "front" ? "체형 정면" : "체형 측면", aN: multi && sfi < sli ? sfi + 1 : null, bN: sli + 1, aVal: sfi < sli ? sc[sfi] : null, bVal: sc[sli], unit: "점", deltaTxt: dS.deltaTxt, better: dS.better }); }); }
    var romL = [];
    Object.keys(tl.rom).forEach(function(k){
      var it = tl.rom[k], li = lastIdx(it.vals); if(li !== ln) return;
      var fi = firstIdx(it.vals, bi), hasA = multi && fi < li, d = hasA ? deltaOf(it.vals[fi], it.vals[li], "°", true) : { deltaTxt: "", better: null, delta: 0 };
      if(hasA){ d.better = it.pct[li] > it.pct[fi] ? true : it.pct[li] < it.pct[fi] ? false : null; }
      romL.push({ kind: "rom", key: k, label: it.label, aN: hasA ? fi + 1 : null, bN: li + 1, aVal: hasA ? it.vals[fi] : null, bVal: it.vals[li], unit: "°", deltaTxt: d.deltaTxt, better: d.better, ord: it.ord });
    });
    [["cva", tl.cva, "fhp|C|cva", "거북목 CVA", true, 500], ["atr", tl.atr, "scol|C|atr", "척추 균형 ATR", false, 501]].forEach(function(q){
      var s = q[1], li = lastIdx(s); if(li !== ln) return;
      var fi = firstIdx(s, bi), hasA = multi && fi < li, d = hasA ? deltaOf(s[fi], s[li], "°", q[4]) : { deltaTxt: "", better: null, delta: 0 };
      romL.push({ kind: "rom", key: q[2], label: q[3], aN: hasA ? fi + 1 : null, bN: li + 1, aVal: hasA ? s[fi] : null, bVal: s[li], unit: "°", deltaTxt: d.deltaTxt, better: d.better, ord: q[5] });
    });
    romL.sort(function(a, b){ return (a.ord || 0) - (b.ord || 0); });
    return out.concat(romL);
  }

  /* 07 기록표 */
  function historyRows(tl, bi){
    var rows = [], put = function(label, unit, vals, hiBetter, pct){
      if(!vals.some(function(v){ return v != null; })) return;
      var fi = firstIdx(vals, bi), li = lastIdx(vals), d = fi >= 0 && fi < li ? deltaOf(vals[fi], vals[li], unit, hiBetter) : { delta: null, deltaTxt: "", better: null };
      if(pct && fi < li && d.delta){ d.better = pct[li] > pct[fi] ? true : pct[li] < pct[fi] ? false : null; }
      rows.push({ label: label, unit: unit, vals: vals, txt: vals.map(function(v){ return v == null ? "–" : fmtNum(v) + unit; }), deltaTxt: d.deltaTxt, better: d.better });
    };
    put("체형 정렬 점수", "점", tl.score, true);
    put("거북목 CVA", "°", tl.cva, true);
    put("척추 균형 ATR", "°", tl.atr, false);
    Object.keys(tl.rom).map(function(k){ return tl.rom[k]; }).sort(function(a, b){ return a.ord - b.ord; }).forEach(function(it){ put(it.label, "°", it.vals, true, it.pct); });
    return { cols: tl.rounds, rows: rows };
  }

  /* 08 판정 기준 — 화면(#rsCrit)과 이미지가 같은 문장을 쓴다 */
  var CRITERIA = [
    ["체형 정렬 점수", "100점에서 기울기·편위만큼 감점. 정면 5쌍은 1°당 2.5점(쌍당 최대 10점), 측면 4점은 몸 높이 대비 1%당 2.5점. 90 이상 매우 좋음 · 75 이상 양호 · 60 이상 주의 · 60 미만 개선 필요."],
    ["정면 기울기", "1.5° 미만 정상 · 3.0° 미만 약간 비대칭 · 그 이상 비대칭 큼."],
    ["측면 편위", "플럼라인(복사뼈 기준 수직선)에서 귀~복사뼈 높이의 2% 미만 정상 · 4% 미만 약간 벗어남 · 그 이상 많이 벗어남. 그래프의 cm 경계는 이 회원의 키로 환산한 값."],
    ["거북목 CVA", "55° 이상 정상 · 50–55° 경계 · 45–50° 목이 많이 나옴 · 45° 미만 매우 많이 나옴."],
    ["척추 균형 ATR", "5° 미만 정상 · 5–7° 관찰 필요 · 7° 이상 전문가 상담 권장."],
    ["관절 가동범위", "정상 각도 대비 90% 이상 정상 · 70% 이상 주의 · 70% 미만 개선 필요. 좌우 차이 10° 이상은 따로 표시."]
  ];
  var DISCLAIMER = "이 리포트는 촬영 거리·각도·자세에 따라 달라질 수 있는 스크리닝 참고 자료이며, 의학적 진단을 대신하지 않습니다. 통증이나 뚜렷한 변형이 있으면 전문가와 상담하세요.";

  /* o.baseKey = 비교 기준 회차의 key (v307). 없거나 모르는 키·선택 회차 자신이면 1차 */
  function buildReportDoc(o){
    var tl = o.tl, J = o.J, N = tl.rounds.length, multi = N >= 2, bi = 0;
    tl.rounds.forEach(function(r, i){ if(o.baseKey != null && r.key === o.baseKey && i < N - 1) bi = i; });
    var cur = N ? tl.rounds[N - 1] : null, base = multi ? tl.rounds[bi] : null;
    var sum = summaryRows(tl, J, multi, bi);
    return { rounds: tl.rounds, cur: cur, base: base, multi: multi,
             summary: sum, note: noteText(sum, N, multi, bi), trend: multi ? trendSeries(tl) : [],
             body: bodyRows(o.body), rom: { rows: romRows(tl, bi) }, zones: zoneStrips(tl, J, multi, bi),
             photos: photoItems(tl, multi, bi), history: historyRows(tl, bi) };
  }

  var api = { buildReportDoc: buildReportDoc, fmtNum: fmtNum, deltaOf: deltaOf, cvaLabel: cvaLabel, atrLabel: atrLabel, ZONE: ZONE, CRITERIA: CRITERIA, DISCLAIMER: DISCLAIMER };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AYO_LOGIC = Object.assign(root.AYO_LOGIC || {}, api);
})(this);
