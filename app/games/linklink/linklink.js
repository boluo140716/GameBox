/* 消消乐 · 相邻交换三连消除（纯前端） */
(function () {
  'use strict';

  var DIFFS = {
    easy: { name: '轻松', rows: 7, cols: 7, types: 5, moves: 25, target: 1500 },
    normal: { name: '标准', rows: 8, cols: 8, types: 6, moves: 24, target: 2600 },
    hard: { name: '挑战', rows: 8, cols: 8, types: 6, moves: 20, target: 3800 },
  };
  var ICONS = ['🐰', '🐱', '🐥', '🐸', '🐼', '🐨'];
  var COLORS = [
    '255, 158, 188',
    '255, 185, 104',
    '255, 224, 97',
    '120, 223, 173',
    '141, 188, 240',
    '185, 157, 240',
  ];
  var DIFF_KEY = 'gamebox_m3_diff';
  var BEST_KEY = 'gamebox_m3_best';

  var board = document.getElementById('board');
  var shell = document.getElementById('boardShell');
  var main = document.getElementById('main');
  var canvas = document.getElementById('fx');
  var comboEl = document.getElementById('combo');
  var flashEl = document.getElementById('flash');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var levelEl = document.getElementById('level');
  var targetEl = document.getElementById('target');
  var movesEl = document.getElementById('moves');
  var movesStat = movesEl.parentNode;
  var progressBar = document.getElementById('progressBar');
  var statusEl = document.getElementById('statusText');
  var diffsEl = document.getElementById('diffs');
  var hintBtn = document.getElementById('hintBtn');
  var shuffleBtn = document.getElementById('shuffleBtn');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var starsEl = document.getElementById('stars');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var resultScore = document.getElementById('resultScore');
  var resultTarget = document.getElementById('resultTarget');
  var nextBtn = document.getElementById('nextBtn');
  var retryBtn = document.getElementById('retryBtn');
  var soundBtn = document.getElementById('soundBtn');
  var toastEl = document.getElementById('toast');

  var slotLayer = null;
  var ctx = null;
  var S = null;
  var bestMap = {};
  var drag = null;
  var toastTimer = null;
  var comboTimer = null;
  var flashTimer = null;
  var fastMode = false;
  var particles = [];
  var rafId = null;
  var lastTs = 0;

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, fastMode ? Math.min(8, ms) : ms);
    });
  }

  function sfx(name, opts) {
    if (window.LINK_SFX) window.LINK_SFX.play(name, opts);
  }

  function renderSound() {
    if (!soundBtn || !window.LINK_SFX) return;
    var on = window.LINK_SFX.isEnabled();
    soundBtn.textContent = on ? '🔊' : '🔇';
    soundBtn.classList.toggle('muted', !on);
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.title = on ? '音效已开' : '音效已关';
  }

  function emptyGrid(rows, cols) {
    var g = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push(null);
      g.push(row);
    }
    return g;
  }

  function emptyTypes(rows, cols) {
    var g = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push(0);
      g.push(row);
    }
    return g;
  }

  function shuffleArr(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function loadBest() {
    try {
      var raw = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
      bestMap = raw && typeof raw === 'object' ? raw : {};
    } catch (e) { bestMap = {}; }
  }

  function saveBest() {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bestMap)); } catch (e) {}
  }

  function saveDiff() {
    try { localStorage.setItem(DIFF_KEY, S.diff); } catch (e) {}
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1700);
  }

  function updateBest() {
    if (!S) return;
    var old = typeof bestMap[S.diff] === 'number' ? bestMap[S.diff] : 0;
    if (S.score > old) {
      bestMap[S.diff] = S.score;
      saveBest();
    }
  }

  function updateUI() {
    if (!S) return;
    levelEl.textContent = String(S.level);
    scoreEl.textContent = String(S.score);
    targetEl.textContent = String(S.target);
    movesEl.textContent = String(Math.max(0, S.moves));
    movesStat.classList.toggle('low', S.moves <= 5);
    var pct = S.target ? Math.min(100, (S.score / S.target) * 100) : 0;
    progressBar.style.width = pct.toFixed(1) + '%';
    bestEl.textContent = String(typeof bestMap[S.diff] === 'number' ? bestMap[S.diff] : 0);
  }

  // ───────── 布局 ─────────

  function buildSlots() {
    if (!slotLayer) {
      slotLayer = document.createElement('div');
      slotLayer.className = 'slot-layer';
      board.appendChild(slotLayer);
    }
    slotLayer.innerHTML = '';
    var count = S.rows * S.cols;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'slot';
      slotLayer.appendChild(el);
    }
  }

  function layout() {
    if (!S) return;
    var availW = main.clientWidth || window.innerWidth;
    var availH = main.clientHeight || window.innerHeight;
    var size = Math.floor(Math.min(availW - 12, availH - 6, 600));
    size = Math.max(220, size);

    var gap = Math.max(3, Math.round(size * 0.008));
    var pad = Math.max(7, Math.round(size * 0.022));
    var cell = Math.floor((size - pad * 2 - gap * (S.cols - 1)) / S.cols);
    cell = Math.max(22, cell);
    var gridSize = cell * S.cols + gap * (S.cols - 1);
    var offset = Math.max(4, Math.floor((size - gridSize) / 2));

    S.layout = { size: size, cell: cell, gap: gap, offset: offset, gridSize: gridSize };
    shell.style.width = size + 'px';
    shell.style.height = size + 'px';
    board.style.left = offset + 'px';
    board.style.top = offset + 'px';
    board.style.width = gridSize + 'px';
    board.style.height = gridSize + 'px';
    board.style.setProperty('--cell', cell + 'px');
    board.style.setProperty('--gap', gap + 'px');
    slotLayer.style.gridTemplateColumns = 'repeat(' + S.cols + ', ' + cell + 'px)';
    slotLayer.style.gridAutoRows = cell + 'px';
    slotLayer.style.gap = gap + 'px';

    for (var i = 0; i < S.tiles.length; i++) {
      S.tiles[i].el.style.transition = 'none';
      setTransform(S.tiles[i]);
    }
    void board.offsetWidth;
    for (var j = 0; j < S.tiles.length; j++) S.tiles[j].el.style.transition = '';

    resizeCanvas();
  }

  function resizeCanvas() {
    var size = S.layout.size || 0;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(size * dpr));
    canvas.height = Math.max(1, Math.round(size * dpr));
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cellCenter(r, c) {
    var l = S.layout;
    return {
      x: l.offset + c * (l.cell + l.gap) + l.cell / 2,
      y: l.offset + r * (l.cell + l.gap) + l.cell / 2,
    };
  }

  function setTransform(t) {
    if (!S || !S.layout.cell) return;
    var x = t.col * (S.layout.cell + S.layout.gap);
    var y = t.row * (S.layout.cell + S.layout.gap);
    t.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  // ───────── 方块 ─────────

  function createTile(type, row, col, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'tile';
    el.dataset.type = type;
    el.innerHTML = '<span class="tile-face">' + ICONS[type - 1] + '</span>';
    el.style.transition = 'none';
    board.appendChild(el);
    var t = { id: S.nextId++, type: type, row: row, col: col, el: el, face: el.firstChild };
    setTransform(t);
    void el.offsetWidth;
    el.style.transition = '';
    if (opts.spawn) {
      el.classList.add('spawn');
      t.face.style.animationDelay = (opts.delay || 0) + 'ms';
      setTimeout(function () { el.classList.remove('spawn'); }, 270 + (opts.delay || 0));
    }
    return t;
  }

  function paintTile(t) {
    if (!t || !t.el) return;
    t.el.dataset.type = t.type;
    t.face.textContent = ICONS[t.type - 1];
  }

  function removeTile(t) {
    if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
    var idx = S.tiles.indexOf(t);
    if (idx !== -1) S.tiles.splice(idx, 1);
  }

  function clearTiles() {
    var old = board.querySelectorAll('.tile');
    for (var i = 0; i < old.length; i++) old[i].remove();
    var pops = shell.querySelectorAll('.score-pop');
    for (var j = 0; j < pops.length; j++) pops[j].remove();
  }

  function addFallingTile(type, targetRow, col, fromRow) {
    var t = createTile(type, fromRow, col, {});
    // 逻辑位置立即落到目标格；视觉上仍停在 fromRow，下一帧再触发下落。
    t.row = targetRow;
    S.grid[targetRow][col] = t;
    S.tiles.push(t);
    requestAnimationFrame(function () {
      if (!S || S.grid[targetRow][col] !== t) return;
      setTransform(t);
    });
    return t;
  }

  // ───────── 匹配 ─────────

  function findMatchesIn(types) {
    var set = new Set();
    var rows = S.rows, cols = S.cols;
    var r, c, run, v, k;

    for (r = 0; r < rows; r++) {
      run = 1;
      for (c = 1; c < cols; c++) {
        v = types[r][c];
        if (v && v === types[r][c - 1]) {
          run++;
        } else {
          if (run >= 3) for (k = c - run; k < c; k++) set.add(r * cols + k);
          run = 1;
        }
      }
      if (run >= 3) for (k = cols - run; k < cols; k++) set.add(r * cols + k);
    }

    for (c = 0; c < cols; c++) {
      run = 1;
      for (r = 1; r < rows; r++) {
        v = types[r][c];
        if (v && v === types[r - 1][c]) {
          run++;
        } else {
          if (run >= 3) for (k = r - run; k < r; k++) set.add(k * cols + c);
          run = 1;
        }
      }
      if (run >= 3) for (k = rows - run; k < rows; k++) set.add(k * cols + c);
    }
    return set;
  }

  function hasMatchIn(types) {
    var rows = S.rows, cols = S.cols;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var v = types[r][c];
        if (!v) continue;
        if (c + 2 < cols && v === types[r][c + 1] && v === types[r][c + 2]) return true;
        if (r + 2 < rows && v === types[r + 1][c] && v === types[r + 2][c]) return true;
      }
    }
    return false;
  }

  function getTypes() {
    var out = [];
    for (var r = 0; r < S.rows; r++) {
      var row = [];
      for (var c = 0; c < S.cols; c++) {
        var t = S.grid[r][c];
        row.push(t ? t.type : 0);
      }
      out.push(row);
    }
    return out;
  }

  function findMatches() {
    return findMatchesIn(getTypes());
  }

  function findMoveInTypes(types) {
    var rows = S.rows, cols = S.cols;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (c + 1 < cols) {
          var t = types[r][c]; types[r][c] = types[r][c + 1]; types[r][c + 1] = t;
          var ok = hasMatchIn(types);
          t = types[r][c]; types[r][c] = types[r][c + 1]; types[r][c + 1] = t;
          if (ok) return { r1: r, c1: c, r2: r, c2: c + 1 };
        }
        if (r + 1 < rows) {
          var t2 = types[r][c]; types[r][c] = types[r + 1][c]; types[r + 1][c] = t2;
          var ok2 = hasMatchIn(types);
          t2 = types[r][c]; types[r][c] = types[r + 1][c]; types[r + 1][c] = t2;
          if (ok2) return { r1: r, c1: c, r2: r + 1, c2: c };
        }
      }
    }
    return null;
  }

  function findMove() {
    return findMoveInTypes(getTypes());
  }

  // ───────── 生成 ─────────

  function generateNoMatch() {
    var types = [];
    for (var r = 0; r < S.rows; r++) {
      var row = [];
      for (var c = 0; c < S.cols; c++) {
        var banned = {};
        if (c >= 2 && row[c - 1] && row[c - 1] === row[c - 2]) banned[row[c - 1]] = 1;
        if (r >= 2 && types[r - 1][c] && types[r - 1][c] === types[r - 2][c]) banned[types[r - 1][c]] = 1;
        var choices = [];
        for (var t = 1; t <= S.types; t++) if (!banned[t]) choices.push(t);
        if (!choices.length) for (var u = 1; u <= S.types; u++) choices.push(u);
        row.push(choices[Math.floor(Math.random() * choices.length)]);
      }
      types.push(row);
    }
    return types;
  }

  function buildBoardTypes() {
    for (var attempt = 0; attempt < 220; attempt++) {
      var types = generateNoMatch();
      if (findMoveInTypes(types)) return types;
    }
    return generateNoMatch();
  }

  function buildTiles(types) {
    S.grid = emptyGrid(S.rows, S.cols);
    S.tiles = [];
    S.nextId = 1;
    for (var r = 0; r < S.rows; r++) {
      for (var c = 0; c < S.cols; c++) {
        var t = createTile(types[r][c], r, c, {
          spawn: true,
          delay: Math.min(240, (r * S.cols + c) * 5),
        });
        S.grid[r][c] = t;
        S.tiles.push(t);
      }
    }
  }

  // ───────── 新局 ─────────

  function newGame(diffKey, level) {
    if (!DIFFS[diffKey]) diffKey = (S && S.diff) || 'normal';
    level = Math.max(1, parseInt(level || 1, 10) || 1);
    var d = DIFFS[diffKey];
    var moves = Math.min(32, d.moves + Math.floor((level - 1) / 2));
    var target = Math.round((d.target * Math.pow(1.32, level - 1)) / 10) * 10;

    S = {
      diff: diffKey,
      level: level,
      rows: d.rows,
      cols: d.cols,
      types: d.types,
      moves: moves,
      target: target,
      score: 0,
      grid: [],
      tiles: [],
      nextId: 1,
      busy: false,
      over: false,
      selected: null,
      layout: { size: 0, cell: 0, gap: 0, offset: 0, gridSize: 0 },
      lastBonus: 0,
    };
    saveDiff();

    clearTiles();
    clearParticles();
    buildSlots();
    layout();
    var types = buildBoardTypes();
    buildTiles(types);
    updateUI();
    overlay.hidden = true;
    comboEl.classList.remove('show');
    flashEl.classList.remove('show');
    board.classList.remove('shuffling');
    setStatus('滑动或点击相邻图块交换');
    updateDiffUI();
  }

  function updateDiffUI() {
    if (!S) return;
    var chips = diffsEl.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].dataset.diff === S.diff);
    }
  }

  // ───────── 交换 / 消除 ─────────

  function swapCells(a, b) {
    var ar = a.row, ac = a.col, br = b.row, bc = b.col;
    S.grid[ar][ac] = b;
    S.grid[br][bc] = a;
    a.row = br; a.col = bc;
    b.row = ar; b.col = ac;
  }

  function clearSelection() {
    var els = board.querySelectorAll('.tile.selected');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('selected');
    if (S) S.selected = null;
  }

  function clearHint() {
    var els = board.querySelectorAll('.tile.hint');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('hint');
  }

  function selectTile(r, c) {
    clearSelection();
    var t = S.grid[r][c];
    if (!t) return;
    S.selected = { r: r, c: c };
    t.el.classList.add('selected');
    setStatus('已选中，点击相邻图块交换');
  }

  function scoreFor(count, combo) {
    return count * 40 * combo + Math.max(0, count - 3) * 30 * combo;
  }

  function resolveMatches(initial, comboStart) {
    var matches = initial;
    var combo = comboStart;
    var guard = 0;

    function step() {
      if (!matches.size || guard++ >= 20) return Promise.resolve();
      var cells = [];
      matches.forEach(function (key) {
        cells.push({ r: Math.floor(key / S.cols), c: key % S.cols });
      });

      var gained = scoreFor(cells.length, combo);
      sfx(cells.length >= 5 || combo >= 3 ? 'big' : 'match');
      S.score += gained;
      updateBest();
      updateUI();
      popScore(cells, '+' + gained);
      if (combo >= 2) showCombo(combo);
      if (combo >= 3 || cells.length >= 6) {
        flashScreen();
        shell.classList.remove('combo-glow');
        void shell.offsetWidth;
        shell.classList.add('combo-glow');
        setTimeout(function () { shell.classList.remove('combo-glow'); }, 620);
      }

      var cleared = [];
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var t = S.grid[cell.r][cell.c];
        if (!t) continue;
        t.el.classList.add('clearing');
        spawnParticles(t);
        S.grid[cell.r][cell.c] = null;
        cleared.push(t);
      }

      return delay(210).then(function () {
        for (var j = 0; j < cleared.length; j++) removeTile(cleared[j]);
        return collapseAndRefill();
      }).then(function () {
        matches = findMatches();
        combo++;
        return step();
      });
    }

    return step();
  }

  function collapseAndRefill() {
    for (var c = 0; c < S.cols; c++) {
      var write = S.rows - 1;
      for (var r = S.rows - 1; r >= 0; r--) {
        var t = S.grid[r][c];
        if (!t) continue;
        if (r !== write) {
          S.grid[r][c] = null;
          S.grid[write][c] = t;
          t.row = write;
          t.col = c;
          setTransform(t);
        }
        write--;
      }
      var need = write + 1;
      for (var i = 0; i < need; i++) {
        var targetRow = write - i;
        var fromRow = -1 - i;
        var type = 1 + Math.floor(Math.random() * S.types);
        addFallingTile(type, targetRow, c, fromRow);
      }
    }
    return delay(260);
  }

  function attemptSwap(r1, c1, r2, c2) {
    if (!S || S.busy || S.over) return Promise.resolve(false);
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return Promise.resolve(false);
    var a = S.grid[r1][c1];
    var b = S.grid[r2][c2];
    if (!a || !b) return Promise.resolve(false);

    S.busy = true;
    clearSelection();
    clearHint();
    swapCells(a, b);
    setTransform(a);
    setTransform(b);
    sfx('swap');

    return delay(170).then(function () {
      var matches = findMatches();
      if (!matches.size) {
        swapCells(a, b);
        setTransform(a);
        setTransform(b);
        sfx('fail');
        a.el.classList.add('shake');
        b.el.classList.add('shake');
        setTimeout(function () {
          a.el.classList.remove('shake');
          b.el.classList.remove('shake');
        }, 340);
        setStatus('这样换不出三连，再试试');
        return delay(190).then(function () {
          S.busy = false;
          return false;
        });
      }

      S.moves = Math.max(0, S.moves - 1);
      updateUI();
      return resolveMatches(matches, 1).then(function () {
        return finishTurn();
      }).then(function () {
        S.busy = false;
        updateUI();
        return true;
      });
    });
  }

  function finishTurn() {
    updateUI();
    if (S.score >= S.target) {
      return delay(120).then(function () { winLevel(); });
    }
    if (S.moves <= 0) {
      return delay(120).then(function () { loseLevel(); });
    }
    if (!findMove()) {
      toast('没有可消除的组合，自动洗牌');
      return shuffleBoard(true).then(function () {
        if (!S.over && !findMove()) {
          S.over = true;
          showResult(false);
        }
      });
    }
    return Promise.resolve();
  }

  // ───────── 结算 ─────────

  function winLevel() {
    if (S.over) return;
    var bonus = Math.max(0, S.moves) * 80;
    S.lastBonus = bonus;
    if (bonus) {
      S.score += bonus;
      updateBest();
      updateUI();
      var cx = S.layout.offset + S.layout.gridSize / 2;
      popText(cx, S.layout.offset + S.layout.gridSize / 2, '+' + bonus, true);
    }
    S.over = true;
    showResult(true);
  }

  function loseLevel() {
    if (S.over) return;
    S.over = true;
    showResult(false);
  }

  function showResult(win) {
    var ratio = S.target ? S.score / S.target : 0;
    sfx(win ? 'win' : 'lose');
    var starCount = win ? (ratio >= 1.55 ? 3 : ratio >= 1.25 ? 2 : 1) : 0;
    var starEls = starsEl.querySelectorAll('span');

    for (var i = 0; i < starEls.length; i++) starEls[i].classList.remove('on');
    void starsEl.offsetWidth;
    for (var j = 0; j < starCount; j++) starEls[j].classList.add('on');

    resultTitle.textContent = win ? '第 ' + S.level + ' 关通过！' : '步数用完了';
    if (win) {
      resultSub.textContent = S.lastBonus
        ? '剩余 ' + S.moves + ' 步 · 步数奖励 +' + S.lastBonus
        : '目标达成，继续下一关吧。';
    } else {
      var gap = Math.max(0, S.target - S.score);
      resultSub.textContent = '还差 ' + gap + ' 分，再试一次就能过关。';
    }
    resultScore.textContent = String(S.score);
    resultTarget.textContent = String(S.target);
    nextBtn.style.display = win ? '' : 'none';
    retryBtn.textContent = win ? '再玩一次' : '重新挑战';
    overlay.hidden = false;
    setStatus(win ? '目标达成！' : '步数用完了');
    updateUI();
  }

  // ───────── 分数特效 ─────────

  function popScore(cells, text) {
    if (!cells.length) return;
    var x = 0, y = 0;
    for (var i = 0; i < cells.length; i++) {
      var p = cellCenter(cells[i].r, cells[i].c);
      x += p.x; y += p.y;
    }
    popText(x / cells.length, y / cells.length, text, false);
  }

  function popText(x, y, text, big) {
    var el = document.createElement('span');
    el.className = 'score-pop';
    el.textContent = text;
    if (big) el.style.fontSize = '22px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    shell.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 820);
  }

  function showCombo(combo) {
    comboEl.textContent = '连击 ×' + combo;
    comboEl.classList.remove('show');
    void comboEl.offsetWidth;
    comboEl.classList.add('show');
    clearTimeout(comboTimer);
    comboTimer = setTimeout(function () { comboEl.classList.remove('show'); }, 860);
  }

  function flashScreen() {
    flashEl.classList.remove('show');
    void flashEl.offsetWidth;
    flashEl.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { flashEl.classList.remove('show'); }, 460);
  }

  // ───────── 粒子 ─────────

  function spawnParticles(t) {
    if (!ctx) return;
    var p = cellCenter(t.row, t.col);
    var color = COLORS[(t.type - 1) % COLORS.length];
    for (var i = 0; i < 9; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 45 + Math.random() * 150;
      particles.push({
        x: p.x + (Math.random() - 0.5) * S.layout.cell * 0.4,
        y: p.y + (Math.random() - 0.5) * S.layout.cell * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        life: 0.48 + Math.random() * 0.34,
        maxLife: 0.82,
        size: 1.8 + Math.random() * 3.8,
        color: color,
        square: Math.random() > 0.58,
      });
    }
    if (!rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(tickParticles);
    }
  }

  function tickParticles(ts) {
    if (!ctx || !S) { rafId = null; return; }
    if (!lastTs) lastTs = ts;
    var dt = Math.min(34, ts - lastTs);
    lastTs = ts;
    ctx.clearRect(0, 0, S.layout.size, S.layout.size);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt / 1000;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += 380 * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      var a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(' + p.color + ',1)';
      if (p.square) {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (particles.length) {
      rafId = requestAnimationFrame(tickParticles);
    } else {
      rafId = null;
      lastTs = 0;
      ctx.clearRect(0, 0, S.layout.size, S.layout.size);
    }
  }

  function clearParticles() {
    particles = [];
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = 0;
    if (ctx && S) ctx.clearRect(0, 0, S.layout.size, S.layout.size);
  }

  // ───────── 洗牌 / 提示 ─────────

  function shuffleBoard(auto) {
    if (!S || S.over) return Promise.resolve(false);
    if (S.busy && !auto) return Promise.resolve(false);
    sfx('shuffle');
    var prevBusy = S.busy;
    S.busy = true;
    clearSelection();
    clearHint();
    board.classList.add('shuffling');

    return delay(160).then(function () {
      var order = [];
      for (var r = 0; r < S.rows; r++) {
        for (var c = 0; c < S.cols; c++) if (S.grid[r][c]) order.push(S.grid[r][c]);
      }
      if (!order.length) {
        board.classList.remove('shuffling');
        S.busy = prevBusy;
        return false;
      }
      var types = order.map(function (t) { return t.type; });
      var positions = order.map(function (t) { return { r: t.row, c: t.col }; });
      var ok = false;

      for (var tries = 0; tries < 220 && !ok; tries++) {
        shuffleArr(types);
        var m = emptyTypes(S.rows, S.cols);
        for (var i = 0; i < order.length; i++) m[positions[i].r][positions[i].c] = types[i];
        if (!hasMatchIn(m) && findMoveInTypes(m)) ok = true;
      }

      if (!ok) {
        var fresh = buildBoardTypes();
        for (var k = 0; k < order.length; k++) {
          types[k] = fresh[positions[k].r][positions[k].c];
        }
      }

      for (var j = 0; j < order.length; j++) {
        order[j].type = types[j];
        paintTile(order[j]);
      }
      return delay(230).then(function () {
        board.classList.remove('shuffling');
        S.busy = prevBusy;
        setStatus(auto ? '没有可消除的组合，已自动洗牌' : '已洗牌');
        if (auto) toast('已自动洗牌');
        return true;
      });
    });
  }

  function hint() {
    if (!S || S.busy || S.over) return;
    sfx('tap');
    var mv = findMove();
    if (!mv) {
      toast('没有可消除的组合，自动洗牌');
      shuffleBoard(true);
      return;
    }
    clearHint();
    var a = S.grid[mv.r1][mv.c1];
    var b = S.grid[mv.r2][mv.c2];
    if (a) a.el.classList.add('hint');
    if (b) b.el.classList.add('hint');
    setStatus('提示：交换这两个图块');
    setTimeout(clearHint, 1650);
  }

  // ───────── 交互 ─────────

  function pointToCell(clientX, clientY) {
    if (!S || !S.layout.cell) return null;
    var rect = board.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var step = S.layout.cell + S.layout.gap;
    var c = Math.floor(x / step);
    var r = Math.floor(y / step);
    if (r < 0 || r >= S.rows || c < 0 || c >= S.cols) return null;
    if (x - c * step > S.layout.cell + 1 || y - r * step > S.layout.cell + 1) return null;
    return { r: r, c: c };
  }

  function handleTap(r, c) {
    if (!S || S.busy || S.over) return;
    if (!S.grid[r][c]) return;
    if (!S.selected) {
      selectTile(r, c);
      return;
    }
    if (S.selected.r === r && S.selected.c === c) {
      clearSelection();
      setStatus('已取消选择');
      return;
    }
    if (Math.abs(S.selected.r - r) + Math.abs(S.selected.c - c) === 1) {
      attemptSwap(S.selected.r, S.selected.c, r, c);
      return;
    }
    selectTile(r, c);
  }

  function bindEvents() {
    diffsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn || !S || S.busy) return;
      newGame(btn.dataset.diff, 1);
    });

    hintBtn.addEventListener('click', hint);
    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        if (!window.LINK_SFX) return;
        window.LINK_SFX.setEnabled(!window.LINK_SFX.isEnabled());
        renderSound();
      });
    }
    shuffleBtn.addEventListener('click', function () { shuffleBoard(false); });
    restartBtn.addEventListener('click', function () {
      if (!S || S.busy) return;
      newGame(S.diff, S.level);
    });
    nextBtn.addEventListener('click', function () {
      if (!S) return;
      newGame(S.diff, S.level + 1);
    });
    retryBtn.addEventListener('click', function () {
      if (!S) return;
      newGame(S.diff, S.level);
    });

    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    board.addEventListener('pointerdown', function (e) {
      if (!S || S.busy || S.over) return;
      if (e.button !== undefined && e.button !== 0) return;
      var cell = pointToCell(e.clientX, e.clientY);
      if (!cell) return;
      drag = { r: cell.r, c: cell.c, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    board.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId || !S || S.busy || S.over) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      var threshold = Math.max(12, S.layout.cell * 0.26);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      drag.moved = true;
      var dr = 0, dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
      else dr = dy > 0 ? 1 : -1;
      var from = drag;
      drag = null;
      var r2 = from.r + dr;
      var c2 = from.c + dc;
      if (r2 < 0 || r2 >= S.rows || c2 < 0 || c2 >= S.cols) {
        setStatus('往棋盘内滑动');
        return;
      }
      attemptSwap(from.r, from.c, r2, c2);
    });

    board.addEventListener('pointerup', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var d = drag;
      drag = null;
      if (!d.moved) handleTap(d.r, d.c);
    });

    board.addEventListener('pointercancel', function () { drag = null; });

    var resizeRaf = null;
    function onResize() {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(function () {
        resizeRaf = null;
        layout();
      });
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(main);
  }

  // ───────── 初始化 ─────────

  function init() {
    slotLayer = document.createElement('div');
    slotLayer.className = 'slot-layer';
    board.appendChild(slotLayer);

    loadBest();
    var diff = 'normal';
    try {
      var saved = localStorage.getItem(DIFF_KEY);
      if (saved && DIFFS[saved]) diff = saved;
    } catch (e) {}
    newGame(diff, 1);
    bindEvents();
    renderSound();
    requestAnimationFrame(function () {
      layout();
      if (!fastMode) setStatus('滑动或点击相邻图块交换');
    });
  }

  window.M3 = {
    get state() {
      if (!S) return null;
      return {
        diff: S.diff,
        level: S.level,
        rows: S.rows,
        cols: S.cols,
        moves: S.moves,
        score: S.score,
        target: S.target,
        best: typeof bestMap[S.diff] === 'number' ? bestMap[S.diff] : 0,
        over: S.over,
        busy: S.busy,
        types: getTypes(),
        selected: S.selected,
      };
    },
    newGame: newGame,
    attemptSwap: attemptSwap,
    findMove: findMove,
    findMatches: function () {
      var out = [];
      findMatches().forEach(function (k) {
        out.push({ r: Math.floor(k / S.cols), c: k % S.cols });
      });
      return out;
    },
    findMoveInTypes: findMoveInTypes,
    shuffle: shuffleBoard,
    hint: hint,
    layout: layout,
    setFast: function (v) { fastMode = !!v; },
    setGoal: function (target, moves) {
      if (!S) return;
      if (typeof target === 'number') S.target = target;
      if (typeof moves === 'number') S.moves = moves;
      updateUI();
    },
    setBoard: function (types) {
      if (!S || !types || types.length !== S.rows) return false;
      for (var r = 0; r < S.rows; r++) {
        if (!types[r] || types[r].length !== S.cols) return false;
      }
      clearTiles();
      clearParticles();
      S.grid = emptyGrid(S.rows, S.cols);
      S.tiles = [];
      S.nextId = 1;
      S.score = 0;
      S.moves = 50;
      S.target = 999999;
      S.lastBonus = 0;
      S.busy = false;
      S.over = false;
      S.selected = null;
      for (var r2 = 0; r2 < S.rows; r2++) {
        for (var c2 = 0; c2 < S.cols; c2++) {
          if (!types[r2][c2]) continue;
          var t = createTile(types[r2][c2], r2, c2, {});
          S.grid[r2][c2] = t;
          S.tiles.push(t);
        }
      }
      updateUI();
      overlay.hidden = true;
      setStatus('测试棋盘');
      return true;
    },
    autoPlay: function (steps) {
      steps = Math.max(1, steps || 1);
      function loop(i) {
        if (i >= steps || !S || S.over) return Promise.resolve(window.M3.state);
        var mv = findMove();
        if (!mv) {
          return shuffleBoard(true).then(function () {
            var mv2 = findMove();
            if (!mv2) return window.M3.state;
            return attemptSwap(mv2.r1, mv2.c1, mv2.r2, mv2.c2).then(function () { return loop(i + 1); });
          });
        }
        return attemptSwap(mv.r1, mv.c1, mv.r2, mv.c2).then(function () { return loop(i + 1); });
      }
      return loop(0);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
