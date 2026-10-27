/* 斗地主 · 每日契约（每天 3 个小目标，手动领取盒豆） */
(function () {
  'use strict';

  var KEY = 'gamebox_ddz_missions_v1';

  var MISSIONS = [
    {
      id: 'wins', name: '赢下 2 局', desc: '今天赢 2 局斗地主', target: 2, reward: 800, field: 'wins'
    },
    {
      id: 'bombs', name: '打出 3 个炸弹', desc: '炸弹和王炸都算', target: 3, reward: 600, field: 'bombs'
    },
    {
      id: 'games', name: '完成 5 局', desc: '不论输赢，打满 5 局', target: 5, reward: 400, field: 'games'
    }
  ];

  var state = {
    date: '',
    progress: { wins: 0, bombs: 0, games: 0 },
    claimed: {}
  };

  var opts = {
    addBeans: function () {},
    toast: function () {},
    onChange: function () {}
  };

  var overlay = null;
  var listEl = null;

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function blank() {
    return {
      date: todayKey(),
      progress: { wins: 0, bombs: 0, games: 0 },
      claimed: {}
    };
  }

  function ensureToday() {
    if (state.date !== todayKey()) {
      state = blank();
      save();
    }
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && raw.date === todayKey() && raw.progress) {
        state = {
          date: raw.date,
          progress: {
            wins: Math.max(0, Number(raw.progress.wins) || 0),
            bombs: Math.max(0, Number(raw.progress.bombs) || 0),
            games: Math.max(0, Number(raw.progress.games) || 0)
          },
          claimed: raw.claimed && typeof raw.claimed === 'object' ? raw.claimed : {}
        };
      } else {
        state = blank();
      }
    } catch (e) {
      state = blank();
    }
    save();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function progressOf(mission) {
    return Math.min(mission.target, state.progress[mission.field] || 0);
  }

  function isComplete(mission) {
    return progressOf(mission) >= mission.target;
  }

  function isClaimed(mission) {
    return !!state.claimed[mission.id];
  }

  function canClaim(mission) {
    return isComplete(mission) && !isClaimed(mission);
  }

  function claimableCount() {
    ensureToday();
    return MISSIONS.filter(canClaim).length;
  }

  function notify() {
    if (typeof opts.onChange === 'function') opts.onChange(claimableCount());
  }

  // 一局结束后调用；bombs 是本局玩家打出的炸弹/王炸数量
  function record(result) {
    ensureToday();
    result = result || {};
    state.progress.games += 1;
    if (result.win) state.progress.wins += 1;
    state.progress.bombs += Math.max(0, Number(result.bombs) || 0);
    save();
    if (overlay && !overlay.hidden) render();
    notify();

    var justDone = MISSIONS.filter(function (m) {
      return isComplete(m) && !isClaimed(m) && progressOf(m) === m.target;
    });
    if (justDone.length) {
      opts.toast('契约达成：' + justDone[0].name + '，可领取 ' + fmt(justDone[0].reward) + ' 盒豆');
    }
  }

  function claim(id) {
    ensureToday();
    var mission = MISSIONS.filter(function (m) { return m.id === id; })[0];
    if (!mission || !canClaim(mission)) return 0;
    state.claimed[id] = true;
    save();
    opts.addBeans(mission.reward);
    opts.toast('已领取 ' + fmt(mission.reward) + ' 盒豆');
    render();
    notify();
    return mission.reward;
  }

  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'overlay mission-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="overlay-card mission-card">' +
        '<button type="button" class="shop-close mission-close" aria-label="关闭每日契约">×</button>' +
        '<h2>每日契约</h2>' +
        '<p class="sub">每天 0 点刷新 · 完成后手动领取</p>' +
        '<div class="mission-list" id="missionList"></div>' +
        '<p class="mission-note">进度只统计斗地主对局，领取的盒豆直接进钱包。</p>' +
      '</div>';
    document.body.appendChild(overlay);
    listEl = document.getElementById('missionList');
    overlay.querySelector('.mission-close').onclick = close;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
  }

  function render() {
    if (!listEl) return;
    listEl.innerHTML = '';
    MISSIONS.forEach(function (mission) {
      var done = isComplete(mission);
      var claimed = isClaimed(mission);
      var have = progressOf(mission);
      var pct = Math.min(100, Math.round(have / mission.target * 100));
      var row = document.createElement('div');
      row.className = 'mission-row' + (done ? ' done' : '') + (claimed ? ' claimed' : '');
      row.innerHTML =
        '<div class="mission-info">' +
          '<strong>' + mission.name + '</strong>' +
          '<small>' + mission.desc + '</small>' +
          '<div class="mission-bar"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
        '<div class="mission-side">' +
          '<span class="mission-count">' + have + ' / ' + mission.target + '</span>' +
          '<button type="button" class="mission-claim"' + (done && !claimed ? '' : ' disabled') + '>' +
            (claimed ? '已领取' : (done ? '领取 +' + fmt(mission.reward) : '+' + fmt(mission.reward))) +
          '</button>' +
        '</div>';
      row.querySelector('.mission-claim').onclick = function () { claim(mission.id); };
      listEl.appendChild(row);
    });
  }

  function open() {
    ensureDom();
    ensureToday();
    render();
    overlay.hidden = false;
  }

  function close() {
    if (overlay) overlay.hidden = true;
  }

  function init(options) {
    if (options) {
      Object.keys(options).forEach(function (key) { opts[key] = options[key]; });
    }
    load();
    ensureDom();
    notify();
  }

  window.DDZ_MISSIONS = {
    MISSIONS: MISSIONS,
    init: init,
    open: open,
    close: close,
    record: record,
    claim: claim,
    claimableCount: claimableCount,
    progress: function () {
      ensureToday();
      return {
        date: state.date,
        progress: {
          wins: state.progress.wins,
          bombs: state.progress.bombs,
          games: state.progress.games
        },
        claimed: Object.assign({}, state.claimed)
      };
    }
  };
})();
