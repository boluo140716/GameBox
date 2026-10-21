/* 华容道 · 横刀立马（纯前端，游戏盒主题） */
(function () {
  'use strict';

  var LAYOUT = [
    { id: 'cao', name: '曹操', r: 0, c: 1, w: 2, h: 2, cls: 'cao' },
    { id: 'zhang', name: '张飞', r: 0, c: 0, w: 1, h: 2, cls: '' },
    { id: 'zhao', name: '赵云', r: 0, c: 3, w: 1, h: 2, cls: '' },
    { id: 'ma', name: '马超', r: 2, c: 0, w: 1, h: 2, cls: '' },
    { id: 'huang', name: '黄忠', r: 2, c: 3, w: 1, h: 2, cls: '' },
    { id: 'guan', name: '关羽', r: 2, c: 1, w: 2, h: 1, cls: 'guan' },
    { id: 's1', name: '兵', r: 3, c: 1, w: 1, h: 1, cls: 'soldier' },
    { id: 's2', name: '兵', r: 3, c: 2, w: 1, h: 1, cls: 'soldier' },
    { id: 's3', name: '兵', r: 4, c: 0, w: 1, h: 1, cls: 'soldier' },
    { id: 's4', name: '兵', r: 4, c: 3, w: 1, h: 1, cls: 'soldier' },
  ];
  var BEST_KEY = 'gamebox_klotski_best';

  var boardEl = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var movesEl = document.getElementById('moves');
  var timerEl = document.getElementById('timer');
  var bestEl = document.getElementById('best');
  var undoBtn = document.getElementById('undoBtn');
  var resetBtn = document.getElementById('resetBtn');
  var dpad = document.getElementById('dpad');
  var overlay = document.getElementById('overlay');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var againBtn = document.getElementById('againBtn');
  var closeBtn = document.getElementById('closeBtn');
  var toastEl = document.getElementById('toast');

  var timerId = null;
  var toastTimer = null;
  var drag = null;
  var S = null;

  function loadBest() {
    try {
      var b = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      return b && typeof b.moves === 'number' ? b : null;
    } catch (e) { return null; }
  }
  function saveBest(b) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) {}
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1400);
  }
  function pad3(n) { return String(Math.min(999, Math.max(0, n))).padStart(3, '0'); }

  // ───────── 新局 ─────────

  function newGame() {
    stopTimer();
    S = {
      pieces: LAYOUT.map(function (p) {
        return { id: p.id, name: p.name, r: p.r, c: p.c, w: p.w, h: p.h, cls: p.cls };
      }),
      selected: null,
      moves: 0,
      started: false,
      over: false,
      startTime: 0,
      elapsed: 0,
      history: [],
      cell: 72,
      pad: 16,
      els: {},
    };
    buildPieces();
    overlay.hidden = true;
    timerEl.textContent = '000';
    movesEl.textContent = '0';
    updateBest();
    layout();
    updateUI();
  }

  function buildPieces() {
    var old = boardEl.querySelectorAll('.piece');
    for (var i = 0; i < old.length; i++) old[i].remove();
    S.els = {};
    S.pieces.forEach(function (p) {
      var el = document.createElement('div');
      el.className = 'piece' + (p.cls ? ' ' + p.cls : '');
      el.dataset.id = p.id;
      el.innerHTML = '<span>' + p.name + '</span>';
      el.addEventListener('pointerdown', function (e) { onPieceDown(e, p.id); });
      S.els[p.id] = el;
      boardEl.appendChild(el);
    });
  }

  function layout() {
    if (!S) return;
    var availW = boardWrap.clientWidth - 16;
    var availH = boardWrap.clientHeight - 16;
    var pad = 16;
    var cell = Math.floor(Math.min((availW - pad * 2) / 4, (availH - pad * 2) / 5, 96));
    cell = Math.max(42, cell);
    S.cell = cell;
    S.pad = pad;
    boardEl.style.setProperty('--cell', cell + 'px');
    boardEl.style.setProperty('--pad', pad + 'px');
    renderPositions();
  }

  function renderPositions() {
    var cell = S.cell;
    var pad = S.pad;
    var gap = 4;
    S.pieces.forEach(function (p) {
      var el = S.els[p.id];
      if (!el) return;
      el.style.left = (pad + p.c * cell + gap / 2) + 'px';
      el.style.top = (pad + p.r * cell + gap / 2) + 'px';
      el.style.width = (p.w * cell - gap) + 'px';
      el.style.height = (p.h * cell - gap) + 'px';
      el.style.fontSize = Math.max(12, Math.round(cell * (p.id === 'cao' ? 0.34 : p.w === 1 && p.h === 1 ? 0.3 : 0.26))) + 'px';
    });
    updateSelection();
    updateUI();
  }

  // ───────── 规则 ─────────

  function pieceAt(r, c, exceptId) {
    for (var i = 0; i < S.pieces.length; i++) {
      var p = S.pieces[i];
      if (p.id === exceptId) continue;
      if (r >= p.r && r < p.r + p.h && c >= p.c && c < p.c + p.w) return p;
    }
    return null;
  }

  function canMove(p, dr, dc) {
    var nr = p.r + dr;
    var nc = p.c + dc;
    if (nr < 0 || nc < 0 || nr + p.h > 5 || nc + p.w > 4) return false;
    for (var r = nr; r < nr + p.h; r++) {
      for (var c = nc; c < nc + p.w; c++) {
        if (pieceAt(r, c, p.id)) return false;
      }
    }
    return true;
  }

  function pushHistory() {
    S.history.push(JSON.stringify({
      pieces: S.pieces.map(function (p) { return { id: p.id, r: p.r, c: p.c }; }),
      moves: S.moves,
    }));
    if (S.history.length > 300) S.history.shift();
  }

  function movePiece(p, dr, dc) {
    if (!S || S.over || !p) return false;
    if (!canMove(p, dr, dc)) return false;
    startTimer();
    pushHistory();
    p.r += dr;
    p.c += dc;
    S.moves++;
    renderPositions();
    if (p.id === 'cao' && p.r === 3 && p.c === 1) win();
    return true;
  }

  function moveSelected(dr, dc) {
    if (!S || S.over) return;
    var p = S.selected && S.pieces.find(function (x) { return x.id === S.selected; });
    if (!p) { toast('先点选一个方块'); return; }
    if (!movePiece(p, dr, dc)) {
      var el = S.els[p.id];
      if (el) {
        el.classList.add('shake');
        setTimeout(function () { el.classList.remove('shake'); }, 300);
      }
    }
  }

  // ───────── 交互 ─────────

  function onPieceDown(e, id) {
    if (!S || S.over) return;
    S.selected = id;
    updateSelection();
    drag = { id: id, x: e.clientX, y: e.clientY };
    var el = S.els[id];
    if (el && el.setPointerCapture) {
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    }
    e.preventDefault();
  }

  boardEl.addEventListener('pointermove', function (e) {
    if (!drag || !S || S.over) return;
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    var threshold = Math.max(16, S.cell * 0.36);
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    var dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
    else dr = dy > 0 ? 1 : -1;
    var p = S.pieces.find(function (x) { return x.id === drag.id; });
    movePiece(p, dr, dc);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    boardEl.addEventListener(ev, function () { drag = null; });
  });

  boardEl.addEventListener('click', function (e) {
    var el = e.target.closest('.piece');
    if (!el || !S) return;
    S.selected = el.dataset.id;
    updateSelection();
  });

  dpad.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    var dir = btn.dataset.dir;
    if (dir === 'up') moveSelected(-1, 0);
    else if (dir === 'down') moveSelected(1, 0);
    else if (dir === 'left') moveSelected(0, -1);
    else if (dir === 'right') moveSelected(0, 1);
  });

  document.addEventListener('keydown', function (e) {
    if (!S || S.over) return;
    var map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    var d = map[e.key];
    if (!d) return;
    e.preventDefault();
    moveSelected(d[0], d[1]);
  });

  function updateSelection() {
    S.pieces.forEach(function (p) {
      var el = S.els[p.id];
      if (el) el.classList.toggle('selected', S.selected === p.id);
    });
    var btns = dpad.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = !S.selected || S.over;
  }

  function updateUI() {
    movesEl.textContent = S.moves;
    undoBtn.disabled = S.over || S.history.length === 0;
    updateSelection();
  }

  function updateBest() {
    var b = loadBest();
    bestEl.textContent = b ? b.moves + ' 步' : '--';
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
    updateUI();

    var prev = loadBest();
    var isBest = !prev || S.moves < prev.moves;
    if (isBest) saveBest({ moves: S.moves, time: S.elapsed });
    updateBest();

    resultTitle.textContent = '曹操已脱险';
    resultTitle.style.color = '#d8bc83';
    resultSub.innerHTML =
      '用时：' + S.elapsed + ' 秒 · ' + S.moves + ' 步' +
      (isBest ? '<br>新的最少步数记录 🏆' : '');
    setTimeout(function () { overlay.hidden = false; }, 360);
  }

  // ───────── 按钮 ─────────

  undoBtn.addEventListener('click', function () {
    if (!S || S.over || !S.history.length) return;
    var snap = JSON.parse(S.history.pop());
    var map = {};
    S.pieces.forEach(function (p) { map[p.id] = p; });
    snap.pieces.forEach(function (pos) {
      var p = map[pos.id];
      if (p) { p.r = pos.r; p.c = pos.c; }
    });
    S.moves = snap.moves;
    S.selected = null;
    overlay.hidden = true;
    renderPositions();
    updateUI();
  });

  resetBtn.addEventListener('click', function () { newGame(); });
  againBtn.addEventListener('click', function () { overlay.hidden = true; newGame(); });
  closeBtn.addEventListener('click', function () { overlay.hidden = true; });

  window.addEventListener('resize', layout);
  if (window.ResizeObserver) {
    new ResizeObserver(function () { layout(); }).observe(boardWrap);
  }

  newGame();

  // 测试入口
  window.HK = {
    get state() { return S; },
    newGame: newGame,
    movePiece: movePiece,
    canMove: canMove,
    layout: layout,
    win: win,
  };
})();
