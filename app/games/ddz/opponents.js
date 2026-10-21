/* 斗地主 · 8 位 AI 对手与后台盒豆小经济 */
(function () {
  'use strict';

  var AI_KEY = 'gamebox_ddz_ai_v1';
  var AI_FLOOR = 500;
  var AI_RESERVE = 500;

  var ROSTER = [
    {
      id: 'xiaoman', name: '小满', avatar: '👩', personality: '稳健派，喜欢先看牌再出手。',
      beans: 1800,
      wishlist: ['frame_bamboo', 'title_friend', 'frame_star', 'title_famous', 'frame_gold', 'title_spring'],
      bids: ['叫地主。', '我来试试。', '这局我坐庄。']
    },
    {
      id: 'afu', name: '阿福', avatar: '🧔', personality: '豪爽派，牌好就敢加注。',
      beans: 1700,
      wishlist: ['frame_bronze', 'title_new', 'frame_red', 'title_bomber', 'frame_gold', 'title_collector'],
      bids: ['我来！', '叫地主，图个痛快。', '这把我带节奏。']
    },
    {
      id: 'ale', name: '阿乐', avatar: '😎', personality: '气氛组，输了也要说两句。',
      beans: 1750,
      wishlist: ['frame_red', 'title_bomber', 'frame_gold', 'title_spring', 'frame_star', 'title_famous'],
      bids: ['叫！', '让我来。', '这局有乐子。']
    },
    {
      id: 'xiaobei', name: '小北', avatar: '🧑', personality: '冷静派，出牌不快但很少后悔。',
      beans: 1600,
      wishlist: ['frame_star', 'title_friend', 'frame_bamboo', 'title_famous', 'frame_gold', 'title_collector'],
      bids: ['我叫。', '先拿地主。', '可以试试。']
    },
    {
      id: 'laok', name: '老K', avatar: '🧓', personality: '老牌手，嘴上谦虚，手里全是算计。',
      beans: 1650,
      wishlist: ['frame_gold', 'title_spring', 'frame_red', 'title_bomber', 'frame_star', 'title_collector'],
      bids: ['老夫来。', '叫地主。', '这局稳一点。']
    },
    {
      id: 'tangtang', name: '糖糖', avatar: '👧', personality: '甜嘴但手硬，最爱春天。',
      beans: 1550,
      wishlist: ['frame_bamboo', 'title_famous', 'frame_star', 'title_friend', 'frame_gold', 'title_spring'],
      bids: ['我我我！', '叫地主呀。', '这局让我来。']
    },
    {
      id: 'aqi', name: '阿七', avatar: '🧑‍🦱', personality: '炸弹爱好者，能炸就炸。',
      beans: 1700,
      wishlist: ['frame_star', 'title_bomber', 'frame_red', 'title_spring', 'frame_gold', 'title_collector'],
      bids: ['炸！', '叫地主。', '这局听响。']
    },
    {
      id: 'zhujie', name: '竹姐', avatar: '👩‍🦰', personality: '收藏控，小铺上新一定要看。',
      beans: 1800,
      wishlist: ['frame_red', 'title_collector', 'frame_gold', 'title_famous', 'frame_bamboo', 'title_spring'],
      bids: ['我来坐庄。', '叫地主。', '这局慢慢打。']
    }
  ];

  var BY_ID = {};
  ROSTER.forEach(function (ai) { BY_ID[ai.id] = ai; });

  var state = { profiles: {}, bag: [], lastPair: [] };
  var opts = { toast: function () {} };
  var overlay = null;

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function samePair(a, b) {
    if (!a || !b || a.length < 2 || b.length < 2) return false;
    return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
  }

  function defaultProfile(ai) {
    return {
      beans: ai.beans,
      wins: 0,
      losses: 0,
      owned: [],
      equipped: { frame: '', title: '' },
      lastPurchase: ''
    };
  }

  function validItem(id, cat) {
    if (!window.DDZ_SHOP || !id) return null;
    var item = window.DDZ_SHOP.getItem(id);
    return item && (!cat || item.cat === cat) ? item : null;
  }

  function ensureProfiles() {
    ROSTER.forEach(function (ai) {
      var p = state.profiles[ai.id];
      if (!p || typeof p !== 'object') {
        state.profiles[ai.id] = defaultProfile(ai);
        return;
      }
      if (typeof p.beans !== 'number' || !isFinite(p.beans)) p.beans = ai.beans;
      if (typeof p.wins !== 'number') p.wins = 0;
      if (typeof p.losses !== 'number') p.losses = 0;
      if (!Array.isArray(p.owned)) p.owned = [];
      p.owned = p.owned.filter(function (id) { return !!validItem(id); });
      if (!p.equipped || typeof p.equipped !== 'object') p.equipped = { frame: '', title: '' };
      if (p.equipped.frame && (!validItem(p.equipped.frame, 'frame') || p.owned.indexOf(p.equipped.frame) < 0)) p.equipped.frame = '';
      if (p.equipped.title && (!validItem(p.equipped.title, 'title') || p.owned.indexOf(p.equipped.title) < 0)) p.equipped.title = '';
      if (p.lastPurchase && !validItem(p.lastPurchase)) p.lastPurchase = '';
      if (p.beans < AI_FLOOR) p.beans = AI_FLOOR;
    });
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(AI_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        if (raw.profiles && typeof raw.profiles === 'object') state.profiles = raw.profiles;
        if (Array.isArray(raw.bag)) {
          state.bag = raw.bag.filter(function (id) { return !!BY_ID[id]; });
        }
        if (Array.isArray(raw.lastPair)) {
          state.lastPair = raw.lastPair.filter(function (id) { return !!BY_ID[id]; }).slice(0, 2);
        }
      }
    } catch (e) {}
    ensureProfiles();
    save();
  }

  function save() {
    try {
      localStorage.setItem(AI_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function get(id) {
    return BY_ID[id] || null;
  }

  function getProfile(id) {
    if (!state.profiles[id]) {
      var ai = BY_ID[id];
      if (!ai) return null;
      state.profiles[id] = defaultProfile(ai);
    }
    return state.profiles[id];
  }

  function refillBag() {
    state.bag = shuffle(ROSTER.map(function (ai) { return ai.id; }));
  }

  function pickPair() {
    state.bag = (state.bag || []).filter(function (id) { return !!BY_ID[id]; });
    if (state.bag.length < 2) refillBag();
    var pair = [state.bag.shift(), state.bag.shift()];
    if (!pair[0] || !pair[1] || pair[0] === pair[1]) {
      refillBag();
      pair = [state.bag.shift(), state.bag.shift()];
    }
    if (state.lastPair.length === 2 && samePair(pair, state.lastPair)) {
      refillBag();
      var candidates = state.bag.filter(function (id) { return id !== pair[0]; });
      pair[1] = candidates[Math.floor(Math.random() * candidates.length)];
      state.bag = candidates.filter(function (id) { return id !== pair[1]; });
    }
    if (Math.random() < 0.5) pair.reverse();
    state.lastPair = pair.slice();
    save();
    return pair.map(function (id) {
      var ai = BY_ID[id];
      return { id: ai.id, name: ai.name, avatar: ai.avatar, personality: ai.personality };
    });
  }

  function maybeBuy(profile, ai) {
    if (!window.DDZ_SHOP) return null;
    var wishlist = ai.wishlist || [];
    for (var i = 0; i < wishlist.length; i++) {
      var id = wishlist[i];
      var item = window.DDZ_SHOP.getItem(id);
      if (!item || (item.cat !== 'frame' && item.cat !== 'title')) continue;
      if (profile.owned.indexOf(id) >= 0) continue;
      if (profile.beans - item.price < AI_RESERVE) continue;
      profile.beans -= item.price;
      profile.owned.push(id);
      profile.equipped[item.cat] = id;
      profile.lastPurchase = id;
      return item;
    }
    return null;
  }

  function itemKind(item) {
    return item.cat === 'frame' ? '头像框' : '称号';
  }

  function settle(game) {
    if (!game || !Array.isArray(game.opponents)) return [];
    var events = [];
    game.opponents.forEach(function (meta, i) {
      var ai = BY_ID[meta && meta.id];
      if (!ai) return;
      var profile = getProfile(ai.id);
      var playerIndex = i + 1;
      var isLandlord = game.landlord === playerIndex;
      var aiWin = isLandlord ? (game.winner === playerIndex) : (game.winner !== game.landlord);
      var roleMultiplier = isLandlord ? 2 : 1;
      var delta = (aiWin ? 1 : -1) * game.base * game.multiplier * roleMultiplier;
      profile.beans = Math.max(0, profile.beans + delta);
      if (aiWin) profile.wins++;
      else profile.losses++;
      if (profile.beans < AI_FLOOR) profile.beans = AI_FLOOR;
      var item = maybeBuy(profile, ai);
      if (item) {
        events.push({
          ai: { id: ai.id, name: ai.name, avatar: ai.avatar },
          item: item,
          delta: delta,
          beans: profile.beans
        });
      }
    });
    save();
    return events;
  }

  function quoteBid(id) {
    var ai = BY_ID[id];
    if (!ai || !ai.bids || !ai.bids.length) return '叫地主。';
    return ai.bids[Math.floor(Math.random() * ai.bids.length)];
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'overlay ai-profile-overlay';
    overlay.hidden = true;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideProfile();
    });
  }

  function hideProfile() {
    if (overlay) overlay.hidden = true;
  }

  function openProfile(id) {
    var ai = BY_ID[id];
    if (!ai) return;
    ensureOverlay();
    var profile = getProfile(id);
    var frame = validItem(profile.equipped.frame, 'frame');
    var title = validItem(profile.equipped.title, 'title');
    var last = validItem(profile.lastPurchase);
    var frameClass = frame ? ' ' + frame.cls : '';
    var recent = last
      ? '最近兑换：<strong>「' + last.name + '」' + itemKind(last) + '</strong>'
      : '最近兑换：<span>还没有在小铺花过盒豆</span>';
    overlay.innerHTML =
      '<div class="overlay-card ai-profile-card">' +
        '<button type="button" class="shop-close ai-profile-close" aria-label="关闭资料">×</button>' +
        '<div class="ai-profile-avatar avatar' + frameClass + '">' + ai.avatar + '</div>' +
        '<h3>' + ai.name + '</h3>' +
        (title ? '<span class="ai-profile-title">' + title.name + '</span>' : '') +
        '<p class="ai-profile-personality">' + ai.personality + '</p>' +
        '<div class="ai-profile-stats">' +
          '<div><span>盒豆</span><strong>' + fmt(profile.beans) + '</strong></div>' +
          '<div><span>战绩</span><strong>' + profile.wins + ' 胜 / ' + profile.losses + ' 负</strong></div>' +
        '</div>' +
        '<div class="ai-profile-recent">' + recent + '</div>' +
        '<div class="ai-profile-note">AI 只买头像框和称号，不影响出牌和难度。</div>' +
        '<button type="button" class="btn ghost ai-profile-back">返回牌桌</button>' +
      '</div>';
    overlay.querySelector('.ai-profile-close').onclick = hideProfile;
    overlay.querySelector('.ai-profile-back').onclick = hideProfile;
    overlay.hidden = false;
  }

  function init(options) {
    if (options) {
      Object.keys(options).forEach(function (key) { opts[key] = options[key]; });
    }
    load();
  }

  window.DDZ_OPPONENTS = {
    ROSTER: ROSTER,
    AI_FLOOR: AI_FLOOR,
    AI_RESERVE: AI_RESERVE,
    get: get,
    getProfile: getProfile,
    pickPair: pickPair,
    settle: settle,
    quoteBid: quoteBid,
    openProfile: openProfile,
    closeProfile: hideProfile,
    init: init,
    formatBeans: fmt
  };
})();
