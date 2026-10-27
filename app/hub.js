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

  var state = { cat: 'all', query: '', currentId: null, favs: [], recent: [] };
  var homeScroll = 0;
  var loaderTimer = null;

  var FAV_KEY = 'gamebox_favs_v1';
  var RECENT_KEY = 'gamebox_recent_v1';

  function loadIdList(key) {
    try {
      var arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (id) { return !!byId[id]; });
    } catch (e) { return []; }
  }

  function saveIdList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }

  function isFav(id) { return state.favs.indexOf(id) >= 0; }

  function toggleFav(id) {
    if (!byId[id]) return;
    var i = state.favs.indexOf(id);
    if (i >= 0) state.favs.splice(i, 1);
    else state.favs.unshift(id);
    saveIdList(FAV_KEY, state.favs);
    renderGrid();
    updateFavChip();
  }

  function markRecent(id) {
    if (!byId[id]) return;
    state.recent = [id].concat(state.recent.filter(function (x) { return x !== id; })).slice(0, 10);
    saveIdList(RECENT_KEY, state.recent);
  }

  function updateFavChip() {
    var el = document.getElementById('favCount');
    if (el) el.textContent = String(state.favs.length);
  }

  state.favs = loadIdList(FAV_KEY);
  state.recent = loadIdList(RECENT_KEY);

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

  function fallbackLabel(g) {
    if (!g) return '·';
    if (g.name === '2048') return '2048';
    return (g.name || g.icon || '·').charAt(0);
  }

  function play(id) {
    if (!byId[id]) return;
    markRecent(id);
    location.hash = '#/play/' + encodeURIComponent(id);
  }

  function addRankChip(host, g) {
    if (!window.GameRank || !window.GameRank.hasGame(g.id)) return;
    var d = window.GameRank.describe(g.id);
    if (!d) return;
    var chip = document.createElement('span');
    chip.className = 'gr-hub-chip' + (d.pending ? ' pending' : '');
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', g.name + '棋力 ' + d.tier + '，查看段位');
    chip.title = d.tier + ' ' + d.starText + ' · ' + d.title + ' · 棋力 ' + d.rating;
    chip.innerHTML = '<i style="background:' + d.color + '"></i>' + d.tier + ' ' + d.starText;
    function openRank(e) {
      e.preventDefault();
      e.stopPropagation();
      window.GameRank.open(g.id);
    }
    chip.addEventListener('click', openRank);
    chip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') openRank(e);
    });
    host.appendChild(chip);
  }

  function refreshRankChips() {
    if (!window.GameRank) return;
    window.GameRank.reload();
    document.querySelectorAll('.gr-hub-chip').forEach(function (el) { el.remove(); });
    GAMES.forEach(function (g) {
      var featured = document.querySelector('#featured .feature-card[data-id="' + g.id + '"]');
      if (featured) addRankChip(featured, g);
      var card = document.querySelector('#grid .card[data-id="' + g.id + '"]');
      if (card) addRankChip(card.querySelector('.thumb') || card, g);
    });
  }

  function makeFeatureCard(g) {
    var btn = document.createElement('button');
    btn.className = 'feature-card' + (g.img ? '' : ' emoji');
    btn.type = 'button';
    btn.dataset.id = g.id;
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
      art.className = 'feature-fallback';
      art.textContent = fallbackLabel(g);
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

    addRankChip(btn, g);

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
      fb.textContent = fallbackLabel(g);
      thumb.appendChild(fb);
    }
    btn.appendChild(thumb);
    addRankChip(thumb, g);

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

    var fav = document.createElement('span');
    fav.className = 'fav-btn' + (isFav(g.id) ? ' on' : '');
    fav.textContent = isFav(g.id) ? '★' : '☆';
    fav.setAttribute('role', 'button');
    fav.setAttribute('tabindex', '0');
    fav.setAttribute('aria-label', isFav(g.id) ? '取消收藏' : '收藏');
    fav.title = isFav(g.id) ? '取消收藏' : '收藏';
    fav.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFav(g.id);
    });
    fav.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(g.id);
      }
    });
    btn.appendChild(fav);

    btn.addEventListener('click', function () { play(g.id); });
    return btn;
  }

  function renderFeatured() {
    var list = GAMES.filter(function (g) { return g.featured; });
    featuredEl.innerHTML = '';
    list.forEach(function (g) { featuredEl.appendChild(makeFeatureCard(g)); });
  }

  function renderRecent() {
    var wrap = document.getElementById('recentWrap');
    var listEl = document.getElementById('recent');
    if (!wrap || !listEl) return;
    var ids = state.recent.filter(function (id) { return !!byId[id]; }).slice(0, 8);
    var show = ids.length > 0 && state.cat === 'all' && !state.query.trim();
    wrap.hidden = !show;
    if (!show) return;
    listEl.innerHTML = '';
    ids.forEach(function (id) {
      var g = byId[id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-item';
      btn.title = '继续玩 ' + g.name;
      btn.innerHTML =
        '<span class="recent-icon">' + (g.icon || '🎮') + '</span>' +
        '<span class="recent-name">' + g.name + '</span>' +
        '<span class="recent-go">继续 →</span>';
      btn.addEventListener('click', function () { play(id); });
      listEl.appendChild(btn);
    });
  }

  function renderGrid() {
    var q = state.query.trim().toLowerCase();
    var filtering = !!q || state.cat !== 'all';
    featuredWrap.hidden = filtering;
    var shown = 0;
    gridEl.innerHTML = '';
    GAMES.forEach(function (g) {
      if (g.featured && !filtering) return; // 推荐位已单独展示
      if (state.cat === 'fav' && !isFav(g.id)) return;
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
    emptyEl.textContent = state.cat === 'fav'
      ? '还没有收藏，点卡片右上角的 ☆ 就能收藏。'
      : '没有找到这个游戏，换个关键词试试。';
    updateFavChip();
    renderRecent();
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
    document.title = '游戏盒 GameBox · 35 款经典小游戏';
    window.scrollTo(0, homeScroll);
    renderRecent();
    refreshRankChips();
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

  var fullBtn = document.getElementById('fullBtn');
  if (fullBtn) {
    fullBtn.addEventListener('click', function () {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        return;
      }
      if (playerEl.requestFullscreen) {
        playerEl.requestFullscreen().catch(function () {});
      }
    });
    document.addEventListener('fullscreenchange', function () {
      var on = !!document.fullscreenElement;
      fullBtn.textContent = on ? '⤢' : '⛶';
      fullBtn.title = on ? '退出全屏' : '全屏';
      fullBtn.setAttribute('aria-label', on ? '退出全屏' : '全屏');
    });
  }

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
