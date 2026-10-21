/* 扫雷 · 重制版（纯前端，游戏盒主题） */
(function () {
  'use strict';

  var DIFFS = {
    beginner: { rows: 9, cols: 9, mines: 10, name: '初级' },
    intermediate: { rows: 16, cols: 16, mines: 40, name: '中级' },
    expert: { rows: 16, cols: 30, mines: 99, name: '高级' },
  };
  var BEST_KEY = 'gamebox_mines_best';
  var DIFF_KEY = 'gamebox_mines_diff';

  var boardEl = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var mineCountEl = document.getElementById('mineCount');
  var timerEl = document.getElementById('timer');
  var faceBtn = document.getElementById('faceBtn');
  var diffsEl = document.getElementById('diffs');
  var modeBtn = document.getElementById('modeBtn');
  var hintEl = document.getElementById('hintText');
  var bestEl = document.getElementById('bestText');
  var overlay = document.getElementById('overlay');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var againBtn = document.getElementById('againBtn');
  var closeBtn = document.getElementById('closeBtn');
  var toastEl = document.getElementById('toast');

  var diffKey = 'beginner';
  try {
    var savedDiff = localStorage.getItem(DIFF_KEY);
    if (savedDiff && DIFFS[savedDiff]) diffKey = savedDiff;
  } catch (e) {}

  var bests = loadBests();
  var flagMode = false;
  var timerId = null;
  var toastTimer = null;
  var longPressFired = false;
  var pressTimer = null;
  var pressStart = null;

  var S = null;

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
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1400);
  }

  function pad3(n) {
    n = Math.min(999, Math.max(0, n));
    return String(n).padStart(3, '0');
  }

  // ───────── 新局 ─────────

  function newGame(key) {
    if (key && DIFFS[key]) {
      diffKey = key;
      try { localStorage.setItem(DIFF_KEY, key); } catch (e) {}
    }
    var d = DIFFS[diffKey];
    stopTimer();
    S = {
      rows: d.rows,
      cols: d.cols,
      mines: d.mines,
      name: d.name,
      cells: [],
      els: [],
      started: false,
      over: false,
      win: false,
      flags: 0,
      revealed: 0,
      startTime: 0,
      elapsed: 0,
      exploded: null,
    };

    for (var r = 0; r < d.rows; r++) {
      var row = [];
      var elRow = [];
      for (var c = 0; c < d.cols; c++) {
        row.push({ mine: false, adj: 0, revealed: false, flagged: false });
        elRow.push(null);
      }
      S.cells.push(row);
      S.els.push(elRow);
    }

    buildBoard();
    updateMineCount();
    timerEl.textContent = '000';
    faceBtn.textContent = '🙂';
    overlay.hidden = true;
    updateBestText();
    updateModeUI();
    updateDiffUI();
    requestAnimationFrame(layout);
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    boardEl.style.setProperty('--cols', S.cols);
    var frag = document.createDocumentFragment();
    for (var r = 0; r < S.rows; r++) {
      for (var c = 0; c < S.cols; c++) {
        var el = document.createElement('div');
        el.className = 'cell';
        el.dataset.r = r;
        el.dataset.c = c;
        el.setAttribute('role', 'gridcell');
        frag.appendChild(el);
        S.els[r][c] = el;
      }
    }
    boardEl.appendChild(frag);
  }

  function layout() {
    if (!S) return;
    var availW = boardWrap.clientWidth - 12;
    var availH = boardWrap.clientHeight - 12;
    var gap = 2;
    var pad = 16;
    var tw = (availW - pad - (S.cols - 1) * gap) / S.cols;
    var th = (availH - pad - (S.rows - 1) * gap) / S.rows;
    var tile = Math.floor(Math.min(tw, th, 34));
    tile = Math.max(15, tile);
    boardEl.style.setProperty('--tile', tile + 'px');
  }

  // ───────── 布雷 ─────────

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function forNeighbors(r, c, fn) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < S.rows && cc >= 0 && cc < S.cols) fn(rr, cc);
      }
    }
  }

  function placeMines(safeR, safeC) {
    var safe = {};
    safe[safeR + ',' + safeC] = true;
    forNeighbors(safeR, safeC, function (rr, cc) { safe[rr + ',' + cc] = true; });

    var coords = [];
    for (var r = 0; r < S.rows; r++) {
      for (var c = 0; c < S.cols; c++) {
        if (!safe[r + ',' + c]) coords.push([r, c]);
      }
    }
    if (coords.length < S.mines) {
      coords = [];
      for (var r2 = 0; r2 < S.rows; r2++) {
        for (var c2 = 0; c2 < S.cols; c2++) {
          if (r2 !== safeR || c2 !== safeC) coords.push([r2, c2]);
        }
      }
    }
    shuffle(coords);
    for (var i = 0; i < S.mines && i < coords.length; i++) {
      S.cells[coords[i][0]][coords[i][1]].mine = true;
    }

    for (var rr = 0; rr < S.rows; rr++) {
      for (var cc = 0; cc < S.cols; cc++) {
        var cell = S.cells[rr][cc];
        if (cell.mine) continue;
        var n = 0;
        forNeighbors(rr, cc, function (nr, nc) { if (S.cells[nr][nc].mine) n++; });
        cell.adj = n;
      }
    }
  }

  // ───────── 翻开 / 插旗 ─────────

  function reveal(r, c) {
    if (!S || S.over) return;
    var cell = S.cells[r][c];
    if (!cell || cell.revealed || cell.flagged) return;

    if (!S.started) {
      S.started = true;
      placeMines(r, c);
      startTimer();
    }

    if (cell.mine) {
      lose(r, c);
      return;
    }

    var stack = [[r, c]];
    while (stack.length) {
      var p = stack.pop();
      var rr = p[0], cc = p[1];
      var cur = S.cells[rr][cc];
      if (cur.revealed || cur.flagged || cur.mine) continue;
      cur.revealed = true;
      S.revealed++;
      updateCell(rr, cc);
      if (cur.adj === 0) {
        forNeighbors(rr, cc, function (nr, nc) {
          var nx = S.cells[nr][nc];
          if (!nx.revealed && !nx.flagged && !nx.mine) stack.push([nr, nc]);
        });
      }
    }

    if (S.revealed === S.rows * S.cols - S.mines) win();
  }

  function toggleFlag(r, c) {
    if (!S || S.over) return;
    var cell = S.cells[r][c];
    if (!cell || cell.revealed) return;
    if (!cell.flagged && S.flags >= S.mines) {
      toast('旗子用完了');
      return;
    }
    cell.flagged = !cell.flagged;
    S.flags += cell.flagged ? 1 : -1;
    updateCell(r, c);
    updateMineCount();
  }

  function chord(r, c) {
    if (!S || S.over) return;
    var cell = S.cells[r][c];
    if (!cell || !cell.revealed || !cell.adj) return;
    var flags = 0;
    var hidden = [];
    forNeighbors(r, c, function (nr, nc) {
      var n = S.cells[nr][nc];
      if (n.flagged) flags++;
      else if (!n.revealed) hidden.push([nr, nc]);
    });
    if (flags !== cell.adj) return;
    hidden.forEach(function (p) { if (!S.over) reveal(p[0], p[1]); });
  }

  // ───────── 结算 ─────────

  function startTimer() {
    S.startTime = Date.now();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(function () {
      if (!S || S.over) return;
      S.elapsed = Math.floor((Date.now() - S.startTime) / 1000);
      timerEl.textContent = pad3(S.elapsed);
    }, 200);
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (S && S.started) {
      S.elapsed = Math.max(S.elapsed, Math.floor((Date.now() - S.startTime) / 1000));
      timerEl.textContent = pad3(S.elapsed);
    }
  }

  function lose(r, c) {
    S.over = true;
    S.win = false;
    S.exploded = r + ',' + c;
    stopTimer();
    S.elapsed = Math.max(1, S.elapsed);
    timerEl.textContent = pad3(S.elapsed);
    faceBtn.textContent = '😵';

    for (var rr = 0; rr < S.rows; rr++) {
      for (var cc = 0; cc < S.cols; cc++) {
        var cell = S.cells[rr][cc];
        if (cell.mine && !cell.revealed) {
          cell.revealed = true;
          updateCell(rr, cc);
        } else if (!cell.mine && cell.flagged) {
          updateCell(rr, cc);
        }
      }
    }
    updateCell(r, c);
    setTimeout(function () { showResult(false); }, 650);
  }

  function win() {
    S.over = true;
    S.win = true;
    stopTimer();
    S.elapsed = Math.max(1, S.elapsed);
    timerEl.textContent = pad3(S.elapsed);
    faceBtn.textContent = '😎';

    for (var rr = 0; rr < S.rows; rr++) {
      for (var cc = 0; cc < S.cols; cc++) {
        var cell = S.cells[rr][cc];
        if (cell.mine && !cell.flagged) {
          cell.flagged = true;
          S.flags++;
          updateCell(rr, cc);
        }
      }
    }
    updateMineCount();

    var isBest = false;
    var t = S.elapsed;
    if (!bests[diffKey] || t < bests[diffKey]) {
      bests[diffKey] = t;
      saveBests();
      isBest = true;
    }
    updateBestText();
    setTimeout(function () { showResult(true, isBest); }, 420);
  }

  function showResult(isWin, isBest) {
    resultTitle.textContent = isWin ? '扫雷成功' : '踩雷了';
    resultTitle.style.color = isWin ? 'var(--gb-teal)' : 'var(--gb-coral)';
    var d = DIFFS[diffKey];
    var sub = '难度：' + d.name + ' ' + d.rows + '×' + d.cols + ' · ' + d.mines + ' 雷' +
      '<br>用时：' + S.elapsed + ' 秒';
    if (isWin && isBest) sub += ' · 新纪录 🏆';
    if (!isWin) sub += '<br>再来一局，避开所有雷。';
    resultSub.innerHTML = sub;
    overlay.hidden = false;
  }

  // ───────── 渲染 ─────────

  function updateCell(r, c) {
    var cell = S.cells[r][c];
    var el = S.els[r][c];
    if (!el) return;
    el.className = 'cell';
    el.textContent = '';

    if (cell.revealed) {
      el.classList.add('revealed');
      if (cell.mine) {
        el.classList.add('mine');
        if (S.exploded === r + ',' + c) el.classList.add('exploded');
        el.textContent = '💣';
      } else if (cell.adj) {
        el.classList.add('n' + cell.adj);
        el.textContent = cell.adj;
      }
    } else if (cell.flagged) {
      el.classList.add('flag');
      el.textContent = '🚩';
      if (S.over && !cell.mine) el.classList.add('wrong');
    }
  }

  function updateMineCount() {
    mineCountEl.textContent = Math.max(0, S.mines - S.flags);
  }

  function updateBestText() {
    var b = bests[diffKey];
    bestEl.textContent = typeof b === 'number' ? '最佳：' + b + ' 秒' : '最佳：--';
  }

  function updateDiffUI() {
    var chips = diffsEl.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].dataset.diff === diffKey);
    }
  }

  function updateModeUI() {
    modeBtn.textContent = flagMode ? '🚩 插旗' : '⛏ 挖开';
    modeBtn.classList.toggle('flagging', flagMode);
    hintEl.textContent = flagMode
      ? '点击插旗 · 长按翻开'
      : '点击翻开 · 长按 / 右键插旗';
  }

  // ───────── 事件 ─────────

  boardEl.addEventListener('click', function (e) {
    if (longPressFired) { longPressFired = false; return; }
    var el = e.target.closest('.cell');
    if (!el || !S || S.over) return;
    var r = Number(el.dataset.r);
    var c = Number(el.dataset.c);
    var cell = S.cells[r][c];
    if (cell.revealed) {
      chord(r, c);
      return;
    }
    if (flagMode) toggleFlag(r, c);
    else reveal(r, c);
  });

  boardEl.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    var el = e.target.closest('.cell');
    if (!el || !S || S.over) return;
    var r = Number(el.dataset.r);
    var c = Number(el.dataset.c);
    if (!S.cells[r][c].revealed) toggleFlag(r, c);
  });

  boardEl.addEventListener('pointerdown', function (e) {
    if (!S || S.over || e.button === 2) return;
    var el = e.target.closest('.cell');
    if (!el) return;
    pressStart = { x: e.clientX, y: e.clientY, el: el };
    longPressFired = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function () {
      longPressFired = true;
      var r = Number(el.dataset.r);
      var c = Number(el.dataset.c);
      if (S) {
        if (flagMode) reveal(r, c);
        else toggleFlag(r, c);
      }
      if (navigator.vibrate) navigator.vibrate(18);
    }, 450);
    if (!S.over) faceBtn.textContent = '😮';
  });

  boardEl.addEventListener('pointermove', function (e) {
    if (!pressStart) return;
    if (Math.abs(e.clientX - pressStart.x) > 10 || Math.abs(e.clientY - pressStart.y) > 10) {
      clearTimeout(pressTimer);
      pressStart = null;
    }
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    boardEl.addEventListener(ev, function () {
      clearTimeout(pressTimer);
      pressStart = null;
      if (S && !S.over) faceBtn.textContent = '🙂';
    });
  });

  diffsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    newGame(btn.dataset.diff);
  });

  modeBtn.addEventListener('click', function () {
    flagMode = !flagMode;
    updateModeUI();
  });

  faceBtn.addEventListener('click', function () { newGame(diffKey); });
  againBtn.addEventListener('click', function () { overlay.hidden = true; newGame(diffKey); });
  closeBtn.addEventListener('click', function () { overlay.hidden = true; });

  window.addEventListener('resize', layout);
  if (window.ResizeObserver) {
    new ResizeObserver(function () { layout(); }).observe(boardWrap);
  }

  newGame(diffKey);

  // 测试入口
  window.MS = {
    get state() { return S; },
    DIFFS: DIFFS,
    newGame: newGame,
    reveal: reveal,
    toggleFlag: toggleFlag,
    layout: layout,
  };
})();
