/* 리포트 "한눈에 보기" — 회차별 시계열·ROM 평균·KPI·상태표·아령 행 (화면을 모르는 순수 함수)
   브라우저: index.html 이 먼저 불러와 window.AYO_LOGIC 으로 씀 · Node: require 로 씀 (테스트: tests/report-timeline.test.js)

   입력은 index.html 의 mbBuildSessions() 결과(회차 묶음)를 그대로 받는다 — 회차 번호의 출처를 하나로 두기 위해서다.
     session = { key, at, day:"2026-07-03", rec:{score, f[], sd[]}|null, roms:[{joint, side, move, value, at}] }
   판정 함수(J = { romJudge, scolJudge, scoreBand })는 주입받는다 — 화면과 공유 이미지가 같은 판정을 쓰게.
   비운 기록(score·value 가 null)은 빈 칸으로 둔다. 0 으로 쓰지 않는다. */
(function(root){
  "use strict";

  // 판정 class 어휘 통일: "st-good" · "g-good" · "good" → "good"
  function normCls(c){
    c = String(c || "");
    if(c.indexOf("good") >= 0) return "good";
    if(c.indexOf("warn") >= 0) return "warn";
    if(c.indexOf("crit") >= 0) return "crit";
    return "";
  }
  var CLS_TXT = { good: "양호", warn: "주의", crit: "개선 필요", "": "미측정" };
  function fmtDay(d){ return String(d || "").replace(/-/g, "."); }
  function findJoint(catalog, k){ return (catalog || []).find(function(j){ return j.k === k; }) || null; }
  function findMove(J, k){ return J ? (J.moves || []).find(function(m){ return m.k === k; }) || null : null; }
  function sideTxt(side){ return side === "L" ? " (좌)" : side === "R" ? " (우)" : ""; }
  function romOrd(catalog, J, mv, side){ return J ? catalog.indexOf(J) * 20 + (mv ? J.moves.indexOf(mv) * 2 : 19) + (side === "R" ? 1 : 0) : 999; }   // mbRomInfo 와 같은 순서
  function isRomItem(x){ return x && x.joint !== "fhp" && x.joint !== "scol"; }
  function firstIdx(arr){ for(var i = 0; i < arr.length; i++) if(arr[i] != null) return i; return -1; }
  function lastIdx(arr){ for(var i = arr.length - 1; i >= 0; i--) if(arr[i] != null) return i; return -1; }

  // 한 회차 안의 ROM 기록을 (관절|좌우|동작) 마다 가장 늦게 잰 1건으로 줄인다
  function latestPerKey(roms){
    var out = {};
    (roms || []).slice().sort(function(a, b){ return (a.at || 0) - (b.at || 0); }).forEach(function(x){
      if(!x || x.value == null) return;
      out[x.joint + "|" + (x.side || "C") + "|" + x.move] = x;
    });
    return out;
  }

  /* ROM 평균 — 그 회차에 잰 ROM 항목(거북목·척추 균형 제외, 좌·우는 별개)의 정상 대비 % 평균.
     % 는 100 으로 상한(과도한 가동이 부족한 항목을 가리지 않게). 항목이 없으면 null. */
  function romAvgPct(roms, catalog, romJudge){
    var L = latestPerKey(roms), sum = 0, n = 0;
    Object.keys(L).forEach(function(k){
      var x = L[k]; if(!isRomItem(x)) return;
      var J = findJoint(catalog, x.joint), mv = findMove(J, x.move); if(!mv) return;
      var jd = romJudge(mv, x.value); if(!jd || jd.pct == null) return;
      sum += Math.min(100, jd.pct); n++;
    });
    return n ? { pct: Math.round(sum / n), n: n } : null;
  }
  function romAvgCls(pct){ return pct == null ? "" : pct >= 90 ? "good" : pct >= 70 ? "warn" : "crit"; }   // romJudge 와 같은 경계

  /* 회차별 시계열 */
  function buildTimeline(sessions, catalog, J, opts){
    opts = opts || {};
    var S = (sessions || []).slice().sort(function(a, b){ return (a.at || 0) - (b.at || 0); });
    if(opts.uptoKey != null){ var cut = -1; S.forEach(function(s, i){ if(s.key === opts.uptoKey) cut = i; }); if(cut >= 0) S = S.slice(0, cut + 1); }
    var N = S.length, blank = function(){ var a = []; for(var i = 0; i < N; i++) a.push(null); return a; };
    var rounds = S.map(function(s, i){ return { n: i + 1, key: s.key, day: fmtDay(s.day), at: s.at }; });
    var score = S.map(function(s){ return s.rec && s.rec.score != null ? s.rec.score : null; });
    var cva = blank(), atr = blank(), romAvg = blank(), rom = {}, body = {};
    var scoreCls = score.map(function(v){ return v == null ? null : normCls(J.scoreBand(v).cls); });
    S.forEach(function(s, si){
      var L = latestPerKey(s.roms);
      if(L["fhp|C|cva"]) cva[si] = L["fhp|C|cva"].value;
      if(L["scol|C|atr"]) atr[si] = L["scol|C|atr"].value;
      romAvg[si] = romAvgPct(s.roms, catalog, J.romJudge);
      Object.keys(L).forEach(function(k){
        var x = L[k]; if(!isRomItem(x)) return;
        var Jt = findJoint(catalog, x.joint), mv = findMove(Jt, x.move); if(!Jt || !mv) return;
        if(!rom[k]) rom[k] = { key: k, label: Jt.n + " " + mv.n + sideTxt(x.side), side: x.side || "C", normal: mv.normal, mv: mv,
                               ord: romOrd(catalog, Jt, mv, x.side), vals: blank(), pct: blank(), cls: blank() };
        var jd = J.romJudge(mv, x.value);
        rom[k].vals[si] = x.value; rom[k].pct[si] = Math.min(100, Math.round(jd.pct || 0)); rom[k].cls[si] = normCls(jd.cls);
      });
      if(s.rec){
        ["f", "sd"].forEach(function(m){
          (Array.isArray(s.rec[m]) ? s.rec[m] : []).forEach(function(it){   // 옛 기록은 f·sd 가 배열이 아닐 수 있어 건너뜀
            if(!it || !it.key) return;
            var bk = m + ":" + it.key;
            if(!body[bk]) body[bk] = { key: bk, label: it.title || it.name || it.key, vals: blank(), cls: blank() };
            body[bk].vals[si] = it.value; body[bk].cls[si] = normCls(it.cls);
          });
        });
      }
    });
    var cvaCls = cva.map(function(v){ return v == null ? null : normCls(J.scolJudge({ grade: "cva" }, v).cls); });
    var atrCls = atr.map(function(v){ return v == null ? null : normCls(J.scolJudge({ grade: "atr" }, v).cls); });
    return { rounds: rounds, score: score, scoreCls: scoreCls, cva: cva, cvaCls: cvaCls, atr: atr, atrCls: atrCls, romAvg: romAvg, rom: rom, body: body };
  }

  /* KPI 타일 4개 */
  function kpiOf(tl, J){
    var mk = function(k, label, unit, series, judge, hiBetter){
      var li = lastIdx(series), fi = firstIdx(series);
      var latest = li >= 0 ? series[li] : null, base = fi >= 0 && fi !== li ? series[fi] : null;
      var jd = latest == null ? { cls: "", label: "미측정" } : judge(latest);
      var delta = base != null && latest != null ? Math.round((latest - base) * 10) / 10 : null;
      var better = delta == null || delta === 0 ? null : (hiBetter ? delta > 0 : delta < 0);
      return { k: k, label: label, unit: unit, series: series, latest: latest, latestN: li >= 0 ? li + 1 : null,
               base: base, baseN: base != null ? fi + 1 : null, delta: delta, better: better, cls: jd.cls, judge: jd.label,
               single: tl.rounds.length < 2 || base == null };
    };
    var sb = function(v){ var b = J.scoreBand(v); return { cls: normCls(b.cls), label: b.label }; };
    var sj = function(g){ return function(v){ var b = J.scolJudge({ grade: g }, v); return { cls: normCls(b.cls), label: CLS_TXT[normCls(b.cls)] }; }; };
    var avgSeries = tl.romAvg.map(function(a){ return a ? a.pct : null; }), avgN = tl.romAvg.map(function(a){ return a ? a.n : 0; });
    var out = [
      mk("score", "종합 점수", "점", tl.score, sb, true),
      mk("cva", "거북목 각도", "°", tl.cva, sj("cva"), true),
      mk("atr", "척추 균형", "°", tl.atr, sj("atr"), false),
      mk("romAvg", "ROM 정상 대비", "%", avgSeries, function(v){ var c = romAvgCls(v); return { cls: c, label: CLS_TXT[c] }; }, true)
    ];
    out[1].sub = "정상 55° 이상"; out[2].sub = "정상 5° 미만"; out[0].sub = "정상 75점 이상";
    var ln = lastIdx(avgSeries); out[3].n = ln >= 0 ? avgN[ln] : 0; out[3].sub = out[3].n ? out[3].n + "항목 평균" : "ROM 측정 없음";
    out[0].ref = 75; out[1].ref = 55; out[2].ref = 5; out[3].ref = 90;
    return out;
  }

  /* 항목 × 회차 상태표. 회차 > maxCols 면 1차 + 최근 (maxCols-1)차, 사이를 "…" 로 표시 */
  function statusRows(tl, opts){
    opts = opts || {}; var maxCols = opts.maxCols || 5, N = tl.rounds.length, cols = [];
    if(N <= maxCols) for(var i = 0; i < N; i++) cols.push(i);
    else { cols.push(0); for(var j = N - (maxCols - 1); j < N; j++) cols.push(j); }
    var gap = N > maxCols;
    var cell = function(v, cls, unit){ return v == null ? null : { txt: v + (unit || ""), cls: cls || "" }; };
    var rows = [];
    rows.push({ key: "score", label: "종합 점수", cells: tl.score.map(function(v, i){ return cell(v, tl.scoreCls[i], "점"); }) });
    rows.push({ key: "cva", label: "거북목 각도", cells: tl.cva.map(function(v, i){ return cell(v, tl.cvaCls[i], "°"); }) });
    rows.push({ key: "atr", label: "척추 균형", cells: tl.atr.map(function(v, i){ return cell(v, tl.atrCls[i], "°"); }) });
    rows = rows.filter(function(r){ return r.cells.some(function(c){ return c; }); });   // 값이 하나도 없는 행은 뺀다 (예: ROM 만 잰 회원의 종합 점수 행)
    var maxRows = opts.maxRows || 14, roomRom = Math.max(0, maxRows - rows.length);   // 행 제한: 최근 회차에 있는 항목 우선, 나머지는 카탈로그 순
    var romItems = Object.keys(tl.rom).map(function(k){ return tl.rom[k]; }).sort(function(a, b){ return a.ord - b.ord; });
    if(romItems.length > roomRom){
      var recent = function(it){ return it.vals[N - 1] != null ? 0 : 1; };
      romItems = romItems.slice().sort(function(a, b){ return recent(a) - recent(b) || a.ord - b.ord; }).slice(0, roomRom).sort(function(a, b){ return a.ord - b.ord; });
    }
    romItems.forEach(function(it){
      rows.push({ key: it.key, label: it.label, cells: it.vals.map(function(v, i){ return cell(v, it.cls[i], "°"); }) });
    });
    if(opts.detail){
      Object.keys(tl.body).forEach(function(k){ var it = tl.body[k]; rows.push({ key: it.key, label: it.label, body: true, cells: it.vals.map(function(v, i){ return cell(v, it.cls[i], ""); }) }); });
    }
    return { cols: cols, gap: gap, rows: rows };
  }

  /* ROM 아령 그래프 행: 최근 회차에 값이 있는 항목만. a = 가장 이른 회차(최근과 다를 때만), b = 최근 */
  function dumbbellRows(tl, opts){
    opts = opts || {}; var max = opts.max || 14;
    var items = Object.keys(tl.rom).map(function(k){ return tl.rom[k]; }).sort(function(a, b){ return a.ord - b.ord; });
    var out = [];
    items.forEach(function(it){
      var li = lastIdx(it.vals); if(li < 0 || li !== tl.rounds.length - 1) return;   // 최근 회차에 없으면 제외
      var fi = firstIdx(it.vals), hasA = fi >= 0 && fi !== li;
      out.push({ key: it.key, label: it.label, side: it.side, normal: it.normal,
                 a: hasA ? it.pct[fi] : null, aVal: hasA ? it.vals[fi] : null, aN: hasA ? fi + 1 : null,
                 b: it.pct[li], bVal: it.vals[li], bN: li + 1, cls: it.cls[li],
                 better: hasA ? (it.pct[li] > it.pct[fi] ? true : it.pct[li] < it.pct[fi] ? false : null) : null });   // 방향은 정상 대비 % 로 (신전·과신전은 각도가 줄어도 개선)
    });
    return out.slice(0, max);
  }

  var api = { normCls: normCls, CLS_TXT: CLS_TXT, buildTimeline: buildTimeline, romAvgPct: romAvgPct, romAvgCls: romAvgCls,
              kpiOf: kpiOf, statusRows: statusRows, dumbbellRows: dumbbellRows };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AYO_LOGIC = Object.assign(root.AYO_LOGIC || {}, api);
})(this);
