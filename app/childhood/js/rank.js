/* GameBox · 棋力段位（五子棋 / 中国象棋试点）
 * 只统计人机对战；按 AI 难度用 Elo 计算棋力，黄金以上需要赢下晋级赛。
 * 数据存 localStorage，游戏 iframe 与首页共用同一份。
 */
(function () {
  "use strict";

  var KEY = "gamebox_rank_v1";
  var VERSION = 1;
  var DAILY_GAIN_CAP = 150;
  var DAILY_LOSS_CAP = 100;
  var AI_RATING = { easy: 800, normal: 1100, hard: 1400, master: 1700, grandmaster: 2100 };
  var AI_LABEL = { easy: "简单", normal: "普通", hard: "困难", master: "大师", grandmaster: "宗师" };

  var TIERS = [
    { name: "木牌", floor: 0, color: "#b08a62" },
    { name: "青铜", floor: 900, color: "#c98b5a" },
    { name: "白银", floor: 1100, color: "#b9c6d6" },
    { name: "黄金", floor: 1300, color: "#ffc857" },
    { name: "铂金", floor: 1500, color: "#7fe3d4" },
    { name: "钻石", floor: 1700, color: "#8fc6ff" },
    { name: "大师", floor: 1900, color: "#ff9f43" },
    { name: "宗师", floor: 2100, color: "#ff6b6b" }
  ];

  var GAMES = {
    gomoku: {
      name: "五子棋",
      icon: "⚫",
      titles: ["连珠新手", "连珠学徒", "连珠棋手", "连珠好手", "连珠强手", "连珠高手", "连珠国手", "连珠宗师"],
      achievements: [
        { id: "first_win", name: "初战告捷", desc: "赢下第一局", test: function (s) { return s.wins >= 1; } },
        { id: "ten_wins", name: "十局老手", desc: "累计赢下 10 局", test: function (s) { return s.wins >= 10; } },
        { id: "streak3", name: "三连捷", desc: "取得 3 连胜", test: function (s) { return s.bestStreak >= 3; } },
        { id: "hundred", name: "百战连珠", desc: "完成 100 局人机对战", test: function (s) { return s.games >= 100; } },
        { id: "legend", name: "连珠传说", desc: "达到宗师段位", test: function (s) { return s.rating >= 2100; } }
      ]
    },
    "chinese-chess": {
      name: "中国象棋",
      icon: "車",
      titles: ["弈林新手", "弈林学徒", "弈林棋手", "弈林好手", "弈林强手", "弈林高手", "弈林国手", "弈林宗师"],
      achievements: [
        { id: "first_win", name: "旗开得胜", desc: "赢下第一局", test: function (s) { return s.wins >= 1; } },
        { id: "ten_wins", name: "十局老手", desc: "累计赢下 10 局", test: function (s) { return s.wins >= 10; } },
        { id: "streak3", name: "三连捷", desc: "取得 3 连胜", test: function (s) { return s.bestStreak >= 3; } },
        { id: "hundred", name: "百战弈林", desc: "完成 100 局人机对战", test: function (s) { return s.games >= 100; } },
        { id: "legend", name: "弈林传说", desc: "达到宗师段位", test: function (s) { return s.rating >= 2100; } }
      ]
    }
  };

  var state = load();
  var modal = null;
  var keyHandler = null;

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function blank() {
    return {
      rating: 1000,
      peak: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      games: 0,
      streak: 0,
      bestStreak: 0,
      results: [],
      titles: [],
      pending: false,
      gmWins: 0,
      challengeWins: 0,
      promotionWins: 0,
      daily: { date: todayKey(), gain: 0, loss: 0 }
    };
  }

  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalize(raw) {
    var base = blank();
    if (!raw || typeof raw !== "object") return base;
    base.rating = Math.max(0, Math.min(2600, num(raw.rating, 1000)));
    base.peak = Math.max(base.rating, Math.min(2600, num(raw.peak, base.rating)));
    base.wins = Math.max(0, num(raw.wins, 0));
    base.losses = Math.max(0, num(raw.losses, 0));
    base.draws = Math.max(0, num(raw.draws, 0));
    base.games = Math.max(base.wins + base.losses + base.draws, num(raw.games, 0));
    base.streak = Math.max(0, num(raw.streak, 0));
    base.bestStreak = Math.max(base.streak, num(raw.bestStreak, 0));
    base.pending = !!raw.pending;
    base.gmWins = Math.max(0, num(raw.gmWins, 0));
    base.challengeWins = Math.max(0, num(raw.challengeWins, 0));
    base.promotionWins = Math.max(0, num(raw.promotionWins, 0));
    if (Array.isArray(raw.results)) {
      base.results = raw.results
        .filter(function (item) {
          return item && (item.r === "W" || item.r === "L" || item.r === "D");
        })
        .slice(0, 30);
    }
    if (Array.isArray(raw.titles)) {
      base.titles = raw.titles.filter(function (id) { return typeof id === "string"; });
    }
    if (raw.daily && typeof raw.daily === "object") {
      base.daily = {
        date: typeof raw.daily.date === "string" ? raw.daily.date : todayKey(),
        gain: Math.max(0, num(raw.daily.gain, 0)),
        loss: Math.max(0, num(raw.daily.loss, 0))
      };
    }
    return base;
  }

  function load() {
    var raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {}
    var out = { v: VERSION, games: {} };
    if (raw && raw.games) {
      Object.keys(GAMES).forEach(function (id) {
        out.games[id] = normalize(raw.games[id]);
      });
    } else {
      Object.keys(GAMES).forEach(function (id) {
        out.games[id] = blank();
      });
    }
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function ensureDaily(s) {
    var today = todayKey();
    if (!s.daily || s.daily.date !== today) {
      s.daily = { date: today, gain: 0, loss: 0 };
    }
  }

  function tierIndex(rating) {
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (rating >= TIERS[i].floor) return i;
    }
    return 0;
  }

  function starsText(stars) {
    return "★★★".slice(0, stars) + "☆☆☆".slice(0, 3 - stars);
  }

  function tierInfo(rating) {
    var index = tierIndex(rating);
    var tier = TIERS[index];
    var next = index + 1 < TIERS.length ? TIERS[index + 1].floor : tier.floor + 200;
    var span = Math.max(1, next - tier.floor);
    var pct = Math.max(0, Math.min(99, Math.round((rating - tier.floor) / span * 100)));
    var stars = Math.max(1, Math.min(3, Math.ceil(pct / 33.34)));
    return {
      index: index,
      name: tier.name,
      color: tier.color,
      floor: tier.floor,
      next: next,
      nextName: index + 1 < TIERS.length ? TIERS[index + 1].name : "宗师之巅",
      pct: pct,
      stars: stars,
      starText: starsText(stars)
    };
  }

  function titleFor(cfg, info) {
    return cfg.titles[info.index] || cfg.titles[cfg.titles.length - 1];
  }

  function describe(gameId, includeUnplayed) {
    var cfg = GAMES[gameId];
    if (!cfg) return null;
    var s = state.games[gameId];
    if ((!s || !s.games) && !includeUnplayed) return null;
    if (!s) s = blank();
    var info = tierInfo(s.rating);
    return {
      gameId: gameId,
      name: cfg.name,
      icon: cfg.icon,
      tier: info.name,
      stars: info.stars,
      starText: info.starText,
      color: info.color,
      rating: s.rating,
      title: titleFor(cfg, info),
      pending: !!s.pending,
      games: s.games,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      bestStreak: s.bestStreak,
      gmWins: s.gmWins || 0,
      recommended: recommendedFromRating(s.rating),
      canChallengeGrandmaster: tierIndex(s.rating) >= 6
    };
  }

  function recommendedFromRating(rating) {
    if (rating < 900) return "easy";
    if (rating < 1300) return "normal";
    if (rating < 1700) return "hard";
    return "master";
  }

  function recommendedDifficulty(gameId) {
    var s = state.games[gameId];
    return recommendedFromRating(s ? s.rating : 1000);
  }

  function canChallengeGrandmaster(gameId) {
    var s = state.games[gameId];
    return !!s && tierIndex(s.rating) >= 6;
  }

  function kFactor(s) {
    if (s.rating >= 1900) return 16;
    return s.games < 15 ? 32 : 24;
  }

  var DIFF_ORDER = { easy: 1, normal: 2, hard: 3, master: 4, grandmaster: 5 };

  function effectiveDifficulty(start, current) {
    var first = DIFF_ORDER[start] ? start : "normal";
    var last = DIFF_ORDER[current] ? current : "normal";
    return DIFF_ORDER[last] < DIFF_ORDER[first] ? last : first;
  }

  function checkAchievements(s, cfg) {
    var gained = [];
    cfg.achievements.forEach(function (a) {
      if (s.titles.indexOf(a.id) >= 0) return;
      if (a.test(s)) {
        s.titles.push(a.id);
        gained.push(a.name);
      }
    });
    return gained;
  }

  function record(gameId, info) {
    var cfg = GAMES[gameId];
    if (!cfg || !info || info.mode !== "pve") return null;
    var s = state.games[gameId] || (state.games[gameId] = blank());
    ensureDaily(s);

    var result = info.result === "win" || info.result === "loss" || info.result === "draw" ? info.result : null;
    if (!result) return null;
    var difficulty = AI_RATING[info.difficulty] ? info.difficulty : "normal";
    var before = s.rating;
    var ai = AI_RATING[difficulty];
    var baseline = recommendedFromRating(before);
    var gap = Math.max(0, (DIFF_ORDER[difficulty] || 2) - (DIFF_ORDER[baseline] || 2));
    var challenge = gap > 0;
    var challengeMultiplier = 1;
    if (challenge && result === "win") {
      challengeMultiplier = [1, 1.5, 1.75, 2][Math.min(gap, 3)] || 2;
    } else if (challenge && result === "loss") {
      challengeMultiplier = [1, 1.25, 1.4, 1.5][Math.min(gap, 3)] || 1.5;
    }

    var expected = 1 / (1 + Math.pow(10, (ai - before) / 400));
    var score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
    var delta = Math.round(kFactor(s) * (score - expected));
    var baseDelta = delta;

    // 刷低难度 AI 的收益很低，但胜场照常记录
    if (result === "win" && ai <= before - 250) {
      delta = Math.round(delta * 0.25);
    }
    if (challengeMultiplier > 1) {
      delta =
        delta < 0
          ? -Math.round(Math.abs(delta) * challengeMultiplier)
          : Math.round(delta * challengeMultiplier);
    }
    var capped = false;
    if (delta > 0) {
      var gainRoom = Math.max(0, DAILY_GAIN_CAP - s.daily.gain);
      if (delta > gainRoom) { delta = gainRoom; capped = true; }
    } else if (delta < 0) {
      var lossRoom = Math.max(0, DAILY_LOSS_CAP - s.daily.loss);
      if (-delta > lossRoom) { delta = -lossRoom; capped = true; }
    }

    var oldTier = tierIndex(before);
    var rating = before + delta;
    var promoted = false;
    var promotionReady = false;
    var promotionDenied = false;
    var promotionWon = false;
    var demoted = false;

    if (s.pending && oldTier >= TIERS.length - 1) s.pending = false;

    if (s.pending) {
      if (result === "win" && difficulty !== "easy") {
        var targetTier = Math.min(TIERS.length - 1, oldTier + 1);
        rating = TIERS[targetTier].floor + 10;
        promoted = true;
        promotionWon = true;
        s.pending = false;
      } else {
        if (result === "win") promotionDenied = true;
        else s.pending = false;
        rating = Math.min(rating, TIERS[oldTier + 1].floor - 1);
      }
    } else {
      var rawTier = tierIndex(rating);
      if (rawTier > oldTier) {
        if (oldTier >= 3) {
          rating = TIERS[oldTier + 1].floor - 1;
          s.pending = true;
          promotionReady = true;
        } else {
          promoted = true;
        }
      }
    }

    // 黄金以下不降段，只掉星
    var afterTier = tierIndex(rating);
    if (afterTier < oldTier && oldTier < 3) {
      rating = Math.max(TIERS[oldTier].floor, rating);
    } else if (afterTier < oldTier) {
      demoted = true;
    }

    s.rating = Math.max(0, Math.min(2600, rating));
    delta = s.rating - before;
    if (delta > 0) s.daily.gain += delta;
    else if (delta < 0) s.daily.loss += -delta;

    s.games += 1;
    if (result === "win") {
      s.wins += 1;
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      if (difficulty === "grandmaster") s.gmWins = (s.gmWins || 0) + 1;
      if (challenge) s.challengeWins = (s.challengeWins || 0) + 1;
      if (promotionWon) s.promotionWins = (s.promotionWins || 0) + 1;
    } else if (result === "loss") {
      s.losses += 1;
      s.streak = 0;
    } else {
      s.draws += 1;
      s.streak = 0;
    }
    s.peak = Math.max(s.peak, s.rating);
    s.results.unshift({
      r: result === "win" ? "W" : result === "loss" ? "L" : "D",
      d: delta,
      diff: difficulty,
      t: Date.now()
    });
    s.results = s.results.slice(0, 30);

    var newTitles = checkAchievements(s, cfg);
    save();

    var info2 = tierInfo(s.rating);
    var out = {
      gameId: gameId,
      name: cfg.name,
      icon: cfg.icon,
      result: result,
      difficulty: difficulty,
      difficultyLabel: AI_LABEL[difficulty],
      before: before,
      after: s.rating,
      delta: delta,
      baseDelta: baseDelta,
      tier: info2.name,
      stars: info2.stars,
      starText: info2.starText,
      color: info2.color,
      title: titleFor(cfg, info2),
      pct: info2.pct,
      next: info2.next,
      nextName: info2.nextName,
      baseline: baseline,
      baselineLabel: AI_LABEL[baseline],
      challenge: challenge,
      gap: gap,
      challengeMultiplier: challengeMultiplier,
      capped: capped,
      promoted: promoted,
      promotionReady: promotionReady,
      promotionDenied: promotionDenied,
      promotionWon: promotionWon,
      demoted: demoted,
      pending: !!s.pending,
      games: s.games,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      streak: s.streak,
      bestStreak: s.bestStreak,
      gmWins: s.gmWins || 0,
      newTitles: newTitles,
      vouchersEarned: 0,
      voucherTotal: 0,
      skinsUnlocked: []
    };
    if (window.GameSkins && typeof window.GameSkins.onRankResult === "function") {
      var reward = window.GameSkins.onRankResult(out);
      if (reward) {
        out.vouchersEarned = reward.earned || 0;
        out.voucherTotal = reward.total || 0;
        out.skinsUnlocked = reward.newUnlocks || [];
      }
    }
    return out;
  }

  // ───────────────────────── 展示 ─────────────────────────

  var CSS = [
    ".gr-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,8,14,.74);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:'PingFang SC','HarmonyOS Sans SC','Microsoft YaHei',system-ui,sans-serif}",
    ".gr-overlay[hidden]{display:none}",
    ".gr-modal{position:relative;width:min(520px,94vw);max-height:88vh;overflow:auto;padding:22px;border-radius:22px;border:1px solid rgba(255,200,87,.28);background:radial-gradient(600px 260px at 18% 0%,rgba(255,159,67,.12),transparent 70%),linear-gradient(160deg,rgba(30,45,70,.98),rgba(9,15,25,.99));box-shadow:0 30px 80px rgba(0,0,0,.62);color:#f4f1e8}",
    ".gr-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#e9eef7;font:inherit;font-size:18px;line-height:1;cursor:pointer;z-index:2}",
    ".gr-close:hover{background:rgba(255,255,255,.16)}",
    ".gr-kicker{color:#8fa1b9;font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase}",
    ".gr-head{display:flex;align-items:center;gap:14px;margin-top:12px}",
    ".gr-emblem{flex:0 0 auto;width:56px;height:56px;border-radius:18px;display:grid;place-items:center;font-size:26px;border:1px solid rgba(255,200,87,.3);background:rgba(255,200,87,.08);border:1px solid color-mix(in srgb,var(--gr-color) 55%,transparent);background:color-mix(in srgb,var(--gr-color) 16%,transparent)}",
    ".gr-tier-big{font-size:25px;font-weight:900;letter-spacing:2px}",
    ".gr-tier-big span{font-size:14px;letter-spacing:2px;color:#ffd88f;margin-left:6px}",
    ".gr-title-pill{display:inline-block;margin-top:4px;padding:2px 9px;border-radius:999px;border:1px solid rgba(255,200,87,.32);background:rgba(255,200,87,.09);color:#ffe1a0;font-size:11px;font-weight:700}",
    ".gr-progress{height:7px;margin-top:16px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}",
    ".gr-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ffc857,#ff9f43)}",
    ".gr-progress-text{margin-top:6px;color:#93a2b8;font-size:11px;line-height:1.5}",
    ".gr-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px}",
    ".gr-stat{padding:9px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04)}",
    ".gr-stat span{display:block;color:#8fa1b9;font-size:10px}",
    ".gr-stat strong{display:block;margin-top:3px;font-size:15px;font-variant-numeric:tabular-nums}",
    ".gr-section-title{margin:16px 0 7px;color:#c7d2e2;font-size:11.5px;font-weight:800;letter-spacing:1px}",
    ".gr-form{display:flex;gap:5px;flex-wrap:wrap}",
    ".gr-dot{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:900;color:#08111c}",
    ".gr-dot.W{background:#63d69a}.gr-dot.L{background:#ff8a8a}.gr-dot.D{background:#9fb0c6}",
    ".gr-dot.empty{background:rgba(255,255,255,.08);color:#63738a}",
    ".gr-titles{display:grid;gap:6px}",
    ".gr-title-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}",
    ".gr-title-row.locked{opacity:.5}",
    ".gr-title-row b{font-size:12px;min-width:76px}",
    ".gr-title-row small{color:#8fa1b9;font-size:10.5px}",
    ".gr-title-row em{margin-left:auto;color:#ffd88f;font-size:10px;font-style:normal;white-space:nowrap}",
    ".gr-note{margin:16px 0 0;color:#7f90a8;font-size:10.5px;line-height:1.7}",
    ".gr-badge{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding:4px 10px;border-radius:999px;border:1px solid rgba(255,200,87,.4);background:rgba(8,13,22,.82);color:#ffd88f;font:inherit;font-size:11px;font-weight:800;letter-spacing:.3px;cursor:pointer;white-space:nowrap}",
    ".gr-badge:hover{border-color:rgba(255,200,87,.7);background:rgba(255,200,87,.12)}",
    ".gr-badge.pending{border-color:rgba(255,107,107,.55);color:#ffd7d7;background:rgba(60,15,18,.85)}",
    ".gr-badge i{width:6px;height:6px;border-radius:50%;display:inline-block}",
    ".gr-result{margin:14px 0 4px;padding:12px 13px;border-radius:14px;border:1px solid rgba(255,200,87,.26);background:rgba(255,255,255,.045);text-align:left}",
    ".gr-result-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
    ".gr-result-tier{font-size:15px;font-weight:900;letter-spacing:1px}",
    ".gr-result-tier span{margin-left:4px;font-size:11px;color:#ffd88f;letter-spacing:1px}",
    ".gr-result-title{color:#c7d2e2;font-size:11px}",
    ".gr-delta{margin-left:auto;font-size:15px;font-weight:900;font-variant-numeric:tabular-nums}",
    ".gr-delta.up{color:#7be0a3}.gr-delta.down{color:#ff9b9b}.gr-delta.flat{color:#9fb0c6}",
    ".gr-result-rating{margin-top:5px;color:#93a2b8;font-size:10.5px}",
    ".gr-mini-bar{height:5px;margin-top:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}",
    ".gr-mini-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ffc857,#ff9f43)}",
    ".gr-result-note{margin-top:7px;color:#b9c6d6;font-size:10.5px;line-height:1.55}",
    ".gr-result-note.warn{color:#ffb4b4}",
    ".gr-result-note.good{color:#7be0a3}",
    ".gr-new-title{margin-top:6px;color:#ffd88f;font-size:10.5px;font-weight:700}",
    ".gr-challenge{margin-top:8px;padding:6px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#c7d2e2;font-size:10.5px;line-height:1.45}",
    ".gr-challenge.win{border-color:rgba(123,224,163,.34);background:rgba(37,96,67,.22);color:#9af0bd}",
    ".gr-challenge.loss{border-color:rgba(255,138,138,.34);background:rgba(96,29,20,.24);color:#ffb4b4}",
    ".gr-voucher-line{margin-top:6px;color:#ffd88f;font-size:10.5px;font-weight:700}",
    ".gr-unlock-line{margin-top:4px;color:#9af0bd;font-size:10.5px;font-weight:700}",
    ".gr-skin-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035)}",
    ".gr-skin-row div{min-width:0}.gr-skin-row b{display:block;font-size:11.5px;color:#f2eee6}.gr-skin-row small{display:block;margin-top:2px;color:#8fa1b9;font-size:10px}",
    ".gr-skin-btn{margin-left:auto;flex:none;padding:5px 10px;border-radius:8px;border:1px solid rgba(255,200,87,.36);background:rgba(255,200,87,.12);color:#ffe1a0;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer}",
    ".gr-skin-btn:hover{background:rgba(255,200,87,.22)}",
    ".gr-result-skin{margin-top:8px;padding:5px 10px;border-radius:8px;border:1px solid rgba(255,200,87,.32);background:rgba(255,200,87,.10);color:#ffe1a0;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer}",
    ".gr-result-skin:hover{background:rgba(255,200,87,.20)}",
    ".gr-hub-chip{position:absolute;z-index:3;display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,200,87,.35);background:rgba(8,13,22,.78);color:#ffd88f;font-size:10px;font-weight:800;letter-spacing:.2px;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);white-space:nowrap}",
    ".gr-hub-chip:hover{border-color:rgba(255,200,87,.7);background:rgba(255,200,87,.14)}",
    ".gr-hub-chip i{width:6px;height:6px;border-radius:50%;display:inline-block}",
    ".gr-hub-chip.pending{border-color:rgba(255,107,107,.55);color:#ffd7d7;background:rgba(60,15,18,.85)}",
    ".card .thumb .gr-hub-chip{left:8px;bottom:8px;top:auto;right:auto}",
    ".feature-card>.gr-hub-chip{top:12px;right:14px;left:auto;bottom:auto}",
    "@media(max-width:700px){.gr-modal{padding:18px}.gr-tier-big{font-size:21px}.gr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.gr-badge{font-size:10px;padding:3px 8px}.gr-hub-chip{font-size:9px;padding:2px 7px}}"
  ].join("");

  function ensureStyles() {
    if (document.getElementById("gr-styles")) return;
    var style = document.createElement("style");
    style.id = "gr-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function mountBadge(gameId, selector) {
    ensureStyles();
    var host = document.querySelector(selector) || document.body;
    var btn = host.querySelector('.gr-badge[data-game="' + gameId + '"]');
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gr-badge";
      btn.dataset.game = gameId;
      btn.title = "查看棋力段位";
      btn.addEventListener("click", function () { open(gameId); });
      host.appendChild(btn);
    }
    refreshBadge(gameId);
  }

  function refreshBadge(gameId) {
    var d = describe(gameId, true);
    if (!d) return;
    var nodes = document.querySelectorAll('.gr-badge[data-game="' + gameId + '"]');
    for (var i = 0; i < nodes.length; i++) {
      var btn = nodes[i];
      btn.innerHTML = '<i style="background:' + d.color + '"></i>' + d.tier + " " + d.starText + (d.pending ? " · 晋级赛" : "");
      btn.classList.toggle("pending", d.pending);
      btn.title = d.tier + " " + d.starText + " · " + d.title + " · 棋力 " + d.rating + "（点击查看）";
    }
  }

  function renderResult(result, targetSelector) {
    ensureStyles();
    var target = document.querySelector(targetSelector || "#game-over .overlay-content");
    if (!target) return;
    var old = target.querySelector(".gr-result");
    if (old) old.remove();
    if (!result) return;

    var box = document.createElement("div");
    box.className = "gr-result";
    var deltaClass = result.delta > 0 ? "up" : result.delta < 0 ? "down" : "flat";
    var deltaText = (result.delta > 0 ? "+" : "") + result.delta;
    var note = "";
    var noteClass = "";
    var challengeLine = "";
    if (result.challenge) {
      var challengeResult =
        result.result === "win" ? "越级挑战成功" : result.result === "loss" ? "越级挑战失败" : "越级挑战和棋";
      var challengeScore = result.promoted
        ? "晋级赛"
        : result.result === "draw"
          ? "积分不变"
          : "积分 ×" + result.challengeMultiplier;
      challengeLine =
        '<div class="gr-challenge ' + (result.result === "win" ? "win" : result.result === "loss" ? "loss" : "") + '">' +
          challengeResult + " · 高 " + result.gap + " 档 · " + challengeScore +
          (result.capped ? " · 已触及每日上限" : "") +
        "</div>";
    }
    if (result.promoted) {
      note = "晋级成功！" + result.tier + " · " + result.title;
      noteClass = "good";
    } else if (result.promotionReady) {
      note = "晋级赛就绪：下一局获胜升入 " + result.nextName;
    } else if (result.pending) {
      note = result.promotionDenied
        ? "本局难度为" + result.difficultyLabel + "，晋级赛需要在普通及以上难度获胜。"
        : "晋级赛：赢下下一局升入 " + result.nextName + "（普通及以上难度）";
      if (result.promotionDenied) noteClass = "warn";
    } else if (result.demoted) {
      note = "段位下降至 " + result.tier + "，下一局打回来。";
      noteClass = "warn";
    } else if (result.tier === "宗师") {
      note = "已达最高段位，继续刷新你的棋力纪录。";
    } else {
      note = "距 " + result.nextName + " 还差 " + Math.max(0, result.next - result.after) + " 分。";
    }

    box.innerHTML =
      '<div class="gr-result-top">' +
        '<span class="gr-result-tier">' + result.tier + '<span>' + result.starText + "</span></span>" +
        '<span class="gr-result-title">' + result.title + "</span>" +
        '<span class="gr-delta ' + deltaClass + '">' + deltaText + "</span>" +
      "</div>" +
      '<div class="gr-result-rating">棋力 ' + result.before + " → " + result.after +
        " · 对手 " + result.difficultyLabel + "（" + AI_RATING[result.difficulty] + "）" +
        " · 推荐 " + result.baselineLabel + "</div>" +
      '<div class="gr-mini-bar"><i style="width:' + result.pct + '%"></i></div>' +
      challengeLine +
      '<div class="gr-result-note ' + noteClass + '">' + note + "</div>" +
      (result.newTitles.length ? '<div class="gr-new-title">解锁称号：' + result.newTitles.join("、") + "</div>" : "") +
      (result.vouchersEarned ? '<div class="gr-voucher-line">皮肤券 +' + result.vouchersEarned + "（共 " + result.voucherTotal + "）</div>" : "") +
      (result.skinsUnlocked && result.skinsUnlocked.length ? '<div class="gr-unlock-line">解锁皮肤：' + result.skinsUnlocked.join("、") + "</div>" : "") +
      (window.GameSkins && (result.vouchersEarned || (result.skinsUnlocked && result.skinsUnlocked.length))
        ? '<button type="button" class="gr-result-skin">查看皮肤</button>'
        : "");

    var winnerText = target.querySelector("#winner-text");
    if (winnerText && winnerText.parentNode === target) {
      target.insertBefore(box, winnerText.nextSibling);
    } else {
      target.appendChild(box);
    }
    var skinLink = box.querySelector(".gr-result-skin");
    if (skinLink && window.GameSkins) {
      skinLink.addEventListener("click", function () {
        window.GameSkins.open({ gameId: result.gameId });
      });
    }
  }

  function open(gameId) {
    var cfg = GAMES[gameId];
    if (!cfg) return;
    ensureStyles();
    close();
    reload();
    if (window.GameSkins && typeof window.GameSkins.reload === "function") {
      window.GameSkins.reload();
    }
    var s = state.games[gameId] || blank();
    var info = tierInfo(s.rating);
    var title = titleFor(cfg, info);
    var results = s.results.slice(0, 10).reverse();
    var dots = "";
    for (var i = 0; i < 10; i++) {
      var item = results[i];
      dots += item
        ? '<span class="gr-dot ' + item.r + '" title="' + AI_LABEL[item.diff] + " · " + (item.d > 0 ? "+" : "") + item.d + '">' + (item.r === "W" ? "胜" : item.r === "L" ? "负" : "和") + "</span>"
        : '<span class="gr-dot empty">·</span>';
    }
    var winRate = s.games ? Math.round(s.wins / s.games * 100) : 0;
    var rec = recommendedFromRating(s.rating);
    var progressText;
    if (s.pending) {
      progressText = "晋级赛：下一局在普通及以上难度获胜，升入 " + info.nextName;
    } else if (info.index >= TIERS.length - 1) {
      progressText = "已达最高段位，继续刷新棋力纪录";
    } else {
      progressText = "距 " + info.nextName + " 还差 " + Math.max(0, info.next - s.rating) + " 分";
    }
    progressText += " · 推荐 AI：" + AI_LABEL[rec];
    var equippedNames = window.GameSkins ? window.GameSkins.getEquippedNames() : null;
    var skinState = window.GameSkins ? window.GameSkins.getState() : null;
    var skinRow = equippedNames
      ? '<div class="gr-section-title">棋盘与棋子</div>' +
        '<div class="gr-skin-row">' +
          '<div><b>棋盘 · ' + equippedNames.board + '</b><small>棋子 · ' + equippedNames.pieces +
            (skinState ? ' · 皮肤券 ' + skinState.vouchers : '') + '</small></div>' +
          '<button type="button" class="gr-skin-btn">管理皮肤</button>' +
        '</div>'
      : "";

    var titleRows = '<div class="gr-title-row"><b>' + title + "</b><small>当前段位称号</small><em>已获得</em></div>";
    cfg.achievements.forEach(function (a) {
      var unlocked = s.titles.indexOf(a.id) >= 0;
      titleRows +=
        '<div class="gr-title-row' + (unlocked ? "" : " locked") + '">' +
          "<b>" + a.name + "</b><small>" + a.desc + "</small>" +
          "<em>" + (unlocked ? "已获得" : "未解锁") + "</em>" +
        "</div>";
    });

    modal = document.createElement("div");
    modal.className = "gr-overlay";
    modal.innerHTML =
      '<div class="gr-modal" role="dialog" aria-modal="true" aria-label="' + cfg.name + '棋力段位">' +
        '<button type="button" class="gr-close" aria-label="关闭">×</button>' +
        '<div class="gr-kicker">' + cfg.name + " · 棋力段位</div>" +
        '<div class="gr-head">' +
          '<div class="gr-emblem" style="--gr-color:' + info.color + '">' + cfg.icon + "</div>" +
          "<div><div class=\"gr-tier-big\">" + info.name + "<span>" + info.starText + "</span></div>" +
          '<div class="gr-title-pill">' + title + "</div></div>" +
        "</div>" +
        '<div class="gr-progress"><i style="width:' + info.pct + '%"></i></div>' +
        '<div class="gr-progress-text">' + progressText + "</div>" +
        '<div class="gr-stats">' +
          '<div class="gr-stat"><span>棋力</span><strong>' + s.rating + "</strong></div>" +
          '<div class="gr-stat"><span>最高棋力</span><strong>' + s.peak + "</strong></div>" +
          '<div class="gr-stat"><span>战绩</span><strong>' + s.wins + " 胜 " + s.losses + " 负 " + s.draws + " 和</strong></div>" +
          '<div class="gr-stat"><span>胜率</span><strong>' + winRate + "%</strong></div>" +
          '<div class="gr-stat"><span>当前连胜</span><strong>' + s.streak + "</strong></div>" +
          '<div class="gr-stat"><span>总对局</span><strong>' + s.games + "</strong></div>" +
        "</div>" +
        skinRow +
        '<div class="gr-section-title">最近 10 局</div><div class="gr-form">' + dots + "</div>" +
        '<div class="gr-section-title">称号</div><div class="gr-titles">' + titleRows + "</div>" +
        '<p class="gr-note">只统计人机对战。按 AI 难度计算棋力：简单 800 / 普通 1100 / 困难 1400 / 大师 1700 / 宗师 2100；赢强敌加分更多，输弱敌扣分更多。越级挑战有额外加分，也会承担更高扣分，倍率在每日 +150 / -100 上限内结算。黄金以上需要赢下晋级赛才能升段；黄金以下不降段。</p>' +
      "</div>";
    document.body.appendChild(modal);

    modal.querySelector(".gr-close").addEventListener("click", close);
    var skinBtn = modal.querySelector(".gr-skin-btn");
    if (skinBtn && window.GameSkins) {
      skinBtn.addEventListener("click", function () {
        window.GameSkins.open({ gameId: gameId });
      });
    }
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
    keyHandler = function (e) {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", keyHandler);
  }

  function close() {
    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    modal = null;
  }

  function isPromotionPending(gameId) {
    return !!(state.games[gameId] && state.games[gameId].pending);
  }

  function getState(gameId) {
    return state.games[gameId] ? JSON.parse(JSON.stringify(state.games[gameId])) : null;
  }

  function reload() {
    state = load();
  }

  ensureStyles();

  window.GameRank = {
    hasGame: function (gameId) { return !!GAMES[gameId]; },
    record: record,
    describe: describe,
    mountBadge: mountBadge,
    refreshBadge: refreshBadge,
    renderResult: renderResult,
    open: open,
    close: close,
    isPromotionPending: isPromotionPending,
    getState: getState,
    reload: reload,
    effectiveDifficulty: effectiveDifficulty,
    recommendedDifficulty: recommendedDifficulty,
    recommendedFromRating: recommendedFromRating,
    canChallengeGrandmaster: canChallengeGrandmaster,
    tiers: TIERS,
    aiRating: AI_RATING,
    aiLabel: AI_LABEL
  };
})();
