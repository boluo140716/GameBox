/* 斗地主 · 纯前端单机版（你 vs 两个 AI） */
(function () {
  'use strict';

  // ───────────────────────── 牌与规则 ─────────────────────────

  var SUITS = [
    { s: '♠', red: false },
    { s: '♥', red: true },
    { s: '♣', red: false },
    { s: '♦', red: true },
  ];
  var RANK = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' };
  var FALLBACK_NAMES = ['你', '小满', '阿福'];

  // 单机盒豆：只做本地记分，不充值、不兑换。
  var WALLET_KEY = 'gamebox_ddz_wallet_v1';
  var DAILY_BONUS = 500;
  var FIRST_WIN_BONUS = 300;
  var SOLVENT_FLOOR = 1000;
  var MAX_MULTIPLIER = 16;
  var MAX_STREAK_BONUS = 20000;
  var ROOMS = [
    { id: 'novice', name: '新手场', base: 100, entry: 1000 },
    { id: 'standard', name: '标准场', base: 500, entry: 5000 },
    { id: 'expert', name: '高手场', base: 2000, entry: 20000 }
  ];
  var currentRoom = ROOMS[0];

  var uid = 0;
  function makeDeck() {
    var deck = [];
    for (var v = 3; v <= 15; v++) {
      for (var i = 0; i < SUITS.length; i++) {
        deck.push({ id: uid++, v: v, suit: SUITS[i].s, red: SUITS[i].red, joker: false });
      }
    }
    deck.push({ id: uid++, v: 16, suit: '', red: false, joker: true });
    deck.push({ id: uid++, v: 17, suit: '', red: true, joker: true });
    return deck;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sortHand(h) {
    h.sort(function (a, b) { return a.v - b.v || a.id - b.id; });
  }

  function isConsec(vals) {
    for (var i = 1; i < vals.length; i++) if (vals[i] !== vals[i - 1] + 1) return false;
    return true;
  }

  function consecRuns(vals) {
    var runs = [];
    var cur = [];
    for (var i = 0; i < vals.length; i++) {
      if (!cur.length || vals[i] === cur[cur.length - 1] + 1) cur.push(vals[i]);
      else { if (cur.length) runs.push(cur); cur = [vals[i]]; }
    }
    if (cur.length) runs.push(cur);
    return runs;
  }

  // 识别牌型；不合法返回 null
  function analyze(cards) {
    var n = cards.length;
    if (!n) return null;
    var cnt = new Map();
    for (var i = 0; i < n; i++) cnt.set(cards[i].v, (cnt.get(cards[i].v) || 0) + 1);
    var entries = Array.from(cnt.entries()).sort(function (a, b) { return a[0] - b[0]; });
    var vs = entries.map(function (e) { return e[0]; });
    var counts = entries.map(function (e) { return e[1]; });
    var maxV = vs[vs.length - 1];

    if (n === 2 && cnt.get(16) === 1 && cnt.get(17) === 1) return { type: 'rocket', len: 1, value: 17, name: '王炸' };
    if (n === 4 && entries.length === 1) return { type: 'bomb', len: 1, value: vs[0], name: '炸弹' };
    if (n === 1) return { type: 'single', len: 1, value: vs[0], name: '单张' };
    if (n === 2 && entries.length === 1) return { type: 'pair', len: 1, value: vs[0], name: '对子' };
    if (n === 3 && entries.length === 1) return { type: 'triple', len: 1, value: vs[0], name: '三张' };
    if (n === 4 && entries.length === 2) {
      var t4 = entries.find(function (e) { return e[1] === 3; });
      if (t4) return { type: 'triple1', len: 1, value: t4[0], name: '三带一' };
    }
    if (n === 5 && entries.length === 2) {
      var t5 = entries.find(function (e) { return e[1] === 3; });
      var p5 = entries.find(function (e) { return e[1] === 2; });
      if (t5 && p5) return { type: 'triple2', len: 1, value: t5[0], name: '三带二' };
    }
    if (n >= 5 && counts.every(function (c) { return c === 1; }) && isConsec(vs) && maxV <= 14) {
      return { type: 'straight', len: n, value: vs[0], name: '顺子' };
    }
    if (n >= 6 && n % 2 === 0 && counts.every(function (c) { return c === 2; }) && vs.length >= 3 && isConsec(vs) && maxV <= 14) {
      return { type: 'pairStraight', len: vs.length, value: vs[0], name: '连对' };
    }

    // 飞机（三顺）：只认恰好三张的连续牌，避免和炸弹混淆
    var tripleRanks = entries.filter(function (e) { return e[1] === 3; }).map(function (e) { return e[0]; });
    var runs = consecRuns(tripleRanks);
    for (var r = 0; r < runs.length; r++) {
      var run = runs[r];
      for (var len = run.length; len >= 2; len--) {
        for (var si = 0; si + len <= run.length; si++) {
          var ranks = run.slice(si, si + len);
          var base = 3 * len;
          if (n === base) return { type: 'plane', len: len, value: ranks[0], name: '飞机' };
          if (n === base + len) {
            var rem = [];
            for (var ei = 0; ei < entries.length; ei++) {
              var v = entries[ei][0], c = entries[ei][1];
              if (ranks.indexOf(v) !== -1) c -= 3;
              for (var k = 0; k < c; k++) rem.push(v);
            }
            if (rem.length === len) return { type: 'plane1', len: len, value: ranks[0], name: '飞机带单' };
          }
          if (n === base + 2 * len) {
            var remCnt = new Map();
            for (var ej = 0; ej < entries.length; ej++) {
              var v2 = entries[ej][0], c2 = entries[ej][1];
              if (ranks.indexOf(v2) !== -1) c2 -= 3;
              if (c2 > 0) remCnt.set(v2, c2);
            }
            var rc = Array.from(remCnt.values());
            if (rc.length === len && rc.every(function (x) { return x === 2; })) {
              return { type: 'plane2', len: len, value: ranks[0], name: '飞机带对' };
            }
          }
        }
      }
    }

    // 四带二 / 四带两对
    for (var qi = 0; qi < entries.length; qi++) {
      if (entries[qi][1] !== 4) continue;
      var q = entries[qi][0];
      var leftover = [];
      for (var qj = 0; qj < entries.length; qj++) {
        var lv = entries[qj][0], lc = entries[qj][1];
        if (lv === q) lc -= 4;
        for (var lk = 0; lk < lc; lk++) leftover.push(lv);
      }
      if (n === 6 && leftover.length === 2) return { type: 'four2', len: 1, value: q, name: '四带二' };
      if (n === 8 && leftover.length === 4) {
        var lcMap = new Map();
        leftover.forEach(function (x) { lcMap.set(x, (lcMap.get(x) || 0) + 1); });
        var lvals = Array.from(lcMap.values());
        if (lvals.length === 2 && lvals.every(function (x) { return x === 2; })) {
          return { type: 'four2p', len: 1, value: q, name: '四带两对' };
        }
      }
    }
    return null;
  }

  function beats(a, b) {
    if (!a) return false;
    if (!b) return true;
    if (a.type === 'rocket') return true;
    if (b.type === 'rocket') return false;
    if (a.type === 'bomb' && b.type !== 'bomb') return true;
    if (b.type === 'bomb' && a.type !== 'bomb') return false;
    if (a.type !== b.type) return false;
    if (a.len !== b.len) return false;
    return a.value > b.value;
  }

  // ───────────────────────── AI 候选生成 ─────────────────────────

  function groupByValue(hand) {
    var m = new Map();
    hand.forEach(function (c) {
      if (!m.has(c.v)) m.set(c.v, []);
      m.get(c.v).push(c);
    });
    return m;
  }

  function pickWings(hand, usedRanks, count) {
    var pool = hand
      .filter(function (c) { return usedRanks.indexOf(c.v) === -1; })
      .sort(function (a, b) { return a.v - b.v; });
    if (pool.length < count) return null;
    return pool.slice(0, count);
  }

  function pickPairWings(hand, usedRanks, count) {
    var m = groupByValue(hand);
    var vals = Array.from(m.keys()).sort(function (a, b) { return a - b; });
    var out = [];
    for (var i = 0; i < vals.length && out.length / 2 < count; i++) {
      var v = vals[i];
      if (usedRanks.indexOf(v) !== -1) continue;
      var arr = m.get(v);
      if (arr.length >= 2) out.push(arr[0], arr[1]);
    }
    return out.length === count * 2 ? out : null;
  }

  function dedupePlays(plays) {
    var seen = new Set();
    var out = [];
    plays.forEach(function (p) {
      var key = p.map(function (c) { return c.id; }).sort(function (a, b) { return a - b; }).join(',');
      if (!seen.has(key)) { seen.add(key); out.push(p); }
    });
    return out;
  }

  // 找出所有能压过 last 的出牌
  function genBeats(hand, last) {
    var plays = [];
    if (!last) return plays;
    var m = groupByValue(hand);
    var vals = Array.from(m.keys()).sort(function (a, b) { return a - b; });

    if (last.type !== 'rocket') {
      // 炸弹
      vals.forEach(function (v) {
        if (m.get(v).length >= 4 && (last.type !== 'bomb' || v > last.value)) {
          plays.push(m.get(v).slice(0, 4));
        }
      });
      if (m.has(16) && m.has(17)) plays.push([m.get(16)[0], m.get(17)[0]]);
    }

    if (last.type === 'rocket') return dedupePlays(plays);

    if (last.type === 'single') {
      vals.forEach(function (v) { if (v > last.value) plays.push([m.get(v)[0]]); });
    } else if (last.type === 'pair' || last.type === 'triple') {
      var need = last.type === 'pair' ? 2 : 3;
      vals.forEach(function (v) {
        if (v > last.value && m.get(v).length >= need) plays.push(m.get(v).slice(0, need));
      });
    } else if (last.type === 'triple1') {
      vals.forEach(function (v) {
        if (v > last.value && m.get(v).length >= 3) {
          var wings = pickWings(hand, [v], 1);
          if (wings) plays.push(m.get(v).slice(0, 3).concat(wings));
        }
      });
    } else if (last.type === 'triple2') {
      vals.forEach(function (v) {
        if (v > last.value && m.get(v).length >= 3) {
          var wings = pickPairWings(hand, [v], 1);
          if (wings) plays.push(m.get(v).slice(0, 3).concat(wings));
        }
      });
    } else if (last.type === 'straight') {
      for (var s = Math.max(3, last.value + 1); s + last.len - 1 <= 14; s++) {
        var ok = true;
        for (var k = 0; k < last.len; k++) if (!m.has(s + k)) { ok = false; break; }
        if (ok) {
          var one = [];
          for (var k2 = 0; k2 < last.len; k2++) one.push(m.get(s + k2)[0]);
          plays.push(one);
        }
      }
    } else if (last.type === 'pairStraight') {
      for (var ps = Math.max(3, last.value + 1); ps + last.len - 1 <= 14; ps++) {
        var ok2 = true;
        for (var k3 = 0; k3 < last.len; k3++) if (!m.has(ps + k3) || m.get(ps + k3).length < 2) { ok2 = false; break; }
        if (ok2) {
          var two = [];
          for (var k4 = 0; k4 < last.len; k4++) two.push(m.get(ps + k4)[0], m.get(ps + k4)[1]);
          plays.push(two);
        }
      }
    } else if (last.type === 'plane' || last.type === 'plane1' || last.type === 'plane2') {
      var tripleVals = vals.filter(function (v) { return m.get(v).length >= 3 && v <= 14; });
      var runs = consecRuns(tripleVals);
      runs.forEach(function (run) {
        for (var start = 0; start + last.len <= run.length; start++) {
          var ranks = run.slice(start, start + last.len);
          if (ranks[0] <= last.value) continue;
          var baseCards = [];
          ranks.forEach(function (v) { baseCards.push.apply(baseCards, m.get(v).slice(0, 3)); });
          if (last.type === 'plane') { plays.push(baseCards); continue; }
          if (last.type === 'plane1') {
            var w1 = pickWings(hand, ranks, last.len);
            if (w1) plays.push(baseCards.concat(w1));
          } else {
            var w2 = pickPairWings(hand, ranks, last.len);
            if (w2) plays.push(baseCards.concat(w2));
          }
        }
      });
    } else if (last.type === 'four2' || last.type === 'four2p') {
      vals.forEach(function (v) {
        if (v > last.value && m.get(v).length >= 4) {
          var base = m.get(v).slice(0, 4);
          if (last.type === 'four2') {
            var w = pickWings(hand, [v], 2);
            if (w) plays.push(base.concat(w));
          } else {
            var w2 = pickPairWings(hand, [v], 2);
            if (w2) plays.push(base.concat(w2));
          }
        }
      });
    }
    return dedupePlays(plays);
  }

  function take(m, v, n) {
    var arr = m.get(v);
    if (!arr || arr.length < n) return null;
    var out = arr.splice(0, n);
    if (!arr.length) m.delete(v);
    return out;
  }

  // 把手牌拆成“可以打出去”的若干组
  function decompose(hand) {
    var m = groupByValue(hand);
    var groups = [];

    if (m.has(16) && m.has(17)) {
      groups.push([take(m, 16, 1)[0], take(m, 17, 1)[0]]);
    }
    Array.from(m.keys()).forEach(function (v) {
      if (v < 16 && m.get(v) && m.get(v).length >= 4) groups.push(take(m, v, 4));
    });

    var guard = 0;
    while (guard++ < 30) {
      var ranks = [];
      for (var v = 3; v <= 14; v++) if ((m.get(v) || []).length >= 1) ranks.push(v);
      var runs = consecRuns(ranks).filter(function (r) { return r.length >= 5; });
      if (!runs.length) break;
      runs.sort(function (a, b) { return b.length - a.length; });
      var run = runs[0];
      var cards = [];
      run.forEach(function (rv) { cards.push.apply(cards, take(m, rv, 1)); });
      groups.push(cards);
    }

    guard = 0;
    while (guard++ < 30) {
      var pranks = [];
      for (var pv = 3; pv <= 14; pv++) if ((m.get(pv) || []).length >= 2) pranks.push(pv);
      var pruns = consecRuns(pranks).filter(function (r) { return r.length >= 3; });
      if (!pruns.length) break;
      pruns.sort(function (a, b) { return b.length - a.length; });
      var prun = pruns[0];
      var pcards = [];
      prun.forEach(function (rv) { pcards.push.apply(pcards, take(m, rv, 2)); });
      groups.push(pcards);
    }

    guard = 0;
    while (guard++ < 30) {
      var tranks = [];
      for (var tv = 3; tv <= 14; tv++) if ((m.get(tv) || []).length >= 3) tranks.push(tv);
      var truns = consecRuns(tranks).filter(function (r) { return r.length >= 2; });
      if (!truns.length) break;
      truns.sort(function (a, b) { return b.length - a.length; });
      var trun = truns[0];
      var tcards = [];
      trun.forEach(function (rv) { tcards.push.apply(tcards, take(m, rv, 3)); });
      groups.push(tcards);
    }

    Array.from(m.keys()).forEach(function (v) {
      if (m.get(v) && m.get(v).length >= 3) groups.push(take(m, v, 3));
    });
    Array.from(m.keys()).forEach(function (v) {
      if (m.get(v) && m.get(v).length >= 2) groups.push(take(m, v, 2));
    });
    Array.from(m.keys()).forEach(function (v) {
      if (m.get(v) && m.get(v).length >= 1) groups.push(take(m, v, 1));
    });

    return groups.filter(function (g) { return g && g.length; });
  }

  function leadScore(group) {
    var p = analyze(group);
    if (!p) return 99999;
    var s = p.value;
    if (p.type === 'bomb') s += 2000;
    if (p.type === 'rocket') s += 4000;
    if (group.length >= 5) s -= 24;
    if (p.type === 'triple' || p.type === 'triple1' || p.type === 'triple2') s -= 4;
    if (p.type === 'pair') s -= 1;
    return s;
  }

  function chooseLead(hand) {
    if (!hand.length) return null;
    var all = analyze(hand);
    if (all && (all.type !== 'bomb' || hand.length === 4)) return hand.slice();
    var groups = decompose(hand);
    if (!groups.length) return [hand[0]];
    var safe = groups.filter(function (g) {
      var p = analyze(g);
      return p && p.type !== 'bomb' && p.type !== 'rocket';
    });
    var pool = safe.length ? safe : groups;
    pool.sort(function (a, b) { return leadScore(a) - leadScore(b); });
    return pool[0];
  }

  function chooseFollow(hand, last) {
    var cands = genBeats(hand, last);
    if (!cands.length) return null;
    cands.sort(function (a, b) {
      var pa = analyze(a), pb = analyze(b);
      var ca = (pa.type === 'bomb' || pa.type === 'rocket' ? 1000 : 0) + pa.value - a.length * 0.01;
      var cb = (pb.type === 'bomb' || pb.type === 'rocket' ? 1000 : 0) + pb.value - b.length * 0.01;
      return ca - cb;
    });
    return cands[0];
  }

  // ───────────────────────── 游戏状态 ─────────────────────────

  var S = {
    hands: [[], [], []],
    bottom: [],
    landlord: -1,
    turn: 0,
    last: null,
    passCount: 0,
    phase: 'idle',
    selected: new Set(),
    bidTurn: 0,
    bidCount: 0,
    round: 0,
    over: false,
    base: ROOMS[0].base,
    multiplier: 1,
    stakeMult: 1,
    playCount: [0, 0, 0],
    playerBombs: 0,
    reasons: [],
    opponents: [],
    revengeId: '',
  };

  function playerName(p) {
    if (p === 0) return '你';
    var opp = S.opponents && S.opponents[p - 1];
    return opp && opp.name ? opp.name : FALLBACK_NAMES[p];
  }

  var stats = loadStats();
  var wallet = loadWallet();
  var turnToken = 0;
  var timers = [];

  function loadStats() {
    var empty = { win: 0, lose: 0, streak: 0, bestStreak: 0, bombs: 0, springs: 0, landlordWins: 0 };
    try {
      var s = JSON.parse(localStorage.getItem('gamebox_ddz_stats') || 'null');
      if (!s || typeof s.win !== 'number') return empty;
      return {
        win: s.win,
        lose: s.lose,
        streak: Math.max(0, Number(s.streak) || 0),
        bestStreak: Math.max(0, Number(s.bestStreak) || 0),
        bombs: Math.max(0, Number(s.bombs) || 0),
        springs: Math.max(0, Number(s.springs) || 0),
        landlordWins: Math.max(0, Number(s.landlordWins) || 0)
      };
    } catch (e) { return empty; }
  }
  function saveStats() {
    try { localStorage.setItem('gamebox_ddz_stats', JSON.stringify(stats)); } catch (e) {}
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function defaultWallet() {
    return { beans: 3000, lastDaily: '', lastFirstWin: '', biggestWin: 0 };
  }

  function loadWallet() {
    try {
      var w = JSON.parse(localStorage.getItem(WALLET_KEY) || 'null');
      if (!w || typeof w.beans !== 'number') return defaultWallet();
      return {
        beans: Math.max(0, Math.floor(w.beans)),
        lastDaily: w.lastDaily || '',
        lastFirstWin: w.lastFirstWin || '',
        biggestWin: Math.max(0, Math.floor(w.biggestWin || 0))
      };
    } catch (e) { return defaultWallet(); }
  }

  function saveWallet() {
    try { localStorage.setItem(WALLET_KEY, JSON.stringify(wallet)); } catch (e) {}
  }

  function fmtBeans(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function claimDaily() {
    var today = todayKey();
    if (wallet.lastDaily === today) return 0;
    wallet.lastDaily = today;
    wallet.beans += DAILY_BONUS;
    saveWallet();
    return DAILY_BONUS;
  }

  // 余额不足最低场次时补到 1000，保证单机模式永远有局可玩。
  function ensureSolvent() {
    if (wallet.beans >= SOLVENT_FLOOR) return 0;
    var grant = SOLVENT_FLOOR - wallet.beans;
    wallet.beans = SOLVENT_FLOOR;
    saveWallet();
    return grant;
  }

  function later(fn, ms) {
    var t = setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
    return t;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // ───────────────────────── DOM ─────────────────────────

  var handEl = document.getElementById('hand');
  var actionBar = document.getElementById('actionBar');
  var messageEl = document.getElementById('message');
  var lastCardsEl = document.getElementById('lastCards');
  var lastLabelEl = document.getElementById('lastLabel');
  var bottomEl = document.getElementById('bottomCards');
  var overlay = document.getElementById('overlay');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var roomOverlay = document.getElementById('roomOverlay');
  var roomListEl = document.getElementById('roomList');
  var roomBalanceEl = document.getElementById('roomBalance');
  var roomNoteEl = document.getElementById('roomNote');
  var walletBalanceEl = document.getElementById('walletBalance');
  var walletChipEl = document.getElementById('walletChip');
  var roomChipEl = document.getElementById('roomChip');
  var multChipEl = document.getElementById('multChip');
  var toastEl = document.getElementById('toast');
  var appEl = document.getElementById('app');
  var youAvatar = document.getElementById('youAvatar');
  var selfTitle = document.getElementById('selfTitle');
  var resultShopBtn = document.getElementById('resultShopBtn');
  var roomShopBtn = document.getElementById('roomShopBtn');
  var doubleOverlay = document.getElementById('doubleOverlay');
  var doubleNoteEl = document.getElementById('doubleNote');
  var soundBtnEl = document.getElementById('soundBtn');
  var soundIconEl = document.getElementById('soundIcon');
  var missionBtnEl = document.getElementById('missionBtn');
  var missionBadgeEl = document.getElementById('missionBadge');
  var streakBadgeEl = document.getElementById('streakBadge');
  var revengeBtn = document.getElementById('revengeBtn');
  var toastTimer = null;
  var revengeTargetId = '';

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1500);
  }

  function $(id) { return document.getElementById(id); }

  function cosmeticClass(id) {
    if (!window.DDZ_SHOP || !id) return '';
    var item = window.DDZ_SHOP.getItem(id);
    return item && item.cls ? ' ' + item.cls : '';
  }

  function applyPlayerCosmetics(equipped) {
    if (!window.DDZ_SHOP) return;
    equipped = equipped || window.DDZ_SHOP.getEquipped();
    var felt = equipped && equipped.felt ? window.DDZ_SHOP.getItem(equipped.felt) : null;
    var back = equipped && equipped.back ? window.DDZ_SHOP.getItem(equipped.back) : null;
    var frame = equipped && equipped.frame ? window.DDZ_SHOP.getItem(equipped.frame) : null;
    var avatar = equipped && equipped.avatar ? window.DDZ_SHOP.getItem(equipped.avatar) : null;
    var title = equipped && equipped.title ? window.DDZ_SHOP.getItem(equipped.title) : null;
    if (appEl) {
      appEl.className = 'ddz' + (felt ? cosmeticClass(felt.id) : '') + (back ? cosmeticClass(back.id) : '');
    }
    if (youAvatar) {
      youAvatar.className = 'avatar you' + (frame ? cosmeticClass(frame.id) : '');
      youAvatar.textContent = avatar && avatar.glyph ? avatar.glyph : '🙂';
    }
    if (selfTitle) {
      selfTitle.textContent = title ? title.name : '';
      selfTitle.hidden = !title;
    }
  }

  function spendBeans(amount) {
    if (wallet.beans - amount < SOLVENT_FLOOR) return false;
    wallet.beans -= amount;
    saveWallet();
    renderTopbar();
    if (roomOverlay && !roomOverlay.hidden) renderRoomList();
    return true;
  }

  function renderTopbar() {
    walletBalanceEl.textContent = fmtBeans(wallet.beans);
    if (roomBalanceEl) roomBalanceEl.textContent = fmtBeans(wallet.beans);
    roomChipEl.textContent = currentRoom.name + ' · 底注 ' + fmtBeans(currentRoom.base);
    multChipEl.textContent = '×' + S.multiplier + (S.stakeMult > 1 ? ' 注×' + S.stakeMult : '');
    var streak = stats.streak || 0;
    if (streakBadgeEl) {
      streakBadgeEl.hidden = streak < 2;
      streakBadgeEl.textContent = '🔥 ' + streak + ' 连胜';
      streakBadgeEl.title = '最高连胜 ' + (stats.bestStreak || 0) + ' 局';
    }
    var claimable = window.DDZ_MISSIONS ? window.DDZ_MISSIONS.claimableCount() : 0;
    if (missionBadgeEl) {
      missionBadgeEl.hidden = claimable <= 0;
      missionBadgeEl.textContent = claimable > 9 ? '9+' : String(claimable);
    }
    if (missionBtnEl) missionBtnEl.classList.toggle('has-reward', claimable > 0);
  }

  function renderSoundBtn() {
    if (!soundBtnEl || !window.DDZ_SFX) return;
    var on = window.DDZ_SFX.isEnabled();
    soundBtnEl.classList.toggle('muted', !on);
    soundBtnEl.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtnEl.title = on ? '音效已开' : '音效已关';
    if (soundIconEl) soundIconEl.textContent = on ? '🔊' : '🔇';
  }

  function renderRoomList() {
    roomListEl.innerHTML = '';
    ROOMS.forEach(function (room) {
      var canEnter = wallet.beans >= room.entry;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'room-option' + (canEnter ? '' : ' locked');
      btn.disabled = !canEnter;
      btn.innerHTML =
        '<span class="room-name">' + room.name + '</span>' +
        '<span class="room-base">底注 ' + fmtBeans(room.base) + '</span>' +
        '<span class="room-entry">' +
          (canEnter ? '入场 ' + fmtBeans(room.entry) : '需 ' + fmtBeans(room.entry) + ' 盒豆') +
        '</span>';
      btn.onclick = function () {
        if (wallet.beans < room.entry) {
          toast('盒豆不足，先去低场次赢一些吧');
          return;
        }
        currentRoom = room;
        roomOverlay.hidden = true;
        startGame();
      };
      roomListEl.appendChild(btn);
    });
    roomBalanceEl.textContent = fmtBeans(wallet.beans);
    roomNoteEl.textContent = '每日登录 +' + fmtBeans(DAILY_BONUS) + ' · 每日首胜 +' + fmtBeans(FIRST_WIN_BONUS) + ' · 低于 ' + fmtBeans(SOLVENT_FLOOR) + ' 自动补足';
    renderTopbar();
  }

  function openRoomOverlay() {
    if (S.phase === 'bid' || S.phase === 'play' || S.phase === 'double') {
      toast('本局结束后才能换场');
      return;
    }
    renderRoomList();
    roomOverlay.hidden = false;
  }

  function bubble(player, text) {
    if (player === 0) return;
    var el = $('bubble' + player);
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1200);
  }

  function cardEl(card, mini) {
    var el = document.createElement('div');
    el.className = 'card' + (card.red ? ' red' : ' black') + (card.joker ? ' joker' : '') + (mini ? ' mini' : '');
    el.dataset.id = card.id;
    var rank = card.joker ? (card.v === 17 ? '大王' : '小王') : RANK[card.v];
    el.innerHTML = '<span class="rank">' + rank + '</span><span class="suit">' + (card.joker ? '' : card.suit) + '</span>';
    return el;
  }

  function renderBottom() {
    bottomEl.innerHTML = '';
    if (S.landlord >= 0) {
      S.bottom.forEach(function (c) { bottomEl.appendChild(cardEl(c, true)); });
    } else {
      for (var i = 0; i < 3; i++) {
        var b = document.createElement('div');
        b.className = 'card back';
        bottomEl.appendChild(b);
      }
    }
  }

  function renderBacks(player) {
    var el = $('backs' + player);
    if (!el) return;
    el.innerHTML = '';
    var count = S.hands[player].length;
    var show = Math.min(count, 10);
    for (var i = 0; i < show; i++) {
      var b = document.createElement('div');
      b.className = 'back-card';
      b.style.left = (i * 6) + 'px';
      el.appendChild(b);
    }
  }

  function renderSeats() {
    for (var p = 1; p <= 2; p++) {
      var opp = S.opponents && S.opponents[p - 1];
      if (opp) {
        var nameEl = $('name' + p);
        var avatarEl = $('avatar' + p);
        var titleEl = $('title' + p);
        var profile = window.DDZ_OPPONENTS ? window.DDZ_OPPONENTS.getProfile(opp.id) : null;
        var frame = profile && profile.equipped ? profile.equipped.frame : '';
        var title = profile && profile.equipped ? profile.equipped.title : '';
        var frameItem = frame && window.DDZ_SHOP ? window.DDZ_SHOP.getItem(frame) : null;
        var titleItem = title && window.DDZ_SHOP ? window.DDZ_SHOP.getItem(title) : null;
        if (nameEl) nameEl.textContent = opp.name;
        if (avatarEl) {
          avatarEl.textContent = opp.avatar;
          avatarEl.className = 'avatar' + (frameItem ? cosmeticClass(frameItem.id) : '');
        }
        if (titleEl) {
          titleEl.textContent = titleItem ? titleItem.name : '';
          titleEl.hidden = !titleItem;
        }
      } else {
        var emptyTitle = $('title' + p);
        if (emptyTitle) emptyTitle.hidden = true;
      }
      $('count' + p).textContent = S.hands[p].length + ' 张';
      $('seat' + p).classList.toggle('active', S.turn === p && !S.over && S.phase === 'play');
      var badge = $('seat' + p).querySelector('.landlord-badge');
      if (badge) badge.hidden = S.landlord !== p;
      renderBacks(p);
    }
    $('count0').textContent = S.hands[0].length + ' 张';
    $('youLandlord').hidden = S.landlord !== 0;
    document.querySelector('.self').classList.toggle('active', S.turn === 0 && !S.over && S.phase === 'play');
  }

  function renderHand() {
    handEl.innerHTML = '';
    S.hands[0].forEach(function (c) {
      var el = cardEl(c, false);
      el.classList.add('selectable');
      if (S.selected.has(c.id)) el.classList.add('selected');
      handEl.appendChild(el);
    });
    requestAnimationFrame(layoutHand);
  }

  function layoutHand() {
    var n = handEl.children.length;
    if (n < 2) { handEl.style.setProperty('--overlap', '0px'); return; }
    var mobile = window.innerWidth <= 720;
    var cw = mobile ? 46 : 54;
    var avail = handEl.clientWidth - 10;
    var overlap = (avail - n * cw) / (n - 1);
    overlap = Math.max(-34, Math.min(-2, overlap));
    handEl.style.setProperty('--overlap', overlap + 'px');
  }

  function renderLast() {
    lastCardsEl.innerHTML = '';
    if (!S.last) {
      lastLabelEl.textContent = S.phase === 'play' ? '自由出牌' : '准备开始';
      return;
    }
    lastLabelEl.textContent = playerName(S.last.player) + ' 出牌 · ' + S.last.pattern.name;
    S.last.cards.forEach(function (c) { lastCardsEl.appendChild(cardEl(c, true)); });
  }

  function renderActions() {
    actionBar.innerHTML = '';
    if (S.over) return;

    if (S.phase === 'bid') {
      if (S.bidTurn !== 0) {
        actionBar.innerHTML = '<span class="waiting">等待其他玩家叫地主…</span>';
        return;
      }
      var call = document.createElement('button');
      call.className = 'btn primary';
      call.textContent = '叫地主';
      call.onclick = function () { placeBid(0, true); };
      var no = document.createElement('button');
      no.className = 'btn ghost';
      no.textContent = '不叫';
      no.onclick = function () { placeBid(0, false); };
      actionBar.appendChild(no);
      actionBar.appendChild(call);
      return;
    }

    if (S.phase === 'double') {
      var noDouble = document.createElement('button');
      noDouble.className = 'btn ghost';
      noDouble.textContent = '不加注';
      noDouble.title = '按当前底注开局';
      noDouble.onclick = function () { chooseDouble(1); };

      var double2 = document.createElement('button');
      double2.className = 'btn primary';
      double2.textContent = '加倍 ×2';
      double2.title = '本局你的输赢 ×2';
      double2.onclick = function () { chooseDouble(2); };

      var double4 = document.createElement('button');
      double4.className = 'btn danger';
      double4.textContent = '超级 ×4';
      double4.title = '本局你的输赢 ×4，风险更高';
      double4.onclick = function () { chooseDouble(4); };

      actionBar.appendChild(noDouble);
      actionBar.appendChild(double2);
      actionBar.appendChild(double4);
      return;
    }

    if (S.phase !== 'play') return;
    if (S.turn !== 0) {
      actionBar.innerHTML = '<span class="waiting">' + playerName(S.turn) + ' 思考中…</span>';
      return;
    }

    var lead = !S.last;

    var hint = document.createElement('button');
    hint.className = 'btn ghost';
    hint.textContent = '提示';
    hint.onclick = showHint;
    actionBar.appendChild(hint);

    if (!lead) {
      var pass = document.createElement('button');
      pass.className = 'btn danger';
      pass.textContent = '不出';
      pass.onclick = playerPass;
      actionBar.appendChild(pass);
    }

    var play = document.createElement('button');
    play.className = 'btn primary';
    play.textContent = '出牌';
    play.id = 'playBtn';
    play.disabled = true;
    play.onclick = playerPlay;
    actionBar.appendChild(play);

    updatePlayButton();
  }

  function updatePlayButton() {
    var btn = document.getElementById('playBtn');
    if (!btn) return;
    var cards = selectedCards();
    if (!cards.length) { btn.disabled = true; return; }
    var p = analyze(cards);
    btn.disabled = !p || (!(!S.last) && !beats(p, S.last.pattern));
    if (p) {
      if (S.last && !beats(p, S.last.pattern)) messageEl.textContent = p.name + ' · 压不过';
      else messageEl.textContent = p.name;
    } else {
      messageEl.textContent = '牌型不合法';
    }
  }

  function selectedCards() {
    return S.hands[0].filter(function (c) { return S.selected.has(c.id); });
  }

  function renderAll() {
    renderSeats();
    renderHand();
    renderBottom();
    renderLast();
    renderActions();
    renderTopbar();
  }

  function message(text) { messageEl.textContent = text; }

  // ───────────────────────── 发牌 / 叫地主 ─────────────────────────

  function startGame(forceOpponent) {
    if (wallet.beans < currentRoom.entry) {
      openRoomOverlay();
      return;
    }
    S.opponents = window.DDZ_OPPONENTS ? window.DDZ_OPPONENTS.pickPair(forceOpponent) : [];
    S.revengeId = forceOpponent || '';
    clearTimers();
    turnToken++;
    S.hands = [[], [], []];
    S.bottom = [];
    S.landlord = -1;
    S.turn = 0;
    S.last = null;
    S.passCount = 0;
    S.phase = 'deal';
    S.selected.clear();
    S.bidTurn = Math.floor(Math.random() * 3);
    S.bidCount = 0;
    S.over = false;
    S.base = currentRoom.base;
    S.multiplier = 1;
    S.stakeMult = 1;
    S.playCount = [0, 0, 0];
    S.playerBombs = 0;
    S.reasons = [];
    S.round++;
    overlay.hidden = true;
    roomOverlay.hidden = true;
    if (doubleOverlay) doubleOverlay.hidden = true;

    var deck = shuffle(makeDeck());
    for (var i = 0; i < 51; i++) S.hands[i % 3].push(deck[i]);
    S.bottom = deck.slice(51);
    S.hands.forEach(sortHand);

    clearDealNodes();
    message('发牌中…');
    dealAnimation(beginBidding);
  }

  function beginBidding() {
    S.phase = 'bid';
    renderAll();
    $('seat1').classList.remove('active');
    $('seat2').classList.remove('active');

    if (S.bidTurn === 0) {
      message('轮到你先叫地主');
    } else {
      message('叫地主阶段');
      later(function () { aiBid(S.bidTurn); }, 700);
    }
    renderActions();
  }

  var dealNodes = [];

  function clearDealNodes() {
    dealNodes.forEach(function (n) { n.remove(); });
    dealNodes = [];
    Array.prototype.forEach.call(document.querySelectorAll('.deal-fly'), function (n) { n.remove(); });
  }

  function elementCenter(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function equippedBackClass() {
    if (!window.DDZ_SHOP) return '';
    var eq = window.DDZ_SHOP.getEquipped();
    var item = eq && eq.back ? window.DDZ_SHOP.getItem(eq.back) : null;
    return item && item.cls ? ' ' + item.cls : '';
  }

  // 发牌：51 张牌从桌面中央依次飞向三家，结束后再进入叫地主
  function dealAnimation(done) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    handEl.innerHTML = '';
    ['backs1', 'backs2'].forEach(function (id) {
      var el = $(id);
      if (el) el.innerHTML = '';
    });
    bottomEl.innerHTML = '';
    actionBar.innerHTML = '';
    lastCardsEl.innerHTML = '';
    lastLabelEl.textContent = '准备开始';
    ['count0', 'count1', 'count2'].forEach(function (id) {
      var el = $(id);
      if (el) el.textContent = '…';
    });
    ['seat1', 'seat2'].forEach(function (id) {
      var seat = $(id);
      if (!seat) return;
      seat.classList.remove('active');
      var badge = seat.querySelector('.landlord-badge');
      if (badge) badge.hidden = true;
    });
    ['bubble1', 'bubble2'].forEach(function (id) {
      var el = $(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
    if ($('youLandlord')) $('youLandlord').hidden = true;

    if (reduce || !appEl.animate) { done(); return; }

    var box = appEl.getBoundingClientRect();
    var from = { x: box.left + box.width / 2, y: box.top + box.height * 0.43 };
    var targets = [elementCenter(handEl), elementCenter($('backs1')), elementCenter($('backs2'))];
    targets = targets.map(function (t) { return t || from; });

    var backCls = equippedBackClass();
    var gap = 24;
    var dur = 300;
    var total = 51 * gap + dur + 80;

    for (var i = 0; i < 51; i++) {
      var to = targets[i % 3];
      var el = document.createElement('div');
      el.className = 'deal-fly' + backCls;
      el.style.left = from.x + 'px';
      el.style.top = from.y + 'px';
      document.body.appendChild(el);
      dealNodes.push(el);

      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var rot = Math.random() * 22 - 11;
      el.animate([
        { transform: 'translate(-50%, -50%) scale(.82)', opacity: 0 },
        {
          transform: 'translate(calc(-50% + ' + (dx * 0.2) + 'px), calc(-50% + ' + (dy * 0.2 - 14) + 'px)) rotate(' + (rot * 0.5) + 'deg) scale(1)',
          opacity: 1,
          offset: 0.3
        },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot + 'deg) scale(.94)', opacity: .92 }
      ], {
        duration: dur,
        delay: i * gap,
        easing: 'cubic-bezier(.25,.7,.3,1)',
        fill: 'both'
      });

      if (i % 3 === 0) {
        (function (delay) {
          later(function () { sfx('deal', { rate: 0.94 + Math.random() * 0.12 }); }, delay);
        })(i * gap + 40);
      }
      if (i % 6 === 0) {
        (function (n, delay) {
          later(function () {
            ['count1', 'count2'].forEach(function (id) {
              var el = $(id);
              if (el) el.textContent = n + ' 张';
            });
          }, delay);
        })(Math.min(17, Math.floor(i / 3) + 1), i * gap);
      }
    }

    later(function () {
      clearDealNodes();
      done();
    }, total);
  }

  function sfx(name, opts) {
    if (window.DDZ_SFX) window.DDZ_SFX.play(name, opts);
  }

  function handStrength(hand) {
    var score = 0;
    var cnt = new Map();
    hand.forEach(function (c) {
      cnt.set(c.v, (cnt.get(c.v) || 0) + 1);
      if (c.v === 17) score += 4;
      else if (c.v === 16) score += 3;
      else if (c.v === 15) score += 1.5;
      else if (c.v === 14) score += 0.8;
      else if (c.v === 13) score += 0.4;
    });
    cnt.forEach(function (n, v) {
      if (v < 16 && n === 4) score += 4;
    });
    return score;
  }

  function aiBid(player) {
    if (S.phase !== 'bid' || S.bidTurn !== player) return;
    var score = handStrength(S.hands[player]);
    var call = score >= 6 || (S.bidCount === 2 && score >= 3.6);
    if (!call && Math.random() < 0.12 && score > 2) call = true;
    placeBid(player, call);
  }

  function placeBid(player, call) {
    if (S.phase !== 'bid') return;
    var bidText = '不叫';
    if (call) {
      var opp = player !== 0 && S.opponents ? S.opponents[player - 1] : null;
      bidText = opp && window.DDZ_OPPONENTS ? window.DDZ_OPPONENTS.quoteBid(opp.id) : '叫地主！';
    }
    bubble(player, bidText);
    sfx('tap');
    if (player === 0) message(call ? '你叫了地主' : '你选择不叫');

    if (call) {
      setLandlord(player);
      return;
    }
    S.bidCount++;
    if (S.bidCount >= 3) {
      S.phase = 'idle';
      message('三家都不叫，重新发牌…');
      later(startGame, 1100);
      return;
    }
    S.bidTurn = (player + 1) % 3;
    renderActions();
    if (S.bidTurn === 0) {
      message('轮到你叫地主');
      renderActions();
    } else {
      later(function () { aiBid(S.bidTurn); }, 750);
    }
  }

  function setLandlord(player) {
    S.landlord = player;
    S.hands[player] = S.hands[player].concat(S.bottom);
    sortHand(S.hands[player]);
    S.phase = 'double';
    S.turn = player;
    S.last = null;
    S.passCount = 0;
    sfx('tap');
    renderAll();
    message(playerName(player) + ' 成为地主 · 看完牌后选择是否加注');
  }

  // 开局加倍：只放大自己的输赢，不影响对手
  function openDoubleOverlay() {
    if (S.phase !== 'double' || S.over || !doubleOverlay) return;
    var roleText = S.landlord === 0 ? '地主' : '农民';
    var cap = S.base * Math.max(1, S.multiplier) * 4 * (S.landlord === 0 ? 2 : 1);
    if (doubleNoteEl) {
      doubleNoteEl.textContent = '你的身份：' + roleText + ' · 底注 ' + fmtBeans(S.base) +
        ' · 超级加倍单局输赢约 ' + fmtBeans(cap) + ' 盒豆（炸弹、春天继续翻倍）';
    }
    doubleOverlay.hidden = false;
  }

  function chooseDouble(mult) {
    if (S.phase !== 'double' || S.over) return;
    S.stakeMult = mult;
    doubleOverlay.hidden = true;
    S.phase = 'play';
    sfx('tap');
    if (mult > 1) toast('本局已加注 ×' + mult);
    renderAll();
    if (S.landlord !== 0) {
      later(beginTurn, 700);
    } else {
      message('轮到你出牌');
      renderActions();
    }
  }

  // ───────────────────────── 出牌流程 ─────────────────────────

  var lastPlayed = -1;

  function beginTurn() {
    if (S.phase !== 'play' || S.over) return;
    renderAll();
    if (S.turn === 0) {
      message(!S.last ? '你先出牌' : '轮到你出牌');
      return;
    }
    var token = ++turnToken;
    var player = S.turn;
    message(playerName(player) + ' 思考中…');
    later(function () {
      if (token !== turnToken || S.turn !== player || S.phase !== 'play') return;
      aiTurn(player);
    }, 650 + Math.random() * 550);
  }

  function aiTurn(player) {
    if (S.phase !== 'play' || S.turn !== player || S.over) return;
    var hand = S.hands[player];
    var lead = !S.last;

    // 队友快走完时，农民尽量让牌
    if (!lead && S.landlord !== player && S.last.player !== S.landlord && S.last.player !== player) {
      if (S.hands[S.last.player].length <= 2) {
        passTurn(player);
        return;
      }
    }
    // 对手只剩一张时，尽量出大单张
    var choice = lead ? chooseLead(hand) : chooseFollow(hand, S.last.pattern);
    if (!choice) {
      if (lead) choice = [hand[hand.length - 1]];
      else { passTurn(player); return; }
    }
    playCards(player, choice, true);
  }

  function playCards(player, cards, fromAI) {
    if (S.phase !== 'play' || S.turn !== player || S.over) return;
    var pattern = analyze(cards);
    if (!pattern) {
      if (!fromAI) toast('牌型不合法');
      return;
    }
    if (S.last && !beats(pattern, S.last.pattern)) {
      if (!fromAI) toast('压不过上家的牌');
      return;
    }
    S.playCount[player]++;
    var raised = pattern.type === 'bomb' || pattern.type === 'rocket';
    if (raised) {
      S.multiplier = Math.min(MAX_MULTIPLIER, S.multiplier * 2);
      S.reasons.push(pattern.name);
      if (player === 0) S.playerBombs++;
    }
    var ids = new Set(cards.map(function (c) { return c.id; }));
    S.hands[player] = S.hands[player].filter(function (c) { return !ids.has(c.id); });
    S.last = { player: player, cards: cards.slice().sort(function (a, b) { return a.v - b.v; }), pattern: pattern };
    S.passCount = 0;
    lastPlayed = player;
    if (!fromAI) S.selected.clear();
    bubble(player, pattern.name + (raised ? ' ×2' : ''));
    sfx(raised ? 'bomb' : 'play');
    renderAll();
    message(playerName(player) + ' 出 ' + pattern.name + (raised ? ' · 倍数 ×' + S.multiplier : ''));

    if (!S.hands[player].length) {
      endGame(player);
      return;
    }
    S.turn = (player + 1) % 3;
    beginTurn();
  }

  function passTurn(player) {
    if (S.phase !== 'play' || S.turn !== player || S.over) return;
    if (!S.last) {
      if (player === 0) toast('你是先手，必须出牌');
      return;
    }
    bubble(player, '不出');
    sfx('tap');
    S.passCount++;
    message(playerName(player) + ' 不出');
    S.turn = (player + 1) % 3;
    if (S.passCount >= 2) {
      S.last = null;
      S.passCount = 0;
      message('两家不出，' + playerName(S.turn) + ' 重新出牌');
    }
    beginTurn();
  }

  function playerPlay() {
    if (S.turn !== 0 || S.phase !== 'play') return;
    var cards = selectedCards();
    if (!cards.length) { toast('先选牌'); return; }
    playCards(0, cards, false);
  }

  function playerPass() {
    if (S.turn !== 0 || S.phase !== 'play') return;
    if (!S.last) { toast('先手必须出牌'); return; }
    passTurn(0);
  }

  function showHint() {
    if (S.turn !== 0 || S.phase !== 'play') return;
    var choice = S.last ? chooseFollow(S.hands[0], S.last.pattern) : chooseLead(S.hands[0]);
    if (!choice || !choice.length) { toast('没有能出的牌'); return; }
    S.selected.clear();
    choice.forEach(function (c) { S.selected.add(c.id); });
    renderHand();
    updatePlayButton();
  }

  function settleWallet(youWin) {
    var stake = S.base * S.multiplier * (S.stakeMult || 1);
    var theoretical = youWin
      ? (S.landlord === 0 ? stake * 2 : stake)
      : -(S.landlord === 0 ? stake * 2 : stake);
    var before = wallet.beans;
    var afterGame = Math.max(0, before + theoretical);
    var delta = afterGame - before;

    var firstWin = 0;
    var today = todayKey();
    if (youWin && wallet.lastFirstWin !== today) {
      firstWin = FIRST_WIN_BONUS;
      afterGame += firstWin;
      wallet.lastFirstWin = today;
    }
    // 连胜加成：2 连胜 +10%，3 连胜 +20%，4 连胜 +30%，5 连胜及以上 +40%
    var streakPct = youWin ? Math.min(0.4, Math.max(0, ((stats.streak || 0) - 1) * 0.1)) : 0;
    var streakBonus = streakPct > 0 ? Math.min(MAX_STREAK_BONUS, Math.round(Math.abs(theoretical) * streakPct)) : 0;
    afterGame += streakBonus;
    wallet.beans = afterGame;
    if (delta + firstWin + streakBonus > 0) {
      wallet.biggestWin = Math.max(wallet.biggestWin || 0, delta + firstWin + streakBonus);
    }
    saveWallet();

    var bailout = ensureSolvent();
    return {
      delta: delta,
      before: before,
      after: wallet.beans,
      firstWin: firstWin,
      bailout: bailout,
      streakBonus: streakBonus,
      streakPct: streakPct,
      stake: stake,
      capped: delta !== theoretical
    };
  }

  function endGame(winner) {
    S.phase = 'over';
    S.over = true;
    turnToken++;
    var landlordWin = winner === S.landlord;
    var youWin = (S.landlord === 0 && landlordWin) || (S.landlord !== 0 && !landlordWin);
    var prevStreak = stats.streak || 0;
    if (youWin) {
      stats.win++;
      stats.streak = prevStreak + 1;
      stats.bestStreak = Math.max(stats.bestStreak || 0, stats.streak);
      if (S.landlord === 0) stats.landlordWins = (stats.landlordWins || 0) + 1;
    } else {
      stats.lose++;
      stats.streak = 0;
    }
    stats.bombs = (stats.bombs || 0) + S.playerBombs;
    saveStats();

    var springName = '';
    if (landlordWin) {
      var farmer1 = (S.landlord + 1) % 3;
      var farmer2 = (S.landlord + 2) % 3;
      if (S.playCount[farmer1] === 0 && S.playCount[farmer2] === 0) springName = '春天';
    } else if (S.playCount[S.landlord] === 1) {
      springName = '反春';
    }
    if (springName) {
      S.multiplier = Math.min(MAX_MULTIPLIER, S.multiplier * 2);
      S.reasons.push(springName);
      stats.springs = (stats.springs || 0) + 1;
      saveStats();
    }

    var aiResult = { purchases: [], reactions: [], revenge: null };
    if (window.DDZ_OPPONENTS && S.opponents && S.opponents.length) {
      aiResult = window.DDZ_OPPONENTS.settle({
        landlord: S.landlord,
        winner: winner,
        youWin: youWin,
        base: S.base,
        multiplier: S.multiplier,
        stakeMult: S.stakeMult,
        opponents: S.opponents
      }) || aiResult;
    }

    var result = settleWallet(youWin);

    // 复仇局：赢了给一笔小额奖励，输了记下这笔账
    var revengeWin = !!(youWin && S.revengeId);
    var revengeBonus = 0;
    if (revengeWin) {
      revengeBonus = 300;
      wallet.beans += revengeBonus;
      saveWallet();
      result.after = wallet.beans;
    }

    if (window.DDZ_MISSIONS) {
      window.DDZ_MISSIONS.record({ win: youWin, bombs: S.playerBombs });
    }

    var aiNews = '';
    if (aiResult.purchases && aiResult.purchases.length) {
      aiNews = '<br><span class="ai-news">对手动态：</span>' + aiResult.purchases.map(function (e) {
        var kind = e.item.cat === 'frame' ? '头像框' : '称号';
        return e.ai.name + ' 换上了「' + e.item.name + '」' + kind;
      }).join('<br>');
    }
    var reactionText = '';
    if (aiResult.reactions && aiResult.reactions.length) {
      reactionText = '<br><span class="ai-news">对手反应：</span>' + aiResult.reactions.map(function (line) {
        return line;
      }).join('<br>');
    }

    revengeTargetId = aiResult.revenge ? aiResult.revenge.id : '';
    if (revengeBtn) {
      revengeBtn.hidden = !revengeTargetId;
      if (revengeTargetId) {
        revengeBtn.textContent = '找 ' + aiResult.revenge.name + ' 复仇 · 已连输 ' + aiResult.revenge.count + ' 局';
      }
    }

    var deltaText = (result.delta >= 0 ? '+' : '') + fmtBeans(result.delta);
    var reasonText = S.reasons.length ? '<br>倍率来源：' + S.reasons.join('、') : '';
    var roleMult = S.landlord === 0 ? 2 : 1;
    var roleText = S.landlord === 0 ? '地主 2' : '农民 1';
    var title = landlordWin ? '地主胜利' : '农民胜利';
    resultTitle.textContent = title;
    resultTitle.style.color = landlordWin ? 'var(--gb-amber)' : 'var(--gb-teal)';
    var claimable = window.DDZ_MISSIONS ? window.DDZ_MISSIONS.claimableCount() : 0;
    resultSub.innerHTML =
      (youWin ? '🎉 你赢了这一局' : '😮 你输了这一局') +
      '<br>你的身份：' + (S.landlord === 0 ? '地主' : '农民') +
      '<br>场次：' + currentRoom.name + ' · 底注 ' + fmtBeans(S.base) + ' × 倍数 ' + S.multiplier + (S.stakeMult > 1 ? ' × 加注 ' + S.stakeMult : '') + ' × ' + roleText + ' = ' + fmtBeans(result.stake * roleMult) +
      reasonText +
      '<br>本局盈亏：<span class="result-' + (result.delta >= 0 ? 'gain' : 'loss') + '">' + deltaText + ' 盒豆</span>' +
      (result.capped && result.delta < 0 ? '（余额不足，按实际余额结算）' : '') +
      (result.streakBonus ? '<br>连胜 ' + stats.streak + ' 局 · 加成 +' + fmtBeans(result.streakBonus) + ' 盒豆（+' + Math.round(result.streakPct * 100) + '%）' : '') +
      (!youWin && prevStreak >= 2 ? '<br>连胜中断（此前 ' + prevStreak + ' 连胜）' : '') +
      (result.firstWin ? '<br>每日首胜 +' + fmtBeans(result.firstWin) + ' 盒豆' : '') +
      (result.bailout ? '<br>破产补助 +' + fmtBeans(result.bailout) + ' 盒豆' : '') +
      (revengeBonus ? '<br>复仇成功 +' + fmtBeans(revengeBonus) + ' 盒豆' : '') +
      (S.revengeId && !youWin ? '<br>复仇失败，这笔账先记着。' : '') +
      '<br>盒豆：' + fmtBeans(result.before) + ' → ' + fmtBeans(result.after) +
      '<br>战绩：' + stats.win + ' 胜 / ' + stats.lose + ' 负 · 当前 ' + (stats.streak || 0) + ' 连胜 · 最高 ' + (stats.bestStreak || 0) + ' 连胜' +
      (claimable ? '<br>每日契约：有 ' + claimable + ' 个奖励可领取' : '') +
      reactionText +
      aiNews;
    sfx(youWin ? 'win' : 'lose');
    overlay.hidden = false;
    renderAll();
    message(title);
  }

  // ───────────────────────── 交互 ─────────────────────────

  handEl.addEventListener('click', function (e) {
    var el = e.target.closest('.card');
    if (!el || S.phase !== 'play' || S.turn !== 0 || S.over) return;
    var id = Number(el.dataset.id);
    if (S.selected.has(id)) S.selected.delete(id);
    else S.selected.add(id);
    el.classList.toggle('selected');
    updatePlayButton();
  });

  window.addEventListener('resize', layoutHand);

  roomChipEl.addEventListener('click', openRoomOverlay);

  if (soundBtnEl) {
    soundBtnEl.addEventListener('click', function () {
      if (!window.DDZ_SFX) return;
      window.DDZ_SFX.setEnabled(!window.DDZ_SFX.isEnabled());
      renderSoundBtn();
    });
  }
  renderSoundBtn();

  if (missionBtnEl) {
    missionBtnEl.addEventListener('click', function () {
      if (!window.DDZ_MISSIONS) { toast('每日契约正在加载'); return; }
      window.DDZ_MISSIONS.open();
    });
  }

  if (revengeBtn) {
    revengeBtn.addEventListener('click', function () {
      if (!revengeTargetId) return;
      var id = revengeTargetId;
      overlay.hidden = true;
      startGame(id);
    });
  }

  [['doubleNo', 1], ['doubleX2', 2], ['doubleX4', 4]].forEach(function (pair) {
    var btn = document.getElementById(pair[0]);
    if (btn) btn.addEventListener('click', function () { chooseDouble(pair[1]); });
  });

  function openShop() {
    if (window.DDZ_SHOP) window.DDZ_SHOP.open();
    else toast('小铺正在加载');
  }

  function openOpponent(index) {
    var opp = S.opponents && S.opponents[index];
    if (!opp || !window.DDZ_OPPONENTS) {
      toast('本局对手资料还没准备好');
      return;
    }
    window.DDZ_OPPONENTS.openProfile(opp.id);
  }

  if (walletChipEl) walletChipEl.addEventListener('click', openShop);
  if (resultShopBtn) resultShopBtn.addEventListener('click', openShop);
  if (roomShopBtn) roomShopBtn.addEventListener('click', openShop);
  if ($('avatar1')) $('avatar1').addEventListener('click', function () { openOpponent(0); });
  if ($('avatar2')) $('avatar2').addEventListener('click', function () { openOpponent(1); });

  document.getElementById('againBtn').addEventListener('click', function () {
    overlay.hidden = true;
    startGame();
  });

  document.getElementById('changeRoomBtn').addEventListener('click', function () {
    overlay.hidden = true;
    openRoomOverlay();
  });

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (window.DDZ_SHOP) window.DDZ_SHOP.close();
    if (window.DDZ_OPPONENTS) window.DDZ_OPPONENTS.closeProfile();
  });

  if (window.DDZ_SHOP) {
    window.DDZ_SHOP.init({
      getBeans: function () { return wallet.beans; },
      spend: spendBeans,
      floor: SOLVENT_FLOOR,
      onEquip: applyPlayerCosmetics,
      toast: toast
    });
  }

  if (window.DDZ_MISSIONS) {
    window.DDZ_MISSIONS.init({
      addBeans: function (amount) {
        wallet.beans += amount;
        saveWallet();
        renderTopbar();
        if (roomOverlay && !roomOverlay.hidden) renderRoomList();
      },
      toast: toast,
      onChange: function () { renderTopbar(); }
    });
  }
  if (window.DDZ_OPPONENTS) window.DDZ_OPPONENTS.init({ toast: toast });
  applyPlayerCosmetics(window.DDZ_SHOP ? window.DDZ_SHOP.getEquipped() : null);

  var dailyBonus = claimDaily();
  var initialBailout = ensureSolvent();
  renderAll();
  openRoomOverlay();
  if (dailyBonus || initialBailout) {
    setTimeout(function () {
      var gifts = [];
      if (dailyBonus) gifts.push('每日登录 +' + fmtBeans(dailyBonus));
      if (initialBailout) gifts.push('破产补助 +' + fmtBeans(initialBailout));
      toast(gifts.join(' · '));
    }, 350);
  }

  // 自动化测试入口
  window.DDZ = {
    analyze: analyze,
    beats: beats,
    genBeats: genBeats,
    chooseLead: chooseLead,
    chooseFollow: chooseFollow,
    state: S,
    simulate: simulate,
    render: renderAll,
    wallet: wallet,
    shop: window.DDZ_SHOP,
    opponents: window.DDZ_OPPONENTS,
    getOpponents: function () { return S.opponents.slice(); },
    openShop: openShop,
    openOpponent: openOpponent,
    rooms: ROOMS,
    getRoom: function () { return currentRoom; },
    setRoom: function (id) {
      var room = ROOMS.filter(function (r) { return r.id === id; })[0];
      if (room) currentRoom = room;
      return currentRoom;
    },
    startGame: startGame,
    endGame: endGame,
    openRoom: openRoomOverlay,
    saveWallet: saveWallet
  };

  // 纯 AI 模拟：用于验证规则不会卡死
  function simulate(maxTurns) {
    maxTurns = maxTurns || 400;
    var hands = [[], [], []];
    var deck = shuffle(makeDeck());
    for (var i = 0; i < 51; i++) hands[i % 3].push(deck[i]);
    var bottom = deck.slice(51);
    hands.forEach(sortHand);
    var landlord = Math.floor(Math.random() * 3);
    hands[landlord] = hands[landlord].concat(bottom);
    sortHand(hands[landlord]);
    var turn = landlord;
    var last = null;
    var passes = 0;
    var turns = 0;

    while (turns++ < maxTurns) {
      var hand = hands[turn];
      if (!hand.length) return { ok: true, turns: turns, winner: turn };
      var lead = !last;
      var choice = lead ? chooseLead(hand) : chooseFollow(hand, last.pattern);
      if (!choice) {
        if (lead) return { ok: false, reason: 'lead-no-choice', turn: turn };
        passes++;
        turn = (turn + 1) % 3;
        if (passes >= 2) { last = null; passes = 0; }
        continue;
      }
      var p = analyze(choice);
      if (!p) return { ok: false, reason: 'invalid-pattern', turn: turn, cards: choice.map(function (c) { return c.v; }) };
      if (last && !beats(p, last.pattern)) return { ok: false, reason: 'cannot-beat', turn: turn };
      var ids = new Set(choice.map(function (c) { return c.id; }));
      hands[turn] = hands[turn].filter(function (c) { return !ids.has(c.id); });
      last = { player: turn, cards: choice, pattern: p };
      passes = 0;
      if (!hands[turn].length) return { ok: true, turns: turns, winner: turn };
      turn = (turn + 1) % 3;
    }
    return { ok: false, reason: 'timeout', turns: turns };
  }
})();
