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

    { id: 'back_classic', cat: 'back', name: '经典牌背', price: 0, cls: 'back-classic', rarity: '普通', default: true, desc: '默认蓝色斜纹牌背。' },
    { id: 'back_red', cat: 'back', name: '红金纹', price: 2000, cls: 'back-red', rarity: '稀有', desc: '红底金线，喜气但不刺眼。' },
    { id: 'back_bamboo', cat: 'back', name: '青竹', price: 3500, cls: 'back-bamboo', rarity: '稀有', desc: '青绿色竹纹牌背，清爽耐看。' },
    { id: 'back_night', cat: 'back', name: '星夜', price: 6000, cls: 'back-night', rarity: '史诗', desc: '深蓝星点牌背，适合夜场。' },

    { id: 'frame_bronze', cat: 'frame', name: '铜环', price: 1500, cls: 'frame-bronze', rarity: '稀有', desc: '一圈低调的铜色头像框。' },
    { id: 'frame_bamboo', cat: 'frame', name: '竹节', price: 3000, cls: 'frame-bamboo', rarity: '稀有', desc: '青竹节纹头像框，干净利落。' },
    { id: 'frame_star', cat: 'frame', name: '星辉', price: 4000, cls: 'frame-star', rarity: '史诗', desc: '深蓝星辉头像框，夜里很亮。' },
    { id: 'frame_gold', cat: 'frame', name: '金桂', price: 6000, cls: 'frame-gold', rarity: '史诗', desc: '金桂色头像框，稳重又贵气。' },
    { id: 'frame_red', cat: 'frame', name: '红金', price: 8000, cls: 'frame-red', rarity: '传说', desc: '红金双色头像框，牌桌焦点。' },

    { id: 'title_new', cat: 'title', name: '盒豆新贵', price: 2000, rarity: '稀有', desc: '刚在盒豆场站稳脚跟的新面孔。' },
    { id: 'title_friend', cat: 'title', name: '牌桌老友', price: 4000, rarity: '史诗', desc: '常来牌桌坐坐的人。' },
    { id: 'title_famous', cat: 'title', name: '豆界名流', price: 6000, rarity: '史诗', desc: '盒豆圈里小有名气。' },
    { id: 'title_bomber', cat: 'title', name: '炸弹艺术家', price: 8000, rarity: '史诗', desc: '一手炸弹，炸得恰到好处。' },
    { id: 'title_spring', cat: 'title', name: '春天制造机', price: 12000, rarity: '传说', desc: '让对手一局都出不了几张牌。' },
    { id: 'title_collector', cat: 'title', name: '牌桌收藏家', price: 15000, rarity: '传说', desc: '小铺里的好东西，早晚都要收齐。' }
  ];

  var BY_ID = {};
  CATALOG.forEach(function (item) { BY_ID[item.id] = item; });

  var TABS = [
    { id: 'felt', label: '牌桌' },
    { id: 'back', label: '牌背' },
    { id: 'frame', label: '头像框' },
    { id: 'title', label: '称号' },
    { id: 'owned', label: '已拥有' }
  ];

  var state = {
    owned: [DEFAULT_FELT, DEFAULT_BACK],
    equipped: { felt: DEFAULT_FELT, back: DEFAULT_BACK, frame: '', title: '' }
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
          frame: raw.equipped.frame || '',
          title: raw.equipped.title || ''
        };
      }
    } catch (e) {}
    ensureDefaults();
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
      var order = { felt: 0, back: 1, frame: 2, title: 3 };
      return state.owned.map(getItem).filter(Boolean).sort(function (a, b) {
        return order[a.cat] - order[b.cat] || a.price - b.price;
      });
    }
    return CATALOG.filter(function (item) { return item.cat === cat; });
  }

  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = '';
    TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-tab' + (tab.id === currentCat ? ' active' : '');
      btn.textContent = tab.label;
      if (tab.id === 'owned') btn.textContent += ' ' + state.owned.length;
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
      card.className = 'shop-item ' + rarityClass(item.rarity) + (equipped ? ' equipped' : '');
      card.onclick = function () { openDetail(item.id); };
      var priceText = item.price ? fmt(item.price) + ' 盒豆' : '默认';
      var stateText = equipped ? '使用中' : (owned ? '已拥有' : priceText);
      card.innerHTML =
        '<div class="shop-item-preview">' + previewHtml(item, false) + '</div>' +
        '<div class="shop-item-body">' +
          '<strong>' + item.name + '</strong>' +
          '<span class="shop-rarity">' + item.rarity + '</span>' +
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
    renderTabs();
    renderGrid();
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
    detailPrice.textContent = item.price ? fmt(item.price) + ' 盒豆' : '默认拥有';
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
      if (!canBuy(item)) {
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
          '<button type="button" class="shop-close" aria-label="关闭小铺">×</button>' +
        '</div>' +
        '<div class="shop-balance">' +
          '<span>我的盒豆</span>' +
          '<strong id="shopBalance">0</strong>' +
          '<em id="shopSpendable">可消费 0 · 保留 1,000</em>' +
        '</div>' +
        '<div class="shop-tabs" id="shopTabs"></div>' +
        '<div class="shop-grid" id="shopGrid"></div>' +
      '</div>';
    document.body.appendChild(shopOverlay);
    gridEl = document.getElementById('shopGrid');
    balanceEl = document.getElementById('shopBalance');
    tabsEl = document.getElementById('shopTabs');
    shopOverlay.querySelector('.shop-close').onclick = close;
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
    open: open,
    close: close,
    init: init
  };
})();
