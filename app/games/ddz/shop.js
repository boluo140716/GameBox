/* 斗地主 · 盒豆小铺（只兑换外观，不影响牌局） */
(function () {
  'use strict';

  var INVENTORY_KEY = 'gamebox_ddz_inventory_v1';
  var DEFAULT_FELT = 'felt_classic';
  var DEFAULT_BACK = 'back_classic';

  var CATALOG = [
    { id: 'felt_classic', cat: 'felt', name: '墨绿经典', price: 0, cls: 'felt-classic', rarity: '普通', default: true, desc: '默认牌桌，深墨绿哑光毡布。' },
    { id: 'felt_midnight', cat: 'felt', name: '午夜蓝', price: 3000, cls: 'felt-midnight', rarity: '稀有', desc: '深蓝夜色，像在午夜牌桌上打牌。' },
    { id: 'felt_wood', cat: 'felt', name: '暖木棕', price: 5000, cls: 'felt-wood', rarity: '史诗', desc: '暖棕木纹桌面，带一点老牌馆的味道。' },
    { id: 'felt_bamboo', cat: 'felt', name: '竹影青', price: 8000, cls: 'felt-bamboo', rarity: '史诗', desc: '青竹色桌面，安静又耐看。' },
    { id: 'felt_ruby', cat: 'felt', name: '朱砂红', price: 4500, cls: 'felt-ruby', rarity: '稀有', desc: '朱砂红毡布，热闹又压得住场。' },
    { id: 'felt_ink', cat: 'felt', name: '水墨灰', price: 6000, cls: 'felt-ink', rarity: '史诗', desc: '淡墨渐层桌面，像一笔晕开的山水。' },
    { id: 'felt_aurora', cat: 'felt', name: '极光', price: 15000, cls: 'felt-aurora', rarity: '传说', desc: '青紫极光在桌面上缓缓流动。' },
    { id: 'felt_rosewood', cat: 'felt', name: '紫檀', price: 12000, cls: 'felt-rosewood', rarity: '传说', desc: '深紫檀木纹，像一张用了很多年的老牌桌。' },
    { id: 'felt_slate', cat: 'felt', name: '青石', price: 7000, cls: 'felt-slate', rarity: '史诗', desc: '冷灰石板桌面，细纹像雨后的青石。' },
    { id: 'felt_peach', cat: 'felt', name: '桃笺', price: 5500, cls: 'felt-peach', rarity: '稀有', desc: '淡桃色纸面，带一点旧信笺的暖意。' },
    { id: 'felt_ocean', cat: 'felt', name: '远海', price: 9000, cls: 'felt-ocean', rarity: '史诗', desc: '深海青蓝，细波纹一层层铺开。' },

    { id: 'back_classic', cat: 'back', name: '经典牌背', price: 0, cls: 'back-classic', rarity: '普通', default: true, desc: '默认蓝色斜纹牌背。' },
    { id: 'back_red', cat: 'back', name: '红金纹', price: 2000, cls: 'back-red', rarity: '稀有', desc: '红底金线，喜气但不刺眼。' },
    { id: 'back_bamboo', cat: 'back', name: '青竹', price: 3500, cls: 'back-bamboo', rarity: '稀有', desc: '青绿色竹纹牌背，清爽耐看。' },
    { id: 'back_night', cat: 'back', name: '星夜', price: 6000, cls: 'back-night', rarity: '史诗', desc: '深蓝星点牌背，适合夜场。' },
    { id: 'back_plaid', cat: 'back', name: '格纹', price: 2500, cls: 'back-plaid', rarity: '稀有', desc: '英伦格纹牌背，干净利落。' },
    { id: 'back_gold', cat: 'back', name: '鎏金', price: 5000, cls: 'back-gold', rarity: '史诗', desc: '深底鎏金纹，翻牌时最扎眼。' },
    { id: 'back_aurora', cat: 'back', name: '极光', price: 10000, cls: 'back-aurora', rarity: '传说', desc: '青紫渐层牌背，和极光牌桌成套。' },
    { id: 'back_celadon', cat: 'back', name: '青瓷', price: 6000, cls: 'back-celadon', rarity: '史诗', desc: '青灰釉色与细碎冰裂纹。' },
    { id: 'back_plum', cat: 'back', name: '梅影', price: 4500, cls: 'back-plum', rarity: '稀有', desc: '深梅色底，几枝白梅落在牌背。' },
    { id: 'back_cloud', cat: 'back', name: '云纹', price: 7000, cls: 'back-cloud', rarity: '史诗', desc: '层叠云纹，像老屏风上的暗纹。' },
    { id: 'back_ember', cat: 'back', name: '余烬', price: 12000, cls: 'back-ember', rarity: '传说', desc: '黑底余火，翻牌时带一点暖光。' },

    { id: 'frame_bronze', cat: 'frame', name: '铜环', price: 1500, cls: 'frame-bronze', rarity: '稀有', desc: '一圈低调的铜色头像框。' },
    { id: 'frame_bamboo', cat: 'frame', name: '竹节', price: 3000, cls: 'frame-bamboo', rarity: '稀有', desc: '青竹节纹头像框，干净利落。' },
    { id: 'frame_star', cat: 'frame', name: '星辉', price: 4000, cls: 'frame-star', rarity: '史诗', desc: '深蓝星辉头像框，夜里很亮。' },
    { id: 'frame_gold', cat: 'frame', name: '金桂', price: 6000, cls: 'frame-gold', rarity: '史诗', desc: '金桂色头像框，稳重又贵气。' },
    { id: 'frame_red', cat: 'frame', name: '红金', price: 8000, cls: 'frame-red', rarity: '传说', desc: '红金双色头像框，牌桌焦点。' },
    { id: 'frame_silver', cat: 'frame', name: '银霜', price: 2000, cls: 'frame-silver', rarity: '稀有', desc: '冷银细边，低调但清楚。' },
    { id: 'frame_leaf', cat: 'frame', name: '青藤', price: 3500, cls: 'frame-leaf', rarity: '稀有', desc: '青藤绕一圈，像坐在院子里打牌。' },
    { id: 'frame_neon', cat: 'frame', name: '霓虹', price: 4500, cls: 'frame-neon', rarity: '史诗', desc: '霓虹描边，夜场最显眼。' },
    { id: 'frame_crown', cat: 'frame', name: '雀冠', price: 12000, cls: 'frame-crown', rarity: '传说', desc: '金色冠冕描边，自带一层微光。' },

    { id: 'title_new', cat: 'title', name: '盒豆新贵', price: 2000, rarity: '稀有', desc: '刚在盒豆场站稳脚跟的新面孔。' },
    { id: 'title_friend', cat: 'title', name: '牌桌老友', price: 4000, rarity: '史诗', desc: '常来牌桌坐坐的人。' },
    { id: 'title_famous', cat: 'title', name: '豆界名流', price: 6000, rarity: '史诗', desc: '盒豆圈里小有名气。' },
    { id: 'title_bomber', cat: 'title', name: '炸弹艺术家', price: 8000, rarity: '史诗', desc: '一手炸弹，炸得恰到好处。' },
    { id: 'title_spring', cat: 'title', name: '春天制造机', price: 12000, rarity: '传说', desc: '让对手一局都出不了几张牌。' },
    { id: 'title_collector', cat: 'title', name: '牌桌收藏家', price: 15000, rarity: '传说', desc: '小铺里的好东西，早晚都要收齐。' },
    { id: 'title_landlord', cat: 'title', name: '叫地主', price: 3000, rarity: '稀有', desc: '开局第一声，气势先到。' },
    { id: 'title_farmer', cat: 'title', name: '农民起义', price: 3000, rarity: '稀有', desc: '两个人也能把地主拉下马。' },
    { id: 'title_miracle', cat: 'title', name: '绝地翻盘', price: 7000, rarity: '史诗', desc: '残局剩三张，照样能赢。' },
    { id: 'title_king', cat: 'title', name: '牌桌之王', price: 20000, rarity: '传说', desc: '这张桌上，说话最有分量的那位。' },

    { id: 'avatar_shiba', cat: 'avatar', name: '柴犬', price: 2000, glyph: '🐕', rarity: '稀有', desc: '一只坐在你位子上看牌的柴犬。' },
    { id: 'avatar_cat', cat: 'avatar', name: '橘猫', price: 2000, glyph: '🐈', rarity: '稀有', desc: '橘猫上桌，手气也跟着来。' },
    { id: 'avatar_koi', cat: 'avatar', name: '锦鲤', price: 5000, glyph: '🐟', rarity: '史诗', desc: '锦鲤附体，摸牌顺一点。' },
    { id: 'avatar_panda', cat: 'avatar', name: '熊猫', price: 3000, glyph: '🐼', rarity: '稀有', desc: '一只认真看牌的熊猫，表情很稳。' },
    { id: 'avatar_fox', cat: 'avatar', name: '狐狸', price: 4500, glyph: '🦊', rarity: '史诗', desc: '笑得很稳，手里可能藏着炸弹。' },
    { id: 'avatar_tiger', cat: 'avatar', name: '老虎', price: 6000, glyph: '🐯', rarity: '史诗', desc: '坐姿很凶，出牌很稳。' },
    { id: 'avatar_owl', cat: 'avatar', name: '夜枭', price: 8000, glyph: '🦉', rarity: '史诗', desc: '夜里精神最好，专盯对手剩牌。' },
    { id: 'avatar_dragon', cat: 'avatar', name: '龙', price: 12000, glyph: '🐉', rarity: '传说', desc: '牌桌上最有排面的那位。' },

    // 套装奖励：不单独出售，集齐对应分类后自动解锁
    { id: 'title_set_felt', cat: 'title', name: '牌桌鉴赏家', price: 0, rarity: '传说', reward: true, set: 'felt', desc: '集齐全部牌桌后获得，不单独出售。' },
    { id: 'title_set_back', cat: 'title', name: '牌背收藏家', price: 0, rarity: '传说', reward: true, set: 'back', desc: '集齐全部牌背后获得，不单独出售。' },
    { id: 'title_set_avatar', cat: 'title', name: '人见人爱', price: 0, rarity: '传说', reward: true, set: 'avatar', desc: '集齐全部头像后获得，不单独出售。' },
    { id: 'title_set_frame', cat: 'title', name: '框住全场', price: 0, rarity: '传说', reward: true, set: 'frame', desc: '集齐全部头像框后获得，不单独出售。' },
    { id: 'title_set_title', cat: 'title', name: '称号大满贯', price: 0, rarity: '传说', reward: true, set: 'title', desc: '集齐全部称号后获得，不单独出售。' }
  ];

  var SET_LABELS = { felt: '牌桌', back: '牌背', avatar: '头像', frame: '头像框', title: '称号' };
  var CAT_ORDER = ['felt', 'back', 'avatar', 'frame', 'title'];

  var BY_ID = {};
  CATALOG.forEach(function (item) { BY_ID[item.id] = item; });

  var TABS = [
    { id: 'felt', label: '牌桌' },
    { id: 'back', label: '牌背' },
    { id: 'avatar', label: '头像' },
    { id: 'frame', label: '头像框' },
    { id: 'title', label: '称号' },
    { id: 'owned', label: '已拥有' }
  ];

  var state = {
    owned: [DEFAULT_FELT, DEFAULT_BACK],
    equipped: { felt: DEFAULT_FELT, back: DEFAULT_BACK, avatar: '', frame: '', title: '' }
  };

  var opts = {
    getBeans: function () { return 0; },
    spend: function () { return false; },
    floor: 1000,
    onEquip: function () {},
    toast: function () {}
  };

  var shopOverlay = null;
  var gridEl = null;
  var balanceEl = null;
  var tabsEl = null;
  var progressEl = null;
  var progressFillEl = null;
  var detailOverlay = null;
  var detailPreview = null;
  var detailName = null;
  var detailDesc = null;
  var detailPrice = null;
  var detailNote = null;
  var detailActions = null;
  var currentCat = 'felt';
  var detailItemId = '';
  var confirmBuy = false;

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function getItem(id) {
    return BY_ID[id] || null;
  }

  function isOwned(id) {
    return state.owned.indexOf(id) >= 0;
  }

  function getEquipped() {
    return {
      felt: state.equipped.felt,
      back: state.equipped.back,
      avatar: state.equipped.avatar,
      frame: state.equipped.frame,
      title: state.equipped.title
    };
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(INVENTORY_KEY) || 'null');
      if (raw && Array.isArray(raw.owned)) {
        state.owned = raw.owned.filter(function (id) { return !!getItem(id); });
      }
      if (raw && raw.equipped) {
        state.equipped = {
          felt: raw.equipped.felt || DEFAULT_FELT,
          back: raw.equipped.back || DEFAULT_BACK,
          avatar: raw.equipped.avatar || '',
          frame: raw.equipped.frame || '',
          title: raw.equipped.title || ''
        };
      }
    } catch (e) {}
    ensureDefaults();
    checkSetRewards(true);
    save();
  }

  function save() {
    try {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function ensureDefaults() {
    [DEFAULT_FELT, DEFAULT_BACK].forEach(function (id) {
      if (!isOwned(id)) state.owned.push(id);
    });
    if (!getItem(state.equipped.felt) || !isOwned(state.equipped.felt)) state.equipped.felt = DEFAULT_FELT;
    if (!getItem(state.equipped.back) || !isOwned(state.equipped.back)) state.equipped.back = DEFAULT_BACK;
    if (state.equipped.frame && (!getItem(state.equipped.frame) || !isOwned(state.equipped.frame))) state.equipped.frame = '';
    if (state.equipped.avatar && (!getItem(state.equipped.avatar) || !isOwned(state.equipped.avatar))) state.equipped.avatar = '';
    if (state.equipped.title && (!getItem(state.equipped.title) || !isOwned(state.equipped.title))) state.equipped.title = '';
  }

  function equipmentId(cat) {
    return state.equipped[cat] || '';
  }

  function showToast(text) {
    if (typeof opts.toast === 'function') opts.toast(text);
  }

  function equip(id) {
    var item = getItem(id);
    if (!item || !isOwned(id)) return;
    state.equipped[item.cat] = item.id;
    save();
    opts.onEquip(getEquipped());
    showToast('已装备「' + item.name + '」');
    render();
    renderDetail();
  }

  function buy(id) {
    var item = getItem(id);
    if (!item || isOwned(id)) return;
    if (!confirmBuy) {
      confirmBuy = true;
      renderDetail();
      return;
    }
    if (opts.getBeans() - item.price < opts.floor) {
      showToast('盒豆不足，需保留 ' + fmt(opts.floor) + ' 底金');
      confirmBuy = false;
      renderDetail();
      return;
    }
    if (!opts.spend(item.price)) {
      showToast('盒豆不足，需保留 ' + fmt(opts.floor) + ' 底金');
      confirmBuy = false;
      renderDetail();
      return;
    }
    state.owned.push(item.id);
    state.equipped[item.cat] = item.id;
    save();
    opts.onEquip(getEquipped());
    confirmBuy = false;
    showToast('已兑换并装备「' + item.name + '」');
    checkSetRewards(false);
    render();
    renderDetail();
  }

  function canBuy(item) {
    return opts.getBeans() - item.price >= opts.floor;
  }

  function previewHtml(item, big) {
    var cls = 'shop-preview' + (big ? ' big' : '');
    if (item.cat === 'felt') {
      return '<div class="' + cls + ' shop-swatch ' + item.cls + '"></div>';
    }
    if (item.cat === 'back') {
      return '<div class="' + cls + ' shop-back ' + item.cls + '"></div>';
    }
    if (item.cat === 'avatar') {
      return '<div class="' + cls + ' shop-avatar">' + (item.glyph || '🙂') + '</div>';
    }
    if (item.cat === 'frame') {
      return '<div class="' + cls + ' shop-frame ' + item.cls + '">🙂</div>';
    }
    return '<div class="' + cls + ' shop-title">' + item.name + '</div>';
  }

  function rarityClass(rarity) {
    if (rarity === '稀有') return 'rarity-rare';
    if (rarity === '史诗') return 'rarity-epic';
    if (rarity === '传说') return 'rarity-legend';
    return 'rarity-common';
  }

  function itemsFor(cat) {
    if (cat === 'owned') {
      var order = { felt: 0, back: 1, avatar: 2, frame: 3, title: 4 };
      return state.owned.map(getItem).filter(Boolean).sort(function (a, b) {
        return order[a.cat] - order[b.cat] || a.price - b.price;
      });
    }
    return CATALOG.filter(function (item) { return item.cat === cat; });
  }

  function collectibleItems(cat) {
    return CATALOG.filter(function (item) { return item.cat === cat && !item.reward; });
  }

  function ownedCollectibles(cat) {
    return collectibleItems(cat).filter(function (item) { return isOwned(item.id); }).length;
  }

  function setRewardFor(cat) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].reward && CATALOG[i].set === cat) return CATALOG[i];
    }
    return null;
  }

  function totalCollectibles() {
    return CATALOG.filter(function (item) { return !item.reward; }).length;
  }

  function ownedTotal() {
    return CATALOG.filter(function (item) { return !item.reward && isOwned(item.id); }).length;
  }

  function checkSetRewards(silent) {
    var gained = [];
    CATALOG.forEach(function (item) {
      if (!item.reward || isOwned(item.id)) return;
      var parts = collectibleItems(item.set);
      if (parts.length && parts.every(function (p) { return isOwned(p.id); })) {
        state.owned.push(item.id);
        gained.push(item);
      }
    });
    if (gained.length) {
      save();
      if (!silent) {
        gained.forEach(function (item) {
          showToast('套装达成：' + item.name + '（称号已入库）');
        });
      }
    }
    return gained;
  }

  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = '';
    TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-tab' + (tab.id === currentCat ? ' active' : '');
      btn.textContent = tab.label;
      if (tab.id === 'owned') btn.textContent += ' ' + ownedTotal();
      btn.onclick = function () {
        currentCat = tab.id;
        render();
      };
      tabsEl.appendChild(btn);
    });
  }

  function renderGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (currentCat !== 'owned') {
      var all = collectibleItems(currentCat);
      var have = ownedCollectibles(currentCat);
      var pct = all.length ? Math.round(have / all.length * 100) : 0;
      var reward = setRewardFor(currentCat);
      var head = document.createElement('div');
      head.className = 'shop-cat-progress';
      head.innerHTML =
        '<span>' + SET_LABELS[currentCat] + ' ' + have + ' / ' + all.length + '</span>' +
        '<span class="shop-cat-bar"><i style="width:' + pct + '%"></i></span>' +
        (reward
          ? '<span class="shop-set' + (have >= all.length ? ' done' : '') + '">套装：' + reward.name + (have >= all.length ? ' ✓' : '') + '</span>'
          : '');
      gridEl.appendChild(head);
    }

    var items = itemsFor(currentCat);
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'shop-empty';
      empty.textContent = currentCat === 'owned' ? '还没有收藏，去兑换第一件吧。' : '这里暂时没有奖品。';
      gridEl.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var owned = isOwned(item.id);
      var equipped = equipmentId(item.cat) === item.id;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'shop-item ' + rarityClass(item.rarity) + (equipped ? ' equipped' : '') + (item.reward && !owned ? ' reward-locked' : '');
      card.onclick = function () { openDetail(item.id); };
      var priceText = item.price ? fmt(item.price) + ' 盒豆' : '默认';
      var stateText = equipped ? '使用中' : (owned ? '已拥有' : (item.reward ? '集齐解锁' : priceText));
      card.innerHTML =
        '<div class="shop-item-preview">' + previewHtml(item, false) + '</div>' +
        '<div class="shop-item-body">' +
          '<strong>' + item.name + '</strong>' +
          '<span class="shop-rarity">' + item.rarity + (item.reward ? ' · 套装' : '') + '</span>' +
          '<small class="' + (equipped ? 'shop-using' : '') + '">' + stateText + '</small>' +
        '</div>';
      gridEl.appendChild(card);
    });
  }

  function render() {
    if (balanceEl) balanceEl.textContent = fmt(opts.getBeans());
    var spendable = Math.max(0, opts.getBeans() - opts.floor);
    var spendableEl = document.getElementById('shopSpendable');
    if (spendableEl) spendableEl.textContent = '可消费 ' + fmt(spendable) + ' · 保留 ' + fmt(opts.floor);
    if (progressEl) {
      var have = ownedTotal();
      var total = totalCollectibles();
      progressEl.innerHTML = '收藏 <strong>' + have + '</strong> / ' + total;
      if (progressFillEl) progressFillEl.style.width = (total ? Math.round(have / total * 100) : 0) + '%';
    }
    renderTabs();
    renderGrid();
  }

  function randomize() {
    var changed = 0;
    CAT_ORDER.forEach(function (cat) {
      var pool = collectibleItems(cat).filter(function (item) { return isOwned(item.id); });
      if (!pool.length) return;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      if (state.equipped[cat] !== pick.id) {
        state.equipped[cat] = pick.id;
        changed++;
      }
    });
    save();
    opts.onEquip(getEquipped());
    showToast(changed ? '换了一身随机装扮' : '这套装扮已经很随机了');
    render();
  }

  function open() {
    ensureDom();
    confirmBuy = false;
    render();
    shopOverlay.hidden = false;
  }

  function close() {
    if (shopOverlay) shopOverlay.hidden = true;
    if (detailOverlay) detailOverlay.hidden = true;
    detailItemId = '';
    confirmBuy = false;
  }

  function openDetail(id) {
    var item = getItem(id);
    if (!item) return;
    ensureDetailDom();
    detailItemId = id;
    confirmBuy = false;
    renderDetail();
    detailOverlay.hidden = false;
  }

  function closeDetail() {
    if (detailOverlay) detailOverlay.hidden = true;
    detailItemId = '';
    confirmBuy = false;
  }

  function renderDetail() {
    var item = getItem(detailItemId);
    if (!item || !detailOverlay) return;
    var owned = isOwned(item.id);
    var equipped = equipmentId(item.cat) === item.id;
    detailPreview.innerHTML = previewHtml(item, true);
    detailName.textContent = item.name;
    detailDesc.textContent = item.desc;
    detailPrice.textContent = item.reward ? '套装奖励' : (item.price ? fmt(item.price) + ' 盒豆' : '默认拥有');
    detailActions.innerHTML = '';

    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn primary';

    if (equipped) {
      action.textContent = '使用中';
      action.disabled = true;
    } else if (owned) {
      action.textContent = '装备';
      action.onclick = function () { equip(item.id); };
    } else if (item.reward) {
      action.textContent = '尚未解锁';
      action.disabled = true;
    } else {
      var enough = canBuy(item);
      action.textContent = confirmBuy ? '确认花费 ' + fmt(item.price) + ' 盒豆' : '兑换 · ' + fmt(item.price) + ' 盒豆';
      action.disabled = !enough;
      action.onclick = function () { buy(item.id); };
    }
    detailActions.appendChild(action);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn ghost';
    closeBtn.textContent = '返回';
    closeBtn.onclick = closeDetail;
    detailActions.appendChild(closeBtn);

    if (!owned) {
      if (item.reward) {
        var setItems = collectibleItems(item.set);
        var need = setItems.filter(function (p) { return !isOwned(p.id); }).length;
        detailNote.textContent = '集齐「' + SET_LABELS[item.set] + '」全部 ' + setItems.length + ' 件后自动解锁，还差 ' + need + ' 件。';
      } else if (!canBuy(item)) {
        detailNote.textContent = '还差 ' + fmt(item.price + opts.floor - opts.getBeans()) + ' 盒豆（需保留 ' + fmt(opts.floor) + ' 底金）';
      } else if (confirmBuy) {
        detailNote.textContent = '再点一次确认兑换，兑换后永久拥有。';
      } else {
        detailNote.textContent = '兑换后永久拥有，不会影响牌局。';
      }
    } else if (equipped) {
      detailNote.textContent = '当前正在使用。';
    } else {
      detailNote.textContent = '已拥有，可以随时装备。';
    }
  }

  function ensureDom() {
    if (shopOverlay) return;
    shopOverlay = document.createElement('div');
    shopOverlay.className = 'overlay shop-overlay';
    shopOverlay.hidden = true;
    shopOverlay.innerHTML =
      '<div class="shop-card">' +
        '<div class="shop-head">' +
          '<div><h2>盒豆小铺</h2><p>兑换后永久拥有 · 不影响牌局</p></div>' +
          '<div class="shop-head-actions">' +
            '<button type="button" class="shop-random" id="shopRandomBtn" title="随机换一套已拥有的装扮">🎲 随机装扮</button>' +
            '<button type="button" class="shop-close" aria-label="关闭小铺">×</button>' +
          '</div>' +
        '</div>' +
        '<div class="shop-balance">' +
          '<span>我的盒豆</span>' +
          '<strong id="shopBalance">0</strong>' +
          '<em id="shopSpendable">可消费 0 · 保留 1,000</em>' +
        '</div>' +
        '<div class="shop-progress">' +
          '<span id="shopProgress">收藏 0 / 0</span>' +
          '<span class="shop-progress-bar"><i id="shopProgressFill"></i></span>' +
        '</div>' +
        '<div class="shop-tabs" id="shopTabs"></div>' +
        '<div class="shop-grid" id="shopGrid"></div>' +
      '</div>';
    document.body.appendChild(shopOverlay);
    gridEl = document.getElementById('shopGrid');
    balanceEl = document.getElementById('shopBalance');
    tabsEl = document.getElementById('shopTabs');
    progressEl = document.getElementById('shopProgress');
    progressFillEl = document.getElementById('shopProgressFill');
    shopOverlay.querySelector('.shop-close').onclick = close;
    shopOverlay.querySelector('#shopRandomBtn').onclick = randomize;
    shopOverlay.addEventListener('click', function (e) {
      if (e.target === shopOverlay) close();
    });
  }

  function ensureDetailDom() {
    if (detailOverlay) return;
    detailOverlay = document.createElement('div');
    detailOverlay.className = 'overlay shop-detail-overlay';
    detailOverlay.hidden = true;
    detailOverlay.innerHTML =
      '<div class="shop-detail-card">' +
        '<button type="button" class="shop-close" aria-label="关闭详情">×</button>' +
        '<div class="shop-detail-preview" id="shopDetailPreview"></div>' +
        '<h3 id="shopDetailName"></h3>' +
        '<p class="shop-detail-desc" id="shopDetailDesc"></p>' +
        '<div class="shop-detail-price" id="shopDetailPrice"></div>' +
        '<p class="shop-detail-note" id="shopDetailNote"></p>' +
        '<div class="actions" id="shopDetailActions"></div>' +
      '</div>';
    document.body.appendChild(detailOverlay);
    detailPreview = document.getElementById('shopDetailPreview');
    detailName = document.getElementById('shopDetailName');
    detailDesc = document.getElementById('shopDetailDesc');
    detailPrice = document.getElementById('shopDetailPrice');
    detailNote = document.getElementById('shopDetailNote');
    detailActions = document.getElementById('shopDetailActions');
    detailOverlay.querySelector('.shop-close').onclick = closeDetail;
    detailOverlay.addEventListener('click', function (e) {
      if (e.target === detailOverlay) closeDetail();
    });
  }

  function init(options) {
    if (options) {
      Object.keys(options).forEach(function (key) { opts[key] = options[key]; });
    }
    load();
    save();
    ensureDom();
    opts.onEquip(getEquipped());
    render();
  }

  window.DDZ_SHOP = {
    CATALOG: CATALOG,
    getItem: getItem,
    getOwned: function () { return state.owned.slice(); },
    getEquipped: getEquipped,
    isOwned: isOwned,
    itemsFor: itemsFor,
    getProgress: function () {
      return { owned: ownedTotal(), total: totalCollectibles() };
    },
    open: open,
    close: close,
    init: init
  };
})();
