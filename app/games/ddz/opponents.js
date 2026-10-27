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

  var LINES = {
    xiaoman: { win: '这局我跟得稳。', lose: '这手打得漂亮，我认。' },
    afu: { win: '哈哈，这把我收下了！', lose: '痛快！下把再来。' },
    ale: { win: '看到没，这就是气氛的力量。', lose: '输了也热闹，值了。' },
    xiaobei: { win: '算过了，这局在我手里。', lose: '嗯，是我漏算了一步。' },
    laok: { win: '年轻人，牌桌还长着呢。', lose: '这局记下了，加倍奉还。' },
    tangtang: { win: '嘿嘿，糖糖今天手气好。', lose: '哼，下一局不让你啦。' },
    aqi: { win: '响不响？我就说该炸。', lose: '没炸响，下把换个引线。' },
    zhujie: { win: '赢一局，离新收藏又近一点。', lose: '没事，先把这局的牌记住。' }
  };

  var state = { profiles: {}, bag: [], lastPair: [], grudge: {} };
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
      vsWins: 0,
      vsLosses: 0,
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
      if (typeof p.vsWins !== 'number') p.vsWins = 0;
      if (typeof p.vsLosses !== 'number') p.vsLosses = 0;
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
        if (raw.grudge && typeof raw.grudge === 'object') {
          state.grudge = {};
          Object.keys(raw.grudge).forEach(function (id) {
            if (BY_ID[id]) state.grudge[id] = Math.max(0, Number(raw.grudge[id]) || 0);
          });
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

  function pickPair(forceId) {
    var pair;
    if (forceId && BY_ID[forceId]) {
      var others = ROSTER.filter(function (ai) { return ai.id !== forceId; }).map(function (ai) { return ai.id; });
      pair = [forceId, others[Math.floor(Math.random() * others.length)]];
      state.bag = (state.bag || []).filter(function (id) { return pair.indexOf(id) === -1; });
    } else {
      state.bag = (state.bag || []).filter(function (id) { return !!BY_ID[id]; });
      if (state.bag.length < 2) refillBag();
      pair = [state.bag.shift(), state.bag.shift()];
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
    if (!game || !Array.isArray(game.opponents)) {
      return { purchases: [], reactions: [], revenge: null };
    }
    var purchases = [];
    var reactions = [];
    var currentIds = [];
    var playerWon = typeof game.youWin === 'boolean'
      ? game.youWin
      : (game.landlord === 0 ? game.winner === 0 : game.winner !== 0);
    game.opponents.forEach(function (meta, i) {
      var ai = BY_ID[meta && meta.id];
      if (!ai) return;
      currentIds.push(ai.id);
      var profile = getProfile(ai.id);
      var playerIndex = i + 1;
      var isLandlord = game.landlord === playerIndex;
      var aiWin = isLandlord ? (game.winner === playerIndex) : (game.winner !== game.landlord);
      // 只有“对手赢了你 / 你赢了对手”才算交锋，队友同赢同输不计
      var aiBeatPlayer = aiWin && !playerWon;
      var playerBeatAi = !aiWin && playerWon;
      var roleMultiplier = isLandlord ? 2 : 1;
      var delta = (aiWin ? 1 : -1) * game.base * game.multiplier * roleMultiplier;
      profile.beans = Math.max(0, profile.beans + delta);
      if (aiWin) profile.wins++;
      else profile.losses++;
      if (aiBeatPlayer) profile.vsWins = (profile.vsWins || 0) + 1;
      if (playerBeatAi) profile.vsLosses = (profile.vsLosses || 0) + 1;
      if (profile.beans < AI_FLOOR) profile.beans = AI_FLOOR;

      // 玩家连输给同一个对手时积累“怨念”，到 2 局就可以发起复仇
      if (aiBeatPlayer) {
        state.grudge[ai.id] = (state.grudge[ai.id] || 0) + 1;
        reactions.push(ai.name + '：' + quote(ai.id, 'win'));
      } else {
        state.grudge[ai.id] = 0;
        if (playerBeatAi) reactions.push(ai.name + '：' + quote(ai.id, 'lose'));
      }

      var item = maybeBuy(profile, ai);
      if (item) {
        purchases.push({
          ai: { id: ai.id, name: ai.name, avatar: ai.avatar },
          item: item,
          delta: delta,
          beans: profile.beans
        });
      }
    });

    var revenge = null;
    currentIds.forEach(function (id) {
      var count = state.grudge[id] || 0;
      if (count >= 2 && (!revenge || count > revenge.count)) {
        var ai = BY_ID[id];
        revenge = { id: id, name: ai.name, avatar: ai.avatar, count: count };
      }
    });

    save();
    return { purchases: purchases, reactions: reactions, revenge: revenge };
  }

  function quote(id, kind) {
    var ai = BY_ID[id];
    var lines = LINES[id] || {};
    var entry = lines[kind];
    var pool = Array.isArray(entry) ? entry : (entry ? [entry] : []);
    if (!pool.length) return ai ? ai.name + '：再来一局。' : '';
    return pool[Math.floor(Math.random() * pool.length)];
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
    var grudge = (state.grudge && state.grudge[id]) || 0;
    var grudgeText = grudge >= 2 ? ' · 你已经连输给他 ' + grudge + ' 局' : '';
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
          '<div><span>总战绩</span><strong>' + profile.wins + ' 胜 / ' + profile.losses + ' 负</strong></div>' +
          '<div><span>对你的战绩</span><strong>' + (profile.vsWins || 0) + ' 胜 / ' + (profile.vsLosses || 0) + ' 负</strong></div>' +
        '</div>' +
        '<div class="ai-profile-recent">' + recent + '</div>' +
        '<div class="ai-profile-note">AI 只买头像框和称号，不影响出牌和难度。' + grudgeText + '</div>' +
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
    quote: quote,
    quoteBid: quoteBid,
    openProfile: openProfile,
    closeProfile: hideProfile,
    init: init,
    formatBeans: fmt
  };
})();
