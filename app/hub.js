/* 游戏盒 GameBox — 首页 / 路由 / 播放器 */
(function () {
  'use strict';

  var GAMES = window.GAMEBOX_GAMES || [];
  var byId = {};
  GAMES.forEach(function (g) { byId[g.id] = g; });

  var homeEl = document.getElementById('home');
  var playerEl = document.getElementById('player');
  var frame = document.getElementById('gameFrame');
  var loader = document.getElementById('loader');
  var playerName = document.getElementById('playerName');
  var playerHint = document.getElementById('playerHint');
  var gridEl = document.getElementById('grid');
  var featuredEl = document.getElementById('featured');
  var featuredWrap = document.getElementById('featuredWrap');
  var emptyEl = document.getElementById('empty');
  var searchEl = document.getElementById('searchInput');
  var chipsEl = document.getElementById('chips');

  var state = { cat: 'all', query: '', currentId: null };
  var homeScroll = 0;
  var loaderTimer = null;

  function showLoaderSoon() {
    clearTimeout(loaderTimer);
    loader.classList.add('hide');
    loaderTimer = setTimeout(function () {
      loader.classList.remove('hide');
    }, 200);
  }

  function hideLoader() {
    clearTimeout(loaderTimer);
    loader.classList.add('hide');
  }

  function imgUrl(path) {
    return encodeURI(path).replace(/#/g, '%23');
  }

  function play(id) {
    if (!byId[id]) return;
    location.hash = '#/play/' + encodeURIComponent(id);
  }

  function makeFeatureCard(g) {
    var btn = document.createElement('button');
    btn.className = 'feature-card' + (g.img ? '' : ' emoji');
    btn.type = 'button';
    btn.setAttribute('aria-label', '打开 ' + g.name);

    var bg = document.createElement('span');
    bg.className = 'bg';
    if (g.img) bg.style.backgroundImage = 'url("' + imgUrl(g.img) + '")';
    btn.appendChild(bg);

    var shade = document.createElement('span');
    shade.className = 'shade';
    btn.appendChild(shade);

    if (!g.img) {
      var art = document.createElement('span');
      art.className = 'emoji-art';
      art.textContent = g.icon;
      btn.appendChild(art);
    }

    var badge = document.createElement('span');
    badge.className = 'fc-badge';
    badge.textContent = g.tag || '推荐';
    btn.appendChild(badge);

    var body = document.createElement('span');
    body.className = 'fc-body';
    var name = document.createElement('span');
    name.className = 'fc-name';
    name.textContent = g.name;
    var desc = document.createElement('span');
    desc.className = 'fc-desc';
    desc.textContent = g.desc || '';
    body.appendChild(name);
    body.appendChild(desc);
    btn.appendChild(body);

    btn.addEventListener('click', function () { play(g.id); });
    return btn;
  }

  function makeCard(g) {
    var btn = document.createElement('button');
    btn.className = 'card';
    btn.type = 'button';
    btn.dataset.id = g.id;
    btn.setAttribute('aria-label', '打开 ' + g.name);

    var thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (g.img) {
      thumb.style.backgroundImage = 'url("' + imgUrl(g.img) + '")';
    } else {
      var fb = document.createElement('div');
      fb.className = 'fallback';
      fb.textContent = g.icon;
      thumb.appendChild(fb);
    }
    btn.appendChild(thumb);

    var meta = document.createElement('div');
    meta.className = 'meta';
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = g.name;
    var tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = g.tag || '';
    meta.appendChild(name);
    meta.appendChild(tag);
    btn.appendChild(meta);

    btn.addEventListener('click', function () { play(g.id); });
    return btn;
  }

  function renderFeatured() {
    var list = GAMES.filter(function (g) { return g.featured; });
    featuredEl.innerHTML = '';
    list.forEach(function (g) { featuredEl.appendChild(makeFeatureCard(g)); });
  }

  function renderGrid() {
    var q = state.query.trim().toLowerCase();
    var filtering = !!q || state.cat !== 'all';
    featuredWrap.hidden = filtering;
    var shown = 0;
    gridEl.innerHTML = '';
    GAMES.forEach(function (g) {
      if (g.featured && !filtering) return; // 推荐位已单独展示
      if (state.cat === 'childhood' && g.kind !== 'childhood') return;
      if (state.cat === 'card' && g.cat !== 'card') return;
      if (state.cat === 'table' && g.cat !== 'table') return;
      if (state.cat === 'arcade' && g.cat !== 'arcade') return;
      if (q) {
        var hay = (g.name + ' ' + (g.desc || '') + ' ' + (g.tag || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      gridEl.appendChild(makeCard(g));
      shown++;
    });
    emptyEl.hidden = shown !== 0;
  }

  function applyRoute() {
    var m = /^#\/play\/(.+)$/.exec(location.hash);
    if (m) {
      var id = decodeURIComponent(m[1]);
      if (byId[id]) { openPlayer(id); return; }
    }
    closePlayer();
  }

  function openPlayer(id) {
    var g = byId[id];
    if (!g) return;
    if (state.currentId === id && !playerEl.hidden) return;
    state.currentId = id;
    homeScroll = window.scrollY || 0;

    homeEl.hidden = true;
    playerEl.hidden = false;
    playerName.textContent = g.name;
    playerHint.textContent = '支持触屏';
    document.title = g.name + ' · 游戏盒';
    showLoaderSoon();
    frame.src = 'about:blank';

    // 等一小段再设置 src，确保 about:blank 已生效（重进同一游戏时也会重新加载）
    setTimeout(function () {
      frame.src = g.src;
    }, 30);
    window.scrollTo(0, 0);
  }

  function closePlayer() {
    if (playerEl.hidden) return;
    playerEl.hidden = true;
    homeEl.hidden = false;
    hideLoader();
    frame.src = 'about:blank';
    state.currentId = null;
    document.title = '游戏盒 GameBox · 34 款经典小游戏';
    window.scrollTo(0, homeScroll);
  }

  function goHome() {
    if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    closePlayer();
  }

  frame.addEventListener('load', function () {
    if (frame.src === 'about:blank') return;
    hideLoader();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    goHome();
  });
  document.getElementById('reloadBtn').addEventListener('click', function () {
    var g = state.currentId && byId[state.currentId];
    if (!g) return;
    showLoaderSoon();
    frame.src = 'about:blank';
    setTimeout(function () { frame.src = g.src; }, 30);
  });

  // 游戏内的“返回大厅 / 退出”按钮 → 回到游戏盒
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'gamebox:exit') goHome();
  });

  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('popstate', applyRoute);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !playerEl.hidden) goHome();
  });

  chipsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    Array.prototype.forEach.call(chipsEl.querySelectorAll('.chip'), function (c) {
      c.classList.toggle('active', c === btn);
    });
    renderGrid();
  });

  searchEl.addEventListener('input', function () {
    state.query = searchEl.value;
    renderGrid();
  });

  renderFeatured();
  renderGrid();
  applyRoute();
})();
