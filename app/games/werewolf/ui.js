/* 狼人杀 · 6 / 9 人单机 — 界面与游戏循环 */
(function () {
  'use strict';

  var E = window.WW_ENGINE;
  var A = window.WW_AI;
  var S = window.WW_SPEECH;
  if (!E || !A || !S) throw new Error('werewolf engine/ai/speech not loaded');

  var app = document.getElementById('app');
  var phaseIcon = document.getElementById('phaseIcon');
  var phaseText = document.getElementById('phaseText');
  var centerKicker = document.getElementById('centerKicker');
  var centerTitle = document.getElementById('centerTitle');
  var centerSub = document.getElementById('centerSub');
  var alivePill = document.getElementById('alivePill');
  var seatsEl = document.getElementById('seats');
  var roleBar = document.getElementById('roleBar');
  var logPanel = document.getElementById('logPanel');
  var logList = document.getElementById('logList');
  var cluePanel = document.getElementById('cluePanel');
  var clueList = document.getElementById('clueList');
  var sideCount = document.getElementById('sideCount');
  var bottomPanel = document.getElementById('bottomPanel');
  var brandMode = document.getElementById('brandMode');
  var startOverlay = document.getElementById('startOverlay');
  var startTitle = document.getElementById('startTitle');
  var startSub = document.getElementById('startSub');
  var startRoleCards = document.getElementById('startRoleCards');
  var startFine = document.getElementById('startFine');
  var startStats = document.getElementById('startStats');
  var resultOverlay = document.getElementById('resultOverlay');
  var resultMark = document.getElementById('resultMark');
  var resultEyebrow = document.getElementById('resultEyebrow');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub = document.getElementById('resultSub');
  var resultRoles = document.getElementById('resultRoles');
  var resultReplay = document.getElementById('resultReplay');
  var resultStats = document.getElementById('resultStats');
  var helpOverlay = document.getElementById('helpOverlay');
  var helpTitle = document.getElementById('helpTitle');
  var helpContent = document.getElementById('helpContent');
  var profileOverlay = document.getElementById('profileOverlay');
  var profileHead = document.getElementById('profileHead');
  var profileBody = document.getElementById('profileBody');
  var toastEl = document.getElementById('toast');
  var flashEl = document.getElementById('flash');

  var STATS_KEY = 'gamebox_werewolf_stats_v1';
  var MODE_KEY = 'gamebox_werewolf_mode_v1';
  var ROLES = {
    wolf: { name: '狼人', icon: '🐺', team: 'wolf', desc: '每晚与同伴刀人，白天可以撒谎。' },
    seer: { name: '预言家', icon: '🔮', team: 'good', desc: '每晚查验一人，得到狼人或好人。' },
    witch: { name: '女巫', icon: '🧪', team: 'good', desc: '一瓶解药、一瓶毒药，每晚最多用一瓶。' },
    hunter: { name: '猎人', icon: '🎯', team: 'good', desc: '出局时可以开枪带走一人；被毒杀时无法开枪。' },
    villager: { name: '村民', icon: '🧑‍🌾', team: 'good', desc: '没有夜间技能，靠发言和票型找狼。' }
  };
  var REASONS = [
    { key: 'vote', label: '票型矛盾', desc: '说的和投的不一致' },
    { key: 'silent', label: '发言划水', desc: '没给有效信息' },
    { key: 'claim', label: '身份对跳', desc: '两个身份必有一狼' },
    { key: 'defend', label: '保人太急', desc: '急着捞一个可疑的人' },
    { key: 'night', label: '夜间刀口', desc: '票型或死亡对不上' },
    { key: 'intuition', label: '直觉', desc: '说不上来，但感觉不对' }
  ];
  function lobbyFromSeats(seats) {
    return (seats || []).map(function (seat, index) {
      return {
        id: index,
        name: seat.name,
        avatar: seat.avatar,
        isHuman: !!seat.human,
        alive: true,
        personality: seat.personality || null
      };
    });
  }
  var LOBBY_6 = lobbyFromSeats(E.SEATS_6 || E.SEATS || []);
  var LOBBY_9 = lobbyFromSeats(E.SEATS_9 || E.SEATS || []);

  var state = null;
  var runToken = 0;
  var pendingResolve = null;
  var speechWait = null;
  var toastTimer = null;
  var flashTimer = null;
  var ui = {
    mode: loadMode(),
    phaseInfo: null,
    tab: 'log',
    selectable: null,
    selected: null,
    onSeatClick: null,
    speaking: null,
    speed: 1,
    bottomActions: {}
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function roleInfo(role) { return ROLES[role] || ROLES.villager; }
  function player(id) { return state ? E.player(state, id) : null; }
  function seatLabel(id) {
    var p = player(id);
    return p ? ((p.id + 1) + '号 ' + p.name) : ((Number(id) + 1) + '号');
  }
  function shortSeat(id) { return (Number(id) + 1) + '号'; }
  function teamName(team) { return team === 'wolf' ? '狼人阵营' : '好人阵营'; }
  function personalityName(key) {
    if (!key) return '';
    var meta = E.PERSONALITIES && E.PERSONALITIES[key];
    return meta ? meta.name : key;
  }

  function loadMode() {
    try {
      return Number(localStorage.getItem(MODE_KEY)) === 9 ? 9 : 6;
    } catch (e) { return 6; }
  }
  function saveMode(mode) {
    try { localStorage.setItem(MODE_KEY, String(mode)); } catch (e) {}
  }

  function defaultStats() {
    return {
      games: 0, wins: 0, losses: 0,
      byRole: {
        wolf: { games: 0, wins: 0 }, seer: { games: 0, wins: 0 },
        witch: { games: 0, wins: 0 }, hunter: { games: 0, wins: 0 },
        villager: { games: 0, wins: 0 }
      }
    };
  }
  function loadStats() {
    var s = defaultStats();
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (!raw) return s;
      var saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        s.games = Number(saved.games) || 0;
        s.wins = Number(saved.wins) || 0;
        s.losses = Number(saved.losses) || 0;
        ['wolf', 'seer', 'witch', 'hunter', 'villager'].forEach(function (r) {
          if (saved.byRole && saved.byRole[r]) {
            s.byRole[r].games = Number(saved.byRole[r].games) || 0;
            s.byRole[r].wins = Number(saved.byRole[r].wins) || 0;
          }
        });
      }
    } catch (e) {}
    return s;
  }
  function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function statsText(s) {
    if (!s.games) return '还没有战绩。第一局，从你开始。';
    var rate = Math.round((s.wins / s.games) * 100);
    return '战绩：' + s.wins + ' 胜 ' + s.losses + ' 负 · 胜率 ' + rate + '%';
  }
  function recordResult(win) {
    var s = loadStats();
    if (!state || state.statsSaved) return s;
    state.statsSaved = true;
    s.games += 1;
    var role = state.players[0].role;
    if (s.byRole[role]) {
      s.byRole[role].games += 1;
      if (win) s.byRole[role].wins += 1;
    }
    if (win) s.wins += 1; else s.losses += 1;
    saveStats(s);
    return s;
  }

  function setPhaseInfo(info) {
    ui.phaseInfo = info || {};
    if (ui.phaseInfo.icon) phaseIcon.textContent = ui.phaseInfo.icon;
    if (ui.phaseInfo.phaseLabel) phaseText.textContent = ui.phaseInfo.phaseLabel;
  }

  function renderCenter() {
    if (!state) {
      centerKicker.textContent = '旧木匣 · 月夜村庄';
      centerTitle.textContent = ui.mode === 9 ? '九人入座' : '六人入座';
      centerSub.textContent = ui.mode === 9
        ? '三只狼混在九个人里，猎人把枪放在桌下。'
        : '天黑之后，有人会摘下人的面具。';
      alivePill.textContent = ui.mode === 9 ? '9 人局' : '6 人局';
      phaseIcon.textContent = '🌙';
      phaseText.textContent = '等待入座';
      app.classList.add('is-night');
      app.classList.remove('is-day');
      return;
    }
    var info = ui.phaseInfo || {};
    var tone = info.tone || 'night';
    var isDay = tone === 'day' || tone === 'dawn' || tone === 'vote' || state.over;
    app.classList.toggle('is-day', isDay);
    app.classList.toggle('is-night', !isDay);
    centerKicker.textContent = info.kicker || ('第 ' + state.day + ' 天');
    centerTitle.textContent = info.title || '月夜村庄';
    centerSub.textContent = info.sub || '';
    alivePill.textContent = '存活 ' + E.alive(state).length + ' / ' + state.players.length;
    phaseIcon.textContent = info.icon || '🌙';
    phaseText.textContent = info.phaseLabel || info.kicker || ('第 ' + state.day + ' 天');
  }

  function seatTagHtml(text, cls) {
    return '<span class="ww-seat-tag ' + (cls || '') + '">' + esc(text) + '</span>';
  }

  function renderSeats() {
    var list = state ? state.players : (ui.mode === 9 ? LOBBY_9 : LOBBY_6);
    var human = state ? state.players[0] : null;
    app.classList.toggle('mode-9', (state ? state.playerCount : ui.mode) === 9);
    var html = '';
    list.forEach(function (p) {
      var cls = ['ww-seat'];
      if (p.isHuman) cls.push('you');
      if (!p.alive) cls.push('dead');
      if (ui.speaking === p.id) cls.push('speaking');
      if (ui.selected === p.id) cls.push('selected');
      if (ui.selectable && ui.selectable(p)) cls.push('targetable');

      var mate = !!(state && human && human.role === 'wolf' && p.role === 'wolf' && !p.isHuman);
      var ri = state && p.role ? roleInfo(p.role) : null;
      var showRole = !!(state && (p.isHuman || state.over));
      var roleDot = showRole && ri ? '<span class="role-dot">' + ri.icon + '</span>' : '';
      var tags = [];
      if (p.claim) {
        var claimCls = p.claim.role === 'seer' ? 'seer' : (p.claim.role === 'witch' ? 'witch' : 'claim');
        var claimText = '跳' + roleInfo(p.claim.role).name;
        if (p.claim.role === 'seer' && p.publicChecks && p.publicChecks.length) {
          var lastCheck = p.publicChecks[p.publicChecks.length - 1];
          claimText += ' · ' + (lastCheck.result === 'wolf' ? '查杀' : '金水');
        }
        tags.push(seatTagHtml(claimText, claimCls));
      }
      if (mate) tags.push(seatTagHtml('狼同伴', 'wolfmate'));
      if (p.isHuman) tags.push(seatTagHtml('你', 'claim'));
      else if (p.personality) tags.push(seatTagHtml(personalityName(p.personality), ''));
      if (state && state.over && ri) tags.push(seatTagHtml(ri.name, ''));

      var voteCount = 0;
      if (state) {
        Object.keys(state.votes || {}).forEach(function (k) {
          if (state.votes[k] === p.id) voteCount += 1;
        });
      }
      html += '<div class="' + cls.join(' ') + '" data-id="' + p.id + '" role="button" tabindex="0" aria-label="' + esc(p.name) + (p.alive ? ' 存活' : ' 已出局') + '">';
      html += '<div class="ww-avatar">' + (p.avatar || '👤') + roleDot + '<span class="no">' + (p.id + 1) + '</span></div>';
      html += '<div class="ww-seat-main"><div class="ww-seat-name">' + esc(p.name) + (mate ? ' <span class="mate">🐺</span>' : '') + '</div>';
      html += '<div class="ww-seat-tags">' + tags.slice(0, state && state.playerCount === 9 ? 2 : 3).join('') + '</div></div>';
      if (voteCount) html += '<span class="ww-vote-badge">' + voteCount + '</span>';
      html += '</div>';
    });
    seatsEl.innerHTML = html;
  }

  function handleSeat(id) {
    if (!state) { toast('先入座开局。'); return; }
    if (ui.onSeatClick) {
      var p = player(id);
      if (ui.selectable && p && !ui.selectable(p)) { toast('这个人现在不能选。'); return; }
      ui.onSeatClick(id);
      return;
    }
    openProfile(id);
  }
  seatsEl.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.ww-seat') : null;
    if (!el) return;
    handleSeat(Number(el.getAttribute('data-id')));
  });
  seatsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest ? e.target.closest('.ww-seat') : null;
    if (!el) return;
    e.preventDefault();
    handleSeat(Number(el.getAttribute('data-id')));
  });

  function renderRoleBar() {
    if (!state) {
      var lobbyLine = ui.mode === 9
        ? '9 人局：3 狼人 / 1 预言家 / 1 女巫 / 1 猎人 / 3 村民'
        : '6 人局：2 狼人 / 1 预言家 / 1 女巫 / 2 村民';
      roleBar.innerHTML = '<div class="ww-role-id"><span class="icon">🎭</span><b>身份未揭晓</b><span class="team">入座后分配</span></div>' +
        '<div class="ww-role-power">' + lobbyLine + '</div>';
      return;
    }
    var p = state.players[0];
    var ri = roleInfo(p.role);
    var power = '';
    if (p.role === 'wolf') {
      var mates = state.players.filter(function (o) { return o.role === 'wolf' && !o.isHuman; });
      if (!mates.length) power = '你是最后的狼人。';
      else power = '同伴：' + mates.map(function (o) {
        return '<b class="' + (o.alive ? '' : 'used') + '">' + esc(o.name) + (o.alive ? '' : '（出局）') + '</b>';
      }).join('、') + '。';
    } else if (p.role === 'seer') {
      if (p.checks && p.checks.length) {
        power = p.checks.map(function (c) {
          var t = player(c.target);
          return '第' + (c.day || '?') + '夜 ' + esc(t ? t.name : shortSeat(c.target)) + '：<b class="' + (c.result === 'wolf' ? 'wolf' : 'ok') + '">' + (c.result === 'wolf' ? '狼人' : '好人') + '</b>';
        }).join(' · ');
      } else power = '还没有查验结果。';
    } else if (p.role === 'witch') {
      var w = p.witch || {};
      var parts = [];
      parts.push('解药 <b class="' + (w.antidote ? 'ok' : 'used') + '">' + (w.antidote ? '可用' : '已用') + '</b>');
      parts.push('毒药 <b class="' + (w.poison ? 'ok' : 'used') + '">' + (w.poison ? '可用' : '已用') + '</b>');
      if (w.savedTarget != null) parts.push('救过 <b>' + esc(shortSeat(w.savedTarget)) + '</b>');
      if (w.poisonedTarget != null) parts.push('毒过 <b>' + esc(shortSeat(w.poisonedTarget)) + '</b>');
      power = parts.join(' · ');
    } else if (p.role === 'hunter') {
      var h = p.hunter || {};
      if (h.shot) {
        power = '已经开过枪' + (h.shotTarget != null ? '，带走了 <b>' + esc(shortSeat(h.shotTarget)) + '</b>' : '');
      } else if (!p.alive) {
        power = p.death && p.death.cause === 'poison'
          ? '被毒杀，枪没能开出来。'
          : '已经出局，仍可开枪带走一人。';
      } else {
        power = '出局时可以开枪带走一人；被毒杀时无法开枪。';
      }
    } else {
      power = '没有夜间技能，靠发言和票型找狼。';
    }
    var dead = p.alive ? '' : '<span class="dead-note">已出局 · 观战中</span>';
    roleBar.innerHTML = '<div class="ww-role-id"><span class="icon">' + ri.icon + '</span><b>' + ri.name + '</b><span class="team">' + teamName(ri.team) + '</span></div>' +
      '<div class="ww-role-power">' + power + (dead ? ' · ' + dead : '') + '</div>';
  }

  function renderAll() {
    renderCenter();
    renderSeats();
    renderRoleBar();
    renderLog();
    renderClues();
  }

  function renderLog() {
    var stick = true;
    if (logPanel) stick = (logPanel.scrollHeight - logPanel.scrollTop - logPanel.clientHeight) < 80;
    if (!state) {
      logList.innerHTML = '<div class="ww-log-empty">入座之后，村民们的发言、死亡和投票会记录在这里。</div>';
      sideCount.textContent = '0';
      return;
    }
    var html = '';
    var logs = state.log || [];
    logs.forEach(function (e) {
      if (e.type === 'speech') {
        var p = player(e.speaker);
        if (!p) return;
        var kind = e.kind || 'pass';
        var tags = [];
        var kindLabel = { accuse: '怀疑', defend: '保人', claim: '跳身份', counter: '对跳', question: '追问', pass: '过' }[kind];
        if (kindLabel) tags.push('<span class="ww-tag ' + kind + '">' + kindLabel + '</span>');
        if (e.role) tags.push('<span class="ww-tag claim">' + esc(roleInfo(e.role).name) + '</span>');
        if (e.check) tags.push('<span class="ww-tag ' + (e.check.result === 'wolf' ? 'wolf' : 'good') + '">' + (e.check.result === 'wolf' ? '查杀' : '金水') + '</span>');
        if (e.replyTo != null) tags.push('<span class="ww-tag reply">回应 ' + shortSeat(e.replyTo) + '</span>');
        (e.evidence || []).slice(0, 2).forEach(function (ev) {
          if (ev && ev.label) tags.push('<span class="ww-tag evidence ' + esc(ev.kind || '') + '">' + esc(ev.label) + '</span>');
        });
        if (e.lastWords) tags.push('<span class="ww-tag last">遗言</span>');
        html += '<div class="ww-log-entry ' + kind + (e.lastWords ? ' last' : '') + '">' +
          '<div class="ww-log-head"><span class="ww-log-avatar">' + (p.avatar || '👤') + '</span>' +
          '<span class="ww-log-name">' + esc(p.name) + ' <span class="seat">' + shortSeat(p.id) + '</span></span>' +
          '<span class="ww-log-tags">' + tags.join('') + '</span></div>' +
          '<div class="ww-log-text">' + esc(e.text || '……') + '</div></div>';
      } else if (e.type === 'dawn') {
        var names = (e.deaths || []).map(function (d) { return shortSeat(d.id); }).join('、');
        html += '<div class="ww-log-sys"><b>第 ' + (e.day || '?') + ' 天 · 天亮了</b><span>' + esc(names ? names + ' 倒下了。' : '平安夜。') + '</span></div>';
      } else if (e.type === 'vote-result') {
        var txt;
        if (e.tie) txt = '平票，无人出局。';
        else if (e.exiled != null) txt = seatLabel(e.exiled) + ' 被放逐。';
        else txt = '无人出局。';
        html += '<div class="ww-log-sys"><b>投票结果</b><span>' + esc(txt) + '</span></div>';
      } else if (e.type === 'hunter-shot') {
        html += '<div class="ww-log-sys"><b>猎人开枪</b><span>' + esc(seatLabel(e.hunter)) + ' 带走了 ' + esc(seatLabel(e.target)) + '。</span></div>';
      }
    });
    if (!html) html = '<div class="ww-log-empty">等待第一声发言。</div>';
    logList.innerHTML = html;
    sideCount.textContent = String(logs.filter(function (e) {
      return e.type === 'speech' || e.type === 'dawn' || e.type === 'vote-result' || e.type === 'hunter-shot';
    }).length);
    if (stick) logPanel.scrollTop = logPanel.scrollHeight;
  }

  function renderClues() {
    if (!state) {
      clueList.innerHTML = '<div class="ww-log-empty">身份声明、票型和死亡记录会汇总在这里。</div>';
      return;
    }
    var html = '';
    var claims = [];
    state.players.forEach(function (p) {
      (p.claims || []).forEach(function (c) { claims.push({ p: p, c: c }); });
    });
    if (claims.length) {
      html += '<div class="ww-clue-card"><h3>身份声明</h3>';
      claims.forEach(function (item) {
        var c = item.c;
        var text = roleInfo(c.role).name;
        if (c.role === 'seer' && c.target != null) {
          text += ' · ' + (c.result === 'wolf' ? '查杀' : '金水') + ' ' + shortSeat(c.target);
        }
        html += '<div class="ww-clue-row"><b>' + esc(shortSeat(item.p.id)) + '</b><span>' + esc(text) + '<br><span class="muted">第 ' + (c.day || '?') + ' 天</span></span></div>';
      });
      html += '</div>';
    }

    var deaths = state.players.filter(function (p) { return p.death; });
    if (deaths.length) {
      html += '<div class="ww-clue-card"><h3>死亡记录</h3>';
      deaths.forEach(function (p) {
        var cause = p.death.cause === 'wolf' ? '夜间出局' : (p.death.cause === 'poison' ? '毒发' : (p.death.cause === 'vote' ? '放逐' : (p.death.cause === 'hunter' ? '被猎人带走' : '出局')));
        html += '<div class="ww-clue-row"><b>' + esc(shortSeat(p.id)) + '</b><span>' + esc(p.name) + ' · ' + cause + '<br><span class="muted">第 ' + (p.death.day || '?') + ' 天</span></span></div>';
      });
      html += '</div>';
    }

    var voteRows = [];
    state.players.forEach(function (p) {
      (p.votes || []).forEach(function (v) { voteRows.push({ p: p, v: v }); });
    });
    voteRows.sort(function (a, b) { return (a.v.day || 0) - (b.v.day || 0); });
    if (voteRows.length) {
      html += '<div class="ww-clue-card"><h3>投票记录</h3>';
      var lastDay = null;
      voteRows.forEach(function (row) {
        if (row.v.day !== lastDay) {
          lastDay = row.v.day;
          html += '<div class="ww-clue-row"><b>第 ' + (lastDay || '?') + ' 天</b><span></span></div>';
        }
        var target = row.v.target == null ? '弃票' : shortSeat(row.v.target);
        html += '<div class="ww-clue-row"><b>' + esc(shortSeat(row.p.id)) + '</b><span>→ ' + esc(target) + '</span></div>';
      });
      html += '</div>';
    }

    var focus = {};
    state.publicEvents.forEach(function (e) {
      if (e.type === 'speech' && e.kind === 'accuse' && e.target != null) {
        if (!focus[e.target]) focus[e.target] = [];
        if (focus[e.target].indexOf(e.speaker) === -1) focus[e.target].push(e.speaker);
      }
    });
    var focusList = Object.keys(focus).map(function (id) { return { id: Number(id), list: focus[id] }; })
      .sort(function (a, b) { return b.list.length - a.list.length; }).slice(0, 3);
    if (focusList.length) {
      html += '<div class="ww-clue-card"><h3>当前焦点</h3>';
      focusList.forEach(function (item) {
        html += '<div class="ww-clue-row"><b>' + esc(shortSeat(item.id)) + '</b><span>被 ' + item.list.map(function (id) { return shortSeat(id); }).join('、') + ' 怀疑</span></div>';
      });
      html += '</div>';
    }
    if (!html) html = '<div class="ww-log-empty">还没有公开线索。</div>';
    clueList.innerHTML = html;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function bottomHead(icon, title, sub) {
    return '<div class="ww-bottom-head"><div class="ww-bottom-icon">' + icon + '</div>' +
      '<div class="ww-bottom-copy"><b>' + esc(title) + '</b><p>' + (sub || '') + '</p></div></div>';
  }

  function spectatorHtml() {
    if (!state || !state.spectator || state.over) return '';
    var p = state.players[0];
    return '<div class="ww-spectator"><span>你已出局 · ' + esc(roleInfo(p.role).name) + ' · 观战中</span>' +
      '<button class="ww-btn small ghost" data-act="spectateSlow" type="button">继续观战</button>' +
      '<button class="ww-btn small primary" data-act="spectateFast" type="button">快进到结算</button></div>';
  }

  function setBottom(html, actions) {
    bottomPanel.innerHTML = spectatorHtml() + (html || '');
    ui.bottomActions = actions || {};
    bottomPanel.scrollTop = 0;
  }
  function setBottomStatus(icon, title, sub) {
    setBottom(bottomHead(icon, title, sub), {});
  }
  bottomPanel.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'spectateSlow') {
      if (state) state.fast = false;
      ui.speed = 1;
      toast('继续观战。');
      return;
    }
    if (act === 'spectateFast') {
      if (state) state.fast = true;
      ui.speed = 0;
      toast('快进到结算。');
      return;
    }
    var fn = ui.bottomActions[act];
    if (fn) fn(btn.getAttribute('data-value'));
  });

  function ask(render) {
    cancelPending();
    return new Promise(function (resolve) {
      pendingResolve = resolve;
      render();
    });
  }
  function answer(value) {
    var fn = pendingResolve;
    pendingResolve = null;
    if (fn) fn(value);
  }
  function cancelPending() {
    if (speechWait) {
      var skip = speechWait;
      speechWait = null;
      skip();
    }
    if (pendingResolve) {
      var fn = pendingResolve;
      pendingResolve = null;
      fn(null);
    }
  }
  function cleanupSeat() {
    ui.selectable = null;
    ui.onSeatClick = null;
    ui.selected = null;
    renderSeats();
  }

  function askWolfTarget() {
    return ask(function () {
      var chosen = null;
      var human = state.players[0];
      function render() {
        var mate = state.players.filter(function (p) { return p.alive && p.role === 'wolf' && !p.isHuman; })[0];
        var suggest = null;
        if (mate) {
          try { suggest = A.decideNight(state, mate).target; } catch (e) {}
        }
        ui.selectable = function (p) { return p.alive && p.role !== 'wolf'; };
        ui.onSeatClick = function (id) {
          chosen = id;
          ui.selected = id;
          renderSeats();
          render();
        };
        ui.selected = chosen;
        renderSeats();
        var html = bottomHead('🐺', '狼人行动', '和同伴一起选择今晚要击杀的人。');
        if (mate) {
          html += '<div class="ww-target-line">同伴 <b>' + esc(mate.name) + '</b> 建议刀 <b>' + (suggest != null ? esc(seatLabel(suggest)) : '—') + '</b>，最终由你决定。</div>';
        }
        html += '<div class="ww-target-line">' + (chosen != null ? '目标：<b>' + esc(seatLabel(chosen)) + '</b>' : '<span class="empty">点一个座位选择目标</span>') + '</div>';
        html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="ok" type="button" ' + (chosen == null ? 'disabled' : '') + '>确认击杀</button></div>';
        setBottom(html, {
          ok: function () {
            if (chosen == null) return;
            cleanupSeat();
            answer(chosen);
          }
        });
      }
      render();
    });
  }

  function askSeerTarget() {
    return ask(function () {
      var human = state.players[0];
      var chosen = null;
      var alive = E.alive(state).filter(function (p) { return p.id !== human.id; });
      var unchecked = alive.filter(function (p) { return !(human.known && human.known[p.id]); });
      var available = unchecked.length ? unchecked : alive;
      if (!available.length) { answer(null); return; }
      function render() {
        ui.selectable = function (p) { return available.some(function (o) { return o.id === p.id; }); };
        ui.onSeatClick = function (id) {
          chosen = id;
          ui.selected = id;
          renderSeats();
          render();
        };
        ui.selected = chosen;
        renderSeats();
        var html = bottomHead('🔮', '预言家行动', '选择今晚要查验的人。查验结果只有你知道。');
        html += '<div class="ww-target-line">' + (chosen != null ? '查验：<b>' + esc(seatLabel(chosen)) + '</b>' : '<span class="empty">点一个座位选择查验目标</span>') + '</div>';
        html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="ok" type="button" ' + (chosen == null ? 'disabled' : '') + '>确认查验</button></div>';
        setBottom(html, {
          ok: function () {
            if (chosen == null) return;
            cleanupSeat();
            answer(chosen);
          }
        });
      }
      render();
    });
  }

  function askWitchAction() {
    return ask(function () {
      var human = state.players[0];
      var w = human.witch || {};
      var victimId = state.night ? state.night.wolfTarget : null;
      var victim = victimId != null ? player(victimId) : null;
      var mode = (w.antidote && victim) ? 'save' : (w.poison ? 'poison' : 'none');
      var selectedPoison = null;
      if (mode === 'none') { answer({ save: false, poison: null }); return; }
      function cleanup() {
        ui.selectable = null;
        ui.onSeatClick = null;
        ui.selected = null;
        renderSeats();
      }
      function finish(save, poison) {
        cleanup();
        answer({ save: !!save, poison: poison == null ? null : poison });
      }
      function potionLine() {
        return '<div class="ww-target-line">解药：<b class="' + (w.antidote ? 'good' : '') + '">' + (w.antidote ? '可用' : '已用') + '</b> · 毒药：<b class="' + (w.poison ? 'good' : '') + '">' + (w.poison ? '可用' : '已用') + '</b></div>';
      }
      function render() {
        var html = bottomHead('🧪', '女巫行动', victim ? ('今晚 ' + esc(seatLabel(victim.id)) + ' 倒下了。') : '今晚没有人被狼人袭击。');
        if (mode === 'save') {
          cleanup();
          html += potionLine();
          html += '<div class="ww-btn-row">';
          if (w.antidote && victim) html += '<button class="ww-btn primary" data-act="save" type="button">使用解药救 ' + esc(seatLabel(victim.id)) + '</button>';
          if (w.poison) html += '<button class="ww-btn ghost" data-act="toPoison" type="button">改用毒药</button>';
          html += '<button class="ww-btn ghost" data-act="none" type="button">' + (victim ? '不救' : '不用药') + '</button></div>';
          setBottom(html, {
            save: function () { finish(true, null); },
            toPoison: function () { mode = 'poison'; cleanup(); render(); },
            none: function () { finish(false, null); }
          });
          return;
        }
        ui.selectable = function (p) { return p.alive && p.id !== human.id; };
        ui.onSeatClick = function (id) {
          selectedPoison = id;
          ui.selected = id;
          renderSeats();
          render();
        };
        ui.selected = selectedPoison;
        renderSeats();
        html += potionLine();
        html += '<div class="ww-target-line">' + (selectedPoison != null ? '毒杀：<b>' + esc(seatLabel(selectedPoison)) + '</b>' : '<span class="empty">点一个座位选择毒杀目标</span>') + '</div>';
        html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="poison" type="button" ' + (selectedPoison == null ? 'disabled' : '') + '>确认用毒</button>';
        if (w.antidote && victim) html += '<button class="ww-btn ghost" data-act="backSave" type="button">返回解药</button>';
        html += '<button class="ww-btn ghost" data-act="none" type="button">不用毒</button></div>';
        setBottom(html, {
          poison: function () { if (selectedPoison == null) return; finish(false, selectedPoison); },
          backSave: function () { mode = 'save'; selectedPoison = null; cleanup(); render(); },
          none: function () { finish(false, null); }
        });
      }
      render();
    });
  }

  function reasonLabel(key) {
    var r = REASONS.filter(function (x) { return x.key === key; })[0];
    return r ? r.label : '直觉';
  }

  function askSpeech(lastWords) {
    return ask(function () {
      var human = state.players[0];
      var isSeer = human.role === 'seer';
      var step = { kind: null, target: null, reason: null, role: null, result: null };

      function finish() {
        var speech = buildPlayerSpeech(step, lastWords);
        cleanupSeat();
        answer(speech);
      }

      function render() {
        var title = lastWords ? '你的遗言' : '轮到你发言';
        var sub = lastWords ? '留一句话，然后进入观战。' : '选择发言方式；点座位选择目标。';
        var html = bottomHead(lastWords ? '🕯️' : '🗣️', title, sub);

        if (!step.kind) {
          html += '<div class="ww-choice-grid">' +
            '<button class="ww-choice pass" data-act="kind" data-value="pass" type="button">过<small>先听后面的</small></button>' +
            '<button class="ww-choice accuse" data-act="kind" data-value="accuse" type="button">怀疑<small>点一个人，给出理由</small></button>' +
            '<button class="ww-choice defend" data-act="kind" data-value="defend" type="button">保人<small>点一个人，说明为什么</small></button>' +
            '<button class="ww-choice claim" data-act="kind" data-value="claim" type="button">跳身份<small>' + (state.playerCount === 9 ? '村民 / 预言家 / 女巫 / 猎人' : '村民 / 预言家 / 女巫') + '</small></button>' +
            '</div>';
          setBottom(html, {
            kind: function (v) {
              step.kind = v;
              step.target = null;
              step.reason = null;
              step.role = null;
              step.result = null;
              render();
            }
          });
          return;
        }

        if (step.kind === 'pass') { finish(); return; }

        if (step.kind === 'accuse' || step.kind === 'defend') {
          var verb = step.kind === 'accuse' ? '怀疑' : '保';
          var target = step.target != null ? player(step.target) : null;
          html += '<div class="ww-target-line">' + (target ? '目标：<b>' + esc(seatLabel(target.id)) + '</b>' : '<span class="empty">点一个座位选择' + verb + '目标</span>') + '</div>';
          if (!target) {
            ui.selectable = function (p) { return p.alive && p.id !== human.id; };
            ui.onSeatClick = function (id) {
              step.target = id;
              ui.selected = id;
              renderSeats();
              render();
            };
            ui.selected = null;
            renderSeats();
            html += '<div class="ww-btn-row"><button class="ww-btn ghost" data-act="back" type="button">返回</button></div>';
            setBottom(html, {
              back: function () { step.kind = null; step.target = null; cleanupSeat(); render(); }
            });
            return;
          }
          ui.selectable = null;
          ui.onSeatClick = null;
          ui.selected = target.id;
          renderSeats();
          html += '<div class="ww-choice-grid">' + REASONS.map(function (r) {
            return '<button class="ww-choice ' + step.kind + '" data-act="reason" data-value="' + r.key + '" type="button">' + esc(r.label) + '<small>' + esc(r.desc) + '</small></button>';
          }).join('') + '</div>';
          html += '<div class="ww-btn-row"><button class="ww-btn ghost" data-act="backTarget" type="button">换目标</button></div>';
          setBottom(html, {
            reason: function (v) { step.reason = v; finish(); },
            backTarget: function () { step.target = null; step.reason = null; cleanupSeat(); render(); }
          });
          return;
        }

        if (step.kind === 'claim') {
          if (!step.role) {
            var seerDisabled = isSeer && (!human.checks || !human.checks.length);
            var hunterOption = state.playerCount === 9
              ? '<button class="ww-choice claim" data-act="role" data-value="hunter" type="button">跳猎人<small>出局时开枪</small></button>'
              : '';
            html += '<div class="ww-choice-grid">' +
              '<button class="ww-choice claim" data-act="role" data-value="villager" type="button">跳村民<small>没有夜间信息</small></button>' +
              '<button class="ww-choice claim" data-act="role" data-value="seer" type="button" ' + (seerDisabled ? 'disabled' : '') + '>跳预言家<small>' + (isSeer ? '报真实查验' : '报一个查验') + '</small></button>' +
              '<button class="ww-choice claim" data-act="role" data-value="witch" type="button">跳女巫<small>报用药信息</small></button>' +
              hunterOption +
              '</div><div class="ww-btn-row"><button class="ww-btn ghost" data-act="back" type="button">返回</button></div>';
            setBottom(html, {
              role: function (v) { step.role = v; step.target = null; step.result = null; render(); },
              back: function () { step.kind = null; render(); }
            });
            return;
          }

          if (step.role === 'seer') {
            var available;
            if (isSeer) {
              available = (human.checks || []).map(function (c) { return c.target; });
            } else {
              available = E.alive(state).filter(function (p) { return p.id !== human.id; }).map(function (p) { return p.id; });
            }
            available = available.filter(function (v, i, a) { return a.indexOf(v) === i; });
            if (isSeer && !available.length) {
              html += '<div class="ww-target-line"><span class="empty">你还没有查验结果，暂时不能报查验。</span></div><div class="ww-btn-row"><button class="ww-btn ghost" data-act="backRole" type="button">返回身份</button></div>';
              setBottom(html, { backRole: function () { step.role = null; render(); } });
              return;
            }
            var checkTarget = step.target != null ? player(step.target) : null;
            html += '<div class="ww-target-line">' + (checkTarget ? '查验目标：<b>' + esc(seatLabel(checkTarget.id)) + '</b>' : '<span class="empty">点一个座位选择查验目标</span>') + '</div>';
            if (!checkTarget) {
              ui.selectable = function (p) { return available.indexOf(p.id) >= 0; };
              ui.onSeatClick = function (id) {
                step.target = id;
                ui.selected = id;
                renderSeats();
                render();
              };
              ui.selected = null;
              renderSeats();
              html += '<div class="ww-btn-row"><button class="ww-btn ghost" data-act="backRole" type="button">返回身份</button></div>';
              setBottom(html, {
                backRole: function () { step.role = null; step.target = null; cleanupSeat(); render(); }
              });
              return;
            }
            ui.selectable = null;
            ui.onSeatClick = null;
            ui.selected = checkTarget.id;
            renderSeats();
            if (isSeer) {
              step.result = (human.known && human.known[step.target]) || 'good';
              html += '<div class="ww-target-line">你的查验结果：<b class="' + (step.result === 'wolf' ? 'wolf' : 'good') + '">' + (step.result === 'wolf' ? '狼人' : '好人') + '</b></div>';
              html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="finish" type="button">报出查验</button><button class="ww-btn ghost" data-act="backTarget" type="button">换目标</button></div>';
              setBottom(html, {
                finish: finish,
                backTarget: function () { step.target = null; cleanupSeat(); render(); }
              });
            } else {
              html += '<div class="ww-choice-grid"><button class="ww-choice claim" data-act="result" data-value="wolf" type="button">报查杀<small>说对方是狼人</small></button><button class="ww-choice claim" data-act="result" data-value="good" type="button">报金水<small>说对方是好人</small></button></div>';
              html += '<div class="ww-btn-row"><button class="ww-btn ghost" data-act="backTarget" type="button">换目标</button></div>';
              setBottom(html, {
                result: function (v) { step.result = v; finish(); },
                backTarget: function () { step.target = null; cleanupSeat(); render(); }
              });
            }
            return;
          }

          html += '<div class="ww-target-line">你将以 <b>' + esc(roleInfo(step.role).name) + '</b> 的身份发言。</div>';
          html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="finish" type="button">就这样说</button><button class="ww-btn ghost" data-act="backRole" type="button">换身份</button></div>';
          setBottom(html, {
            finish: finish,
            backRole: function () { step.role = null; render(); }
          });
        }
      }
      render();
    });
  }

  function buildPlayerSpeech(step, lastWords) {
    var human = state.players[0];
    var speech = S.human(state, step, lastWords);
    if (step.kind === 'accuse' || step.kind === 'defend') {
      speech.reason = step.reason || speech.reason || 'intuition';
    }
    speech.speaker = human.id;
    return speech;
  }

  function askVote() {
    return ask(function () {
      var human = state.players[0];
      var chosen = null;
      function render() {
        ui.selectable = function (p) { return p.alive && p.id !== human.id; };
        ui.onSeatClick = function (id) {
          chosen = id;
          ui.selected = id;
          renderSeats();
          render();
        };
        ui.selected = chosen;
        renderSeats();
        var html = bottomHead('🗳️', '放逐投票', '选择一名存活玩家，或弃票。平票则无人出局。');
        html += '<div class="ww-target-line">' + (chosen != null ? '你投：<b>' + esc(seatLabel(chosen)) + '</b>' : '<span class="empty">点一个座位选择投票目标</span>') + '</div>';
        html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="ok" type="button" ' + (chosen == null ? 'disabled' : '') + '>确认投票</button><button class="ww-btn ghost" data-act="abstain" type="button">弃票</button></div>';
        setBottom(html, {
          ok: function () { if (chosen == null) return; cleanupSeat(); answer(chosen); },
          abstain: function () { cleanupSeat(); answer(null); }
        });
      }
      render();
    });
  }

  function askHunterShot() {
    return ask(function () {
      var human = state.players[0];
      var chosen = null;
      var available = E.alive(state).filter(function (p) { return p.id !== human.id; });
      if (!available.length) { answer(null); return; }
      function render() {
        ui.selectable = function (p) { return p.alive && p.id !== human.id; };
        ui.onSeatClick = function (id) {
          chosen = id;
          ui.selected = id;
          renderSeats();
          render();
        };
        ui.selected = chosen;
        renderSeats();
        var html = bottomHead('🎯', '猎人开枪', '你已经出局。选择一名玩家带走，也可以不开枪。');
        html += '<div class="ww-target-line">' + (chosen != null ? '开枪目标：<b>' + esc(seatLabel(chosen)) + '</b>' : '<span class="empty">点一个座位选择开枪目标</span>') + '</div>';
        html += '<div class="ww-btn-row"><button class="ww-btn primary" data-act="ok" type="button" ' + (chosen == null ? 'disabled' : '') + '>开枪</button>' +
          '<button class="ww-btn ghost" data-act="skip" type="button">不开枪</button></div>';
        setBottom(html, {
          ok: function () { if (chosen == null) return; cleanupSeat(); answer(chosen); },
          skip: function () { cleanupSeat(); answer(null); }
        });
      }
      render();
    });
  }

  async function hunterShotPhase(token, options) {
    options = options || {};
    var deaths = (state.lastDeaths || []).slice();
    var shotHappened = false;
    for (var i = 0; i < deaths.length; i++) {
      if (state.over) break;
      var p = player(deaths[i].id);
      if (!p || p.role !== 'hunter' || p.alive) continue;
      if (p.death && p.death.cause === 'poison') {
        if (!options.quiet) setBottomStatus('🎯', '猎人无法开枪', p.name + ' 是被毒杀的，枪没有响。');
        continue;
      }
      if (p.hunter && p.hunter.shot) continue;
      var targetId = null;
      if (p.isHuman) {
        setBottomStatus('🎯', '猎人开枪', '你已出局，可以带走一个人。');
        targetId = await askHunterShot();
        if (token !== runToken) return false;
      } else {
        targetId = A.decideHunterShot(state, p);
        if (!options.quiet) setBottomStatus('🎯', p.name + ' 的枪', '猎人倒下前，抬起了枪……');
        await sleep(900);
        if (token !== runToken) return false;
      }
      if (!p.hunter) p.hunter = { shot: false };
      if (targetId == null) {
        p.hunter.shot = true;
        if (!options.quiet) setBottomStatus('🎯', '没有开枪', p.name + ' 放下了枪。');
        await sleep(700);
      } else {
        var shot = E.hunterShoot(state, p.id, targetId);
        if (shot) {
          shotHappened = true;
          renderAll();
          if (!options.quiet) setBottomStatus('🎯', '猎人开枪', p.name + ' 带走了 ' + seatLabel(shot.target) + '。');
          await sleep(1100);
        }
      }
      if (token !== runToken) return false;
    }
    return shotHappened;
  }

  function showCheckResult(result) {
    return new Promise(function (resolve) {
      var target = player(result.target);
      var isWolf = result.result === 'wolf';
      var html = '<div class="ww-reveal ' + (isWolf ? 'wolf' : 'good') + '">' +
        '<div class="big-icon">' + (isWolf ? '🐺' : '🌿') + '</div>' +
        '<div><b>查验结果</b><p>' + esc(seatLabel(target ? target.id : result.target)) + ' 是 <strong class="' + (isWolf ? 'wolf' : 'good') + '">' + (isWolf ? '狼人' : '好人') + '</strong>。</p></div></div>';
      setBottom(html, {});
      renderRoleBar();
      renderSeats();
      sleep(1700).then(resolve);
    });
  }

  function flashDeaths(deaths) {
    if (!deaths || !deaths.length || (state && state.fast)) return;
    var names = deaths.map(function (d) { return seatLabel(d.id); }).join('、');
    flashEl.innerHTML = '<div class="ww-flash-card"><b>昨夜出局</b><p>' + esc(names) + '</p></div>';
    flashEl.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { flashEl.hidden = true; }, 1400);
  }

  function openProfile(id) {
    if (!state) { toast('先入座开局。'); return; }
    var p = player(id);
    if (!p) return;
    var knownRole = p.isHuman || state.over;
    var ri = roleInfo(p.role);
    var roleText = knownRole ? ri.name : '身份未知';
    var teamText = knownRole ? teamName(ri.team) : '公开信息';
    profileHead.innerHTML = '<div class="ww-avatar" style="border-color:#8b612d">' + (p.avatar || '👤') + '<span class="no">' + (p.id + 1) + '</span></div>' +
      '<div class="meta"><b>' + esc(p.name) + '</b><small>' + shortSeat(p.id) + ' · ' + (p.alive ? '存活' : '已出局') + ' · ' + esc(roleText) + ' · ' + esc(teamText) + '</small></div>';
    var body = '';
    function section(title, inner) {
      body += '<div class="ww-profile-section"><h3>' + esc(title) + '</h3>' + inner + '</div>';
    }
    if (p.claims && p.claims.length) {
      section('身份声明', '<ul>' + p.claims.map(function (c) {
        var t = roleInfo(c.role).name;
        if (c.role === 'seer' && c.target != null) t += ' · ' + (c.result === 'wolf' ? '查杀' : '金水') + ' ' + shortSeat(c.target);
        return '<li>第 ' + (c.day || '?') + ' 天：' + esc(t) + '</li>';
      }).join('') + '</ul>');
    }
    if (p.publicChecks && p.publicChecks.length) {
      section('公开查验', '<ul>' + p.publicChecks.map(function (c) {
        return '<li>第 ' + (c.day || '?') + ' 天：' + shortSeat(c.target) + ' → ' + (c.result === 'wolf' ? '狼人' : '好人') + '</li>';
      }).join('') + '</ul>');
    }
    if (p.votes && p.votes.length) {
      section('投票', '<ul>' + p.votes.map(function (v) {
        return '<li>第 ' + (v.day || '?') + ' 天：' + (v.target == null ? '弃票' : '投给 ' + shortSeat(v.target)) + '</li>';
      }).join('') + '</ul>');
    }
    if (p.accusations && p.accusations.length) {
      section('怀疑过', '<ul>' + p.accusations.map(function (a) {
        return '<li>第 ' + (a.day || '?') + ' 天：' + shortSeat(a.target) + ' · ' + esc(reasonLabel(a.reason)) + '</li>';
      }).join('') + '</ul>');
    }
    if (p.defenses && p.defenses.length) {
      section('保过', '<ul>' + p.defenses.map(function (a) {
        return '<li>第 ' + (a.day || '?') + ' 天：' + shortSeat(a.target) + ' · ' + esc(reasonLabel(a.reason)) + '</li>';
      }).join('') + '</ul>');
    }
    if (p.death) {
      section('出局', '<p>第 ' + (p.death.day || '?') + ' 天 · ' + (p.death.cause === 'wolf' ? '夜间出局' : (p.death.cause === 'poison' ? '毒发' : (p.death.cause === 'hunter' ? '被猎人带走' : '放逐'))) + '</p>');
    }
    if (!body) body = '<p class="empty">还没有公开记录。</p>';
    profileBody.innerHTML = body;
    profileOverlay.hidden = false;
  }

  function renderStartMode() {
    var mode = ui.mode === 9 ? 9 : 6;
    startTitle.textContent = mode === 9 ? '九人狼人杀' : '六人狼人杀';
    startSub.textContent = mode === 9
      ? '九个人围坐，三只狼藏在其中。猎人把枪放在桌下，女巫握着一瓶毒药。'
      : '你是唯一的真人，另外五个人围坐在旧木桌旁。有人戴着狼面具。';
    startRoleCards.innerHTML = mode === 9
      ? '<div class="rolecard wolf"><span>🐺</span><b>狼人 ×3</b><small>三狼同夜 · 可悍跳</small></div>' +
        '<div class="rolecard seer"><span>🔮</span><b>预言家 ×1</b><small>每晚查验一人</small></div>' +
        '<div class="rolecard witch"><span>🧪</span><b>女巫 ×1</b><small>解药 / 毒药</small></div>' +
        '<div class="rolecard hunter"><span>🎯</span><b>猎人 ×1</b><small>出局开枪 · 毒杀除外</small></div>' +
        '<div class="rolecard villager"><span>🧑‍🌾</span><b>村民 ×3</b><small>靠发言和投票</small></div>'
      : '<div class="rolecard wolf"><span>🐺</span><b>狼人 ×2</b><small>每晚刀人 · 可悍跳</small></div>' +
        '<div class="rolecard seer"><span>🔮</span><b>预言家 ×1</b><small>每晚查验一人</small></div>' +
        '<div class="rolecard witch"><span>🧪</span><b>女巫 ×1</b><small>解药 / 毒药</small></div>' +
        '<div class="rolecard villager"><span>🧑‍🌾</span><b>村民 ×2</b><small>靠发言和投票</small></div>';
    startFine.textContent = '完全离线 · ' + (mode === 9 ? '8' : '5') + ' 个规则 AI · 无网络请求';
    brandMode.textContent = mode + ' 人单机';
    document.title = '狼人杀 · ' + mode + ' 人单机';
    var modeButtons = document.querySelectorAll('.ww-mode-btn');
    for (var i = 0; i < modeButtons.length; i++) {
      modeButtons[i].classList.toggle('active', Number(modeButtons[i].getAttribute('data-mode')) === mode);
    }
  }

  function renderHelp() {
    var mode = state ? state.playerCount : ui.mode;
    var is9 = mode === 9;
    helpTitle.textContent = is9 ? '九人局怎么玩' : '六人局怎么玩';
    helpContent.innerHTML = '<div class="ww-help-grid"><div>' +
      '<h3>身份</h3>' +
      (is9
        ? '<p><b>狼人 ×3</b>：每晚共同击杀一人，白天可以撒谎、悍跳预言家或女巫。</p>' +
          '<p><b>预言家 ×1</b>：每晚查验一人，得到“狼人 / 好人”。</p>' +
          '<p><b>女巫 ×1</b>：一瓶解药、一瓶毒药，每晚最多用一瓶。</p>' +
          '<p><b>猎人 ×1</b>：出局时可以开枪带走一人；被毒杀时无法开枪。</p>' +
          '<p><b>村民 ×3</b>：没有夜间技能，靠发言和票型找狼。</p>'
        : '<p><b>狼人 ×2</b>：每晚与同伴选择击杀一人，白天可以撒谎、悍跳预言家。</p>' +
          '<p><b>预言家 ×1</b>：每晚查验一人，得到“狼人 / 好人”。</p>' +
          '<p><b>女巫 ×1</b>：一瓶解药、一瓶毒药，每晚最多用一瓶。</p>' +
          '<p><b>村民 ×2</b>：没有夜间技能，靠发言和票型找狼。</p>') +
      '</div><div><h3>胜负</h3>' +
      '<p><b>好人胜利</b>：放逐全部 ' + (is9 ? '3' : '2') + ' 名狼人。</p>' +
      '<p><b>狼人胜利</b>：杀光全部 ' + (is9 ? '6' : '4') + ' 名好人。</p>' +
      '<p><b>平票</b>：无人出局，直接进入下一夜。</p>' +
      '<p>玩家出局后可以留一句遗言，然后继续观战；阵营获胜仍计为胜利。</p></div></div>' +
      '<div class="ww-help-tips"><h3>发言与投票</h3>' +
      '<p>轮到你时，选择“过 / 怀疑 / 保人 / 跳身份”。点座位选择目标，再确认。投票时点一名存活玩家，或选择弃票。</p>' +
      '<p>AI 会引用真实发生的票型、死亡、保人和身份对跳。狼人可以撒谎，但谎言也会挂在真实事件上。' +
      (is9 ? '九人局里，狼人会更频繁地悍跳；猎人出局后别忘了开枪。' : '') + '</p></div>';
  }

  function openHelp() {
    renderHelp();
    helpOverlay.hidden = false;
  }
  function hideOverlays() {
    startOverlay.hidden = true;
    resultOverlay.hidden = true;
    helpOverlay.hidden = true;
    profileOverlay.hidden = true;
  }
  function renderStartStats() {
    var s = loadStats();
    startStats.innerHTML = esc(statsText(s)) + '<br><span style="color:#8c7555">狼人：' + s.byRole.wolf.wins + ' 胜 / 好人：' + (s.byRole.seer.wins + s.byRole.witch.wins + s.byRole.hunter.wins + s.byRole.villager.wins) + ' 胜</span>';
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      if (!state || state.fast || ui.speed === 0 || !ms || ms <= 0) { resolve(); return; }
      var start = Date.now();
      var timer = setInterval(function () {
        if (!state || state.fast || ui.speed === 0) {
          clearInterval(timer);
          resolve();
          return;
        }
        var speed = ui.speed || 1;
        if (Date.now() - start >= ms / speed) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  }
  function speechDelay(speech) {
    var len = speech && speech.text ? speech.text.replace(/\s/g, '').length : 0;
    // 默认按“普通人读中文”的速度留时间；点“下一位”可以立即跳过。
    return Math.min(9500, Math.max(2600, 1600 + len * 64));
  }

  function speechMetaHtml(speech) {
    var bits = [];
    if (speech && speech.replyTo != null) {
      bits.push('<span class="ww-speech-chip reply">回应 ' + shortSeat(speech.replyTo) + '</span>');
    }
    ((speech && speech.evidence) || []).slice(0, 2).forEach(function (ev) {
      if (ev && ev.label) {
        bits.push('<span class="ww-speech-chip ' + esc(ev.kind || '') + '">' + esc(ev.label) + '</span>');
      }
    });
    return bits.length ? '<div class="ww-speech-meta">' + bits.join('') + '</div>' : '';
  }

  function showAiSpeech(p, speech, opts) {
    opts = opts || {};
    var html = bottomHead(opts.icon || '🗣️', opts.title || (p.name + ' 正在发言'),
      '<span class="ww-speech-line">' + esc(speech.text || '……') + '</span>');
    html += speechMetaHtml(speech);
    html += '<div class="ww-btn-row"><button class="ww-btn small ghost" data-act="nextSpeech" type="button">下一位</button></div>';
    setBottom(html, { nextSpeech: skipSpeechWait });
  }

  function skipSpeechWait() {
    if (speechWait) speechWait();
  }

  function waitSpeech(ms) {
    if (!state || state.fast || ui.speed === 0 || !ms) return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false;
      var start = Date.now();
      var timer = null;
      function finish() {
        if (done) return;
        done = true;
        if (timer) clearInterval(timer);
        if (speechWait === finish) speechWait = null;
        resolve();
      }
      speechWait = finish;
      timer = setInterval(function () {
        if (!state || state.fast || ui.speed === 0) { finish(); return; }
        if (Date.now() - start >= ms / (ui.speed || 1)) finish();
      }, 50);
    });
  }

  async function nightPhase(token) {
    var human = state.players[0];
    E.startNight(state);
    ui.speaking = null;
    setPhaseInfo({
      kicker: '第 ' + state.day + ' 夜',
      title: '天黑请闭眼',
      sub: '村庄陷入沉睡，狼人开始行动。',
      icon: '🌙',
      phaseLabel: '第 ' + state.day + ' 夜',
      tone: 'night'
    });
    renderAll();

    var humanAlive = human.alive;
    if (humanAlive && human.role === 'wolf') setBottomStatus('🐺', '狼人行动', '选择今晚要击杀的人。');
    else if (humanAlive && human.role === 'seer') setBottomStatus('🔮', '预言家行动', '选择要查验的人。');
    else if (humanAlive && human.role === 'witch') setBottomStatus('🧪', '女巫行动', '等待狼人行动……');
    else setBottomStatus('🌙', '你闭上眼睛', '夜晚行动中，天亮后见分晓。');

    await sleep(600);
    if (token !== runToken) return;

    var wolves = state.players.filter(function (p) { return p.alive && p.role === 'wolf'; });
    var wolfTarget = null;
    if (humanAlive && human.role === 'wolf') {
      wolfTarget = await askWolfTarget();
    } else if (wolves.length) {
      wolfTarget = A.decideNight(state, wolves[0]).target;
      await sleep(520);
    }
    if (token !== runToken) return;
    if (!state.night) state.night = {};
    state.night.wolfTarget = wolfTarget;

    var seer = state.players.filter(function (p) { return p.alive && p.role === 'seer'; })[0];
    var seerTarget = null;
    if (humanAlive && human.role === 'seer') {
      seerTarget = await askSeerTarget();
    } else if (seer) {
      seerTarget = A.decideNight(state, seer).target;
      await sleep(440);
    }
    if (token !== runToken) return;
    state.night.seerTarget = seerTarget;

    var witch = state.players.filter(function (p) { return p.alive && p.role === 'witch'; })[0];
    var witchAction = { save: false, poison: null };
    if (witch) {
      if (witch.isHuman) {
        witchAction = await askWitchAction();
      } else {
        witchAction = A.decideNight(state, witch);
        await sleep(440);
      }
    }
    if (token !== runToken) return;

    E.resolveNight(state, {
      wolfTarget: wolfTarget,
      seerTarget: seerTarget,
      witchSave: witchAction.save,
      witchPoison: witchAction.poison
    });

    if (humanAlive && human.role === 'seer') {
      var check = human.checks && human.checks[human.checks.length - 1];
      if (check) await showCheckResult({ target: check.target, result: check.result });
      if (token !== runToken) return;
    } else if (humanAlive && human.role === 'witch') {
      if (witchAction.save) toast('你使用了解药。');
      else if (witchAction.poison != null) toast('你使用了毒药。');
      await sleep(300);
      if (token !== runToken) return;
    }

    renderAll();
  }

  async function dawnPhase(token) {
    var human = state.players[0];
    var deaths = state.lastDeaths || [];
    var names = deaths.map(function (d) { return seatLabel(d.id); });
    setPhaseInfo({
      kicker: '第 ' + state.day + ' 天',
      title: '天亮了',
      sub: names.length ? (names.join('、') + ' 倒下了。') : '平安夜，没有人倒下。',
      icon: '🌅',
      phaseLabel: '第 ' + state.day + ' 天',
      tone: 'dawn'
    });
    renderAll();
    if (deaths.length) {
      setBottomStatus('🕯️', '昨夜有人出局', names.join('、') + ' 离开了牌桌。');
      flashDeaths(deaths);
    } else {
      setBottomStatus('🌤️', '平安夜', '没有人倒下。女巫也许用掉了她的药。');
    }
    await sleep(1000);
    if (token !== runToken) return;

    await hunterShotPhase(token);
    if (token !== runToken) return;
    deaths = state.lastDeaths || [];
    A.observeDeaths(state, deaths);
    names = deaths.map(function (d) { return seatLabel(d.id); });
    if (ui.phaseInfo && deaths.length) {
      ui.phaseInfo.sub = names.join('、') + ' 倒下了。';
      renderAll();
    }
    for (var i = 0; i < deaths.length; i++) {
      var p = player(deaths[i].id);
      if (!p) continue;
      if (p.isHuman) {
        setBottomStatus('🕯️', '你的遗言', '你已出局，留一句话再进入观战。');
        var sp = await askSpeech(true);
        if (token !== runToken) return;
        if (sp) {
          E.recordSpeech(state, sp);
          A.observeSpeech(state, sp);
          renderAll();
          setBottomStatus('🕯️', '你的遗言', '<span class="ww-speech-line">' + esc(sp.text) + '</span>');
          await sleep(450);
        }
      } else {
        var last = A.decideLastWords(state, p);
        if (last) {
          E.recordSpeech(state, last);
          A.observeSpeech(state, last);
          renderAll();
          showAiSpeech(p, last, { icon: '🕯️', title: p.name + ' 的遗言' });
          await waitSpeech(speechDelay(last));
          if (token !== runToken) return;
        }
      }
    }

    if (!human.alive && !state.spectator) {
      state.spectator = true;
      renderAll();
    }
    if (state.over) {
      setBottomStatus('⚖️', '胜负已分', '正在整理这一夜的结果……');
      await sleep(500);
      return;
    }
    setBottomStatus('☀️', '白天讨论', '存活玩家将依次发言。');
    await sleep(500);
  }

  async function discussionPhase(token) {
    E.startDiscussion(state);
    setPhaseInfo({
      kicker: '第 ' + state.day + ' 天',
      title: '白天发言',
      sub: '听完所有人的发言，再决定把票投给谁。',
      icon: '☀️',
      phaseLabel: '第 ' + state.day + ' 天',
      tone: 'day'
    });
    renderAll();
    var order = E.shuffle(E.alive(state).slice());
    for (var i = 0; i < order.length; i++) {
      if (token !== runToken) return;
      var p = order[i];
      if (!p.alive) continue;
      ui.speaking = p.id;
      renderSeats();
      if (p.isHuman) {
        setBottomStatus('🗣️', '轮到你发言', '选择一种发言方式，点座位选择目标。');
        var sp = await askSpeech(false);
        if (token !== runToken) return;
        if (sp) {
          E.recordSpeech(state, sp);
          A.observeSpeech(state, sp);
          renderAll();
          setBottomStatus('🗣️', '你的发言', '<span class="ww-speech-line">' + esc(sp.text || '……') + '</span>');
        }
        await sleep(500);
      } else {
        setBottomStatus('🗣️', p.name + ' 正在发言', '听完再判断，别急着站边。');
        await sleep(260);
        if (token !== runToken) return;
        var speech = A.planSpeech(state, p);
        E.recordSpeech(state, speech);
        A.observeSpeech(state, speech);
        renderAll();
        showAiSpeech(p, speech);
        await waitSpeech(speechDelay(speech));
        if (token !== runToken) return;
      }
      ui.speaking = null;
      renderSeats();
    }
    renderAll();
    await sleep(350);
  }

  async function votePhase(token) {
    E.startVote(state);
    setPhaseInfo({
      kicker: '第 ' + state.day + ' 天',
      title: '放逐投票',
      sub: '票数最高者出局；平票则无人出局。',
      icon: '🗳️',
      phaseLabel: '第 ' + state.day + ' 天',
      tone: 'vote'
    });
    renderAll();
    var human = state.players[0];

    if (human.alive) {
      setBottomStatus('🗳️', '轮到你投票', '选择一名存活玩家，或弃票。');
      var target = await askVote();
      if (token !== runToken) return;
      E.castVote(state, human.id, target);
      A.observeVote(state, human.id, target);
      renderAll();
      await sleep(300);
    } else {
      setBottomStatus('🗳️', '观战投票', '存活玩家正在投票。');
      await sleep(350);
    }

    var alive = E.alive(state);
    for (var i = 0; i < alive.length; i++) {
      if (token !== runToken) return;
      var p = alive[i];
      if (p.isHuman) continue;
      var vote = A.decideVote(state, p);
      E.castVote(state, p.id, vote);
      A.observeVote(state, p.id, vote);
      renderAll();
      await sleep(350);
    }

    var result = E.resolveVote(state);
    renderAll();
    var summary;
    if (result.tie) summary = '平票，无人出局。';
    else if (result.exiled != null) summary = seatLabel(result.exiled) + ' 被放逐。';
    else summary = '无人出局。';
    setBottomStatus('🗳️', '投票结果', summary);
    await sleep(900);
    if (token !== runToken) return;

    await hunterShotPhase(token);
    if (token !== runToken) return;
    var deaths = state.lastDeaths || [];
    A.observeDeaths(state, deaths);
    renderAll();

    for (var d = 0; d < deaths.length; d++) {
      var dead = player(deaths[d].id);
      if (!dead) continue;
      if (dead.isHuman) {
        setBottomStatus('🕯️', '你的遗言', '你已出局，留一句话再进入观战。');
        var sp = await askSpeech(true);
        if (token !== runToken) return;
        if (sp) {
          E.recordSpeech(state, sp);
          A.observeSpeech(state, sp);
          renderAll();
          setBottomStatus('🕯️', '你的遗言', '<span class="ww-speech-line">' + esc(sp.text) + '</span>');
          await sleep(450);
        }
      } else {
        var last = A.decideLastWords(state, dead);
        if (last) {
          E.recordSpeech(state, last);
          A.observeSpeech(state, last);
          renderAll();
          showAiSpeech(dead, last, { icon: '🕯️', title: dead.name + ' 的遗言' });
          await waitSpeech(speechDelay(last));
          if (token !== runToken) return;
        }
      }
    }

    if (!human.alive && !state.spectator) {
      state.spectator = true;
      renderAll();
    }
    if (!state.over) {
      setBottomStatus('🌙', '夜幕再次降临', '第 ' + (state.day + 1) + ' 夜即将开始。');
      await sleep(550);
    }
  }

  async function runGame(token) {
    while (token === runToken && state && !state.over) {
      await nightPhase(token);
      if (token !== runToken) return;
      await dawnPhase(token);
      if (token !== runToken) return;
      if (state.over) break;
      await discussionPhase(token);
      if (token !== runToken) return;
      if (state.over) break;
      await votePhase(token);
      if (token !== runToken) return;
    }
    if (token === runToken && state) showResult();
  }

  function replayHtml() {
    if (!state) return '';
    var claims = [];
    state.players.forEach(function (p) {
      (p.claims || []).forEach(function (c) {
        var text = '第' + (c.day || '?') + '天 ' + shortSeat(p.id) + ' ' + p.name + ' 跳' + roleInfo(c.role).name;
        if (c.role === 'seer' && c.target != null) {
          text += '，报' + (c.result === 'wolf' ? '查杀' : '金水') + ' ' + shortSeat(c.target);
        }
        claims.push(text);
      });
    });
    var exiles = [];
    var dawns = [];
    (state.log || []).forEach(function (e) {
      if (e.type === 'vote-result' && !e.tie && e.exiled != null) {
        exiles.push('第' + (e.day || '?') + '天 ' + shortSeat(e.exiled) + ' 被放逐');
      }
      if (e.type === 'dawn') {
        var names = (e.deaths || []).map(function (d) { return shortSeat(d.id); });
        dawns.push('第' + (e.day || '?') + '天 ' + (names.length ? names.join('、') + ' 出局' : '平安夜'));
      }
    });
    var lies = [];
    state.players.forEach(function (p) {
      if (p.role !== 'wolf') return;
      (p.claims || []).forEach(function (c) {
        if (c.role !== 'seer' || c.target == null) return;
        lies.push(shortSeat(p.id) + ' ' + p.name + '：第' + (c.day || '?') + '天报' +
          (c.result === 'wolf' ? '查杀' : '金水') + ' ' + shortSeat(c.target));
      });
    });
    function card(title, rows) {
      if (!rows.length) return '';
      return '<div class="ww-replay-card"><h3>' + title + '</h3>' +
        rows.slice(0, 5).map(function (row) { return '<p>' + esc(row) + '</p>'; }).join('') + '</div>';
    }
    var html = '<div class="ww-replay-head"><b>本局复盘</b><span>' + esc(state.winner === 'good' ? '好人阵营获胜' : '狼人阵营获胜') + '</span></div>';
    html += card('身份与起跳', claims);
    html += card('放逐与出局', exiles.concat(dawns));
    html += card('狼人账本', lies);
    if (!claims.length && !exiles.length && !dawns.length) {
      html += '<div class="ww-replay-empty">这一局没有留下公开发言记录。</div>';
    }
    return html;
  }

  function showResult() {
    if (!state) return;
    state.phase = 'over';
    var human = state.players[0];
    var ri = roleInfo(human.role);
    var win = state.winner === ri.team;
    var s = recordResult(win);

    setPhaseInfo({
      kicker: '本局结算',
      title: win ? '你的阵营获胜' : '你的阵营失败',
      sub: '',
      icon: '⚖️',
      phaseLabel: '结算',
      tone: 'dawn'
    });
    renderAll();
    bottomPanel.innerHTML = '';
    ui.bottomActions = {};
    helpOverlay.hidden = true;
    profileOverlay.hidden = true;
    clearTimeout(toastTimer);
    toastEl.classList.remove('show');

    resultMark.className = 'ww-result-mark' + (win ? '' : ' lose');
    resultMark.textContent = win ? '胜' : '负';
    resultEyebrow.textContent = teamName(state.winner);
    resultTitle.textContent = state.winner === 'good' ? '村庄守住了' : '狼人笑到了最后';
    resultSub.textContent = '你是 ' + seatLabel(0) + ' · ' + ri.name + '。' +
      (win ? '你的阵营获胜。' : '你的阵营失败。') +
      (human.alive ? '你活到了最后。' : '你已出局，但阵营结果仍然有效。');

    resultRoles.innerHTML = state.players.map(function (p) {
      var pri = roleInfo(p.role);
      return '<div class="ww-role-chip ' + pri.team + (p.alive ? '' : ' dead') + '">' +
        '<span>' + (p.avatar || '👤') + '</span><div><b>' + esc(p.name) + '</b><small>' +
        pri.name + (p.alive ? '' : ' · 出局') + '</small></div></div>';
    }).join('');

    resultReplay.innerHTML = replayHtml();
    resultStats.innerHTML = '第 ' + state.day + ' 天结束 · 存活 ' + E.alive(state).length + ' 人<br>' + esc(statsText(s));
    resultOverlay.hidden = false;
  }

  function startGame(options) {
    cancelPending();
    runToken += 1;
    var token = runToken;
    var requested = options && (options.playerCount || options.mode);
    ui.mode = Number(requested) === 9 ? 9 : (requested ? 6 : (ui.mode === 9 ? 9 : 6));
    saveMode(ui.mode);
    var gameOptions = {};
    Object.keys(options || {}).forEach(function (key) { gameOptions[key] = options[key]; });
    gameOptions.playerCount = ui.mode;
    state = E.createGame(gameOptions);
    state.statsSaved = false;
    A.init(state);

    ui.phaseInfo = {
      kicker: '第 1 夜',
      title: '天黑请闭眼',
      sub: '村庄陷入沉睡，狼人开始行动。',
      icon: '🌙',
      phaseLabel: '第 1 夜',
      tone: 'night'
    };
    ui.tab = 'log';
    ui.selectable = null;
    ui.selected = null;
    ui.onSeatClick = null;
    ui.speaking = null;
    ui.speed = 1;
    ui.bottomActions = {};
    hideOverlays();
    flashEl.hidden = true;
    clearTimeout(flashTimer);
    clearTimeout(toastTimer);
    toastEl.classList.remove('show');
    switchTab('log');
    renderStartMode();
    renderAll();
    setBottomStatus('🌙', '准备入夜', (ui.mode === 9 ? '八个' : '五个') + ' AI 已经落座。天黑之后，狼人先行动。');
    app.classList.add('is-night');
    app.classList.remove('is-day');

    sleep(650).then(function () {
      if (token === runToken) runGame(token);
    });
  }

  function renderLobby() {
    state = null;
    ui.phaseInfo = null;
    ui.selectable = null;
    ui.selected = null;
    ui.onSeatClick = null;
    ui.speaking = null;
    ui.speed = 1;
    ui.bottomActions = {};
    hideOverlays();
    startOverlay.hidden = false;
    resultOverlay.hidden = true;
    flashEl.hidden = true;
    switchTab('log');
    renderStartMode();
    renderAll();
    setBottom(bottomHead('🌙', '等待入座', '点击“入座开局”，' + (ui.mode === 9 ? '八个' : '五个') + ' AI 会随机落座。'), {});
    renderStartStats();
  }

  function switchTab(tab) {
    ui.tab = tab;
    var tabs = document.querySelectorAll('.ww-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
    }
    logPanel.hidden = tab !== 'log';
    cluePanel.hidden = tab !== 'clues';
  }

  function goHome() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'gamebox:exit' }, '*');
        return;
      }
    } catch (e) {}
    if (history.length > 1) history.back();
    else location.href = '../../index.html';
  }

  document.getElementById('startBtn').addEventListener('click', function () { startGame({ playerCount: ui.mode }); });
  document.getElementById('startHelpBtn').addEventListener('click', openHelp);
  document.getElementById('helpBtn').addEventListener('click', openHelp);
  document.getElementById('helpClose').addEventListener('click', function () { helpOverlay.hidden = true; });
  document.getElementById('profileClose').addEventListener('click', function () { profileOverlay.hidden = true; });
  document.getElementById('againBtn').addEventListener('click', function () {
    var mode = state ? state.playerCount : ui.mode;
    startGame({ playerCount: mode });
  });
  document.getElementById('homeBtn').addEventListener('click', goHome);
  document.getElementById('restartBtn').addEventListener('click', function () {
    if (state && !state.over && !window.confirm('当前对局还没结束，确定重新开局？')) return;
    var mode = state ? state.playerCount : ui.mode;
    startGame({ playerCount: mode });
  });
  document.querySelectorAll('.ww-mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ui.mode = Number(btn.getAttribute('data-mode')) === 9 ? 9 : 6;
      saveMode(ui.mode);
      renderStartMode();
      renderLobby();
    });
  });
  document.querySelectorAll('.ww-tab').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
  });
  profileOverlay.addEventListener('click', function (e) {
    if (e.target === profileOverlay) profileOverlay.hidden = true;
  });
  helpOverlay.addEventListener('click', function (e) {
    if (e.target === helpOverlay) helpOverlay.hidden = true;
  });
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!profileOverlay.hidden) profileOverlay.hidden = true;
    else if (!helpOverlay.hidden) helpOverlay.hidden = true;
  });

  window.WW = {
    start: startGame,
    get state() { return state; },
    engine: E,
    ai: A,
    setSpeed: function (value) {
      ui.speed = value;
      if (value === 0 && state) state.fast = true;
    },
    fastForward: function () {
      if (!state) return;
      state.fast = true;
      ui.speed = 0;
      toast('快进到结算。');
    },
    answer: answer,
    openProfile: openProfile,
    showResult: showResult,
    stats: loadStats,
    renderLobby: renderLobby,
    cancelPending: cancelPending
  };

  renderLobby();

})();
