/* 狼人杀 · 6 / 9 人单机版 — 本地规则 AI
 * 只使用公开信息 + 自己的角色信息，不读心、不联网。
 */
(function (root) {
  'use strict';

  var E = root.WW_ENGINE;
  var S = root.WW_SPEECH;
  if (!E) throw new Error('WW_ENGINE must load before ai.js');
  if (!S) throw new Error('WW_SPEECH must load before ai.js');

  var OPENINGS = {
    steady: ['我先盘一下。', '不急，我说说我的判断。', '我这边先给个结论。', '我按公开信息来。', '稳一点，我先把话放这儿。', '我听完一圈，心里大概有个数。'],
    aggressive: ['我直接说了。', '别绕，今天必须出人。', '我点一个。', '这轮我不藏了。', '我不喜欢和稀泥。', '今天谁在带节奏，我就盯谁。'],
    logical: ['按票型看。', '这里有个矛盾。', '我拆一下逻辑。', '先把时间线捋一下。', '我按顺序说。', '这轮信息不少，我挑重点。'],
    intuitive: ['我感觉不对。', '我的直觉告诉我。', '这波我站不了。', '我总觉得有人在带节奏。', '我说不上来，但味道不对。', '有一句话让我很别扭。'],
    dramatic: ['这局有意思了。', '我给你们说个事。', '别急，我有话说。', '今天这票，不能乱投。', '你们先别急着站边。', '这桌上有人演得挺像。'],
    cautious: ['我再听一轮。', '我先把风险说在前面。', '我不急着定死。', '这轮我留个心眼。', '我说话比较保守。'],
    chaotic: ['我搅一句。', '这局越看越有意思。', '我先扔个观点出来。', '别都装明白人。', '我来点个不太一样的。']
  };

  var CLOSERS = {
    steady: ['先记着，后面再看票。', '不急着定死，但今天我会重点听他。', '这一票我先留着。'],
    aggressive: ['今天归票他，谁保他谁进我视野。', '我就把话放这儿，出他。', '别再分票了，票集中。'],
    logical: ['如果后面没有新信息，我的票会落在他身上。', '这条逻辑先成立，等他回应。', '我把矛盾摆出来，大家自己判断。'],
    intuitive: ['我真觉得他不对，先点一下。', '说不出细节，但我不会投他旁边的人。', '我的感觉很少出错，先留个印。'],
    dramatic: ['他要是好人，那我这双眼睛可以捐了。', '这波我站定，错了明天来打我的脸。', '今天不出他，晚上我要睡不着。'],
    cautious: ['先不下死结论，票型出来再说。', '我保留意见，但会盯他的票。', '别急着冲，先看他怎么接。'],
    chaotic: ['我就喜欢看有人被点到之后的表情。', '这票先扔这儿，明天再看谁捡。', '别问我为什么，问就是味道不对。']
  };

  var REBUTTALS = [
    '你点我之前，先把你自己的票解释清楚。',
    '你说我急，我看你比我还急。',
    '这个帽子扣得挺快，可惜没有证据。',
    '你拿一句感觉来归我，我不认。',
    '你盯着我打，是不是因为我知道你什么？',
    '别把视线往我身上引，你的票型还没解释。',
    '你要推我可以，拿一条站得住的逻辑出来。'
  ];

  var REASON_LABEL = {
    vote: '票型矛盾',
    silent: '发言划水',
    claim: '身份对跳',
    defend: '保人太急',
    night: '夜间刀口',
    intuition: '直觉'
  };

  function rand() { return Math.random(); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function shortLabel(state, id) {
    if (id == null) return '?';
    return (id + 1) + '号';
  }

  function reasonText(reason) {
    return REASON_LABEL[reason] || '感觉不对';
  }

  function chooseLine(p, list, pool) {
    if (!list || !list.length) return '';
    var b = brain(p);
    if (!b.usedLines) b.usedLines = [];
    var start = Math.floor(rand() * list.length);
    for (var i = 0; i < list.length; i++) {
      var line = list[(start + i) % list.length];
      if (b.usedLines.indexOf(line) === -1) {
        b.usedLines.push(line);
        if (b.usedLines.length > 24) b.usedLines.shift();
        return line;
      }
    }
    return list[start];
  }

  function opening(p) {
    return chooseLine(p, OPENINGS[p.personality] || OPENINGS.logical);
  }

  function closer(p) {
    return chooseLine(p, CLOSERS[p.personality] || CLOSERS.logical);
  }

  function init(state) {
    state.players.forEach(function (p) {
      if (p.isHuman) return;
      var suspicion = {};
      var trust = {};
      state.players.forEach(function (o) {
        if (o.id === p.id) return;
        if (p.role === 'wolf' && o.role === 'wolf') suspicion[o.id] = 0.02;
        else suspicion[o.id] = 0.32 + rand() * 0.18;
        trust[o.id] = 0.46 + rand() * 0.12;
      });
      var pers = E.PERSONALITIES[p.personality] || E.PERSONALITIES.logical;
      p.brain = {
        suspicion: suspicion,
        trust: trust,
        known: p.known,
        aggression: pers.aggression,
        teammates: p.role === 'wolf'
          ? state.players.filter(function (o) { return o.id !== p.id && o.role === 'wolf'; }).map(function (o) { return o.id; })
          : [],
        seerClaims: [],
        witchClaims: [],
        lastSpeechDay: 0,
        lastOpening: '',
        usedLines: [],
        memory: [],
        lastReplyTo: null,
        lastTopic: null,
        lastStance: null,
        fakeChecks: [],
        askedToday: []
      };
    });
    S.init(state);
    return state;
  }

  function brain(p) {
    if (!p.brain) {
      p.brain = {
        suspicion: {}, trust: {}, known: p.known || {}, aggression: 0.5, teammates: [],
        seerClaims: [], witchClaims: [], lastSpeechDay: 0, lastOpening: '',
        usedLines: [], memory: [], lastReplyTo: null, lastTopic: null,
        lastStance: null, fakeChecks: [], askedToday: []
      };
    }
    return p.brain;
  }

  function adjust(b, id, delta) {
    if (id == null) return;
    b.suspicion[id] = clamp((b.suspicion[id] == null ? 0.4 : b.suspicion[id]) + delta, 0.02, 0.98);
  }

  function trustAdjust(b, id, delta) {
    if (id == null) return;
    b.trust[id] = clamp((b.trust[id] == null ? 0.5 : b.trust[id]) + delta, 0.02, 0.98);
  }

  function observeSpeech(state, speech) {
    if (!speech) return;
    state.players.forEach(function (p) {
      if (p.isHuman || !p.alive) return;
      if (p.id === speech.speaker) return;
      var b = brain(p);
      var target = speech.target;
      var speaker = speech.speaker;

      b.memory.push({
        day: speech.day,
        speaker: speaker,
        kind: speech.kind,
        target: target,
        role: speech.role || null,
        replyTo: speech.replyTo != null ? speech.replyTo : null,
        topic: speech.topic || null
      });
      if (b.memory.length > 48) b.memory.shift();
      if (speech.replyTo != null) b.lastReplyTo = speech.replyTo;
      if (speech.topic) b.lastTopic = speech.topic;

      if (speech.kind === 'claim' || speech.kind === 'counter') {
        if (speech.role === 'seer') {
          var firstSeer = b.seerClaims.length ? b.seerClaims[0] : null;
          var isNewSeer = b.seerClaims.indexOf(speaker) === -1;
          var speakerIsTeammate = p.role === 'wolf' && b.teammates.indexOf(speaker) !== -1;
          if (isNewSeer) b.seerClaims.push(speaker);
          if (p.role === 'seer' && speaker !== p.id) adjust(b, speaker, 0.3);
          if (isNewSeer && !speakerIsTeammate) {
            if (firstSeer == null) {
              // 第一个起跳的预言家先给一点信任；狼人悍跳同样受此影响，这是信息成本。
              trustAdjust(b, speaker, 0.18);
              adjust(b, speaker, -0.05);
            } else {
              adjust(b, speaker, 0.19);
              adjust(b, firstSeer, 0.04);
            }
          }
          var check = speech.check;
          if (check) {
            if (check.target === p.id) {
              if (p.role === 'wolf' && check.result === 'wolf') adjust(b, speaker, 0.5);
              else if (p.role !== 'wolf' && check.result === 'wolf') adjust(b, speaker, 0.3);
              else if (check.result === 'good') trustAdjust(b, speaker, 0.14);
            }
            if (b.known && b.known[check.target] && b.known[check.target] !== check.result) {
              adjust(b, speaker, 0.34);
            }
            if (p.role === 'wolf' && b.teammates.indexOf(check.target) !== -1 && check.result === 'wolf') {
              adjust(b, speaker, 0.38);
            }
            if (check.result === 'wolf') adjust(b, check.target, 0.12);
            else adjust(b, check.target, -0.05);
          }
        } else if (speech.role === 'witch') {
          if (b.witchClaims.indexOf(speaker) === -1) b.witchClaims.push(speaker);
          if (p.role === 'witch' && speaker !== p.id) adjust(b, speaker, 0.3);
          else adjust(b, speaker, 0.02);
        } else {
          trustAdjust(b, speaker, 0.03);
        }
      }

      if (speech.kind === 'accuse' && target != null) {
        var targetPlayer = E.player(state, target);
        var prior = priorAccusations(state, target, speaker);
        var w = 0.038 + (b.trust[speaker] || 0.5) * 0.032;
        // 同一目标被多人围推时，边际可信度递减。
        if (prior >= 1) w *= 0.52;
        if (prior >= 2) w *= 0.72;
        if ((b.suspicion[speaker] || 0.5) > 0.56) w *= 0.72;
        // 对方刚怀疑过你，你立刻反咬：这是典型反打，先怀疑反打的人。
        var retaliation = !!(targetPlayer && targetPlayer.accusations.some(function (a) {
          return a.target === speaker;
        }));
        if (retaliation) {
          // 互咬时两边都进入视野，不无条件偏袒先开口的人。
          w *= 0.55;
          adjust(b, target, 0.025);
          adjust(b, speaker, 0.03);
        }
        adjust(b, target, w);
        // 跟风围推的人本身也要进入视野。
        if (prior >= 1) adjust(b, speaker, 0.022);
        if (prior >= 2) adjust(b, speaker, 0.018);
        if (target === p.id) adjust(b, speaker, 0.07);
        if (b.teammates.indexOf(target) !== -1) adjust(b, speaker, 0.02);
      }

      if (speech.kind === 'defend' && target != null) {
        adjust(b, target, -0.04 * (b.trust[speaker] || 0.5));
        if (target === p.id) trustAdjust(b, speaker, 0.055);
        if (b.teammates.indexOf(target) !== -1) adjust(b, speaker, 0.015);
      }

      if (speech.kind === 'pass') adjust(b, speaker, 0.015);
      if (speech.kind === 'counter' && target != null) adjust(b, target, 0.05);
      if (speech.kind === 'question' && target != null) {
        // 追问本身不是结论，只让被问的人稍微进入视野；不奖励“只会问”的发言。
        adjust(b, target, 0.018);
        if (target === p.id) adjust(b, speaker, 0.035);
      }
    });
  }

  function observeVote(state, voterId, targetId) {
    state.players.forEach(function (p) {
      if (p.isHuman || !p.alive || p.id === voterId) return;
      var b = brain(p);
      if (targetId == null) return;
      adjust(b, targetId, 0.028);
      if (targetId === p.id) adjust(b, voterId, 0.065);
      if (b.teammates.indexOf(targetId) !== -1) adjust(b, voterId, 0.035);
      var top = topSuspect(state, p);
      if (top && top.id === targetId) trustAdjust(b, voterId, 0.012);
    });
  }

  function observeDeaths(state, deaths) {
    (deaths || []).forEach(function (d) {
      var dead = E.player(state, d.id);
      if (!dead || !dead.claim || dead.claim.role !== 'seer') return;
      var checks = dead.publicChecks || [];
      state.players.forEach(function (p) {
        if (p.isHuman || !p.alive || p.id === dead.id) return;
        var b = brain(p);
        checks.forEach(function (c) {
          if (c.result === 'wolf') adjust(b, c.target, 0.13);
          else adjust(b, c.target, -0.04);
        });
        trustAdjust(b, dead.id, 0.1);
      });
    });
  }

  function publicPressure(state, id) {
    var n = 0;
    state.publicEvents.forEach(function (e) {
      if (e.type === 'speech' && e.kind === 'accuse' && e.target === id) n++;
      if (e.type === 'vote' && e.target === id) n += 0.5;
    });
    return n;
  }

  function priorAccusations(state, targetId, excludeSpeaker) {
    var n = 0;
    state.publicEvents.forEach(function (e) {
      if (e.type === 'speech' && e.kind === 'accuse' && e.target === targetId && e.speaker !== excludeSpeaker) n++;
    });
    return n;
  }

  function latestAccuser(state, p) {
    for (var i = state.publicEvents.length - 1; i >= 0; i--) {
      var e = state.publicEvents[i];
      if (e.day !== state.day) continue;
      if (e.type === 'speech' && e.kind === 'accuse' && e.target === p.id && e.speaker !== p.id) {
        return e.speaker;
      }
    }
    return null;
  }

  function latestSpeechByOther(state, p) {
    for (var i = state.publicEvents.length - 1; i >= 0; i--) {
      var e = state.publicEvents[i];
      if (e.day !== state.day) continue;
      if (e.type === 'speech' && e.speaker !== p.id && !e.lastWords && e.text) return e;
    }
    return null;
  }

  function findOtherWitchClaim(state, selfId) {
    var found = null;
    state.players.forEach(function (p) {
      if (found || p.id === selfId || !p.alive) return;
      if (p.claim && p.claim.role === 'witch') found = { speaker: p.id, claim: p.claim };
    });
    return found;
  }

  function accusersOf(state, targetId) {
    var seen = {};
    var list = [];
    state.publicEvents.forEach(function (e) {
      if (e.type === 'speech' && e.kind === 'accuse' && e.target === targetId) {
        if (!seen[e.speaker]) {
          seen[e.speaker] = true;
          list.push(e.speaker);
        }
      }
    });
    return list;
  }

  function topSuspect(state, p, opts) {
    opts = opts || {};
    var best = null;
    var bestScore = -1;
    var b = brain(p);
    var isWolf = p.role === 'wolf';
    E.alive(state).forEach(function (o) {
      if (o.id === p.id) return;
      if (opts.excludeSeerClaims && o.claim && o.claim.role === 'seer') return;
      if (isWolf && b.teammates.indexOf(o.id) !== -1) return;
      var score = (b.suspicion[o.id] == null ? 0.4 : b.suspicion[o.id]);

      if (isWolf) {
        score += publicPressure(state, o.id) * 0.032;
        if (o.claim && o.claim.role === 'seer') score += 0.16;
        score += rand() * 0.1;
      } else {
        // 好人不要被“多人围推”直接带飞：围推越集中，越要怀疑带节奏的人。
        var accusers = accusersOf(state, o.id);
        var hardCheck = findSeerCheckOn(state, o.id, 'wolf');
        score += publicPressure(state, o.id) * 0.006;
        if (accusers.length >= 2) {
          var avg = 0;
          accusers.forEach(function (id) { avg += (b.suspicion[id] || 0.4); });
          avg /= accusers.length;
          score -= 0.06 * (accusers.length - 1);
          score -= avg * 0.06;
          // 被多人围推的人，除非有预言家查杀，否则不应该是第一归票位。
          if (!hardCheck) score = Math.min(score, 0.46);
        }
        // 主动带节奏的人本身进入视野；参与围推的再加一点。
        score += Math.min(0.18, o.accusations.length * 0.025);
        o.accusations.forEach(function (a) {
          if (accusersOf(state, a.target).length >= 2) score += 0.05;
        });
        if (o.claim && o.claim.role === 'seer') {
          if (b.seerClaims.length === 1 && b.seerClaims[0] === o.id) score -= 0.2;
          else score += 0.05;
        }
        score += rand() * 0.13;
      }

      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    });
    return best ? { id: best.id, score: bestScore } : null;
  }

  function findSeerCheckOn(state, targetId, result) {
    var found = null;
    state.players.forEach(function (p) {
      if (found || !p.claim || p.claim.role !== 'seer') return;
      (p.publicChecks || []).forEach(function (c) {
        if (!found && c.target === targetId && c.result === result) {
          found = { speaker: p.id, check: c };
        }
      });
    });
    return found;
  }

  function findOtherSeerClaim(state, selfId) {
    var found = null;
    state.players.forEach(function (p) {
      if (found || p.id === selfId || !p.alive) return;
      if (p.claim && p.claim.role === 'seer') found = { speaker: p.id, claim: p.claim };
    });
    return found;
  }

  function accuseSpeech(state, p, target, reasonOverride) {
    if (!target) return passSpeech(state, p);
    var ev = S.evidence(state, p, target.id);
    if (reasonOverride) ev.reason = reasonOverride;
    return S.make(state, p, {
      kind: 'accuse',
      target: target.id,
      reason: ev.reason,
      evidenceData: ev,
      confidence: S.confidence(state, p, target.id, 'accuse')
    });
  }

  function defendSpeech(state, p, target, reasonOverride) {
    if (!target) return passSpeech(state, p);
    var ev = S.defendEvidence(state, p, target.id);
    if (reasonOverride) ev.reason = reasonOverride;
    return S.make(state, p, {
      kind: 'defend',
      target: target.id,
      reason: ev.reason,
      evidenceData: ev,
      confidence: S.confidence(state, p, target.id, 'defend')
    });
  }

  function rebutSpeech(state, p, accuserId) {
    var accuser = E.player(state, accuserId);
    if (!accuser || !accuser.alive) return passSpeech(state, p);
    return S.rebut(state, p, accuserId);
  }

  function claimSpeech(state, p, role, targetId, result, counterOf, action) {
    var speech = S.claim(state, p, {
      role: role,
      target: targetId,
      result: result,
      counterOf: counterOf,
      action: action || null
    });
    if (p.role === 'wolf' && role === 'seer') {
      var b = brain(p);
      b.fakeChecks.push({ day: state.day, target: targetId, result: result });
      if (b.fakeChecks.length > 8) b.fakeChecks.shift();
    }
    return speech;
  }

  function passSpeech(state, p) {
    return S.make(state, p, { kind: 'pass' });
  }

  function questionSpeech(state, p, targetId, about) {
    var target = E.player(state, targetId);
    if (!target || !target.alive || target.id === p.id) return passSpeech(state, p);
    return S.question(state, p, target.id, about);
  }

  function planSeerSpeech(state, p) {
    var b = brain(p);
    var knownWolves = E.alive(state).filter(function (o) {
      return o.id !== p.id && b.known[o.id] === 'wolf';
    });
    var knownGood = E.alive(state).filter(function (o) {
      return o.id !== p.id && b.known[o.id] === 'good';
    });
    var otherSeer = findOtherSeerClaim(state, p.id);
    var pressure = publicPressure(state, p.id);
    var shouldClaim = knownWolves.length > 0 || !!otherSeer ||
      (state.day >= 2 && p.checks.length >= 2 && (pressure >= 1 || rand() < 0.3));

    if (shouldClaim) {
      var targetId;
      var result;
      if (knownWolves.length) {
        targetId = knownWolves[0].id;
        result = 'wolf';
      } else if (knownGood.length) {
        targetId = knownGood[knownGood.length - 1].id;
        result = 'good';
      } else if (p.checks.length) {
        targetId = p.checks[p.checks.length - 1].target;
        result = p.checks[p.checks.length - 1].result;
      }
      if (targetId != null) {
        return claimSpeech(state, p, 'seer', targetId, result, otherSeer ? otherSeer.speaker : null);
      }
    }

    var accuser = latestAccuser(state, p);
    if (pressure >= 1 && accuser && rand() < 0.32) {
      return rebutSpeech(state, p, accuser);
    }

    // 没有查杀时，预言家不要带头冲人；优先保自己的金水或报查验。
    if (knownGood.length) {
      var pressuredGood = knownGood.filter(function (o) {
        return publicPressure(state, o.id) >= 1;
      })[0];
      if (pressuredGood) return defendSpeech(state, p, pressuredGood, 'defend');
      if (pressure >= 1 && p.checks.length) {
        var lastGood = p.checks[p.checks.length - 1];
        return claimSpeech(state, p, 'seer', lastGood.target, lastGood.result, null);
      }
    }
    if (pressure >= 2 && p.checks.length) {
      var last = p.checks[p.checks.length - 1];
      return claimSpeech(state, p, 'seer', last.target, last.result, null);
    }
    return passSpeech(state, p);
  }

  function planWolfSpeech(state, p) {
    var b = brain(p);
    var otherSeer = findOtherSeerClaim(state, p.id);
    var otherWitch = findOtherWitchClaim(state, p.id);
    if (otherSeer && b.teammates.indexOf(otherSeer.speaker) !== -1) otherSeer = null;
    if (otherWitch && b.teammates.indexOf(otherWitch.speaker) !== -1) otherWitch = null;
    var teammateUnderFire = b.teammates.some(function (id) {
      var t = E.player(state, id);
      return t && t.alive && publicPressure(state, id) >= 2;
    });
    var pressure = publicPressure(state, p.id);
    var accuser = latestAccuser(state, p);
    var aggression = b.aggression || 0.5;
    if (otherSeer && !p.claim && b.askedToday.indexOf(otherSeer.speaker) === -1 && rand() < 0.16) {
      b.askedToday.push(otherSeer.speaker);
      return questionSpeech(state, p, otherSeer.speaker, '你跳预言家后的验人顺序');
    }
    var teammateSeer = b.teammates.some(function (id) {
      var t = E.player(state, id);
      return t && t.claim && t.claim.role === 'seer';
    });

    // 悍跳预言家：有真预言家时对跳，没有时也可能主动起跳搅局。
    // 一局里通常只让一只狼起跳，避免狼队自己把场面搅成一锅粥。
    var seerChance = 0.03 + aggression * 0.07 + (otherSeer ? 0.08 : 0) +
      (pressure >= 2 ? 0.07 : 0) + (state.day >= 2 ? 0.03 : 0);
    // 九人局狼多，悍跳太频繁会把好人直接打散；保留欺骗性，但降低密度。
    if (state.playerCount === 9) seerChance *= 0.62;
    var shouldFakeSeer = !p.claim && !teammateSeer &&
      (otherSeer || state.day >= 2 || pressure >= 2) && rand() < seerChance;

    if (shouldFakeSeer) {
      var goodTargets = E.alive(state).filter(function (o) {
        return o.role !== 'wolf' && o.id !== p.id;
      });
      var mates = E.alive(state).filter(function (o) {
        return o.role === 'wolf' && o.id !== p.id;
      });
      var fakeTarget = otherSeer ? otherSeer.speaker : null;
      var fakeResult = 'wolf';
      if (fakeTarget == null && goodTargets.length) {
        goodTargets.sort(function (a, c) {
          return publicPressure(state, c.id) - publicPressure(state, a.id);
        });
        fakeTarget = goodTargets[0].id;
      }
      // 偶尔给狼同伴发金水，把自己和同伴绑在一起，制造“预言家视角”。
      if (!otherSeer && mates.length && rand() < 0.2) {
        fakeTarget = mates[Math.floor(rand() * mates.length)].id;
        fakeResult = 'good';
      }
      if (fakeTarget != null) {
        return claimSpeech(state, p, 'seer', fakeTarget, fakeResult, otherSeer ? otherSeer.speaker : null);
      }
    }

    // 悍跳女巫：在真女巫没跳、自己又被架住时，抢身份搅乱用药信息。
    if (!p.claim && !otherWitch && state.day >= 2 && (pressure >= 1 || teammateUnderFire) &&
        rand() < 0.04 + aggression * 0.06) {
      var witchTarget = E.alive(state).filter(function (o) { return o.role !== 'wolf'; })[0];
      return claimSpeech(state, p, 'witch', witchTarget ? witchTarget.id : null, null, null);
    }

    if (accuser != null && (pressure >= 1 || rand() < 0.24)) {
      return rebutSpeech(state, p, accuser);
    }

    // 队友被架住：救、踩、或者干脆切割，都是狼人会做的选择。
    if (teammateUnderFire) {
      var mate = E.player(state, b.teammates[0]);
      if (mate && mate.alive) {
        var roll = rand();
        if (roll < 0.34) return defendSpeech(state, p, mate, 'defend');
        if (roll < 0.48 && state.day >= 2) {
          // 倒钩踩队友：用公开压力换自己的好人面。
          return accuseSpeech(state, p, mate, 'vote');
        }
      }
    }

    // 偶尔保一个好人，制造“我不乱冲”的错觉。
    var pressuredGoods = E.aliveGood(state).filter(function (o) {
      return o.id !== p.id && publicPressure(state, o.id) >= 2;
    });
    if (pressuredGoods.length && rand() < 0.12) {
      return defendSpeech(state, p, pressuredGoods[0], 'defend');
    }

    var target = null;
    if (otherSeer) {
      target = E.player(state, otherSeer.speaker);
    } else {
      var top = topSuspect(state, p);
      if (top) target = E.player(state, top.id);
    }
    if (target && target.alive && target.role !== 'wolf') {
      return accuseSpeech(state, p, target);
    }
    return passSpeech(state, p);
  }

  function planWitchSpeech(state, p) {
    var w = p.witch || {};
    var pressure = publicPressure(state, p.id);
    var accuser = latestAccuser(state, p);
    var canClaim = (w.poisonedTarget != null || w.savedTarget != null) &&
      state.day >= 2 && (pressure >= 1 || rand() < 0.3);
    if (canClaim && !p.claim) {
      var targetId = w.poisonedTarget != null ? w.poisonedTarget : w.savedTarget;
      return claimSpeech(state, p, 'witch', targetId, null, null,
        w.poisonedTarget != null ? 'poison' : 'save');
    }
    if (accuser != null && pressure >= 1 && rand() < 0.32) {
      return rebutSpeech(state, p, accuser);
    }
    return planVillagerSpeech(state, p);
  }

  function planHunterSpeech(state, p) {
    var pressure = publicPressure(state, p.id);
    var accuser = latestAccuser(state, p);
    if (!p.claim && state.day >= 2 && pressure >= 2 && rand() < 0.22) {
      return claimSpeech(state, p, 'hunter', null, null, null);
    }
    if (accuser != null && pressure >= 1 && rand() < 0.38) {
      return rebutSpeech(state, p, accuser);
    }
    return planVillagerSpeech(state, p);
  }

  function planVillagerSpeech(state, p) {
    var b = brain(p);
    var pressure = publicPressure(state, p.id);
    var accuser = latestAccuser(state, p);

    // 被点到时，先接住，不要每次都像没听见一样继续盘别人。
    if (accuser != null && rand() < (pressure >= 2 ? 0.42 : 0.2)) {
      return rebutSpeech(state, p, accuser);
    }

    // 有时先追问上一句，而不是急着下结论。这样同桌才像在聊天。
    var latest = S.latestSpeech(state, p);
    if (latest && latest.speaker !== p.id && b.askedToday.indexOf(latest.speaker) === -1 && rand() < 0.2) {
      b.askedToday.push(latest.speaker);
      var about = '你刚才的判断';
      if (latest.kind === 'claim' || latest.kind === 'counter') about = '你的验人顺序';
      else if (latest.kind === 'accuse' && latest.target != null) about = '你点' + shortLabel(state, latest.target) + '的依据';
      else if (latest.kind === 'defend' && latest.target != null) about = '你保' + shortLabel(state, latest.target) + '的理由';
      return questionSpeech(state, p, latest.speaker, about);
    }

    var top = topSuspect(state, p);
    if (top && top.score > 0.57) {
      var target = E.player(state, top.id);
      // 第一天对方还没开口时，不把“没发言”当成划水证据。
      if (!(state.day === 1 && target && !target.spokeToday)) {
        return accuseSpeech(state, p, target);
      }
    }

    // 如果自己信得过的玩家正在被围攻，可以出来保一手。
    var pressured = E.alive(state).filter(function (o) {
      return o.id !== p.id && publicPressure(state, o.id) >= 2 && (b.trust[o.id] || 0) > 0.58;
    });
    if (pressured.length && rand() < 0.42) {
      return defendSpeech(state, p, pressured[0], 'defend');
    }

    // 没有足够信息时，可以用一句回应带过，而不是每人都是“我过”。
    return passSpeech(state, p);
  }

  function planSpeech(state, p, opts) {
    opts = opts || {};
    var b = brain(p);
    if (b.lastSpeechDay !== state.day) {
      b.askedToday = [];
      b.lastSpeechDay = state.day;
    }
    var speech;
    if (p.role === 'seer') speech = planSeerSpeech(state, p);
    else if (p.role === 'wolf') speech = planWolfSpeech(state, p);
    else if (p.role === 'witch') speech = planWitchSpeech(state, p);
    else if (p.role === 'hunter') speech = planHunterSpeech(state, p);
    else speech = planVillagerSpeech(state, p);
    if (!speech) speech = passSpeech(state, p);
    if (opts.lastWords) {
      speech.lastWords = true;
      speech.tags = (speech.tags || []).concat([{ label: '遗言', kind: 'last' }]);
    }
    return speech;
  }

  function decideVote(state, p) {
    var b = brain(p);
    var candidates = E.alive(state).filter(function (o) { return o.id !== p.id; });
    if (!candidates.length) return null;

    if (p.role === 'seer') {
      var knownWolf = candidates.filter(function (o) { return b.known[o.id] === 'wolf'; })[0];
      if (knownWolf) return knownWolf.id;
    }

    if (p.role === 'wolf') {
      var goods = candidates.filter(function (o) { return o.role !== 'wolf'; });
      if (goods.length) {
        goods.sort(function (a, c) {
          var sa = publicPressure(state, a.id) + (a.claim && a.claim.role === 'seer' ? 1.2 : 0) + rand() * 0.2;
          var sc = publicPressure(state, c.id) + (c.claim && c.claim.role === 'seer' ? 1.2 : 0) + rand() * 0.2;
          return sc - sa;
        });
        return goods[0].id;
      }
    }

    // 好人：优先跟“第一个起跳”的预言家；后起跳的只在第一条线崩了时才考虑。
    var seerClaims = state.players.filter(function (o) {
      return o.claim && o.claim.role === 'seer';
    });

    // 已经起跳的预言家夜里倒了，第二天又冒出一个新预言家：
    // 这个后置位非常可疑，先把他放进归票位，不要被新查验带着走。
    if (p.role !== 'wolf') {
      var deadSeerClaim = seerClaims.filter(function (o) { return !o.alive; })[0];
      var laterSeerClaim = seerClaims.filter(function (o) {
        return o.alive && o.id !== p.id;
      })[0];
      if (deadSeerClaim && laterSeerClaim && rand() < 0.7) {
        return laterSeerClaim.id;
      }
    }

    var claimOrder = b.seerClaims.filter(function (id) {
      var o = E.player(state, id);
      return o && o.alive && o.claim && o.claim.role === 'seer';
    });
    if (!claimOrder.length) {
      claimOrder = seerClaims.map(function (o) { return o.id; });
    }
    var trustedClaimId = claimOrder.length ? claimOrder[0] : null;
    // 第一天出现对跳时，不跟任何一方的查杀，避免被悍跳狼直接带飞。
    // 先起跳的预言家优先；即使出现对跳，也先看他给出的查杀是否成立，
    // 而不是因为“有两家起跳”就把所有信息都丢掉。
    var canFollowClaim = claimOrder.length >= 1;
    if (canFollowClaim) {
      for (var i = 0; i < claimOrder.length; i++) {
        var claimId = claimOrder[i];
        if (claimId === p.id) continue;
        if (claimOrder.length > 1 && claimId !== trustedClaimId) continue;
        var sp = E.player(state, claimId);
        if (!sp) continue;
        if ((b.suspicion[sp.id] || 0.5) > 0.56) continue;
        var check = (sp.publicChecks || []).slice().reverse().filter(function (c) {
          return c.result === 'wolf';
        })[0];
        if (check) {
          var target = E.player(state, check.target);
          if (target && target.alive) return target.id;
        }
      }
    }

    // 第一天只有 1~2 个预言家起跳时，先不投起跳位；3 个以上说明必然有狼悍跳，
    // 这时反而要从起跳位里找最可疑的。
    var aliveSeerClaims = seerClaims.filter(function (o) { return o.alive; });
    var excludeSeer = p.role !== 'wolf' && state.day === 1 &&
      aliveSeerClaims.length > 0 && aliveSeerClaims.length <= 2;
    var top = topSuspect(state, p, { excludeSeerClaims: excludeSeer });
    if (!top) top = topSuspect(state, p);
    if (!top) return null;
    if (top.score < 0.45 && rand() < 0.18) return null;
    return top.id;
  }

  function decideHunterShot(state, p) {
    if (!p || p.role !== 'hunter') return null;
    var b = brain(p);
    var candidates = E.alive(state).filter(function (o) { return o.id !== p.id; });
    if (!candidates.length) return null;

    // 有查杀先打查杀；没有就开枪打自己最不放心的人。
    var check = candidates.filter(function (o) {
      return b.known[o.id] === 'wolf' || findSeerCheckOn(state, o.id, 'wolf');
    })[0];
    if (check) return check.id;

    var top = topSuspect(state, p);
    if (top && top.score >= 0.58) return top.id;
    // 没有把握时，猎人不一定开枪；乱带一个好人反而帮狼。
    if (rand() < 0.45) {
      candidates.sort(function (a, c) {
        return (publicPressure(state, c.id) + (b.suspicion[c.id] || 0.4) + rand() * 0.2) -
          (publicPressure(state, a.id) + (b.suspicion[a.id] || 0.4) + rand() * 0.2);
      });
      return candidates[0] ? candidates[0].id : null;
    }
    return null;
  }

  function processHunterShots(state) {
    var deaths = (state.lastDeaths || []).slice();
    deaths.forEach(function (d) {
      if (state.over) return;
      var p = E.player(state, d.id);
      if (!p || p.role !== 'hunter' || p.alive) return;
      if (p.death && p.death.cause === 'poison') return;
      if (p.hunter && p.hunter.shot) return;
      var targetId = decideHunterShot(state, p);
      if (targetId != null) E.hunterShoot(state, p.id, targetId);
    });
  }

  function decideNight(state, p) {
    if (p.role === 'wolf') return { target: pickWolfTarget(state, p) };
    if (p.role === 'seer') return { target: pickSeerTarget(state, p) };
    if (p.role === 'witch') return pickWitchAction(state, p);
    return { target: null };
  }

  function pickWolfTarget(state, p) {
    var b = brain(p);
    var candidates = E.aliveGood(state).filter(function (o) {
      return o.id !== p.id && b.teammates.indexOf(o.id) === -1;
    });
    if (!candidates.length) return null;
    var best = null;
    var bestScore = -1;
    candidates.forEach(function (t) {
      var s = 0.5 + rand() * 0.3;
      if (t.claim && t.claim.role === 'seer') s += 2.5;
      if (t.claim && t.claim.role === 'witch') s += 1.7;
      if (t.claim && t.claim.role === 'hunter') s += 1.4;
      if (t.isHuman) s += 0.3;
      if (t.publicChecks && t.publicChecks.length) s += 0.35;
      s += (t.accusations.length + t.defenses.length) * 0.035;
      if (s > bestScore) { bestScore = s; best = t; }
    });
    return best ? best.id : null;
  }

  function pickSeerTarget(state, p) {
    var b = brain(p);
    var candidates = E.alive(state).filter(function (o) {
      return o.id !== p.id && !(b.known && b.known[o.id]);
    });
    if (!candidates.length) {
      candidates = E.alive(state).filter(function (o) { return o.id !== p.id; });
    }
    if (!candidates.length) return null;
    candidates.sort(function (a, c) {
      return ((b.suspicion[c.id] || 0.4) + rand() * 0.2) - ((b.suspicion[a.id] || 0.4) + rand() * 0.2);
    });
    return candidates[0].id;
  }

  function pickWitchAction(state, p) {
    var b = brain(p);
    var victimId = state.night ? state.night.wolfTarget : null;
    var victim = victimId != null ? E.player(state, victimId) : null;
    var save = false;
    var poison = null;

    if (victim && p.witch.antidote) {
      if (victim.id === p.id) save = rand() < 0.84;
      else if (victim.claim && victim.claim.role === 'seer') save = rand() < 0.9;
      else if (victim.claim && victim.claim.role === 'witch') save = rand() < 0.68;
      else save = rand() < (state.day === 1 ? 0.48 : 0.24) + (b.trust[victim.id] || 0.5) * 0.18;
    }

    if (!save && p.witch.poison) {
      var top = topSuspect(state, p);
      if (top && top.id !== p.id && top.score > 0.62 && rand() < 0.35 + (b.aggression || 0.5) * 0.3) {
        poison = top.id;
      }
    }
    return { target: null, save: save, poison: poison };
  }

  function decideLastWords(state, p) {
    return planSpeech(state, p, { lastWords: true });
  }

  function processLastWords(state, deaths) {
    (deaths || []).forEach(function (d) {
      var p = E.player(state, d.id);
      if (!p || p.isHuman || !p.brain) return;
      var s = decideLastWords(state, p);
      if (s) {
        E.recordSpeech(state, s);
        observeSpeech(state, s);
      }
    });
  }

  function simulateGame(mode) {
    var state = E.createGame({ allAI: true, playerCount: mode === 9 ? 9 : 6 });
    init(state);
    var guard = 0;
    while (!state.over && guard++ < 24) {
      E.startNight(state);
      var wolves = E.aliveWolves(state);
      var seer = E.aliveGods(state).filter(function (p) { return p.role === 'seer'; })[0];
      var witch = E.aliveGods(state).filter(function (p) { return p.role === 'witch'; })[0];
      var actions = { wolfTarget: null, seerTarget: null, witchSave: false, witchPoison: null };
      if (wolves.length) actions.wolfTarget = pickWolfTarget(state, wolves[0]);
      if (seer) actions.seerTarget = pickSeerTarget(state, seer);
      if (witch) {
        var wa = pickWitchAction(state, witch);
        actions.witchSave = wa.save;
        actions.witchPoison = wa.poison;
      }
      E.resolveNight(state, actions);
      processHunterShots(state);
      observeDeaths(state, state.lastDeaths);
      processLastWords(state, state.lastDeaths);
      if (state.over) break;

      E.startDiscussion(state);
      var order = E.shuffle(E.alive(state).slice());
      order.forEach(function (p) {
        var s = planSpeech(state, p);
        E.recordSpeech(state, s);
        observeSpeech(state, s);
      });

      E.startVote(state);
      E.alive(state).forEach(function (p) {
        var v = decideVote(state, p);
        E.castVote(state, p.id, v);
        observeVote(state, p.id, v);
      });
      E.resolveVote(state);
      processHunterShots(state);
      processLastWords(state, state.lastDeaths);
    }
    return {
      winner: state.winner || 'draw',
      day: state.day,
      roles: state.players.map(function (p) { return p.role; }),
      state: state
    };
  }

  function simulateMany(n, mode) {
    n = n || 1000;
    var out = { n: n, mode: mode === 9 ? 9 : 6, good: 0, wolf: 0, draw: 0, days: 0 };
    for (var i = 0; i < n; i++) {
      var r = simulateGame(out.mode);
      if (r.winner === 'good') out.good++;
      else if (r.winner === 'wolf') out.wolf++;
      else out.draw++;
      out.days += r.day;
    }
    out.avgDays = out.days / n;
    out.goodRate = out.good / n;
    out.wolfRate = out.wolf / n;
    return out;
  }

  root.WW_AI = {
    init: init,
    observeSpeech: observeSpeech,
    observeVote: observeVote,
    observeDeaths: observeDeaths,
    decideNight: decideNight,
    planSpeech: planSpeech,
    decideVote: decideVote,
    decideHunterShot: decideHunterShot,
    processHunterShots: processHunterShots,
    decideLastWords: decideLastWords,
    processLastWords: processLastWords,
    simulateGame: simulateGame,
    simulateMany: simulateMany,
    reasonLabel: reasonText
  };
})(typeof window !== 'undefined' ? window : globalThis);



