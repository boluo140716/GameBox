/* 2048 · 重制版（纯前端，无外部依赖） */
(function () {
  'use strict';

  var SIZE = 4;
  var BEST_KEY = 'gamebox_2048_best';
  var SAVE_KEY = 'gamebox_2048_state';

  var board = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var gridBg = document.getElementById('gridBg');
  var tileLayer = document.getElementById('tileLayer');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var statusEl = document.getElementById('status');
  var undoBtn = document.getElementById('undoBtn');
  var newBtn = document.getElementById('newBtn');
  var overlay = document.getElementById('overlay');
  var overlayContinue = document.getElementById('continueBtn');
  var overlayNew = document.getElementById('overNewBtn');
  var resultEmblem = document.getElementById('resultEmblem');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var resultScore = document.getElementById('resultScore');
  var resultBest = document.getElementById('resultBest');

  var grid = [];
  var tiles = [];
  var nextId = 1;
  var score = 0;
  var best = 0;
  var busy = false;
  var over = false;
  var won = false;
  var overlayOpen = false;
  var history = [];
  var L = { cell: 0, gap: 0, offset: 0, size: 0 };
  var start = null;

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(null);
      g.push(row);
    }
    return g;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function getValues() {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(grid[r][c] ? grid[r][c].value : 0);
      out.push(row);
    }
    return out;
  }

  function hasValue(values, target) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (values[r][c] >= target) return true;
      }
    }
    return false;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
    bestEl.textContent = String(best);
  }

  function updateUndo() {
    undoBtn.disabled = busy || over || overlayOpen || history.length === 0;
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: getValues(),
        score: score,
        won: won,
        over: over,
      }));
    } catch (e) {}
  }

  function canMove() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var a = grid[r][c];
        if (!a) return true;
        var right = c < SIZE - 1 ? grid[r][c + 1] : null;
        var down = r < SIZE - 1 ? grid[r + 1][c] : null;
        if (right && a.value === right.value) return true;
        if (down && a.value === down.value) return true;
      }
    }
    return false;
  }

  // ───────── 布局 ─────────

  function buildSlots() {
    if (gridBg.children.length) return;
    for (var i = 0; i < SIZE * SIZE; i++) {
      var slot = document.createElement('div');
      slot.className = 'slot';
      gridBg.appendChild(slot);
    }
  }

  function faceSize(value) {
    var digits = String(value).length;
    var ratio = digits <= 2 ? 0.42 : digits === 3 ? 0.36 : digits === 4 ? 0.30 : 0.235;
    return Math.max(10, Math.round((L.cell || 72) * ratio));
  }

  function updateFace(t) {
    t.el.dataset.v = t.value <= 2048 ? String(t.value) : 'super';
    t.num.textContent = String(t.value);
    t.num.style.fontSize = faceSize(t.value) + 'px';
  }

  function setTransform(t) {
    var x = L.offset + t.col * (L.cell + L.gap);
    var y = L.offset + t.row * (L.cell + L.gap);
    t.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  function positionTile(t) {
    setTransform(t);
  }

  function layout() {
    var wrapW = boardWrap.clientWidth;
    var wrapH = boardWrap.clientHeight;
    if (!wrapW || !wrapH) return;
    var size = Math.floor(Math.min(wrapW - 2, wrapH - 2, 560));
    size = Math.max(210, size);

    var gap = Math.max(5, Math.round(size * 0.022));
    var offset = Math.max(7, Math.round(size * 0.028));
    var cell = Math.floor((size - offset * 2 - gap * 3) / SIZE);
    cell = Math.max(32, cell);
    var gridSize = cell * SIZE + gap * (SIZE - 1);
    offset = Math.max(6, Math.floor((size - gridSize) / 2));
    var actual = gridSize + offset * 2;

    board.style.width = actual + 'px';
    board.style.height = actual + 'px';
    board.style.setProperty('--cell', cell + 'px');
    board.style.setProperty('--gap', gap + 'px');
    gridBg.style.left = offset + 'px';
    gridBg.style.top = offset + 'px';
    gridBg.style.width = gridSize + 'px';
    gridBg.style.height = gridSize + 'px';

    L = { cell: cell, gap: gap, offset: offset, size: actual };

    tileLayer.classList.add('no-anim');
    for (var i = 0; i < tiles.length; i++) {
      setTransform(tiles[i]);
      updateFace(tiles[i]);
    }
    void tileLayer.offsetWidth;
    tileLayer.classList.remove('no-anim');
  }

  // ───────── 方块 ─────────

  function createTile(value, row, col, isNew) {
    var el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = '<span class="tile-num"></span>';
    el.style.transition = 'none';
    tileLayer.appendChild(el);

    var t = {
      id: nextId++,
      value: value,
      row: row,
      col: col,
      el: el,
      num: el.firstChild,
    };
    grid[row][col] = t;
    tiles.push(t);
    updateFace(t);
    setTransform(t);
    void el.offsetWidth;
    el.style.transition = '';

    if (isNew) {
      el.classList.add('new');
      setTimeout(function () { el.classList.remove('new'); }, 260);
    }
    return t;
  }

  function removeTile(t) {
    if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
    var idx = tiles.indexOf(t);
    if (idx !== -1) tiles.splice(idx, 1);
  }

  function spawnTile() {
    var empty = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!grid[r][c]) empty.push({ r: r, c: c });
      }
    }
    if (!empty.length) return null;
    var pos = empty[Math.floor(Math.random() * empty.length)];
    return createTile(Math.random() < 0.9 ? 2 : 4, pos.r, pos.c, true);
  }

  function floatScore(value, row, col) {
    var el = document.createElement('span');
    el.className = 'score-float';
    el.textContent = '+' + value;
    var x = L.offset + col * (L.cell + L.gap) + L.cell / 2;
    var y = L.offset + row * (L.cell + L.gap) + L.cell / 2;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    board.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 780);
  }

  // ───────── 移动 ─────────

  function lineFor(dir, index) {
    var line = [];
    var i;
    if (dir === 'left') {
      for (i = 0; i < SIZE; i++) line.push({ r: index, c: i });
    } else if (dir === 'right') {
      for (i = SIZE - 1; i >= 0; i--) line.push({ r: index, c: i });
    } else if (dir === 'up') {
      for (i = 0; i < SIZE; i++) line.push({ r: i, c: index });
    } else {
      for (i = SIZE - 1; i >= 0; i--) line.push({ r: i, c: index });
    }
    return line;
  }

  function snapshot() {
    return { v: getValues(), score: score };
  }

  function move(dir) {
    if (busy || over || overlayOpen) return Promise.resolve(false);
    if (['left', 'right', 'up', 'down'].indexOf(dir) === -1) return Promise.resolve(false);

    busy = true;
    updateUndo();

    var before = snapshot();
    var newGrid = emptyGrid();
    var merges = [];
    var gained = 0;
    var didMove = false;

    for (var i = 0; i < SIZE; i++) {
      var line = lineFor(dir, i);
      var seq = [];
      for (var k = 0; k < line.length; k++) {
        var cell = grid[line[k].r][line[k].c];
        if (cell) {
          cell._merged = false;
          seq.push(cell);
        }
      }

      var target = 0;
      var last = null;
      for (var j = 0; j < seq.length; j++) {
        var t = seq[j];
        if (last && !last._merged && last.value === t.value) {
          last._merged = true;
          merges.push({
            keep: last,
            remove: t,
            value: last.value * 2,
            row: last.row,
            col: last.col,
          });
          gained += last.value * 2;
          t.row = last.row;
          t.col = last.col;
          didMove = true;
        } else {
          var pos = line[target];
          if (t.row !== pos.r || t.col !== pos.c) didMove = true;
          t.row = pos.r;
          t.col = pos.c;
          newGrid[pos.r][pos.c] = t;
          last = t;
          target++;
        }
      }
    }

    if (!didMove) {
      busy = false;
      updateUndo();
      setStatus('这个方向没有变化，换个方向试试');
      return Promise.resolve(false);
    }

    history.push(before);
    if (history.length > 20) history.shift();
    grid = newGrid;

    for (var n = 0; n < tiles.length; n++) positionTile(tiles[n]);

    return delay(135).then(function () {
      var removed = [];
      for (var m = 0; m < merges.length; m++) {
        var item = merges[m];
        if (item.remove.el && item.remove.el.parentNode) {
          item.remove.el.parentNode.removeChild(item.remove.el);
        }
        removed.push(item.remove);
        item.keep.value = item.value;
        updateFace(item.keep);
        item.keep.el.classList.add('merged');
        floatScore(item.value, item.row, item.col);
        (function (el) {
          setTimeout(function () { el.classList.remove('merged'); }, 230);
        })(item.keep.el);
      }
      if (removed.length) {
        tiles = tiles.filter(function (t) { return removed.indexOf(t) === -1; });
      }

      score += gained;
      updateScore();
      save();
      spawnTile();
      updateUndo();
      save();
      setStatus(gained ? '+' + gained + ' 分' : '继续合并');
      checkState();
      busy = false;
      updateUndo();
      return true;
    });
  }

  function checkState() {
    if (!won && hasValue(getValues(), 2048)) {
      won = true;
      showWin();
      return;
    }
    if (!canMove()) {
      over = true;
      showGameOver();
    }
  }

  function showWin() {
    var can = canMove();
    overlayOpen = true;
    if (!can) over = true;
    resultEmblem.textContent = '2048';
    resultEmblem.style.fontSize = '22px';
    resultTitle.textContent = can ? '达成 2048！' : '达成 2048 · 棋盘已满';
    resultSub.textContent = can
      ? '继续挑战 4096，看看这局能走多远。'
      : '已经拼出 2048，这一局很精彩。';
    resultScore.textContent = String(score);
    resultBest.textContent = String(best);
    overlayContinue.style.display = can ? '' : 'none';
    overlayNew.textContent = can ? '重新开始' : '开新一局';
    overlay.hidden = false;
    setStatus('达成 2048！');
    updateUndo();
    save();
  }

  function showGameOver() {
    overlayOpen = true;
    over = true;
    resultEmblem.textContent = 'GAME';
    resultEmblem.style.fontSize = '17px';
    resultTitle.textContent = '本局结束';
    resultSub.textContent = '棋盘上没有可以合并的数字了，再来一局吧。';
    resultScore.textContent = String(score);
    resultBest.textContent = String(best);
    overlayContinue.style.display = 'none';
    overlayNew.textContent = '重新开始';
    overlay.hidden = false;
    setStatus('本局结束');
    updateUndo();
    save();
  }

  // ───────── 新局 / 撤销 / 恢复 ─────────

  function newGame() {
    tileLayer.innerHTML = '';
    grid = emptyGrid();
    tiles = [];
    nextId = 1;
    score = 0;
    over = false;
    won = false;
    overlayOpen = false;
    busy = false;
    history = [];
    overlay.hidden = true;
    updateScore();
    updateUndo();
    spawnTile();
    spawnTile();
    save();
    setStatus('合并相同数字，冲击 2048');
  }

  function restore(values, sc, opts) {
    opts = opts || {};
    tileLayer.innerHTML = '';
    grid = emptyGrid();
    tiles = [];
    nextId = 1;
    score = typeof sc === 'number' ? sc : 0;
    over = false;
    busy = false;
    overlay.hidden = true;
    overlayOpen = false;
    won = !!opts.keepWin && hasValue(values, 2048);
    if (opts.clearHistory) history = [];

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = values[r] && values[r][c];
        if (v) createTile(v, r, c, false);
      }
    }
    if (!L.cell) layout();
    for (var i = 0; i < tiles.length; i++) {
      positionTile(tiles[i]);
      updateFace(tiles[i]);
    }
    updateScore();
    updateUndo();
  }

  function undo() {
    if (busy || over || overlayOpen || !history.length) return;
    var h = history.pop();
    restore(h.v, h.score, { keepWin: hasValue(h.v, 2048) });
    save();
    setStatus('已撤销上一步');
  }

  function setValues(values, sc) {
    if (!values || values.length !== SIZE) return false;
    restore(values, sc || 0, { clearHistory: true, keepWin: false });
    setStatus('测试棋盘');
    return true;
  }

  // ───────── 事件 ─────────

  function bindEvents() {
    newBtn.addEventListener('click', function () {
      if (busy) return;
      newGame();
    });
    undoBtn.addEventListener('click', undo);
    overlayContinue.addEventListener('click', function () {
      overlay.hidden = true;
      overlayOpen = false;
      if (!canMove()) {
        over = true;
        showGameOver();
      } else {
        setStatus('继续挑战更高数字');
      }
      updateUndo();
      save();
    });
    overlayNew.addEventListener('click', function () {
      newGame();
    });

    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      var dir = null;
      var key = e.key;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') dir = 'left';
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') dir = 'right';
      else if (key === 'ArrowUp' || key === 'w' || key === 'W') dir = 'up';
      else if (key === 'ArrowDown' || key === 's' || key === 'S') dir = 'down';
      if (!dir) return;
      e.preventDefault();
      move(dir);
    });

    board.addEventListener('pointerdown', function (e) {
      if (busy || over || overlayOpen) return;
      if (e.button !== undefined && e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    board.addEventListener('pointerup', function (e) {
      if (!start || start.id !== e.pointerId) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      start = null;
      var threshold = Math.max(14, L.cell * 0.2);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      var dir;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
      else dir = dy > 0 ? 'down' : 'up';
      move(dir);
    });

    board.addEventListener('pointercancel', function () { start = null; });

    var resizeTimer = null;
    function onResize() {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(function () {
        resizeTimer = null;
        layout();
      });
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(boardWrap);
  }

  function loadBest() {
    try {
      var n = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
      best = isNaN(n) ? 0 : n;
    } catch (e) { best = 0; }
  }

  function readSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !saved.v || saved.v.length !== SIZE) return null;
      for (var r = 0; r < SIZE; r++) {
        if (!saved.v[r] || saved.v[r].length !== SIZE) return null;
      }
      return saved;
    } catch (e) { return null; }
  }

  function init() {
    loadBest();
    buildSlots();
    layout();
    bindEvents();

    var saved = readSave();
    if (saved && !saved.over) {
      restore(saved.v, saved.score, { keepWin: !!saved.won, clearHistory: true });
      setStatus('继续上次的对局');
    } else {
      newGame();
    }
    updateScore();
    updateUndo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.G2048 = {
    SIZE: SIZE,
    get state() {
      return {
        values: getValues(),
        score: score,
        best: best,
        over: over,
        won: won,
        busy: busy,
        overlayOpen: overlayOpen,
        history: history.length,
        canMove: canMove(),
      };
    },
    newGame: newGame,
    move: move,
    undo: undo,
    setValues: setValues,
    canMove: canMove,
    checkState: checkState,
    layout: layout,
  };
})();
