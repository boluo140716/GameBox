/* 狼人杀 · 发言编排器
 * 只做两件事：把结构化判断说成人话；让后手接住前手的话题。
 * 不读隐藏身份，不联网，不调用 LLM。
 *
 * 三个约束：
 * 1. 长度分场景——跳身份/归票短，对跳/反驳长。
 * 2. 同一桌不重复自己说过的话；同一档句式轮着用。
 * 3. 只用公开事件 + 自己的记忆，不碰别人的底牌。
 */
(function (root) {
  'use strict';

  var E = root.WW_ENGINE;
  if (!E) throw new Error('WW_ENGINE must load before speech.js');

  var REASON = {
    vote: '票型对不上',
    silent: '发言没信息',
    claim: '身份对跳',
    defend: '保人太急',
    night: '夜间刀口',
    intuition: '感觉不对'
  };

  // 每类发言的字数区间。短句负责节奏，长句负责逻辑。
  var BUDGET = {
    pass: { min: 34, max: 62 },
    accuse: { min: 44, max: 80 },
    defend: { min: 42, max: 78 },
    question: { min: 22, max: 54 },
    rebut: { min: 56, max: 96 },
    claim: { min: 16, max: 50 }
  };

  var OPENERS = {
    steady: ['我说慢点。', '这轮我讲短点。', '我先给个判断。', '我这边不急。', '我按我看到的说。', '我把话摊开讲。'],
    aggressive: ['我直说。', '这轮我不绕。', '我先点一个。', '别急着过。', '我今天要个说法。', '行，那我先开这个头。'],
    logical: ['我捋一下。', '我把顺序说一下。', '这里有个点。', '我先说结论。', '我把线连一下。', '我按时间顺一遍。'],
    intuitive: ['我总觉得不对。', '有个地方很别扭。', '我先凭感觉说。', '这话听着不舒服。', '我说不上来，但先记着。', '我这人看人还挺准的。'],
    dramatic: ['这局有点意思。', '我先扔句话。', '你们别急着站。', '今天这桌有戏。', '我先来搅一下。', '都别装，有人心里有数。'],
    cautious: ['我保守点说。', '我先留个余地。', '这轮我不定死。', '我再听听。', '我先把风险放着。', '我说错你们别急着投我。'],
    chaotic: ['我插一句。', '我换个角度。', '别都一个说法。', '我先扔个反的。', '这轮我搅一下。', '我偏要说点不一样的。']
  };

  var CONNECT = ['。', '。', '。', '。', '，', '。不过，', '。反正，', '。我直说，', '。话说回来，', '。这么讲吧，'];

  // 模块级：跨局也生效的句式轮换，避免每局都从同一句开始。
  var slotHistory = {};
  var recentTexts = [];

  function rand() { return Math.random(); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function short(state, id) {
    if (id == null) return '?';
    var p = E.player(state, id);
    return p ? (p.id + 1) + '号' : '?';
  }

  function named(state, id) {
    var p = E.player(state, id);
    if (!p) return '?';
    var name = p.name && p.name !== '你' ? p.name : '';
    return (name && rand() < 0.35) ? (p.id + 1) + '号' + name : (p.id + 1) + '号';
  }

  function alive(state, id) {
    var p = E.player(state, id);
    return !!(p && p.alive);
  }

  function brain(p) {
    if (!p.brain) {
      p.brain = {
        suspicion: {}, trust: {}, known: p.known || {}, aggression: 0.5, teammates: [],
        seerClaims: [], witchClaims: [], usedLines: [], memory: [],
        lastReplyTo: null, lastTopic: null
      };
    }
    if (!p.brain.usedLines) p.brain.usedLines = [];
    return p.brain;
  }

  function meta(state) {
    if (!state.speechMeta) {
      state.speechMeta = { used: [], seq: 0, lastBySpeaker: {} };
    }
    return state.speechMeta;
  }

  function remember(state, text) {
    if (!text) return text;
    var m = meta(state);
    if (m.used.indexOf(text) === -1) {
      m.used.push(text);
      if (m.used.length > 240) m.used.shift();
    }
    return text;
  }

  function isRecent(text) {
    return !!text && recentTexts.indexOf(text) !== -1;
  }

  function noteRecent(text) {
    if (!text || isRecent(text)) return;
    recentTexts.push(text);
    if (recentTexts.length > 1800) recentTexts.shift();
  }

  function pick(list, fallback) {
    list = list || [];
    if (!list.length) return fallback || '';
    return list[Math.floor(rand() * list.length)];
  }

  /* 同一档句式（slot）里，先挑最近没被用过的。
   * 池子用掉只剩一句时会自动回收，不会因为去重把自己饿死。 */
  function pickFresh(p, slot, list) {
    list = list || [];
    if (!list.length) return '';
    var hist = slotHistory[slot] || (slotHistory[slot] = []);
    var cap = Math.max(2, list.length - 1);
    var b = brain(p);
    var mem = b.lineMemory || (b.lineMemory = {});
    var mine = mem[slot] || (mem[slot] = []);
    var myCap = Math.max(1, Math.floor(list.length / 2));
    var start = Math.floor(rand() * list.length);
    var line = null;
    var i;

    for (i = 0; i < list.length; i++) {
      var a = list[(start + i) % list.length];
      if (hist.indexOf(a) === -1 && mine.indexOf(a) === -1) { line = a; break; }
    }
    if (!line) {
      for (i = 0; i < list.length; i++) {
        var b2 = list[(start + i) % list.length];
        if (hist.indexOf(b2) === -1) { line = b2; break; }
      }
    }
    if (!line) line = list[start];

    hist.push(line);
    while (hist.length > cap) hist.shift();
    if (mine.indexOf(line) === -1) {
      mine.push(line);
      while (mine.length > myCap) mine.shift();
    }
    return line;
  }

  function sentence(text) {
    text = String(text || '').trim();
    if (!text) return '';
    if (/[。！？!?]$/.test(text)) return text;
    return text + '。';
  }

  function charCount(text) {
    return String(text || '').replace(/\s/g, '').length;
  }

  // 补句不能和已经说过的话撞车，撞了就换一句。
  function overlaps(a, b, n) {
    n = n || 6;
    a = String(a || '');
    b = String(b || '');
    if (!a || !b) return false;
    for (var i = 0; i + n <= a.length; i++) {
      if (b.indexOf(a.substr(i, n)) !== -1) return true;
    }
    return false;
  }

  function splitSentences(text) {
    var s = String(text || '').replace(/\s+/g, '');
    var out = [];
    var buf = '';
    for (var i = 0; i < s.length; i++) {
      buf += s[i];
      if ('。！？'.indexOf(s[i]) !== -1) { out.push(buf); buf = ''; }
    }
    if (buf) out.push(buf);
    return out;
  }

  function init(state) {
    meta(state);
    state.players.forEach(function (p) {
      if (p.isHuman) return;
      var b = brain(p);
      b.lastReplyTo = null;
      b.lastTopic = null;
    });
    return state.speechMeta;
  }

  function latestSpeech(state, p, opts) {
    opts = opts || {};
    for (var i = state.publicEvents.length - 1; i >= 0; i--) {
      var e = state.publicEvents[i];
      if (e.type !== 'speech') continue;
      if (e.day !== state.day) continue;
      if (e.speaker === p.id) continue;
      if (e.lastWords) continue;
      if (!opts.includeDead && !alive(state, e.speaker)) continue;
      return e;
    }
    return null;
  }

  function latestAccuser(state, p) {
    for (var i = state.publicEvents.length - 1; i >= 0; i--) {
      var e = state.publicEvents[i];
      if (e.type !== 'speech' || e.day !== state.day) continue;
      if (e.kind === 'accuse' && e.target === p.id && e.speaker !== p.id) return e;
    }
    return null;
  }

  function replyTarget(state, p) {
    var hit = latestAccuser(state, p);
    if (hit) return hit.speaker;
    var latest = latestSpeech(state, p);
    if (latest) return latest.speaker;
    return null;
  }

  function speechOf(state, speaker) {
    for (var i = state.publicEvents.length - 1; i >= 0; i--) {
      var item = state.publicEvents[i];
      if (item.type === 'speech' && item.day === state.day && item.speaker === speaker && !item.lastWords) {
        return item;
      }
    }
    return null;
  }

  function replyClause(state, p, replyTo) {
    if (replyTo == null) return '';
    var e = speechOf(state, replyTo);
    if (!e) return '';
    var s = short(state, replyTo);
    var target = e.target != null ? short(state, e.target) : '';

    if (e.kind === 'accuse' && e.target === p.id) {
      return pickFresh(p, 'reply:atMe', [
        '你点我，我接着。',
        '你点我，那我得说两句。',
        '你说我是狼，那你得说清我哪一步像。',
        '这个帽子我不躲，但你也别点完就过。',
        '我本来不想今天跟你掰扯，既然你点了，那就说清楚。',
        '你这一票我看懂了，先记着。'
      ]);
    }
    if (e.kind === 'accuse' && e.target != null) {
      return pickFresh(p, 'reply:atOther', [
        '你刚才说' + target + '有问题，这句我接着。',
        '你说' + target + '，我跟你看法不太一样。',
        '你把' + target + '抬出来，我想知道你自己怎么站。',
        '关于' + target + '，我记的东西跟你不完全一样。',
        '你把' + target + '抬出来，那我也说说我的看法。'
      ]);
    }
    if (e.kind === 'defend' && e.target != null) {
      return pickFresh(p, 'reply:defend', [
        '你保' + target + '保得有点快。',
        '你说' + target + '是好人，我这边没完全过。',
        '你替' + target + '说话可以，但别把票也带过去。',
        target + '我暂时没觉得那么干净。'
      ]);
    }
    if (e.kind === 'claim' || e.kind === 'counter') {
      var roleName = E.roleInfo(e.role || 'villager').name;
      return pickFresh(p, 'reply:claim', [
        '你跳' + roleName + '这事，我先不急着认。',
        '你这个身份，我得再想想。',
        '你刚才那个查验，我想听你再说一遍。',
        '你报' + roleName + '，我先记下，但不会只凭一句话站你。',
        '你跳得挺快，快得我有点想问你为什么这个时候跳。'
      ]);
    }
    if (e.kind === 'question') {
      return pickFresh(p, 'reply:question', [
        '你刚才问的那句，我回一下。',
        '这个问题我听到了。',
        '你问' + (target || '我') + '，我先说我的。',
        '你问得对，这事确实得有人讲清楚。'
      ]);
    }
    if (e.kind === 'pass') {
      return pickFresh(p, 'reply:pass', [
        '你刚才说再听一圈，我也先不急。',
        '你过，我也先不收票。',
        '你说要听，我跟你一起听，但别听到最后没人给票。',
        s + '这轮先过，我记着。',
        '你过可以，但你下一轮得给票。'
      ]);
    }
    return pickFresh(p, 'reply:other', [
      '刚才' + s + '那句，我记下了。',
      '我接着' + s + '说。',
      '你这话里有半句我同意，另外半句我不同意。',
      s + '这个态度，我先保留。'
    ]);
  }

  function currentTopic(state, p) {
    var seer = state.players.filter(function (o) {
      return o.alive && o.claim && o.claim.role === 'seer';
    });
    if (seer.length >= 2) return { id: 'seer-claim', label: '预言家对跳' };
    if (seer.length === 1) return { id: 'seer-claim', label: '预言家起跳' };
    var latest = latestSpeech(state, p);
    if (latest && latest.target != null && (latest.kind === 'accuse' || latest.kind === 'defend')) {
      return { id: 'target-' + latest.target, label: short(state, latest.target) };
    }
    return { id: 'day-' + state.day, label: '第' + state.day + '天' };
  }

  function chips(list) {
    var out = [];
    (list || []).forEach(function (item) {
      if (item && item.label && out.length < 2) out.push(item);
    });
    return out;
  }

  /* ── 事实层：只从公开记录里取一件「能落地」的事 ────────────── */

  function evidenceFacts(state, p, target) {
    if (target == null) {
      return { reason: 'intuition', facts: { kind: 'vague' }, chips: [{ label: '直觉', kind: 'reason' }] };
    }
    var t = E.player(state, target);
    if (!t) return { reason: 'intuition', facts: { kind: 'vague' }, chips: [] };

    var lastVote = t.votes && t.votes.length ? t.votes[t.votes.length - 1] : null;
    var lastAcc = t.accusations && t.accusations.length ? t.accusations[t.accusations.length - 1] : null;
    if (lastAcc && lastVote && lastAcc.target !== lastVote.target && lastAcc.day === lastVote.day) {
      return {
        reason: 'vote',
        facts: { kind: 'vote', who: t.id, said: lastAcc.target, voted: lastVote.target },
        chips: [{ label: '票型', kind: 'reason' }, { label: '对不上', kind: 'accuse' }]
      };
    }

    var lastDef = t.defenses && t.defenses.length ? t.defenses[t.defenses.length - 1] : null;
    if (lastDef) {
      var shielded = E.player(state, lastDef.target);
      var hard = shielded ? findPublicCheck(state, shielded.id, 'wolf') : null;
      if (shielded && hard) {
        return {
          reason: 'defend',
          facts: { kind: 'protectWolf', who: t.id, shielded: shielded.id, checker: hard.speaker },
          chips: [{ label: '保人', kind: 'defend' }, { label: '查杀', kind: 'wolf' }]
        };
      }
    }

    if (t.claim && t.claim.role === 'seer') {
      var other = findOtherClaim(state, t.id, 'seer');
      if (other != null) {
        return {
          reason: 'claim',
          facts: { kind: 'seerClash', who: t.id, other: other },
          chips: [{ label: '对跳', kind: 'claim' }, { label: '必有一狼', kind: 'wolf' }]
        };
      }
    }

    var lastSpeech = null;
    for (var i = state.publicEvents.length - 1; i >= 0; i--) {
      var e = state.publicEvents[i];
      if (e.type === 'speech' && e.speaker === t.id && !e.lastWords) { lastSpeech = e; break; }
    }
    if (lastSpeech && lastSpeech.kind === 'pass') {
      return {
        reason: 'silent',
        facts: { kind: 'silent', who: t.id },
        chips: [{ label: '划水', kind: 'reason' }]
      };
    }
    if (state.day === 1 && !t.spokeToday) {
      return {
        reason: 'intuition',
        facts: { kind: 'unspoken', who: t.id },
        chips: [{ label: '未发言', kind: 'reason' }]
      };
    }
    return {
      reason: 'intuition',
      facts: { kind: 'feel', who: t.id },
      chips: [{ label: '直觉', kind: 'reason' }]
    };
  }

  function phraseEvidence(state, p, reason, f) {
    f = f || {};
    if (f.kind === 'vote') {
      var w = short(state, f.who);
      var said = short(state, f.said);
      var voted = short(state, f.voted);
      return pickFresh(p, 'ev:vote', [
        '你回头看' + w + '的票，嘴上说要出' + said + '，手投的却是' + voted + '，这两件事对不上。',
        '我记着' + w + '一句话，说要出' + said + '，结果票落' + voted + '，中间一句解释都没有。',
        w + '前面说' + said + '有问题，最后票给' + voted + '，这种改口我不太信。',
        w + '说和投不是一个人，我一直等他解释，他没解释。',
        w + '那个票投得很有想法，但想法得说出来，不说我就当有鬼。',
        '我盯' + w + '很久了，理由是他说要出' + said + '，票却给了' + voted + '。',
        w + '这一票把' + said + '保下来了，可他自己嘴上又说' + said + '有问题，这算什么。'
      ]);
    }
    if (f.kind === 'protectWolf') {
      var pw = short(state, f.who);
      var sh = short(state, f.shielded);
      var ck = short(state, f.checker);
      return pickFresh(p, 'ev:protectWolf', [
        pw + '一直保' + sh + '，可' + sh + '身上挂着' + ck + '的查杀，这个保法太硬。',
        pw + '替' + sh + '说了不少好话，' + sh + '是被' + ck + '查杀的，这说不通。',
        '我注意到' + pw + '在护' + sh + '，护得比' + sh + '自己还急。',
        sh + '被' + ck + '查杀之后，' + pw + '第一个出来挡，这个顺序很说明问题。',
        '别人都在等' + sh + '解释，只有' + pw + '急着替他找理由。'
      ]);
    }
    if (f.kind === 'seerClash') {
      var cw = short(state, f.who);
      var co = short(state, f.other);
      return pickFresh(p, 'ev:seerClash', [
        '现在' + cw + '和' + co + '都跳预言家，这里面肯定有一个是狼。',
        '两个预言家，一个' + cw + '一个' + co + '，我信不了两个，今天必须出一个。',
        cw + '和' + co + '的验人对不上，我暂时更想看' + cw + '怎么圆。',
        '这桌同时站起两个预言家，' + cw + '和' + co + '，我更怀疑先跳的那个。'
      ]);
    }
    if (f.kind === 'silent') {
      var sw = short(state, f.who);
      return pickFresh(p, 'ev:silent', [
        sw + '这轮又说听，票也没给出来，信息太少了。',
        sw + '两次发言都是听，我真不知道他是好人还是不敢说。',
        sw + '一直划，划到后面大家就只能凭感觉投他了。',
        sw + '把自己摘得干干净净，一句能让人抓的话都不留。',
        '问他什么都说再听听，这种发言等于没发。',
        sw + '不是不会说，是不敢说，这才是我怀疑的地方。'
      ]);
    }
    if (f.kind === 'unspoken') {
      var uw = short(state, f.who);
      return pickFresh(p, 'ev:unspoken', [
        uw + '还没开口，我先点一下，看他怎么接。',
        uw + '到现在一句话没有，我先把他放观察位。',
        uw + '一直不出声，这种人后面最难处理，不如现在逼他说。',
        '一轮下来一句话没有，这种位置留到后面就是雷。',
        '我先点他，不是因为他像狼，是因为他没给任何东西。'
      ]);
    }
    if (f.kind === 'feel') {
      var fw = short(state, f.who);
      return pickFresh(p, 'ev:feel', [
        fw + '刚才那句我听着别扭，但一下说不上哪不对。',
        fw + '说的话都很对，但一句能落地的都没有。',
        fw + '这轮跟着风走，谁强他站谁，我不太舒服。',
        '我说不出具体哪句，' + fw + '给我的感觉就是在躲。',
        fw + '前面讲得挺满，一到要给票就开始绕。'
      ]);
    }
    return pickFresh(p, 'ev:vague', [
      '这轮信息太乱，我先凭感觉。',
      '说实话我现在没底，谁都能说两句漂亮话。',
      '我手上没有硬信息，只能听语气。',
      '现在这桌说法太多，我先把听到的理一理。',
      '我没验人没药，能判断的只有语气和票。',
      '这局到现在没有一条能钉死的证据，我只能先凭印象。',
      '我听下来最难受的是，没人愿意先把票亮出来。'
    ]);
  }

  function evidence(state, p, target) {
    var f = evidenceFacts(state, p, target);
    var out = {
      reason: f.reason,
      text: phraseEvidence(state, p, f.reason, f.facts),
      chips: chips(f.chips),
      baseReason: f.reason,
      rephrase: function () {
        return phraseEvidence(state, p, f.reason, f.facts);
      }
    };
    return out;
  }

  function defendFacts(state, p, target) {
    if (target == null) {
      return { reason: 'defend', facts: { kind: 'vague' }, chips: [{ label: '保人', kind: 'defend' }] };
    }
    var t = E.player(state, target);
    if (!t) return { reason: 'defend', facts: { kind: 'vague' }, chips: [{ label: '保人', kind: 'defend' }] };
    var good = findPublicCheck(state, t.id, 'good');
    if (good) {
      return {
        reason: 'defend',
        facts: { kind: 'gold', who: t.id, checker: good.speaker },
        chips: [{ label: '金水', kind: 'good' }, { label: '保人', kind: 'defend' }]
      };
    }
    var lastVote = t.votes && t.votes.length ? t.votes[t.votes.length - 1] : null;
    var lastAcc = t.accusations && t.accusations.length ? t.accusations[t.accusations.length - 1] : null;
    if (lastVote && (!lastAcc || lastVote.target === lastAcc.target)) {
      return {
        reason: 'defend',
        facts: { kind: 'consistent', who: t.id },
        chips: [{ label: '票型一致', kind: 'good' }, { label: '保人', kind: 'defend' }]
      };
    }
    return { reason: 'defend', facts: { kind: 'logic', who: t.id }, chips: [{ label: '保人', kind: 'defend' }] };
  }

  function phraseDefend(state, p, f) {
    f = f || {};
    if (f.kind === 'gold') {
      var g = short(state, f.who);
      var ck = short(state, f.checker);
      return pickFresh(p, 'def:gold', [
        ck + '给' + g + '发过金水，今天先别动他。',
        g + '是' + ck + '报过的金水，好人没必要这时候去冲。',
        '要出' + g + '，先过' + ck + '那关，他给的是金水。',
        g + '身上有金水，今天把票扔给他纯属浪费。'
      ]);
    }
    if (f.kind === 'consistent') {
      var c = short(state, f.who);
      return pickFresh(p, 'def:consistent', [
        c + '说的和投的至少是一致的，我觉得今天不该先出他。',
        c + '嘴上说谁手上投谁，这点比在座一半人干净。',
        '我不说' + c + '多好，但他前后对得上，今天轮不到他。',
        c + '这轮虽然是错的，但他敢把票亮出来，比藏着强。'
      ]);
    }
    if (f.kind === 'logic') {
      var l = short(state, f.who);
      return pickFresh(p, 'def:logic', [
        l + '今天的逻辑我觉得是通的，别把票浪费在他身上。',
        l + '说的那套我能跟上，硬要出他我不同意。',
        '我不保' + l + '到底，但今天比他更该出的人有。',
        l + '至少把话说清楚了，比一句「我听」强。'
      ]);
    }
    return pickFresh(p, 'def:vague', [
      '这个人我今天不想动。',
      '我先保他，理由待会补。',
      '现在冲他太早，我看不出他哪里像狼。'
    ]);
  }

  function defendEvidence(state, p, target) {
    var f = defendFacts(state, p, target);
    return {
      reason: f.reason,
      text: phraseDefend(state, p, f.facts),
      chips: chips(f.chips),
      baseReason: f.reason,
      rephrase: function () {
        return phraseDefend(state, p, f.facts);
      }
    };
  }

  function findPublicCheck(state, targetId, result) {
    var found = null;
    state.players.forEach(function (p) {
      if (found || !p.claim || p.claim.role !== 'seer') return;
      (p.publicChecks || []).forEach(function (c) {
        if (!found && c.target === targetId && c.result === result) {
          found = { speaker: p.id, target: c.target, result: c.result };
        }
      });
    });
    return found;
  }

  function findOtherClaim(state, targetId, role) {
    var found = null;
    state.players.forEach(function (p) {
      if (found || p.id === targetId || !p.alive) return;
      if (p.claim && p.claim.role === role) found = p.id;
    });
    return found;
  }

  function confidence(state, p, target, kind) {
    var b = brain(p);
    var s = target != null && b.suspicion[target] != null ? b.suspicion[target] : 0.5;
    var c = 0.5;
    if (kind === 'accuse') c = clamp(0.45 + (s - 0.4) * 0.8, 0.35, 0.9);
    else if (kind === 'defend') c = clamp(0.45 + ((b.trust[target] || 0.5) - 0.45) * 0.8, 0.35, 0.9);
    else if (kind === 'claim') c = 0.9;
    return Math.round(c * 100) / 100;
  }

  function opener(p) {
    if (rand() > 0.46) return '';
    var lines = OPENERS[p.personality] || OPENERS.logical;
    return pickFresh(p, 'open:' + (p.personality || 'logical'), lines);
  }

  // 语气跟着把握走：有把握就短而硬，没把握就留口子。
  function stance(state, p, opts) {
    var tg = opts.target != null ? short(state, opts.target) : '';
    var c = opts.confidence == null ? 0.5 : opts.confidence;

    if (opts.kind === 'accuse') {
      if (c >= 0.66) {
        return pickFresh(p, 'stance:accuse:strong', [
          '我今天就出' + tg + '，这票不改。',
          '没什么好犹豫的，' + tg + '今天走。',
          '我票钉在' + tg + '身上，谁说都一样。',
          '今天不出' + tg + '，这局就没法往下走。',
          '我把票压死了，就' + tg + '。'
        ]);
      }
      if (c <= 0.5) {
        return pickFresh(p, 'stance:accuse:soft', [
          '我想听' + tg + '解释，解释不清就出他。',
          '我票先挂' + tg + '，看后面有没有更硬的。',
          '我倾向' + tg + '，但还没到非他不可。',
          '我先点' + tg + '，不算定死。'
        ]);
      }
      return pickFresh(p, 'stance:accuse:mid', [
        '我今天先出' + tg + '。',
        '这票我先压' + tg + '。',
        '先归' + tg + '，票别再散了。',
        '我票先落' + tg + '，理由说完了。',
        '我倾向出' + tg + '，有更硬的我就改。',
        '这轮我给' + tg + '，谁不同意现在说。'
      ]);
    }

    if (opts.kind === 'defend') {
      if (c >= 0.66) {
        return pickFresh(p, 'stance:defend:strong', [
          '我明确说，' + tg + '今天不能出。',
          '我保' + tg + '，谁冲他我先冲谁。',
          '我票不可能给' + tg + '，这点不用再问。',
          tg + '这条线我认死，今天谁提他我跟谁急。'
        ]);
      }
      return pickFresh(p, 'stance:defend:mid', [
        '我先保' + tg + '一轮。',
        '今天别急着出' + tg + '。',
        '要出' + tg + '，先给我一条更硬的逻辑。',
        tg + '我暂时不想动。',
        '我不觉得' + tg + '该今天走，但我也没完全放下他。'
      ]);
    }

    return pickFresh(p, 'stance:pass', [
      '这轮我先不收票。',
      '我先过，票型出来我再定。',
      '我现在没底，硬点一个容易害人。',
      '我再听一圈，下一轮必须给态度。',
      '今天我听你们的，但票我不会乱给。',
      '我不站死边，但也不会装看不见。',
      '这轮先让子弹飞一会儿，谁急谁先露。'
    ]);
  }

  function forward(state, p, target) {
    if (rand() > 0.46) return '';
    var b = brain(p);
    var other = null;
    var ids = Object.keys(b.suspicion || {}).map(Number).filter(function (id) {
      return id !== p.id && id !== target && alive(state, id);
    }).sort(function (a, c) {
      return (b.suspicion[c] || 0) - (b.suspicion[a] || 0);
    });
    if (ids.length) other = ids[0];
    if (target != null && other != null) {
      return pickFresh(p, 'forward:pair', [
        '如果' + short(state, target) + '翻狼，' + short(state, other) + '跟着一起看。',
        '出完' + short(state, target) + '，明天我第一个问' + short(state, other) + '。',
        '要是' + short(state, target) + '是狼，' + short(state, other) + '也跑不了。',
        '这票落下去，明天就看' + short(state, other) + '怎么站。'
      ]);
    }
    return pickFresh(p, 'forward:solo', [
      '票型出来再说。',
      '我先记一笔，明天对账。',
      '后面看谁跟票，跟错的我记着。',
      '不急，先看他怎么接。',
      '今天这票谁跟谁不跟，我都记着。',
      '这票投完，明天再看谁改口。',
      '我不急着定第二个，先看今晚刀口。'
    ]);
  }

  /* 字数不够时补一句有信息量的话，不是凑字。 */
  function extensionPool(state, p, kind, target) {
    var tg = target != null ? short(state, target) : '';
    var b = brain(p);
    var others = Object.keys(b.suspicion || {}).map(Number).filter(function (id) {
      return id !== p.id && id !== target && alive(state, id);
    });
    var ot = others.length ? short(state, others[Math.floor(rand() * others.length)]) : '';

    if (kind === 'accuse') {
      return [
        '我票放这，明天要是对不上，我第一个认。',
        tg ? '说白了，' + tg + '今天要是不给个明确态度，我这票不会动。' : '说白了，今天没人给明确态度，这局就悬了。',
        '我不怕被投，就怕这桌又散票。',
        ot ? '还在听的几位，我也想看' + ot + '怎么站。' : '还在听的几位，麻烦给个态度，别都等着别人先点。',
        '谁要保他，现在就该出来保，别等票成形了才说话。',
        '我把话放这，今天这票我认，明天翻了我认账。'
      ];
    }
    if (kind === 'defend') {
      return [
        tg ? '我今天不出' + tg + '，但我也没保他到死。' : '我今天先不动票，但也没保谁到死。',
        tg ? '谁要冲' + tg + '，先把更硬的理由拿出来。' : '谁要冲人，先把更硬的理由拿出来。',
        '我保他不是因为他干净，是因为今天出他收益最低。',
        '这轮先留一个能说话的，后面还要靠他给信息。'
      ];
    }
    if (kind === 'pass') {
      return [
        '我先把话放这，下一轮我一定给票。',
        '现在给票太早，谁急着推票，我反而要看他。',
        '我这轮听，不代表我没在记。',
        '我今天不点人，但我心里有两个人选。',
        '你们先表态，我最后补一句我的看法。',
        '我票留着，谁今天说得好听我也不会马上跟。',
        ot ? '现在最该说话的是' + ot + '，他一直没给态度。' : '我提醒一句，别把票全压在一个没开口的人身上。',
        ot ? '我听的时候也在看' + ot + '，他今天话比平时少。' : '我听的时候也在看谁一直不接话。'
      ];
    }
    if (kind === 'rebut') {
      return [
        '你点我可以，但点完之后这桌有没有人跟，你自己清楚。',
        '我今天不急着反打，但这事我记你一票。',
        tg ? '我话放这：' + tg + '要是明天改口，我第一个说。' : '我话放这：今天这事没完，明天接着算。',
        '我被点过不止一次了，哪次是真的，你们回头看。'
      ];
    }
    if (kind === 'question') {
      return [
        '我不是要逼你，但这句话你得说清楚。',
        '你可以不回答，我明天按你的态度算。',
        '我问这个不是找茬，是这句话前后对不上。'
      ];
    }
    if (kind === 'claim') {
      return [
        '我把牌亮出来，省得后面再猜。',
        '身份就这样，剩下的靠票型说话。',
        '我先立个身份，后面按这个盘。',
        '我把话说明白，剩下的你们自己判断。'
      ];
    }
    return [];
  }

  function trimToMax(text, max) {
    var guard = 0;
    while (charCount(text) > max && guard++ < 3) {
      var arr = splitSentences(text);
      if (arr.length <= 2) break;
      // 砍中间那句，保住开场和最后的态度。
      arr.splice(1, 1);
      text = arr.join('');
    }
    return text;
  }

  function extendToMin(state, p, kind, target, text, min, max) {
    var guard = 0;
    while (charCount(text) < min && guard++ < 3) {
      var pool = extensionPool(state, p, kind, target).filter(function (line) {
        var bare = line.replace(/[。！？]$/, '');
        return text.indexOf(bare) === -1 && !overlaps(line, text) &&
          charCount(text) + charCount(line) <= max + 12;
      });
      if (!pool.length) break;
      var add = pickFresh(p, 'ext:' + kind, pool);
      if (!add) break;
      // 问句保留问号，别被补句吃掉。
      if (/[！？]$/.test(text)) text = text + add;
      else text = text.replace(/。$/, '') + '。' + add;
    }
    return text;
  }

  function fitText(state, p, kind, target, text) {
    var budget = BUDGET[kind] || BUDGET.pass;
    text = trimToMax(sentence(text), budget.max);
    text = extendToMin(state, p, kind, target, text, budget.min, budget.max);
    return sentence(text);
  }

  function join(parts) {
    var out = '';
    var lastConnect = '';
    parts.forEach(function (part, i) {
      if (!part) return;
      var text = String(part).trim().replace(/[。，,；;]+$/g, '');
      if (!text) return;
      if (out) {
        var connect = pick(CONNECT);
        if (connect === lastConnect) connect = '。';
        lastConnect = connect;
        out += connect;
      }
      out += text;
      if (i === parts.length - 1) out = sentence(out);
    });
    return out;
  }

  function arrange(parts, kind) {
    var map = {};
    parts.forEach(function (part) {
      if (part && part.text) map[part.type] = part.text;
    });
    var patterns = (kind === 'rebut')
      ? [['reply', 'evidence', 'stance'], ['reply', 'stance', 'evidence']]
      : [
        ['reply', 'evidence', 'stance', 'forward'],
        ['reply', 'evidence', 'stance'],
        ['evidence', 'reply', 'stance'],
        ['evidence', 'stance', 'forward'],
        ['evidence', 'stance'],
        ['reply', 'stance', 'forward'],
        ['reply', 'evidence', 'stance']
      ];
    var pattern = patterns[Math.floor(rand() * patterns.length)];
    var out = [];
    pattern.forEach(function (type) {
      if (map[type]) out.push(map[type]);
    });
    if (!out.length) {
      out = parts.map(function (part) { return part.text; }).filter(Boolean);
    }
    // 归票/保人这种短判断，三句以内；指控和反驳允许四句。
    var cap = (kind === 'accuse' || kind === 'defend') ? 4 : 3;
    if (out.length > cap) out = out.slice(0, cap);
    return join(out);
  }

  function composeOnce(state, p, kind, target, replyTo, ev, c) {
    if (kind === 'pass') {
      var passParts = [];
      var accuser = latestAccuser(state, p);
      var reply = '';
      if (replyTo != null) {
        // 被点了还说过，就别摆出「我接着」的架势，软处理更真实。
        reply = (accuser && accuser.speaker === replyTo)
          ? pickFresh(p, 'reply:passAtMe', [
            '你点我，我先记下，这轮我还是想再听一圈。',
            '你说我，我不急着回，先把话听完。',
            '你这一票我记着，但我今天先不给态度。',
            '你冲我来可以，我票留着，明天再算。'
          ])
          : replyClause(state, p, replyTo);
      }
      if (reply) passParts.push(reply);
      passParts.push(stance(state, p, { kind: 'pass', confidence: c }));
      var fw = rand() < 0.45 ? forward(state, p, null) : '';
      if (fw) passParts.push(fw);
      var text = join(passParts);
      var op = opener(p);
      if (op && rand() < 0.7) text = op + text;
      return text;
    }

    var parts = [];
    var r = replyClause(state, p, replyTo);
    if (r) parts.push({ type: 'reply', text: r });
    parts.push({ type: 'evidence', text: ev.text });
    parts.push({ type: 'stance', text: stance(state, p, { kind: kind, target: target, confidence: c }) });
    var f = forward(state, p, kind === 'defend' ? null : target);
    if (f) parts.push({ type: 'forward', text: f });
    var body = arrange(parts, kind);
    var open = opener(p);
    // 已经开口接话了，就别再叠一个「我直说」。
    var openChance = r ? 0.22 : (kind === 'accuse' || kind === 'defend' ? 0.5 : 0.65);
    if (open && rand() < openChance) body = open + body;
    return body;
  }

  function scoreText(state, text, budget) {
    if (!text) return -1;
    var s = 0;
    if (charCount(text) >= budget.min) s += 2;
    else if (charCount(text) >= budget.min * 0.7) s += 1;
    if (!isRecent(text)) s += 2;
    if (meta(state).used.indexOf(text) === -1) s += 1;
    if (/[。！？]$/.test(text)) s += 1;
    return s;
  }

  function rephrase(state, p, base) {
    if (!base) return { reason: 'intuition', text: '', chips: [] };
    if (typeof base.rephrase === 'function' && base.reason === base.baseReason) {
      var t = base.rephrase();
      if (t) return { reason: base.reason, text: t, chips: base.chips || [] };
    }
    return { reason: base.reason, text: base.text, chips: base.chips || [] };
  }

  function make(state, p, opts) {
    opts = opts || {};
    var kind = opts.kind || 'pass';
    var target = opts.target != null ? opts.target : null;
    var replyTo = opts.replyTo != null ? opts.replyTo : replyTarget(state, p);
    if (replyTo === p.id) replyTo = null;
    var topic = opts.topic || currentTopic(state, p).label;
    var c = opts.confidence != null ? opts.confidence : confidence(state, p, target, kind);
    var base = opts.evidenceData || (kind === 'defend' ? defendEvidence(state, p, target) : evidence(state, p, target));
    var budget = BUDGET[kind] || BUDGET.pass;

    // 抽 3 次，挑一个「够长 + 最近没人说过 + 这局没说过」的。
    var best = '';
    var bestScore = -1;
    var used = null;
    for (var attempt = 0; attempt < 3; attempt++) {
      var ev = rephrase(state, p, base);
      var text = fitText(state, p, kind, target, composeOnce(state, p, kind, target, replyTo, ev, c));
      var sc = scoreText(state, text, budget);
      if (sc > bestScore) { bestScore = sc; best = text; used = ev; }
      if (sc >= 6) break;
    }

    var tags = [];
    if (kind === 'accuse') {
      tags.push({ label: '怀疑 ' + short(state, target), kind: 'accuse' });
      tags.push({ label: REASON[opts.reason || (used && used.reason)] || '感觉不对', kind: 'reason' });
    } else if (kind === 'defend') {
      tags.push({ label: '保 ' + short(state, target), kind: 'defend' });
      tags.push({ label: REASON[opts.reason || (used && used.reason)] || '保人', kind: 'reason' });
    } else if (kind === 'pass') {
      tags.push({ label: '过', kind: 'pass' });
    }

    best = remember(state, best);
    noteRecent(best);
    if (p.brain) {
      p.brain.lastReplyTo = replyTo;
      p.brain.lastTopic = topic;
    }
    return {
      speaker: p.id,
      kind: kind,
      target: target,
      reason: opts.reason || (used && used.reason) || null,
      role: opts.role || null,
      check: opts.check || null,
      text: best,
      tags: tags,
      replyTo: replyTo,
      topic: topic,
      confidence: c,
      evidence: chips(used && used.chips),
      lastWords: !!opts.lastWords
    };
  }

  function claim(state, p, opts) {
    opts = opts || {};
    var role = opts.role || 'villager';
    var target = opts.target != null ? opts.target : null;
    var result = opts.result || null;
    var action = opts.action || null;
    var counterOf = opts.counterOf != null ? opts.counterOf : null;
    var replyTo = opts.replyTo != null ? opts.replyTo : (counterOf != null ? counterOf : replyTarget(state, p));
    if (replyTo === p.id) replyTo = null;
    var tags = [];
    var evidenceChips = [];
    var tg = short(state, target);
    var nm = named(state, target);
    var isWolf = result === 'wolf';
    var res = isWolf ? '是狼' : '是好人';
    var resShort = isWolf ? '查杀' : '金水';
    var co = counterOf != null ? short(state, counterOf) : '';

    function build() {
      var text = '';
      if (role === 'seer') {
        if (counterOf != null) {
          text = pickFresh(p, 'claim:seer:counter', [
            '我不认' + co + '这个预言家。我才是，昨晚验的' + tg + '，' + res + '。',
            co + '这个预言家我不接。我验的' + nm + '，' + resShort + '。',
            '他先跳不代表他是真的，我验的' + tg + '，' + res + '。他敢不敢跟我对验人顺序。',
            '两个预言家，那我说我的：' + nm + '，' + resShort + '，今天先让他把顺序说全。',
            '我才是预言家。' + co + '那个身份是抢的，' + tg + '，' + resShort + '。',
            '我不跟他绕，' + nm + '，' + resShort + '。他要是真的，就让他把第一晚验谁说出来。'
          ]);
        } else {
          text = pickFresh(p, 'claim:seer', [
            '我跳预言家。昨晚验的' + tg + '，' + res + '。',
            '我是预言家，' + nm + '是' + resShort + '。',
            '我报个验人，' + tg + '，' + resShort + '。',
            '预言家，第一晚验的' + nm + '，' + resShort + '。我把信息先摆出来。',
            '我不藏了，预言家，' + tg + '，' + resShort + '。你们先按这个盘。',
            '身份牌摊开：预言家。' + nm + '是我验的，' + resShort + '。',
            '先说身份，我是预言家。' + tg + '，' + resShort + '，这条线你们记住。',
            '我不绕，预言家。' + nm + '，' + resShort + '，今晚我还会验。'
          ]);
        }
        if (charCount(text) < 22 || rand() < 0.62) {
          text += ' ' + (isWolf
            ? pickFresh(p, 'claim:seer:plan:wolf', [
              '今天归票' + tg + '。',
              '今天出他，别分票。',
              '今天这票必须落' + tg + '。',
              '票别散，我先落' + tg + '。'
            ])
            : pickFresh(p, 'claim:seer:plan:good', [
              tg + '是金水，今天别动他。',
              '金水先放着，今天去找狼。',
              tg + '我保了，今天别把票扔过去。'
            ]));
        }
      } else if (role === 'witch') {
        if (target != null && action === 'poison') {
          text = pickFresh(p, 'claim:witch:poison', [
            '我跳女巫。昨晚我毒的是' + tg + '，这个毒我认。',
            '女巫。昨晚毒药给了' + nm + '，这手我认。',
            '我是女巫，昨晚毒' + tg + '，毒错了我认账。',
            '不藏了，女巫。昨晚我下毒，毒的是' + nm + '。',
            '女巫牌在我这。昨晚毒的是' + tg + '，后果我担。'
          ]);
        } else if (target != null && action === 'save') {
          text = pickFresh(p, 'claim:witch:save', [
            '我跳女巫。昨晚我救的是' + tg + '，不想看关键位被刀。',
            '女巫。昨晚解药用在' + nm + '身上。',
            '我是女巫，昨晚救的' + tg + '，刀口我记着。',
            '不瞒了，女巫，昨晚我把人从刀口拉回来了，' + tg + '。',
            '女巫牌，昨晚救的是' + nm + '，这个我不藏。'
          ]);
        } else if (target != null) {
          text = pickFresh(p, 'claim:witch:act', [
            '我跳女巫。昨晚我动的是' + tg + '，这个我认。',
            '我是女巫，昨晚药用在' + nm + '身上。',
            '我不藏了，女巫，昨晚动的是' + tg + '。',
            '女巫，报个药：昨晚我动的是' + nm + '，剩下的你们自己算。'
          ]);
        } else {
          text = pickFresh(p, 'claim:witch:idle', [
            '我跳女巫。药还在我手里，今天听你们的。',
            '女巫，昨晚我没动药，今天想听个方向。',
            '我是女巫，药还在，但我不想随便交出去。',
            '女巫牌，双药未动，今天谁给我个准信。',
            '我认女巫，药还没出手，先听一圈再说。'
          ]);
        }
      } else if (role === 'hunter') {
        text = pickFresh(p, 'claim:hunter', [
          '我跳猎人。出我可以，但我走之前会带一个。',
          '我是猎人。今天别把我当软柿子，枪还在。',
          '我认猎人，谁要冲我，先想清楚明天谁陪我走。',
          '猎人牌在我这，你们要拿我试刀，我不会空手走。',
          '别急着投我，猎人，枪口我会自己选。',
          '我摊牌，猎人。今天出我，明天就得有人陪。'
        ]);
      } else {
        text = pickFresh(p, 'claim:villager', [
          '我没有夜间信息，就是普通村民。',
          '我跳村民。今天只能靠听和票型。',
          '我没什么身份可跳，村民一个。',
          '村民，没信息，但我票不会乱给。',
          '我一张白牌，能给的只有我的判断。',
          '普通村民，别指望我有验人，但我有耳朵。',
          '我是村民，身份不硬，话我还是要说。'
        ]);
      }
      return fitText(state, p, 'claim', counterOf != null ? counterOf : target, text);
    }

    // 跳身份最容易被说成模板，抽三次挑最不撞车的。
    var finalText = '';
    for (var attempt = 0; attempt < 3; attempt++) {
      var candidate = build();
      if (!finalText || scoreText(state, candidate, BUDGET.claim) > scoreText(state, finalText, BUDGET.claim)) {
        finalText = candidate;
      }
      if (scoreText(state, candidate, BUDGET.claim) >= 6) break;
    }

    if (role === 'seer') {
      if (counterOf != null) tags.push({ label: '对跳预言家', kind: 'counter' });
      if (isWolf) {
        tags.push({ label: '查杀 ' + tg, kind: 'wolf' });
        evidenceChips.push({ label: '查杀', kind: 'wolf' });
      } else {
        tags.push({ label: '金水 ' + tg, kind: 'good' });
        evidenceChips.push({ label: '金水', kind: 'good' });
      }
    } else if (role === 'witch') {
      tags.push({ label: '跳女巫', kind: 'claim' });
    } else if (role === 'hunter') {
      tags.push({ label: '跳猎人', kind: 'claim' });
    } else {
      tags.push({ label: '跳村民', kind: 'claim' });
    }
    if (counterOf != null) tags.unshift({ label: '对跳', kind: 'counter' });

    finalText = remember(state, finalText);
    noteRecent(finalText);
    return {
      speaker: p.id,
      kind: counterOf != null ? 'counter' : 'claim',
      target: counterOf != null ? counterOf : null,
      reason: 'claim',
      role: role,
      check: role === 'seer' ? { target: target, result: result } : null,
      text: finalText,
      tags: tags,
      replyTo: replyTo,
      topic: counterOf != null ? '预言家对跳' : E.roleInfo(role).name,
      confidence: 0.92,
      evidence: evidenceChips
    };
  }

  function rebut(state, p, accuserId) {
    var accuser = E.player(state, accuserId);
    if (!accuser) return make(state, p, { kind: 'pass' });

    var facts = evidenceFacts(state, accuser.id);
    var read = phraseEvidence(state, p, facts.reason, facts.facts);
    var head = pickFresh(p, 'rebut:head', [
      '你点我，我接着。',
      '行，票冲我来了，我先把话说明白。',
      '你说我是狼，那你得说清我哪一步像。',
      '这帽子我不躲，但你也别点完就过。',
      '我本来不想今天跟你掰扯，既然你点了，那就说清楚。'
    ]);
    var tail = pickFresh(p, 'rebut:tail', [
      '我反倒觉得你比我急。',
      '你今天盯我，我明天盯你。',
      '我这票本来没想给你，现在可以考虑了。',
      '你点我之前，先把自己那一票解释掉。',
      '我说完了，信不信你们自己判断。'
    ]);

    // 先把话说满，再收尾；补的那句要落在结论前面。
    var body = fitText(state, p, 'rebut', accuserId, head + read);
    var text = trimToMax(sentence(body + tail), BUDGET.rebut.max);
    text = remember(state, text);
    noteRecent(text);
    return {
      speaker: p.id,
      kind: 'accuse',
      target: accuserId,
      reason: facts.reason || 'intuition',
      role: null,
      check: null,
      text: text,
      tags: [
        { label: '反击 ' + short(state, accuserId), kind: 'accuse' },
        { label: '自证', kind: 'reason' }
      ],
      replyTo: accuserId,
      topic: '回应 ' + short(state, accuserId),
      confidence: confidence(state, p, accuserId, 'accuse'),
      evidence: chips(facts.chips)
    };
  }

  function question(state, p, target, about) {
    var t = E.player(state, target);
    if (!t) return make(state, p, { kind: 'pass' });
    var tg = short(state, t.id);
    var topic = about;
    if (!topic) {
      if (t.claim && t.claim.role === 'seer') topic = '你的验人顺序';
      else {
        var last = speechOf(state, t.id);
        if (last && last.kind === 'accuse' && last.target != null) topic = '你点' + short(state, last.target) + '的依据';
        else if (last && last.kind === 'defend' && last.target != null) topic = '你保' + short(state, last.target) + '的理由';
        else if (last && last.kind === 'pass') topic = '你这轮为什么过';
        else topic = '你刚才那句判断';
      }
    }
    var text = pickFresh(p, 'question', [
      tg + '，' + topic + '，能再说清楚点吗？',
      '我想问' + tg + '一句：' + topic + '，能展开说说吗？',
      tg + '，先别急着过，' + topic + '说完整再走。',
      tg + '，我问个具体的：' + topic + '，你当时是怎么想的？',
      '我不问别人，就问' + tg + '：' + topic + '，你能给个说法吗？',
      tg + '，' + topic + '这条你还没说清。'
    ]);
    text = fitText(state, p, 'question', t.id, text);
    text = remember(state, text);
    noteRecent(text);
    return {
      speaker: p.id,
      kind: 'question',
      target: t.id,
      reason: 'intuition',
      role: null,
      check: null,
      text: text,
      tags: [{ label: '追问 ' + tg, kind: 'question' }],
      replyTo: t.id,
      topic: '追问 ' + tg,
      confidence: 0.55,
      evidence: [{ label: '追问', kind: 'question' }]
    };
  }

  function human(state, step, lastWords) {
    var p = state.players[0];
    var opts = {
      kind: step.kind,
      target: step.target,
      reason: step.reason || 'intuition',
      role: step.role || null,
      check: step.role === 'seer' ? { target: step.target, result: step.result } : null,
      lastWords: !!lastWords
    };
    if (step.kind === 'claim') {
      var c = claim(state, p, {
        role: step.role,
        target: step.target,
        result: step.result,
        counterOf: null
      });
      if (lastWords) c.text = '我出局了，最后说一句。' + c.text;
      c.lastWords = !!lastWords;
      return c;
    }
    var speech = make(state, p, opts);
    if (lastWords) speech.text = '我出局了，最后说一句。' + speech.text;
    speech.lastWords = !!lastWords;
    return speech;
  }

  root.WW_SPEECH = {
    init: init,
    latestSpeech: latestSpeech,
    replyTarget: replyTarget,
    currentTopic: currentTopic,
    evidence: evidence,
    defendEvidence: defendEvidence,
    claim: claim,
    rebut: rebut,
    question: question,
    make: make,
    human: human,
    confidence: confidence
  };
})(typeof window !== 'undefined' ? window : globalThis);
