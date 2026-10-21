/* 麻将 · 纯前端单机版（推倒胡，你 vs 三个 AI） */
(function () {
  'use strict';

  // ───────────────────────── 牌 ─────────────────────────

  var SUITS = ['m', 's', 'p'];
  var HONOR_NAMES = ['东', '南', '西', '北', '中', '发', '白'];
  var NAMES = ['你', '小满', '阿静', '阿福'];
  var SUIT_ORDER = { m: 0, s: 1, p: 2, z: 3 };
  var SUIT_LABEL = { m: '万', s: '条', p: '筒' };

  var uid = 0;
  function makeWall() {
    var wall = [];
    SUITS.forEach(function (s) {
      for (var r = 1; r <= 9; r++) {
        for (var k = 0; k < 4; k++) wall.push({ id: uid++, s: s, r: r });
      }
    });
    for (var h = 1; h <= 7; h++) {
      for (var k2 = 0; k2 < 4; k2++) wall.push({ id: uid++, s: 'z', r: h });
    }
    return wall;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sortTiles(a) {
    a.sort(function (x, y) {
      return SUIT_ORDER[x.s] - SUIT_ORDER[y.s] || x.r - y.r || x.id - y.id;
    });
  }

  function idx(t) {
    if (t.s === 'm') return t.r - 1;
    if (t.s === 's') return 9 + t.r - 1;
    if (t.s === 'p') return 18 + t.r - 1;
    return 27 + t.r - 1;
  }

  function sameTile(a, b) { return a.s === b.s && a.r === b.r; }

  function countOf(hand, tile) {
    var n = 0;
    for (var i = 0; i < hand.length; i++) if (sameTile(hand[i], tile)) n++;
    return n;
  }

  function tileName(t) {
    return t.s === 'z' ? HONOR_NAMES[t.r - 1] : t.r + SUIT_LABEL[t.s];
  }

  // ───────────────────────── 胡牌判断 ─────────────────────────

  function isSevenPairs(counts) {
    var pairs = 0;
    for (var i = 0; i < counts.length; i++) {
      if (counts[i] % 2 !== 0) return false;
      pairs += counts[i] / 2;
    }
    return pairs === 7;
  }

  function canFormSets(counts, need) {
    if (need === 0) {
      for (var i = 0; i < counts.length; i++) if (counts[i] !== 0) return false;
      return true;
    }
    var first = -1;
    for (var j = 0; j < counts.length; j++) { if (counts[j] > 0) { first = j; break; } }
    if (first < 0) return false;

    if (counts[first] >= 3) {
      counts[first] -= 3;
      var ok = canFormSets(counts, need - 1);
      counts[first] += 3;
      if (ok) return true;
    }
    if (first < 27 && first % 9 <= 6 && counts[first + 1] > 0 && counts[first + 2] > 0) {
      counts[first]--; counts[first + 1]--; counts[first + 2]--;
      var ok2 = canFormSets(counts, need - 1);
      counts[first]++; counts[first + 1]++; counts[first + 2]++;
      if (ok2) return true;
    }
    return false;
  }

  // tiles: 手牌；meldCount: 已碰/杠/吃的组数
  function canWin(tiles, meldCount) {
    if (tiles.length + meldCount * 3 !== 14) return false;
    var counts = new Array(34).fill(0);
    tiles.forEach(function (t) { counts[idx(t)]++; });
    if (meldCount === 0 && tiles.length === 14 && isSevenPairs(counts)) return true;
    var need = 4 - meldCount;
    for (var i = 0; i < 34; i++) {
      if (counts[i] >= 2) {
        counts[i] -= 2;
        var ok = canFormSets(counts, need);
        counts[i] += 2;
        if (ok) return true;
      }
    }
    return false;
  }

  // ───────────────────────── 吃 / 碰 / 杠 ─────────────────────────

  function chowOptions(hand, tile) {
    if (tile.s === 'z') return [];
    var opts = [];
    [[-2, -1], [-1, 1], [1, 2]].forEach(function (pair) {
      var r1 = tile.r + pair[0], r2 = tile.r + pair[1];
      if (r1 < 1 || r2 > 9 || r1 > 9 || r2 < 1) return;
      var a = null, b = null;
      hand.forEach(function (t) {
        if (!a && t.s === tile.s && t.r === r1) { a = t; return; }
        if (a && !b && t.s === tile.s && t.r === r2) b = t;
      });
      if (a && b) opts.push([a, b]);
    });
    return opts;
  }

  function canPung(hand, tile) { return countOf(hand, tile) >= 2; }
  function canKong(hand, tile) { return countOf(hand, tile) >= 3; }

  function computeClaims(discarder, tile) {
    var claims = [];
    for (var p = 0; p < 4; p++) {
      if (p === discarder) continue;
      var hand = S.hands[p];
      var c = { player: p, hu: false, pung: false, kong: false, chow: [] };
      if (canWin(hand.concat([tile]), S.melds[p].length)) c.hu = true;
      if (canKong(hand, tile)) c.kong = true;
      if (canPung(hand, tile)) c.pung = true;
      if (p === (discarder + 1) % 4) c.chow = chowOptions(hand, tile);
      if (c.hu || c.kong || c.pung || c.chow.length) claims.push(c);
    }
    return claims;
  }

  function claimRank(c) {
    if (c.hu) return 4;
    if (c.kong) return 3;
    if (c.pung) return 2;
    if (c.chow.length) return 1;
    return 0;
  }

  function distance(from, to) { return (to - from + 4) % 4; }

  // 从手牌里取出 n 张与 tile 相同的牌，返回取出的牌和剩余手牌
  function removeMatches(hand, tile, n) {
    var taken = [];
    var rest = [];
    hand.forEach(function (t) {
      if (taken.length < n && sameTile(t, tile)) taken.push(t);
      else rest.push(t);
    });
    return { taken: taken, rest: rest };
  }

  // ───────────────────────── 状态 ─────────────────────────

  var S = {
    hands: [[], [], [], []],
    melds: [[], [], [], []],
    discards: [[], [], [], []],
    discardOrder: [],
    wall: [],
    wallPos: 0,
    dealer: -1,
    turn: 0,
    phase: 'idle',
    lastDiscard: null,
    lastDrawn: null,
    selected: null,
    pending: null,
    over: false,
    round: 0,
  };

  var stats = loadStats();
  var timers = [];

  function loadStats() {
    try {
      var s = JSON.parse(localStorage.getItem('gamebox_mj_stats') || 'null');
      return s && typeof s.win === 'number' ? s : { win: 0, lose: 0 };
    } catch (e) { return { win: 0, lose: 0 }; }
  }
  function saveStats() {
    try { localStorage.setItem('gamebox_mj_stats', JSON.stringify(stats)); } catch (e) {}
  }

  function later(fn, ms) {
    var t = setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
    return t;
  }
  function schedule(fn, ms) { return later(fn, ms); }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // ───────────────────────── DOM ─────────────────────────

  var handEl = document.getElementById('hand');
  var actionBar = document.getElementById('actionBar');
  var poolEl = document.getElementById('pool');
  var claimTipEl = document.getElementById('claimTip');
  var lastHintEl = document.getElementById('lastHint');
  var wallBadgeEl = document.getElementById('wallBadge');
  var overlay = document.getElementById('overlay');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1500);
  }

  function $(id) { return document.getElementById(id); }

  function tileEl(t, extra) {
    var el = document.createElement('div');
    el.className = 'tile ' + t.s + (t.s === 'z' ? ' honor' : '') + (extra ? ' ' + extra : '');
    if (t.s === 'z') {
      var color = t.r === 5 ? 'red' : t.r === 6 ? 'green' : t.r === 7 ? 'blue' : '';
      el.innerHTML = '<span class="num ' + color + '">' + HONOR_NAMES[t.r - 1] + '</span>';
    } else {
      el.innerHTML = '<span class="num">' + t.r + '</span><span class="suit">' + SUIT_LABEL[t.s] + '</span>';
    }
    el.dataset.id = t.id;
    return el;
  }

  function renderOppBacks(p) {
    var el = $('backs' + p);
    if (!el) return;
    el.innerHTML = '';
    var limit = window.innerWidth <= 720 ? 10 : 13;
    var n = Math.min(S.hands[p].length, limit);
    for (var i = 0; i < n; i++) {
      var b = document.createElement('div');
      b.className = 'tile-back';
      el.appendChild(b);
    }
  }

  function renderMelds(p) {
    var el = $('melds' + p);
    if (!el) return;
    el.innerHTML = '';
    S.melds[p].forEach(function (m) {
      var wrap = document.createElement('div');
      wrap.className = 'meld';
      m.tiles.forEach(function (t) { wrap.appendChild(tileEl(t, 'mini')); });
      el.appendChild(wrap);
    });
  }

  function renderOpponents() {
    for (var p = 1; p < 4; p++) {
      var seat = $('opp' + p);
      if (!seat) continue;
      seat.classList.toggle('active', S.turn === p && !S.over && (S.phase === 'discard' || S.phase === 'draw'));
      var count = $('count' + p);
      count.textContent = (S.dealer === p ? '庄 · ' : '') + S.hands[p].length + ' 张';
      renderOppBacks(p);
      renderMelds(p);
    }
    $('youDealer').hidden = S.dealer !== 0;
    var self = document.querySelector('.self');
    self.classList.toggle('active', S.turn === 0 && !S.over && (S.phase === 'discard' || S.phase === 'draw'));
  }

  function renderHand() {
    handEl.innerHTML = '';
    S.hands[0].forEach(function (t) {
      var el = tileEl(t, 'selectable');
      if (S.selected === t.id) el.classList.add('selected');
      el.addEventListener('click', function () { onHandClick(t.id); });
      handEl.appendChild(el);
    });
    requestAnimationFrame(layoutHand);
  }

  function layoutHand() {
    var n = handEl.children.length;
    if (n < 2) { handEl.style.setProperty('--overlap', '0px'); return; }
    var mobile = window.innerWidth <= 720;
    var tw = mobile ? 34 : 40;
    var avail = handEl.clientWidth - 8;
    var overlap = (avail - n * tw) / (n - 1);
    overlap = Math.max(-24, Math.min(0, overlap));
    handEl.style.setProperty('--overlap', overlap + 'px');
  }

  function renderPool() {
    poolEl.innerHTML = '';
    S.discardOrder.forEach(function (item) {
      var el = tileEl(item.tile, 'discard p' + item.p);
      if (S.lastDiscard && S.lastDiscard.tile.id === item.tile.id) el.classList.add('last');
      el.title = NAMES[item.p] + ' 打出 ' + tileName(item.tile);
      poolEl.appendChild(el);
    });
    wallBadgeEl.textContent = '牌墙 ' + Math.max(0, S.wall.length - S.wallPos);
    if (S.lastDiscard) {
      lastHintEl.textContent = NAMES[S.lastDiscard.p] + ' 打出 ' + tileName(S.lastDiscard.tile);
    } else {
      lastHintEl.textContent = S.phase === 'discard' && S.turn === 0 ? '轮到你出牌' : '进行中';
    }
  }

  function renderActions() {
    actionBar.innerHTML = '';
    if (S.over) return;

    if (S.phase === 'claimPlayer' && S.pending) {
      var c = S.pending.claims.find(function (x) { return x.player === 0; });
      if (!c) return;
      if (c.hu) addBtn('胡', 'primary', playerHuOnDiscard);
      if (c.kong) addBtn('杠', '', function () { playerClaimKong(S.pending.tile); });
      if (c.pung) addBtn('碰', '', function () { playerClaimPung(S.pending.tile); });
      if (c.chow.length) {
        c.chow.forEach(function (pair) {
          addBtn('吃 ' + [S.pending.tile].concat(pair).sort(function (a, b) { return a.r - b.r; }).map(tileName).join(' '), '', function () {
            playerClaimChow(S.pending.tile, pair);
          });
        });
      }
      addBtn('过', 'ghost', playerPassClaim);
      claimTipEl.textContent = '你可以对 ' + tileName(S.pending.tile) + ' 进行操作';
      return;
    }

    if (S.phase === 'discard' && S.turn === 0 && !S.over) {
      var win = canWin(S.hands[0], S.melds[0].length);
      if (win) addBtn('胡', 'primary', playerHuSelf);
      var quad = findQuad(S.hands[0]);
      if (quad) addBtn('暗杠', '', function () { doConcealedKong(0, quad); });
      if (S.selected) addBtn('打出', 'primary', discardSelected);
      claimTipEl.textContent = win ? '可以自摸胡牌！' : (S.selected ? '再点一次手牌也可以打出' : '点击手牌选择，再点“打出”');
      return;
    }

    claimTipEl.textContent = '';
    var txt = document.createElement('span');
    txt.className = 'waiting';
    if (S.phase === 'discard' && S.turn !== 0) txt.textContent = NAMES[S.turn] + ' 思考中…';
    else if (S.phase === 'claim') txt.textContent = '等待其他玩家…';
    else txt.textContent = S.phase === 'over' ? '' : '等待发牌…';
    actionBar.appendChild(txt);
  }

  function addBtn(label, cls, fn) {
    var b = document.createElement('button');
    b.className = 'btn ' + (cls || '');
    b.textContent = label;
    b.addEventListener('click', fn);
    actionBar.appendChild(b);
  }

  function renderAll() {
    renderOpponents();
    renderHand();
    renderMelds(0);
    renderPool();
    renderActions();
  }

  // ───────────────────────── 开局 ─────────────────────────

  function startRound() {
    clearTimers();
    S.round++;
    if (S.dealer < 0) S.dealer = Math.floor(Math.random() * 4);
    else S.dealer = (S.dealer + 1) % 4;

    S.hands = [[], [], [], []];
    S.melds = [[], [], [], []];
    S.discards = [[], [], [], []];
    S.discardOrder = [];
    S.wall = shuffle(makeWall());
    S.wallPos = 0;
    S.lastDiscard = null;
    S.lastDrawn = null;
    S.selected = null;
    S.pending = null;
    S.over = false;
    S.phase = 'discard';
    S.turn = S.dealer;

    for (var i = 0; i < 13; i++) {
      for (var p = 0; p < 4; p++) S.hands[p].push(S.wall[S.wallPos++]);
    }
    S.hands[S.dealer].push(S.wall[S.wallPos++]);
    S.hands.forEach(sortTiles);

    overlay.hidden = true;
    renderAll();
    claimTipEl.textContent = '';

    if (S.dealer === 0) {
      claimTipEl.textContent = '你是庄家，请先出牌';
      renderActions();
    } else {
      schedule(function () { aiDiscardTurn(S.dealer); }, 800);
    }
  }

  // ───────────────────────── 出牌 ─────────────────────────

  function discardSelected() {
    if (S.phase !== 'discard' || S.turn !== 0 || !S.selected || S.over) return;
    var tile = S.hands[0].find(function (t) { return t.id === S.selected; });
    if (!tile) return;
    discardTile(0, tile);
  }

  function onHandClick(id) {
    if (S.phase !== 'discard' || S.turn !== 0 || S.over) return;
    if (S.selected === id) {
      S.selected = id;
      discardSelected();
      return;
    }
    S.selected = id;
    renderHand();
    renderActions();
  }

  function discardTile(p, tile) {
    if (S.over) return;
    S.hands[p] = S.hands[p].filter(function (t) { return t.id !== tile.id; });
    S.discards[p].push(tile);
    S.discardOrder.push({ p: p, tile: tile });
    S.lastDiscard = { p: p, tile: tile };
    S.selected = null;
    S.phase = 'claim';
    renderAll();
    schedule(function () { resolveDiscard(p); }, p === 0 ? 320 : 430);
  }

  function removeDiscard(discarder, tile) {
    S.discards[discarder] = S.discards[discarder].filter(function (t) { return t.id !== tile.id; });
    S.discardOrder = S.discardOrder.filter(function (x) { return x.tile.id !== tile.id; });
    S.lastDiscard = null;
  }

  function resolveDiscard(discarder) {
    if (S.phase !== 'claim' || S.over) return;
    var tile = S.lastDiscard && S.lastDiscard.tile;
    if (!tile) return;
    var claims = computeClaims(discarder, tile);
    var pc = claims.find(function (c) { return c.player === 0; });

    if (pc) {
      S.pending = { discarder: discarder, tile: tile, claims: claims };
      S.phase = 'claimPlayer';
      renderAll();
      return;
    }
    resolveAIClaims(discarder, claims.filter(function (c) { return c.player !== 0; }));
  }

  function resolveAIClaims(discarder, claims) {
    if (S.over) return;
    // AI 不会见碰就碰、见吃就吃，避免把好牌拆散
    claims = claims.filter(function (c) {
      if (c.hu) return true;
      if (c.kong) return true;
      if (c.pung) return Math.random() < 0.55;
      if (c.chow.length) return Math.random() < 0.3;
      return false;
    });
    if (!claims.length) {
      nextTurn(discarder);
      return;
    }
    claims.sort(function (a, b) {
      return claimRank(b) - claimRank(a) || distance(discarder, a.player) - distance(discarder, b.player);
    });
    var best = claims[0];
    if (best.hu) {
      endRound(best.player, '点炮', S.lastDiscard.tile);
      return;
    }
    if (best.kong) { aiClaimKong(best.player, discarder, S.lastDiscard.tile); return; }
    if (best.pung) { aiClaimPung(best.player, discarder, S.lastDiscard.tile); return; }
    if (best.chow.length) { aiClaimChow(best.player, discarder, S.lastDiscard.tile, best.chow[0]); return; }
    nextTurn(discarder);
  }

  function nextTurn(prev) {
    if (S.over) return;
    S.turn = (prev + 1) % 4;
    S.lastDiscard = null;
    S.phase = 'draw';
    renderAll();
    schedule(function () { drawTile(S.turn, false); }, 260);
  }

  function drawTile(p, replacement) {
    if (S.over || S.turn !== p) return;
    if (S.wallPos >= S.wall.length) {
      endRound(-1, '流局', null);
      return;
    }
    var tile = S.wall[S.wallPos++];
    S.hands[p].push(tile);
    sortTiles(S.hands[p]);
    S.lastDrawn = tile;
    S.phase = 'discard';
    S.selected = null;
    renderAll();

    if (canWin(S.hands[p], S.melds[p].length)) {
      if (p === 0) {
        renderActions();
        return;
      }
      endRound(p, '自摸', tile);
      return;
    }

    if (p === 0) {
      renderActions();
    } else {
      schedule(function () { aiDiscardTurn(p); }, 700 + Math.random() * 450);
    }
  }

  // ───────────────────────── AI ─────────────────────────

  function findQuad(hand) {
    var m = new Map();
    for (var i = 0; i < hand.length; i++) {
      var k = hand[i].s + hand[i].r;
      m.set(k, (m.get(k) || 0) + 1);
    }
    for (var j = 0; j < hand.length; j++) {
      if (m.get(hand[j].s + hand[j].r) >= 4) return hand[j];
    }
    return null;
  }

  function tileUsefulness(tile, hand) {
    var score = 0;
    var same = countOf(hand, tile);
    score += (same - 1) * 7;
    if (tile.s === 'z') {
      if (same === 1) score -= 2.2;
      return score;
    }
    for (var d = -2; d <= 2; d++) {
      if (d === 0) continue;
      var r = tile.r + d;
      if (r < 1 || r > 9) continue;
      var c = 0;
      hand.forEach(function (t) { if (t.s === tile.s && t.r === r) c++; });
      if (c) score += Math.abs(d) === 1 ? 2.6 : 1.2;
    }
    if (tile.r >= 3 && tile.r <= 7) score += 0.5;
    if (tile.r === 1 || tile.r === 9) score -= 0.5;
    return score;
  }

  function chooseDiscard(hand) {
    var best = null;
    var bestScore = Infinity;
    hand.forEach(function (t) {
      var s = tileUsefulness(t, hand) + Math.random() * 0.4;
      if (s < bestScore) { bestScore = s; best = t; }
    });
    return best;
  }

  function aiDiscardTurn(p) {
    if (S.over || S.turn !== p || S.phase !== 'discard') return;
    if (canWin(S.hands[p], S.melds[p].length)) {
      endRound(p, '自摸', S.lastDrawn);
      return;
    }
    var quad = findQuad(S.hands[p]);
    if (quad && Math.random() < 0.75) {
      doConcealedKong(p, quad);
      return;
    }
    var tile = chooseDiscard(S.hands[p]);
    if (tile) discardTile(p, tile);
  }

  function aiClaimPung(p, discarder, tile) {
    var res = removeMatches(S.hands[p], tile, 2);
    S.hands[p] = res.rest;
    S.melds[p].push({ type: 'pung', tiles: [tile].concat(res.taken), from: discarder });
    removeDiscard(discarder, tile);
    S.turn = p;
    S.phase = 'discard';
    S.selected = null;
    renderAll();
    if (p === 0) {
      claimTipEl.textContent = '碰牌成功，请打出一张';
      renderActions();
    } else {
      schedule(function () { aiDiscardTurn(p); }, 720);
    }
  }

  function aiClaimChow(p, discarder, tile, pair) {
    S.hands[p] = S.hands[p].filter(function (t) { return t.id !== pair[0].id && t.id !== pair[1].id; });
    var meld = [tile].concat(pair).sort(function (a, b) { return a.r - b.r; });
    S.melds[p].push({ type: 'chow', tiles: meld, from: discarder });
    removeDiscard(discarder, tile);
    S.turn = p;
    S.phase = 'discard';
    S.selected = null;
    renderAll();
    if (p === 0) {
      claimTipEl.textContent = '吃牌成功，请打出一张';
      renderActions();
    } else {
      schedule(function () { aiDiscardTurn(p); }, 720);
    }
  }

  function aiClaimKong(p, discarder, tile) {
    var res = removeMatches(S.hands[p], tile, 3);
    S.hands[p] = res.rest;
    S.melds[p].push({ type: 'kong', tiles: [tile].concat(res.taken), from: discarder });
    removeDiscard(discarder, tile);
    S.turn = p;
    S.phase = 'draw';
    renderAll();
    schedule(function () { drawTile(p, true); }, 420);
  }

  // ───────────────────────── 玩家操作 ─────────────────────────

  function playerPassClaim() {
    if (!S.pending) return;
    var pending = S.pending;
    S.pending = null;
    S.phase = 'claim';
    resolveAIClaims(pending.discarder, pending.claims.filter(function (c) { return c.player !== 0; }));
  }

  function playerClaimPung(tile) {
    if (!S.pending) return;
    var discarder = S.pending.discarder;
    S.pending = null;
    claimPungForPlayer(tile, discarder);
  }

  function claimPungForPlayer(tile, discarder) {
    var res = removeMatches(S.hands[0], tile, 2);
    S.hands[0] = res.rest;
    S.melds[0].push({ type: 'pung', tiles: [tile].concat(res.taken), from: discarder });
    removeDiscard(discarder, tile);
    S.turn = 0;
    S.phase = 'discard';
    S.selected = null;
    renderAll();
    claimTipEl.textContent = '碰牌成功，请打出一张';
    renderActions();
  }

  function playerClaimKong(tile) {
    if (!S.pending) return;
    var discarder = S.pending.discarder;
    S.pending = null;
    var res = removeMatches(S.hands[0], tile, 3);
    S.hands[0] = res.rest;
    S.melds[0].push({ type: 'kong', tiles: [tile].concat(res.taken), from: discarder });
    removeDiscard(discarder, tile);
    S.turn = 0;
    S.phase = 'draw';
    renderAll();
    claimTipEl.textContent = '杠牌成功，补一张牌';
    schedule(function () { drawTile(0, true); }, 350);
  }

  function playerClaimChow(tile, pair) {
    if (!S.pending) return;
    var discarder = S.pending.discarder;
    S.pending = null;
    S.hands[0] = S.hands[0].filter(function (t) { return t.id !== pair[0].id && t.id !== pair[1].id; });
    var meld = [tile].concat(pair).sort(function (a, b) { return a.r - b.r; });
    S.melds[0].push({ type: 'chow', tiles: meld, from: discarder });
    removeDiscard(discarder, tile);
    S.turn = 0;
    S.phase = 'discard';
    S.selected = null;
    renderAll();
    claimTipEl.textContent = '吃牌成功，请打出一张';
    renderActions();
  }

  function playerHuOnDiscard() {
    if (!S.pending) return;
    var tile = S.pending.tile;
    S.pending = null;
    endRound(0, '点炮', tile);
  }

  function playerHuSelf() {
    if (S.phase !== 'discard' || S.turn !== 0) return;
    if (!canWin(S.hands[0], S.melds[0].length)) return;
    endRound(0, '自摸', S.lastDrawn);
  }

  function doConcealedKong(p, tile) {
    var res = removeMatches(S.hands[p], tile, 4);
    S.hands[p] = res.rest;
    S.melds[p].push({ type: 'kong', concealed: true, tiles: res.taken });
    renderAll();
    claimTipEl.textContent = p === 0 ? '暗杠，补一张牌' : '';
    S.turn = p;
    S.phase = 'draw';
    schedule(function () { drawTile(p, true); }, 380);
  }

  // ───────────────────────── 结算 ─────────────────────────

  function endRound(winner, how, tile) {
    if (S.over) return;
    S.over = true;
    S.phase = 'over';
    clearTimers();
    var youWin = winner === 0;
    if (winner >= 0) {
      if (youWin) stats.win++; else stats.lose++;
      saveStats();
    }
    var title;
    if (winner < 0) title = '流局';
    else if (youWin) title = '你胡了！';
    else title = NAMES[winner] + ' 胡了';
    resultTitle.textContent = title;
    resultTitle.style.color = winner === 0 ? 'var(--gb-teal)' : winner < 0 ? 'var(--gb-muted)' : 'var(--gb-coral)';
    resultSub.innerHTML =
      (winner >= 0 ? (how === '自摸' ? '自摸' : '点炮') + (tile ? ' · ' + tileName(tile) : '') : '牌墙摸完，本局流局') +
      '<br>战绩：' + stats.win + ' 胜 / ' + stats.lose + ' 负' +
      '<br>称号：' + (youWin ? '雀神候选人 🀄' : '再来一局翻盘');
    overlay.hidden = false;
    renderAll();
  }

  window.addEventListener('resize', layoutHand);
  document.getElementById('againBtn').addEventListener('click', function () {
    overlay.hidden = true;
    startRound();
  });

  startRound();

  // ───────────────────────── 测试入口 ─────────────────────────

  window.MJ = {
    state: S,
    canWin: canWin,
    chowOptions: chowOptions,
    tileName: tileName,
    startRound: startRound,
    simulate: simulate,
    render: renderAll,
    makeTile: function (s, r) { return { id: uid++, s: s, r: r }; },
  };

  // 纯 AI 对局模拟：验证胡牌/流局流程
  function simulate(games) {
    games = games || 1;
    var results = { win: 0, draw: 0, fail: [] };
    for (var g = 0; g < games; g++) {
      var hands = [[], [], [], []];
      var melds = [[], [], [], []];
      var wall = shuffle(makeWall());
      var wp = 0;
      for (var i = 0; i < 13; i++) for (var p = 0; p < 4; p++) hands[p].push(wall[wp++]);
      var dealer = Math.floor(Math.random() * 4);
      hands[dealer].push(wall[wp++]);
      hands.forEach(sortTiles);
      var turn = dealer;
      var last = null;
      var skipDraw = false;
      var actions = 0;
      var done = false;

      while (actions++ < 600 && !done) {
        // 摸牌（碰/吃之后直接出牌，不再摸）
        if (!last && !skipDraw) {
          if (wp >= wall.length) { results.draw++; done = true; break; }
          hands[turn].push(wall[wp++]);
          sortTiles(hands[turn]);
          if (canWin(hands[turn], melds[turn].length)) { results.win++; done = true; break; }
        }
        skipDraw = false;
        // 出牌
        var tile = chooseDiscard(hands[turn]);
        hands[turn] = hands[turn].filter(function (t) { return t.id !== tile.id; });
        var discarder = turn;
        // 处理其他家对这张牌的响应（简化为碰/胡）
        var claimed = false;
        for (var off = 1; off < 4 && !claimed; off++) {
          var cp = (discarder + off) % 4;
          if (canWin(hands[cp].concat([tile]), melds[cp].length)) {
            results.win++; done = true; claimed = true; break;
          }
          if (countOf(hands[cp], tile) >= 2 && Math.random() < 0.35) {
            var rm = 0;
            hands[cp] = hands[cp].filter(function (t) {
              if (rm < 2 && sameTile(t, tile)) { rm++; return false; }
              return true;
            });
            melds[cp].push({ type: 'pung', tiles: [tile] });
            turn = cp;
            last = null;
            skipDraw = true;
            claimed = true;
          }
        }
        if (!claimed) {
          turn = (discarder + 1) % 4;
          last = null;
        }
      }
      if (!done) results.fail.push({ game: g, actions: actions });
    }
    return results;
  }
})();
