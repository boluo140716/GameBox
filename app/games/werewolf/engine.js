/* 狼人杀 · 6 / 9 人单机版 — 纯规则引擎
 * 不依赖 DOM，可在浏览器和 Node 中运行。
 */
(function (root) {
  'use strict';

  var ROLES = {
    wolf: {
      key: 'wolf', name: '狼人', icon: '🐺', team: 'wolf', short: '狼',
      desc: '每晚与同伴一起选择击杀一名玩家。'
    },
    seer: {
      key: 'seer', name: '预言家', icon: '🔮', team: 'good', short: '预',
      desc: '每晚查验一名玩家，得知对方是狼人还是好人。'
    },
    witch: {
      key: 'witch', name: '女巫', icon: '🧪', team: 'good', short: '女',
      desc: '拥有 1 瓶解药和 1 瓶毒药，每晚最多使用 1 瓶。'
    },
    hunter: {
      key: 'hunter', name: '猎人', icon: '🎯', team: 'good', short: '猎',
      desc: '出局时可以开枪带走一名玩家；被女巫毒杀时无法开枪。'
    },
    villager: {
      key: 'villager', name: '村民', icon: '🧑‍🌾', team: 'good', short: '民',
      desc: '没有夜间技能，靠发言和投票找出狼人。'
    }
  };

  var SEATS_6 = [
    { name: '你', avatar: '🙂', human: true },
    { name: '阿岚', avatar: '🧑‍🌾', personality: 'steady' },
    { name: '老周', avatar: '🧔', personality: 'aggressive' },
    { name: '小满', avatar: '👩', personality: 'logical' },
    { name: '黑豆', avatar: '🧑‍🎤', personality: 'intuitive' },
    { name: '青禾', avatar: '👧', personality: 'dramatic' }
  ];

  var SEATS_9 = SEATS_6.concat([
    { name: '白露', avatar: '👩‍🦰', personality: 'logical' },
    { name: '石头', avatar: '🧓', personality: 'cautious' },
    { name: '阿杰', avatar: '🧑‍💼', personality: 'chaotic' }
  ]);

  var MODES = {
    6: {
      playerCount: 6,
      name: '六人局',
      roles: ['wolf', 'wolf', 'seer', 'witch', 'villager', 'villager'],
      seats: SEATS_6
    },
    9: {
      playerCount: 9,
      name: '九人局',
      roles: ['wolf', 'wolf', 'wolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager'],
      seats: SEATS_9
    }
  };

  // 兼容旧调用：默认六人局。
  var ROLE_ORDER = MODES[6].roles.slice();
  var SEATS = SEATS_6;

  var PERSONALITIES = {
    steady: { key: 'steady', name: '稳健', aggression: 0.34, claim: 0.44, talk: 0.76 },
    aggressive: { key: 'aggressive', name: '激进', aggression: 0.78, claim: 0.66, talk: 0.92 },
    logical: { key: 'logical', name: '逻辑', aggression: 0.46, claim: 0.56, talk: 0.9 },
    intuitive: { key: 'intuitive', name: '直觉', aggression: 0.56, claim: 0.42, talk: 0.82 },
    dramatic: { key: 'dramatic', name: '戏精', aggression: 0.68, claim: 0.72, talk: 0.98 },
    cautious: { key: 'cautious', name: '谨慎', aggression: 0.24, claim: 0.34, talk: 0.7 },
    chaotic: { key: 'chaotic', name: '搅局', aggression: 0.72, claim: 0.52, talk: 0.94 }
  };

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return list;
  }

  function createGame(options) {
    options = options || {};
    var requested = Number(options.playerCount || options.mode || 0);
    if (!requested && options.roles) requested = options.roles.length;
    var mode = requested === 9 ? 9 : 6;
    var preset = MODES[mode];
    var seats = preset.seats;
    var roles = options.roles ? options.roles.slice() : shuffle(preset.roles.slice());

    // 测试/演示时可以强制玩家身份。
    if (options.playerRole && roles.indexOf(options.playerRole) !== -1) {
      var at = roles.indexOf(options.playerRole);
      var first = roles[0];
      roles[0] = roles[at];
      roles[at] = first;
    }

    var players = seats.map(function (seat, i) {
      var role = roles[i] || 'villager';
      return {
        id: i,
        name: seat.name,
        avatar: seat.avatar,
        isHuman: !!seat.human,
        personality: seat.personality || (options.allAI ? 'logical' : null),
        role: role,
        alive: true,
        claim: null,
        claims: [],
        publicChecks: [],
        checks: [],
        votes: [],
        accusations: [],
        defenses: [],
        questions: [],
        spokeToday: false,
        voteToday: null,
        witch: { antidote: true, poison: true },
        hunter: { shot: false },
        known: {}
      };
    });

    if (options.allAI) {
      players.forEach(function (p) { p.isHuman = false; });
    }

    return {
      players: players,
      mode: mode,
      playerCount: players.length,
      day: 0,
      phase: 'intro',
      night: null,
      lastDeaths: [],
      lastVote: null,
      log: [],
      publicEvents: [],
      votes: {},
      winner: null,
      winReason: null,
      over: false,
      fast: false,
      spectator: false,
      allAI: !!options.allAI,
      runId: 0
    };
  }

  function player(state, id) {
    return state.players[id] || null;
  }

  function alive(state) {
    return state.players.filter(function (p) { return p.alive; });
  }

  function aliveWolves(state) {
    return state.players.filter(function (p) { return p.alive && p.role === 'wolf'; });
  }

  function aliveGods(state) {
    return state.players.filter(function (p) {
      return p.alive && (p.role === 'seer' || p.role === 'witch' || p.role === 'hunter');
    });
  }

  function aliveVillagers(state) {
    return state.players.filter(function (p) { return p.alive && p.role === 'villager'; });
  }

  function aliveGood(state) {
    return state.players.filter(function (p) { return p.alive && p.role !== 'wolf'; });
  }

  function roleInfo(role) {
    return ROLES[role] || ROLES.villager;
  }

  function addEvent(state, event) {
    event.day = state.day;
    state.publicEvents.push(event);
    state.log.push(event);
    return event;
  }

  function startNight(state) {
    state.day++;
    state.phase = 'night';
    state.night = {
      wolfTarget: null,
      seerTarget: null,
      seerResult: null,
      witchSave: false,
      witchPoison: null,
      saved: false,
      deaths: []
    };
    state.lastDeaths = [];
    state.votes = {};
    state.players.forEach(function (p) {
      p.spokeToday = false;
      p.voteToday = null;
    });
    return state.night;
  }

  function resolveNight(state, actions) {
    actions = actions || {};
    var night = state.night || {};
    var seer = state.players.filter(function (p) { return p.alive && p.role === 'seer'; })[0];
    var witch = state.players.filter(function (p) { return p.alive && p.role === 'witch'; })[0];
    var seerResult = null;

    if (seer && actions.seerTarget != null) {
      var checkTarget = player(state, actions.seerTarget);
      if (checkTarget && checkTarget.alive && checkTarget.id !== seer.id) {
        var result = checkTarget.role === 'wolf' ? 'wolf' : 'good';
        seer.known[checkTarget.id] = result;
        seer.checks.push({ day: state.day, target: checkTarget.id, result: result });
        seerResult = { seer: seer.id, target: checkTarget.id, result: result };
        night.seerResult = seerResult;
      }
    }

    var victim = actions.wolfTarget != null ? player(state, actions.wolfTarget) : null;
    if (victim && !victim.alive) victim = null;

    var saved = false;
    if (victim && witch && actions.witchSave && witch.witch.antidote) {
      witch.witch.antidote = false;
      witch.witch.savedTarget = victim.id;
      witch.witch.savedDay = state.day;
      saved = true;
    }

    var poisonTarget = null;
    if (witch && actions.witchPoison != null && witch.witch.poison && !actions.witchSave) {
      var pt = player(state, actions.witchPoison);
      if (pt && pt.alive && pt.id !== witch.id) {
        poisonTarget = pt;
        witch.witch.poison = false;
        witch.witch.poisonedTarget = pt.id;
        witch.witch.poisonedDay = state.day;
      }
    }

    var deaths = [];
    function kill(p, cause) {
      if (!p || !p.alive) return;
      p.alive = false;
      p.death = { day: state.day, cause: cause };
      deaths.push({ id: p.id, cause: cause, day: state.day });
    }

    if (victim && !saved) kill(victim, 'wolf');
    if (poisonTarget) kill(poisonTarget, 'poison');

    night.saved = saved;
    night.deaths = deaths;
    state.lastDeaths = deaths;
    state.phase = 'dawn';

    addEvent(state, {
      type: 'dawn',
      deaths: deaths.slice(),
      saved: saved,
      wolfTarget: victim ? victim.id : null,
      seerResult: seerResult ? { target: seerResult.target, result: seerResult.result } : null
    });

    checkWinner(state);

    return {
      deaths: deaths,
      saved: saved,
      seerResult: seerResult,
      witchUsed: !!witch && (saved || !!poisonTarget)
    };
  }

  function startDiscussion(state) {
    state.phase = 'discussion';
    state.players.forEach(function (p) { p.spokeToday = false; });
    return alive(state);
  }

  function recordSpeech(state, speech) {
    if (!speech) return null;
    var speaker = player(state, speech.speaker);
    if (!speaker) return null;

    var entry = {
      type: 'speech',
      day: state.day,
      speaker: speaker.id,
      kind: speech.kind || 'pass',
      target: speech.target != null ? speech.target : null,
      reason: speech.reason || null,
      role: speech.role || null,
      check: speech.check || null,
      text: speech.text || '',
      tags: speech.tags || [],
      replyTo: speech.replyTo != null ? speech.replyTo : null,
      topic: speech.topic || null,
      confidence: speech.confidence != null ? speech.confidence : null,
      evidence: speech.evidence || [],
      lastWords: !!speech.lastWords
    };

    state.log.push(entry);
    state.publicEvents.push(entry);

    if (speech.kind === 'accuse' && speech.target != null) {
      speaker.accusations.push({ day: state.day, target: speech.target, reason: speech.reason || '' });
    }
    if (speech.kind === 'defend' && speech.target != null) {
      speaker.defenses.push({ day: state.day, target: speech.target, reason: speech.reason || '' });
    }
    if (speech.kind === 'question' && speech.target != null) {
      speaker.questions.push({ day: state.day, target: speech.target, topic: speech.topic || '' });
    }
    if (speech.kind === 'claim' || speech.kind === 'counter') {
      var claim = {
        day: state.day,
        role: speech.role || 'villager',
        target: speech.check ? speech.check.target : null,
        result: speech.check ? speech.check.result : null
      };
      speaker.claim = claim;
      speaker.claims.push(claim);
      if (speech.role === 'seer' && speech.check) {
        speaker.publicChecks.push({
          day: state.day,
          target: speech.check.target,
          result: speech.check.result
        });
      }
    }

    if (!speech.lastWords) speaker.spokeToday = true;
    return entry;
  }

  function startVote(state) {
    state.phase = 'vote';
    state.votes = {};
    state.players.forEach(function (p) { p.voteToday = null; });
    return state;
  }

  function castVote(state, voterId, targetId) {
    var voter = player(state, voterId);
    if (!voter || !voter.alive) return false;
    if (targetId != null) {
      var target = player(state, targetId);
      if (!target || !target.alive) targetId = null;
    }
    state.votes[voterId] = targetId;
    voter.voteToday = targetId;
    voter.votes.push({ day: state.day, target: targetId });
    addEvent(state, {
      type: 'vote',
      voter: voterId,
      target: targetId
    });
    return true;
  }

  function resolveVote(state) {
    var tally = {};
    Object.keys(state.votes).forEach(function (key) {
      var targetId = state.votes[key];
      if (targetId == null) return;
      var target = player(state, targetId);
      if (!target || !target.alive) return;
      tally[targetId] = (tally[targetId] || 0) + 1;
    });

    var max = 0;
    var leaders = [];
    Object.keys(tally).forEach(function (key) {
      var n = tally[key];
      if (n > max) {
        max = n;
        leaders = [Number(key)];
      } else if (n === max) {
        leaders.push(Number(key));
      }
    });

    var result = {
      tally: tally,
      max: max,
      leaders: leaders.slice(),
      exiled: null,
      tie: leaders.length !== 1 || max === 0
    };

    if (!result.tie) {
      var exiled = player(state, leaders[0]);
      if (exiled && exiled.alive) {
        exiled.alive = false;
        exiled.death = { day: state.day, cause: 'vote' };
        result.exiled = exiled.id;
        state.lastDeaths = [{ id: exiled.id, cause: 'vote', day: state.day }];
      }
    } else {
      state.lastDeaths = [];
    }

    state.lastVote = result;
    state.phase = 'vote-result';
    addEvent(state, {
      type: 'vote-result',
      tally: tally,
      leaders: result.leaders,
      exiled: result.exiled,
      tie: result.tie
    });

    checkWinner(state);
    return result;
  }

  function hunterShoot(state, hunterId, targetId) {
    var hunter = player(state, hunterId);
    if (!hunter || hunter.role !== 'hunter' || hunter.alive) return null;
    if (hunter.hunter && hunter.hunter.shot) return null;
    if (hunter.death && hunter.death.cause === 'poison') return null;
    if (state.over || targetId == null) return null;

    var target = player(state, targetId);
    if (!target || !target.alive || target.id === hunter.id) return null;

    if (!hunter.hunter) hunter.hunter = { shot: false };
    hunter.hunter.shot = true;
    hunter.hunter.shotTarget = target.id;
    hunter.hunter.shotDay = state.day;

    target.alive = false;
    target.death = { day: state.day, cause: 'hunter' };

    var shotDeath = { id: target.id, cause: 'hunter', day: state.day };
    state.lastDeaths = state.lastDeaths || [];
    if (!state.lastDeaths.some(function (d) { return d.id === target.id; })) {
      state.lastDeaths.push(shotDeath);
    }

    addEvent(state, {
      type: 'hunter-shot',
      hunter: hunter.id,
      target: target.id
    });
    checkWinner(state);

    return {
      hunter: hunter.id,
      target: target.id,
      winner: state.winner || null
    };
  }

  function checkWinner(state) {
    var wolves = aliveWolves(state).length;
    var good = aliveGood(state).length;

    if (wolves === 0) {
      state.winner = 'good';
      state.winReason = 'all-wolves-dead';
    } else if (good === 0) {
      state.winner = 'wolf';
      state.winReason = 'all-good-dead';
    } else {
      state.winner = null;
      state.winReason = null;
    }
    state.over = !!state.winner;
    return state.winner;
  }

  function publicProfile(state, id) {
    var p = player(state, id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      alive: p.alive,
      claim: p.claim,
      claims: p.claims.slice(),
      publicChecks: p.publicChecks.slice(),
      votes: p.votes.slice(),
      accusations: p.accusations.slice(),
      defenses: p.defenses.slice(),
      questions: p.questions.slice(),
      death: p.death || null,
      // 只有玩家自己或结算后才知道真实身份。
      role: (p.isHuman || state.over) ? p.role : null
    };
  }

  function sameTeam(a, b) {
    if (!a || !b) return false;
    return roleInfo(a.role).team === roleInfo(b.role).team;
  }

  root.WW_ENGINE = {
    ROLES: ROLES,
    ROLE_ORDER: ROLE_ORDER,
    SEATS: SEATS,
    SEATS_6: SEATS_6,
    SEATS_9: SEATS_9,
    MODES: MODES,
    PERSONALITIES: PERSONALITIES,
    shuffle: shuffle,
    createGame: createGame,
    player: player,
    alive: alive,
    aliveWolves: aliveWolves,
    aliveGods: aliveGods,
    aliveVillagers: aliveVillagers,
    aliveGood: aliveGood,
    roleInfo: roleInfo,
    sameTeam: sameTeam,
    startNight: startNight,
    resolveNight: resolveNight,
    startDiscussion: startDiscussion,
    recordSpeech: recordSpeech,
    startVote: startVote,
    castVote: castVote,
    resolveVote: resolveVote,
    hunterShoot: hunterShoot,
    checkWinner: checkWinner,
    publicProfile: publicProfile
  };
})(typeof window !== 'undefined' ? window : globalThis);
