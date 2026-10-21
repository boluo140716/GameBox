/* 蜘蛛纸牌 · 重制版（纯前端，游戏盒主题） */
(function () {
  'use strict';

  var DIFFS = {
    one: { suits: ['♠'], name: '单花色' },
    two: { suits: ['♠', '♥'], name: '双花色' },
    four: { suits: ['♠', '♥', '♣', '♦'], name: '四花色' },
  };
  var RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K' };
  var BEST_KEY = 'gamebox_spider_best';
  var DIFF_KEY = 'gamebox_spider_diff';

  var boardEl = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var doneEl = document.getElementById('doneCount');
  var moveEl = document.getElementById('moveCount');
  var timerEl = document.getElementById('timer');
  var stockBtn = document.getElementById('stockBtn');
  var stockCountEl = document.getElementById('stockCount');
  var foundationsEl = document.getElementById('foundations');
  var diffsEl = document.getElementById('diffs');
  var undoBtn = document.getElementById('undoBtn');
  var hintBtn = document.getElementById('hintBtn');
  var newBtn = document.getElementById('newBtn');
  var trayHint = document.getElementById('trayHint');
  var bestEl = document.getElementById('bestText');
  var overlay = document.getElementById('overlay');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var againBtn = document.getElementById('againBtn');
  var closeBtn = document.getElementById('closeBtn');
  var toastEl = document.getElementById('toast');

  var diffKey = 'one';
  try {
    var saved = localStorage.getItem(DIFF_KEY);
    if (saved && DIFFS[saved]) diffKey = saved;
  } catch (e) {}

  var bests = loadBests();
  var timerId = null;
  var toastTimer = null;
  var hintTimer = null;
  var S = null;
  var uid = 0;

  function loadBests() {
    try {
      var b = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
      return b && typeof b === 'object' ? b : {};
    } catch (e) { return {}; }
  }
  function saveBests() {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) {}
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1500);
  }
  function pad3(n) { return String(Math.min(999, Math.max(0, n))).padStart(3, '0'); }
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ───────── 新局 ─────────

  function newGame(key) {
    if (key && DIFFS[key]) {
      diffKey = key;
      try { localStorage.setItem(DIFF_KEY, key); } catch (e) {}
    }
    stopTimer();
    var d = DIFFS[diffKey];
    var copies = 8 / d.suits.length;
    var deck = [];
    for (var s = 0; s < d.suits.length; s++) {
      for (var c = 0; c < copies; c++) {
        for (var r = 1; r <= 13; r++) {
          deck.push({ id: uid++, r: r, s: d.suits[s], up: false });
        }
      }
    }
    shuffleArr(deck);

    var cols = [];
    for (var i = 0; i < 10; i++) cols.push([]);
    var idx = 0;
    for (var col = 0; col < 10; col++) {
      var n = col < 4 ? 6 : 5;
      for (var k = 0; k < n; k++) {
        var card = deck[idx++];
        card.up = false;
        cols[col].push(card);
      }
      cols[col][cols[col].length - 1].up = true;
    }

    S = {
      difficulty: diffKey,
      cols: cols,
      stock: deck.slice(idx),
      foundations: 0,
      moves: 0,
      started: false,
      over: false,
      startTime: 0,
      elapsed: 0,
      selected: null,
      history: [],
    };

    overlay.hidden = true;
    trayHint.textContent = '点击同花色降序牌组，再点目标列';
    timerEl.textContent = '000';
    renderAll();
    updateDifficultyUI();
    updateBest();
    requestAnimationFrame(layout);
  }

  function layout() {
    if (!S) return;
    var avail = boardWrap.clientWidth - 14;
    var gap = 6;
    var cw = Math.floor((avail - 9 * gap - 12) / 10);
    cw = Math.max(26, Math.min(62, cw));
    var ch = Math.floor(cw * 1.42);
    var step = Math.max(11, Math.floor(ch * 0.3));
    boardEl.style.setProperty('--cw', cw + 'px');
    boardEl.style.setProperty('--ch', ch + 'px');
    boardEl.style.setProperty('--step', step + 'px');
    boardEl.style.setProperty('--gap', gap + 'px');
  }

  // ───────── 规则 ─────────

  function canPickup(col, idx) {
    var cards = S.cols[col];
    if (!cards || idx < 0 || idx >= cards.length) return false;
    if (!cards[idx].up) return false;
    for (var i = idx; i < cards.length - 1; i++) {
      if (!cards[i + 1].up) return false;
      if (cards[i].s !== cards[i + 1].s) return false;
      if (cards[i].r !== cards[i + 1].r + 1) return false;
    }
    return true;
  }

  function canDrop(run, toCol) {
    var dest = S.cols[toCol];
    if (!dest.length) return true;
    return dest[dest.length - 1].r === run[0].r + 1;
  }

  function pushHistory() {
    S.history.push(JSON.stringify({
      cols: S.cols,
      stock: S.stock,
      foundations: S.foundations,
      moves: S.moves,
    }));
    if (S.history.length > 60) S.history.shift();
  }

  function tryMove(from, idx, to) {
    if (!S || S.over) return false;
    if (from === to) return false;
    if (!canPickup(from, idx)) return false;
    var run = S.cols[from].slice(idx);
    if (!canDrop(run, to)) return false;
    startTimer();
    pushHistory();
    S.cols[from].splice(idx, run.length);
    var src = S.cols[from];
    if (src.length && !src[src.length - 1].up) src[src.length - 1].up = true;
    for (var i = 0; i < run.length; i++) S.cols[to].push(run[i]);
    S.moves++;
    S.selected = null;
    checkComplete(to);
    renderAll();
    return true;
  }

  function dealStock() {
    if (!S || S.over) return;
    if (S.stock.length < 10) { toast('牌堆已经空了'); return; }
    for (var c = 0; c < 10; c++) {
      if (!S.cols[c].length) { toast('有空列时不能发牌'); return; }
    }
    startTimer();
    pushHistory();
    for (var i = 0; i < 10; i++) {
      var card = S.stock.pop();
      card.up = true;
      S.cols[i].push(card);
    }
    S.moves++;
    S.selected = null;
    for (var k = 0; k < 10; k++) {
      checkComplete(k);
      if (S.over) break;
    }
    renderAll();
  }

  function checkComplete(col) {
    if (S.over) return;
    var cards = S.cols[col];
    while (cards.length >= 13) {
      var start = cards.length - 13;
      var suit = cards[start].s;
      var ok = true;
      for (var i = 0; i < 13; i++) {
        var card = cards[start + i];
        if (!card.up || card.s !== suit || card.r !== 13 - i) { ok = false; break; }
      }
      if (!ok) break;
      cards.splice(start, 13);
      S.foundations = Math.min(8, S.foundations + 1);
      if (cards.length && !cards[cards.length - 1].up) cards[cards.length - 1].up = true;
      toast('完成一组 K → A');
      if (S.foundations >= 8) { win(); return; }
    }
  }

  // ───────── 交互 ─────────

  function onCardClick(col, idx) {
    if (!S || S.over) return;
    var card = S.cols[col][idx];
    if (!card) return;

    if (S.selected) {
      if (S.selected.col === col && S.selected.idx === idx) {
        S.selected = null;
        renderAll();
        return;
      }
      if (tryMove(S.selected.col, S.selected.idx, col)) return;
      if (S.selected.col === col && card.up && canPickup(col, idx)) {
        S.selected = { col: col, idx: idx };
        renderAll();
        return;
      }
      toast('不能放在这里');
      return;
    }

    if (!card.up) return;
    if (!canPickup(col, idx)) { toast('只能移动同花色的连续降序牌组'); return; }
    S.selected = { col: col, idx: idx };
    renderAll();
  }

  function onColumnClick(col) {
    if (!S || S.over) return;
    if (S.selected) {
      if (!tryMove(S.selected.col, S.selected.idx, col)) toast('不能放在这里');
    }
  }

  function undo() {
    if (!S || S.over || !S.history.length) return;
    var snap = JSON.parse(S.history.pop());
    S.cols = snap.cols;
    S.stock = snap.stock;
    S.foundations = snap.foundations;
    S.moves = snap.moves;
    S.selected = null;
    renderAll();
  }

  function findHint() {
    for (var from = 0; from < 10; from++) {
      var cards = S.cols[from];
      for (var idx = 0; idx < cards.length; idx++) {
        if (!canPickup(from, idx)) continue;
        for (var to = 0; to < 10; to++) {
          if (to === from) continue;
          var run = cards.slice(idx);
          if (!canDrop(run, to)) continue;
          var reveals = idx > 0 && !cards[idx - 1].up;
          return { from: from, idx: idx, to: to, reveals: reveals, emptyDest: !S.cols[to].length };
        }
      }
    }
    if (S.stock.length >= 10 && S.cols.every(function (c) { return c.length; })) {
      return { deal: true };
    }
    return null;
  }

  function hint() {
    if (!S || S.over) return;
    var h = findHint();
    if (!h) { toast('没有可走的牌了，试试撤销'); return; }
    if (h.deal) {
      toast('点击左上角牌堆发牌');
      stockBtn.classList.add('hint');
      setTimeout(function () { stockBtn.classList.remove('hint'); }, 1600);
      return;
    }
    var srcCards = S.cols[h.from];
    for (var i = h.idx; i < srcCards.length; i++) {
      var el = boardEl.querySelector('.card[data-col="' + h.from + '"][data-idx="' + i + '"]');
      if (el) el.classList.add('hint');
    }
    var dest = boardEl.querySelector('.col[data-col="' + h.to + '"]');
    if (dest) dest.classList.add('hint-dst');
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      var hs = boardEl.querySelectorAll('.hint, .hint-dst');
      for (var j = 0; j < hs.length; j++) hs[j].classList.remove('hint', 'hint-dst');
    }, 1600);
    trayHint.textContent = h.reveals ? '提示：这步能翻开暗牌' : '提示：把牌移到高亮列';
  }

  // ───────── 计时 / 结算 ─────────

  function startTimer() {
    if (timerId) return;
    if (!S.started) {
      S.started = true;
      S.startTime = Date.now();
    }
    timerId = setInterval(function () {
      if (!S || S.over) return;
      S.elapsed = Math.floor((Date.now() - S.startTime) / 1000);
      timerEl.textContent = pad3(S.elapsed);
    }, 250);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (S && S.started) {
      S.elapsed = Math.max(S.elapsed, Math.floor((Date.now() - S.startTime) / 1000));
      timerEl.textContent = pad3(S.elapsed);
    }
  }

  function win() {
    if (S.over) return;
    S.over = true;
    stopTimer();
    S.elapsed = Math.max(1, S.elapsed);
    timerEl.textContent = pad3(S.elapsed);

    var isBest = false;
    if (typeof bests[diffKey] !== 'number' || S.elapsed < bests[diffKey]) {
      bests[diffKey] = S.elapsed;
      saveBests();
      isBest = true;
    }
    updateBest();
    renderAll();

    var d = DIFFS[diffKey];
    resultTitle.textContent = '恭喜通关！';
    resultTitle.style.color = 'var(--gb-teal)';
    resultSub.innerHTML =
      '难度：' + d.name +
      '<br>用时：' + S.elapsed + ' 秒 · ' + S.moves + ' 步' +
      (isBest ? '<br>新纪录 🏆' : '');
    setTimeout(function () { overlay.hidden = false; }, 380);
  }

  // ───────── 渲染 ─────────

  function cardEl(card, col, idx, selected) {
    var el = document.createElement('div');
    el.className = 'card' + (card.up ? (card.s === '♥' || card.s === '♦' ? ' red' : ' black') : ' down');
    el.dataset.col = col;
    el.dataset.idx = idx;
    el.style.top = 'calc(' + idx + ' * var(--step))';
    el.style.zIndex = idx + 1;
    if (card.up) {
      el.innerHTML =
        '<span class="r">' + RANK_LABEL[card.r] + '</span>' +
        '<span class="s">' + card.s + '</span>' +
        '<span class="big">' + card.s + '</span>';
    }
    if (selected) el.classList.add('sel');
    return el;
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    for (var col = 0; col < 10; col++) {
      var colEl = document.createElement('div');
      colEl.className = 'col' + (S.cols[col].length ? '' : ' empty');
      colEl.dataset.col = col;
      var cards = S.cols[col];
      var height = 0;
      if (cards.length) {
        height = 'calc(var(--ch) + ' + (cards.length - 1) + ' * var(--step) + 8px)';
      }
      colEl.style.height = height;

      for (var idx = 0; idx < cards.length; idx++) {
        var selected = S.selected && S.selected.col === col && idx >= S.selected.idx;
        colEl.appendChild(cardEl(cards[idx], col, idx, selected));
      }
      boardEl.appendChild(colEl);
    }
  }

  function renderFoundations() {
    foundationsEl.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      var el = document.createElement('div');
      el.className = 'found-slot' + (i < S.foundations ? ' done' : '');
      el.textContent = i < S.foundations ? 'K' : '';
      foundationsEl.appendChild(el);
    }
  }

  function renderAll() {
    if (!S) return;
    renderBoard();
    renderFoundations();
    doneEl.textContent = S.foundations + '/8';
    moveEl.textContent = S.moves;
    stockCountEl.textContent = S.stock.length;
    stockBtn.disabled = S.stock.length === 0;
    undoBtn.disabled = S.over || S.history.length === 0;
    if (S.over) trayHint.textContent = '本局结束';
  }

  function updateBest() {
    var b = bests[diffKey];
    bestEl.textContent = '最佳：' + (typeof b === 'number' ? b + ' 秒' : '--');
  }

  function updateDifficultyUI() {
    var chips = diffsEl.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].dataset.diff === diffKey);
    }
  }

  // ───────── 事件 ─────────

  boardEl.addEventListener('click', function (e) {
    var colEl = e.target.closest('.col');
    if (!colEl || !S || S.over) return;
    var col = Number(colEl.dataset.col);
    var card = e.target.closest('.card');
    if (card) onCardClick(col, Number(card.dataset.idx));
    else onColumnClick(col);
  });

  stockBtn.addEventListener('click', dealStock);
  undoBtn.addEventListener('click', undo);
  hintBtn.addEventListener('click', hint);
  newBtn.addEventListener('click', function () { newGame(diffKey); });
  againBtn.addEventListener('click', function () { overlay.hidden = true; newGame(diffKey); });
  closeBtn.addEventListener('click', function () { overlay.hidden = true; });

  diffsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    newGame(btn.dataset.diff);
  });

  window.addEventListener('resize', layout);
  if (window.ResizeObserver) {
    new ResizeObserver(function () { layout(); }).observe(boardWrap);
  }

  newGame(diffKey);

  // 测试入口
  window.SP = {
    get state() { return S; },
    DIFFS: DIFFS,
    newGame: newGame,
    dealStock: dealStock,
    tryMove: tryMove,
    canPickup: canPickup,
    checkComplete: checkComplete,
    undo: undo,
    hint: hint,
    layout: layout,
  };
})();
