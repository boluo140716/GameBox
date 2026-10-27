/* GameBox · 棋盘/棋子皮肤
 * 棋盘和棋子是两个独立栏位；三套高级皮肤通过段位+挑战解锁，
 * 异色变体用皮肤券购买。所有状态存 localStorage，不接入盒豆。
 */
(function () {
  "use strict";

  var KEY = "gamebox_board_skins_v1";
  var VERSION = 1;
  var PART_PRICE = 20;
  var SET_PRICE = 35;
  var GAME_IDS = ["gomoku", "chinese-chess"];

  var SETS = {
    wood: {
      id: "wood",
      name: "经典木纹",
      type: "default",
      board: "wood",
      pieces: "classic",
      order: 0,
      desc: "基础木纹棋盘与经典黑白棋子，重新绘制并锐化边缘。",
      boardName: "经典木纹",
      pieceName: "经典黑白",
      boardPalette: {
        style: "wood",
        surfaceA: "#e8c98e",
        surfaceB: "#d8ad6a",
        surfaceC: "#c9974f",
        edge: "#8a5a27",
        grid: "#5a3b20",
        star: "#5a3b20",
        frame: "#7a4a1d",
        river: "rgba(90, 59, 32, .72)",
        riverText: "#5a3b20",
        texture: "rgba(122, 74, 22, .10)",
        glow: "rgba(255, 255, 255, .16)",
        shadow: "rgba(0, 0, 0, .28)",
        win: "#c62828"
      },
      pieceStyle: {
        stone: {
          blackA: "#50555b",
          blackB: "#171a1e",
          blackRim: "rgba(0, 0, 0, .62)",
          whiteA: "#fffdf7",
          whiteB: "#d8d2c5",
          whiteRim: "rgba(120, 110, 95, .45)",
          highlight: "rgba(255, 255, 255, .58)",
          shadow: "rgba(0, 0, 0, .30)",
          glow: "transparent",
          last: "#c62828"
        },
        chess: {
          faceA: "#f7e8c6",
          faceB: "#d8bf92",
          rim: "#6b4423",
          innerRim: "rgba(107, 68, 35, .50)",
          red: "#b53a2f",
          black: "#2a2722",
          shadow: "rgba(0, 0, 0, .30)",
          glow: "transparent",
          font: '"KaiTi", "楷体", "STKaiti", serif',
          textShadow: "rgba(0, 0, 0, .20)"
        }
      }
    },
    celadon: {
      id: "celadon",
      name: "青瓷宋韵",
      type: "base",
      board: "celadon",
      pieces: "celadon",
      order: 10,
      desc: "青瓷底、松烟线、哑光棋子。安静耐看，适合长期使用。",
      unlock: { tier: "黄金", wins: 10 },
      unlockText: "黄金段位 + 10 场人机胜",
      boardPalette: {
        style: "celadon",
        surfaceA: "#e8f2eb",
        surfaceB: "#c9ddd3",
        surfaceC: "#b9d0c5",
        edge: "#8fae9e",
        grid: "rgba(47, 93, 80, .72)",
        star: "rgba(47, 93, 80, .90)",
        frame: "#7e9f8f",
        river: "rgba(47, 93, 80, .62)",
        riverText: "#2f5d50",
        texture: "rgba(47, 93, 80, .055)",
        glow: "rgba(79, 143, 120, .18)",
        shadow: "rgba(0, 0, 0, .22)",
        win: "#a84535"
      },
      pieceStyle: {
        stone: {
          blackA: "#3e5852",
          blackB: "#142522",
          blackRim: "rgba(8, 20, 17, .65)",
          whiteA: "#fffdf6",
          whiteB: "#d9d1bf",
          whiteRim: "rgba(101, 122, 108, .45)",
          highlight: "rgba(255, 255, 255, .50)",
          shadow: "rgba(0, 0, 0, .22)",
          glow: "transparent",
          last: "#a84535"
        },
        chess: {
          faceA: "#fbf6ea",
          faceB: "#d9cbb2",
          rim: "#8ba896",
          innerRim: "rgba(47, 93, 80, .35)",
          red: "#a84535",
          black: "#243b35",
          shadow: "rgba(0, 0, 0, .22)",
          glow: "transparent",
          font: '"Songti SC", "STSong", "KaiTi", serif',
          textShadow: "rgba(0, 0, 0, .12)"
        }
      }
    },
    paper: {
      id: "paper",
      name: "宣纸朱砂",
      type: "base",
      board: "paper",
      pieces: "paper",
      order: 20,
      desc: "宣纸底、墨线、朱砂色。保留国风气质，但更克制现代。",
      unlock: { tier: "铂金", streak: 3 },
      unlockText: "铂金段位 + 一次 3 连胜",
      boardPalette: {
        style: "paper",
        surfaceA: "#f7eedc",
        surfaceB: "#e7d7ba",
        surfaceC: "#dcc9a8",
        edge: "#9a7951",
        grid: "rgba(58, 49, 40, .72)",
        star: "rgba(58, 49, 40, .88)",
        frame: "#8c6a45",
        river: "rgba(98, 74, 48, .68)",
        riverText: "#5e4a30",
        texture: "rgba(90, 65, 35, .06)",
        glow: "rgba(178, 58, 46, .10)",
        shadow: "rgba(0, 0, 0, .22)",
        win: "#b23a2e"
      },
      pieceStyle: {
        stone: {
          blackA: "#4a4239",
          blackB: "#17130f",
          blackRim: "rgba(20, 15, 10, .55)",
          whiteA: "#fffdf6",
          whiteB: "#ded0b7",
          whiteRim: "rgba(120, 91, 58, .42)",
          highlight: "rgba(255, 255, 255, .55)",
          shadow: "rgba(45, 30, 15, .20)",
          glow: "transparent",
          last: "#b23a2e"
        },
        chess: {
          faceA: "#fbf4e4",
          faceB: "#e0d1b8",
          rim: "#b08a5c",
          innerRim: "rgba(178, 58, 46, .28)",
          red: "#b23a2e",
          black: "#2b2723",
          shadow: "rgba(45, 30, 15, .20)",
          glow: "transparent",
          font: '"KaiTi", "STKaiti", serif',
          textShadow: "rgba(0, 0, 0, .10)"
        }
      }
    },
    obsidian: {
      id: "obsidian",
      name: "曜石霓虹",
      type: "base",
      board: "obsidian",
      pieces: "obsidian",
      order: 30,
      desc: "黑曜石底、青色刻线、玻璃棋子。高段位挑战奖励。",
      unlock: { tier: "钻石", gmWins: 1 },
      unlockText: "钻石段位 + 击败一次宗师 AI",
      boardPalette: {
        style: "obsidian",
        surfaceA: "#17232d",
        surfaceB: "#080c11",
        surfaceC: "#05080c",
        edge: "#2c3c46",
        grid: "rgba(94, 234, 212, .55)",
        star: "rgba(94, 234, 212, .95)",
        frame: "#2c3c46",
        river: "rgba(94, 234, 212, .72)",
        riverText: "#5eead4",
        texture: "rgba(94, 234, 212, .05)",
        glow: "rgba(94, 234, 212, .16)",
        shadow: "rgba(0, 0, 0, .50)",
        win: "#ff6b6b"
      },
      pieceStyle: {
        stone: {
          blackA: "#2a3c46",
          blackB: "#05090d",
          blackRim: "rgba(94, 234, 212, .75)",
          whiteA: "#f2fffc",
          whiteB: "#9edbd4",
          whiteRim: "rgba(94, 234, 212, .75)",
          highlight: "rgba(255, 255, 255, .62)",
          shadow: "rgba(94, 234, 212, .45)",
          glow: "rgba(94, 234, 212, .40)",
          last: "#ff6b6b"
        },
        chess: {
          faceA: "#22323c",
          faceB: "#0b141b",
          rim: "#49d6c8",
          innerRim: "rgba(94, 234, 212, .35)",
          red: "#ff6b6b",
          black: "#a5f3ff",
          shadow: "rgba(94, 234, 212, .35)",
          glow: "rgba(94, 234, 212, .28)",
          font: '"Songti SC", "STSong", "KaiTi", serif',
          textShadow: "rgba(0, 0, 0, .50)"
        }
      }
    },
    "celadon-moon": {
      id: "celadon-moon",
      name: "青瓷·月白",
      type: "variant",
      parent: "celadon",
      board: "celadon-moon",
      pieces: "celadon-moon",
      order: 11,
      desc: "更浅的月白釉色，配冷银灰棋子，适合清透的棋局。",
      boardPalette: {
        style: "celadon",
        surfaceA: "#f2f8f6",
        surfaceB: "#dbe8e4",
        surfaceC: "#c8dcd7",
        edge: "#9bb5b0",
        grid: "rgba(73, 101, 103, .68)",
        star: "rgba(73, 101, 103, .88)",
        frame: "#8fa9a8",
        river: "rgba(73, 101, 103, .62)",
        riverText: "#496567",
        texture: "rgba(73, 101, 103, .05)",
        glow: "rgba(255, 255, 255, .30)",
        shadow: "rgba(0, 0, 0, .18)",
        win: "#a84535"
      },
      pieceStyle: {
        stone: {
          blackA: "#3f5457",
          blackB: "#172224",
          blackRim: "rgba(20, 35, 37, .55)",
          whiteA: "#ffffff",
          whiteB: "#dbe6e3",
          whiteRim: "rgba(120, 150, 148, .45)",
          highlight: "rgba(255, 255, 255, .70)",
          shadow: "rgba(0, 0, 0, .18)",
          glow: "transparent",
          last: "#a84535"
        },
        chess: {
          faceA: "#fbfdfc",
          faceB: "#dbe7e3",
          rim: "#8fa9a8",
          innerRim: "rgba(73, 101, 103, .30)",
          red: "#a84535",
          black: "#2b4448",
          shadow: "rgba(0, 0, 0, .18)",
          glow: "transparent",
          font: '"Songti SC", "STSong", "KaiTi", serif',
          textShadow: "rgba(0, 0, 0, .10)"
        }
      }
    },
    "paper-ink": {
      id: "paper-ink",
      name: "宣纸·松烟",
      type: "variant",
      parent: "paper",
      board: "paper-ink",
      pieces: "paper-ink",
      order: 21,
      desc: "加深纸色与墨线，像一张被反复研墨的旧棋谱。",
      boardPalette: {
        style: "paper",
        surfaceA: "#eee3ce",
        surfaceB: "#ddceb3",
        surfaceC: "#cfbd9e",
        edge: "#8a6d4a",
        grid: "rgba(47, 42, 34, .78)",
        star: "rgba(47, 42, 34, .92)",
        frame: "#7d6342",
        river: "rgba(78, 62, 42, .72)",
        riverText: "#3d3327",
        texture: "rgba(65, 50, 30, .08)",
        glow: "rgba(178, 58, 46, .07)",
        shadow: "rgba(0, 0, 0, .24)",
        win: "#9d2f27"
      },
      pieceStyle: {
        stone: {
          blackA: "#38322a",
          blackB: "#100d0a",
          blackRim: "rgba(15, 12, 8, .60)",
          whiteA: "#f8f0df",
          whiteB: "#d1c1a6",
          whiteRim: "rgba(100, 78, 48, .45)",
          highlight: "rgba(255, 255, 255, .45)",
          shadow: "rgba(35, 25, 12, .24)",
          glow: "transparent",
          last: "#9d2f27"
        },
        chess: {
          faceA: "#f4ead6",
          faceB: "#d7c5a6",
          rim: "#94724a",
          innerRim: "rgba(157, 47, 39, .30)",
          red: "#9d2f27",
          black: "#241f19",
          shadow: "rgba(35, 25, 12, .24)",
          glow: "transparent",
          font: '"KaiTi", "STKaiti", serif',
          textShadow: "rgba(0, 0, 0, .12)"
        }
      }
    },
    "obsidian-ember": {
      id: "obsidian-ember",
      name: "曜石·赤霞",
      type: "variant",
      parent: "obsidian",
      board: "obsidian-ember",
      pieces: "obsidian-ember",
      order: 31,
      desc: "把青色霓虹换成赤霞，棋子带暖红边缘，适合更热烈的棋局。",
      boardPalette: {
        style: "obsidian",
        surfaceA: "#21151a",
        surfaceB: "#0c0709",
        surfaceC: "#070405",
        edge: "#3d252b",
        grid: "rgba(255, 138, 92, .58)",
        star: "rgba(255, 138, 92, .95)",
        frame: "#3d252b",
        river: "rgba(255, 138, 92, .70)",
        riverText: "#ffb07a",
        texture: "rgba(255, 138, 92, .05)",
        glow: "rgba(255, 107, 107, .16)",
        shadow: "rgba(0, 0, 0, .52)",
        win: "#ff6b6b"
      },
      pieceStyle: {
        stone: {
          blackA: "#3a1f24",
          blackB: "#0b0506",
          blackRim: "rgba(255, 138, 92, .75)",
          whiteA: "#fff0e8",
          whiteB: "#e2a692",
          whiteRim: "rgba(255, 138, 92, .70)",
          highlight: "rgba(255, 255, 255, .58)",
          shadow: "rgba(255, 107, 107, .35)",
          glow: "rgba(255, 107, 107, .35)",
          last: "#ff6b6b"
        },
        chess: {
          faceA: "#2a181c",
          faceB: "#0f080a",
          rim: "#ff8a5c",
          innerRim: "rgba(255, 138, 92, .35)",
          red: "#ff7b6b",
          black: "#ffd0b8",
          shadow: "rgba(255, 107, 107, .28)",
          glow: "rgba(255, 107, 107, .28)",
          font: '"Songti SC", "STSong", "KaiTi", serif',
          textShadow: "rgba(0, 0, 0, .50)"
        }
      }
    }
  };

  var BOARDS = {};
  var PIECES = {};
  Object.keys(SETS).forEach(function (id) {
    var set = SETS[id];
    BOARDS[set.board] = {
      id: set.board,
      setId: id,
      type: set.type,
      parent: set.parent || null,
      name: set.type === "default" ? set.boardName : set.name,
      setName: set.name,
      desc: set.desc,
      unlock: set.unlock,
      unlockText: set.unlockText,
      order: set.order,
      slot: "board",
      palette: set.boardPalette
    };
    PIECES[set.pieces] = {
      id: set.pieces,
      setId: id,
      type: set.type,
      parent: set.parent || null,
      name: set.type === "default" ? set.pieceName : set.name,
      setName: set.name,
      desc: set.desc,
      unlock: set.unlock,
      unlockText: set.unlockText,
      order: set.order,
      slot: "pieces",
      pieceStyle: set.pieceStyle
    };
  });

  var loadUnlocks = [];
  var state = load();
  var modal = null;
  var keyHandler = null;
  var ui = { tab: "board", gameId: "gomoku", onChange: null, toastTimer: null };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function blank() {
    return {
      v: VERSION,
      vouchers: 0,
      lifetimeVouchers: 0,
      sets: { wood: true },
      owned: {
        board: { wood: true },
        pieces: { classic: true }
      },
      equipped: { board: "wood", pieces: "classic" },
      lastReward: null
    };
  }

  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalize(raw) {
    var out = blank();
    if (!raw || typeof raw !== "object") return out;
    out.vouchers = Math.max(0, Math.floor(num(raw.vouchers, 0)));
    out.lifetimeVouchers = Math.max(out.vouchers, Math.floor(num(raw.lifetimeVouchers, out.vouchers)));
    if (raw.sets && typeof raw.sets === "object") {
      Object.keys(raw.sets).forEach(function (id) {
        if (SETS[id] && SETS[id].type === "base" && raw.sets[id]) out.sets[id] = true;
      });
    }
    ["board", "pieces"].forEach(function (slot) {
      var catalog = slot === "board" ? BOARDS : PIECES;
      var defaultId = slot === "board" ? "wood" : "classic";
      out.owned[slot][defaultId] = true;
      var rawOwned = raw.owned && raw.owned[slot];
      if (rawOwned && typeof rawOwned === "object") {
        Object.keys(rawOwned).forEach(function (id) {
          if (catalog[id] && rawOwned[id]) out.owned[slot][id] = true;
        });
      }
    });
    Object.keys(SETS).forEach(function (id) {
      var set = SETS[id];
      if (set.type === "base" && out.sets[id]) {
        out.owned.board[set.board] = true;
        out.owned.pieces[set.pieces] = true;
      }
    });
    if (raw.equipped && typeof raw.equipped === "object") {
      if (BOARDS[raw.equipped.board] && out.owned.board[raw.equipped.board]) out.equipped.board = raw.equipped.board;
      if (PIECES[raw.equipped.pieces] && out.owned.pieces[raw.equipped.pieces]) out.equipped.pieces = raw.equipped.pieces;
    }
    if (raw.lastReward && typeof raw.lastReward === "object") {
      out.lastReward = {
        earned: Math.max(0, num(raw.lastReward.earned, 0)),
        at: num(raw.lastReward.at, 0),
        gameId: typeof raw.lastReward.gameId === "string" ? raw.lastReward.gameId : null
      };
    }
    return out;
  }

  function load() {
    var raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {}
    var out = normalize(raw);
    state = out;
    // Existing rank data can unlock base skins immediately.
    try {
      loadUnlocks = refreshUnlocksInto(out, false);
    } catch (e) {
      loadUnlocks = [];
    }
    save();
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function owns(slot, id) {
    var bag = state.owned[slot];
    return !!(bag && bag[id]);
  }

  function parentUnlocked(item) {
    if (!item || item.type !== "variant") return true;
    return !!state.sets[item.parent];
  }

  function tierIndexFromRating(rating) {
    var tiers = (window.GameRank && window.GameRank.tiers) || [];
    if (!tiers.length) return 0;
    for (var i = tiers.length - 1; i >= 0; i--) {
      if (rating >= tiers[i].floor) return i;
    }
    return 0;
  }

  function tierIndexByName(name) {
    var tiers = (window.GameRank && window.GameRank.tiers) || [];
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i].name === name) return i;
    }
    return -1;
  }

  function checkSetUnlocked(set) {
    if (!set || set.type !== "base" || !set.unlock) return false;
    if (!window.GameRank || !window.GameRank.getState) return false;
    var needTier = tierIndexByName(set.unlock.tier);
    for (var i = 0; i < GAME_IDS.length; i++) {
      var s = window.GameRank.getState(GAME_IDS[i]);
      if (!s) continue;
      if (tierIndexFromRating(s.rating) < needTier) continue;
      if (set.unlock.wins && s.wins < set.unlock.wins) continue;
      if (set.unlock.streak && s.bestStreak < set.unlock.streak) continue;
      if (set.unlock.gmWins && (s.gmWins || 0) < set.unlock.gmWins) continue;
      return true;
    }
    return false;
  }

  function refreshUnlocksInto(target, notify) {
    var unlocked = [];
    Object.keys(SETS).forEach(function (id) {
      var set = SETS[id];
      if (set.type !== "base" || target.sets[id]) return;
      if (!checkSetUnlocked(set)) return;
      target.sets[id] = true;
      target.owned.board[set.board] = true;
      target.owned.pieces[set.pieces] = true;
      unlocked.push(set.name);
    });
    if (unlocked.length) save();
    if (notify && unlocked.length) refreshButtons();
    return unlocked;
  }

  function refreshUnlocks(notify) {
    load();
    var unlocked = refreshUnlocksInto(state, notify);
    return unlocked;
  }

  function boardPalette() {
    var item = BOARDS[state.equipped.board];
    if (!item) return window.BoardGameTheme ? window.BoardGameTheme.DEFAULT_BOARD : null;
    return item.palette;
  }

  function piecePalette() {
    var item = PIECES[state.equipped.pieces];
    if (!item) return window.BoardGameTheme ? window.BoardGameTheme.DEFAULT_PIECES : null;
    return item.pieceStyle;
  }

  function getEquippedNames() {
    return {
      board: (BOARDS[state.equipped.board] || BOARDS.wood).name,
      pieces: (PIECES[state.equipped.pieces] || PIECES.classic).name
    };
  }

  function getEquipment() {
    return clone(state.equipped);
  }

  function equip(slot, id) {
    var catalog = slot === "board" ? BOARDS : PIECES;
    if (!catalog[id] || !owns(slot, id)) return false;
    state.equipped[slot] = id;
    save();
    refreshButtons();
    dispatchChange();
    return true;
  }

  function buy(slot, id, silent) {
    var catalog = slot === "board" ? BOARDS : PIECES;
    var item = catalog[id];
    if (!item || item.type !== "variant" || owns(slot, id) || !parentUnlocked(item)) return false;
    if (state.vouchers < PART_PRICE) return false;
    state.vouchers -= PART_PRICE;
    state.owned[slot][id] = true;
    state.equipped[slot] = id;
    save();
    refreshButtons();
    if (!silent) dispatchChange();
    return true;
  }

  function buySet(parentId, silent) {
    var set = SETS[parentId];
    if (!set || set.type !== "variant" || !state.sets[set.parent]) return false;
    var boardOwned = owns("board", set.board);
    var piecesOwned = owns("pieces", set.pieces);
    if (boardOwned && piecesOwned) return false;
    var price = boardOwned || piecesOwned ? PART_PRICE : SET_PRICE;
    if (state.vouchers < price) return false;
    state.vouchers -= price;
    if (!boardOwned) {
      state.owned.board[set.board] = true;
      state.equipped.board = set.board;
    }
    if (!piecesOwned) {
      state.owned.pieces[set.pieces] = true;
      state.equipped.pieces = set.pieces;
    }
    save();
    refreshButtons();
    if (!silent) dispatchChange();
    return true;
  }

  function dispatchChange() {
    try {
      window.dispatchEvent(new CustomEvent("gamebox-skins-change", { detail: clone(state) }));
    } catch (e) {}
    if (typeof ui.onChange === "function") {
      try { ui.onChange(); } catch (e) {}
    }
    if (modal) renderCards();
    updateWallet();
  }

  function refreshButtons() {
    var n = state.vouchers;
    document.querySelectorAll(".gs-voucher-mini").forEach(function (el) {
      el.textContent = String(n);
    });
    document.querySelectorAll(".gs-status-btn").forEach(function (el) {
      el.title = "棋盘 / 棋子皮肤（皮肤券 " + n + "）";
    });
  }

  function mountButton(selector, gameId) {
    load();
    var host = document.querySelector(selector) || document.body;
    var btn = host.querySelector(".gs-status-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gs-status-btn";
      btn.innerHTML = '<span class="gs-status-label">皮肤</span><b class="gs-voucher-mini">0</b>';
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        open({ gameId: gameId });
      });
      host.appendChild(btn);
    }
    btn.dataset.game = gameId;
    refreshButtons();
    return btn;
  }

  function previewSetup(canvas, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return ctx;
  }

  function drawPreviewGomoku(canvas, boardP, pieceP) {
    var W = 168, H = 188;
    var ctx = previewSetup(canvas, W, H);
    window.BoardGameTheme.drawBoardSurface(ctx, W, H, boardP);
    var size = 156, ox = (W - size) / 2, oy = (H - size) / 2;
    var margin = 16, inner = size - margin * 2, cell = inner / 10;
    ctx.strokeStyle = boardP.grid;
    ctx.lineWidth = 1;
    for (var i = 0; i <= 10; i++) {
      var x = ox + margin + i * cell;
      var y = oy + margin + i * cell;
      ctx.beginPath(); ctx.moveTo(x, oy + margin); ctx.lineTo(x, oy + margin + inner); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + margin, y); ctx.lineTo(ox + margin + inner, y); ctx.stroke();
    }
    var stars = [[3, 3], [7, 3], [5, 5], [3, 7], [7, 7]];
    ctx.fillStyle = boardP.star;
    stars.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(ox + margin + s[0] * cell, oy + margin + s[1] * cell, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
    var stones = [
      ["b", 3, 5], ["b", 4, 5], ["b", 5, 5], ["b", 6, 5], ["b", 7, 5],
      ["w", 4, 4], ["w", 5, 4], ["w", 6, 4], ["w", 7, 4], ["w", 3, 4],
      ["w", 5, 6], ["b", 4, 6]
    ];
    stones.forEach(function (s) {
      window.BoardGameTheme.drawStoneDisc(
        ctx,
        ox + margin + s[1] * cell,
        oy + margin + s[2] * cell,
        cell * 0.41,
        s[0],
        pieceP.stone,
        { last: s[0] === "b" && s[1] === 7 && s[2] === 5 }
      );
    });
  }

  function drawPreviewXiangqi(canvas, boardP, pieceP) {
    var W = 168, H = 188;
    var ctx = previewSetup(canvas, W, H);
    window.BoardGameTheme.drawBoardSurface(ctx, W, H, boardP);
    var pad = 12;
    var cell = Math.min((W - pad * 2) / 8, (H - pad * 2) / 9);
    var bw = cell * 8, bh = cell * 9;
    var ox = (W - bw) / 2, oy = (H - bh) / 2;
    ctx.strokeStyle = boardP.grid;
    ctx.lineWidth = 0.9;
    for (var r = 0; r < 10; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cell);
      ctx.lineTo(ox + bw, oy + r * cell);
      ctx.stroke();
    }
    for (var c = 0; c < 9; c++) {
      var x = ox + c * cell;
      if (c === 0 || c === 8) {
        ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + bh); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + 4 * cell); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, oy + 5 * cell); ctx.lineTo(x, oy + bh); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.moveTo(ox + 3 * cell, oy); ctx.lineTo(ox + 5 * cell, oy + 2 * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + 5 * cell, oy); ctx.lineTo(ox + 3 * cell, oy + 2 * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + 3 * cell, oy + 7 * cell); ctx.lineTo(ox + 5 * cell, oy + 9 * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + 5 * cell, oy + 7 * cell); ctx.lineTo(ox + 3 * cell, oy + 9 * cell); ctx.stroke();

    ctx.fillStyle = boardP.riverText;
    ctx.font = 'bold ' + Math.round(cell * 0.64) + 'px "KaiTi", "STKaiti", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var riverY = oy + 4.5 * cell;
    ctx.fillText("楚 河", ox + 2 * cell, riverY);
    ctx.fillText("漢 界", ox + 6 * cell, riverY);

    var pieces = [
      ["r", 4, 9, "帅"], ["r", 0, 9, "车"], ["r", 1, 9, "马"], ["r", 1, 7, "炮"], ["r", 2, 6, "兵"], ["r", 3, 9, "仕"],
      ["b", 4, 0, "将"], ["b", 8, 0, "车"], ["b", 7, 0, "马"], ["b", 7, 2, "炮"], ["b", 2, 3, "卒"], ["b", 5, 0, "士"]
    ];
    pieces.forEach(function (q) {
      window.BoardGameTheme.drawPieceDisc(
        ctx,
        ox + q[1] * cell,
        oy + q[2] * cell,
        cell * 0.42,
        q[3],
        q[0],
        pieceP.chess
      );
    });
  }

  function renderCards() {
    var grid = modal && modal.querySelector(".gs-grid");
    if (!grid) return;
    var tab = ui.tab;
    var catalog = tab === "board" ? BOARDS : PIECES;
    var items = Object.keys(catalog).map(function (id) { return catalog[id]; });
    items.sort(function (a, b) { return a.order - b.order; });
    var equippedId = state.equipped[tab];
    grid.innerHTML = items.map(function (item) {
      var equipped = equippedId === item.id;
      var owned = owns(tab, item.id);
      var unlockedParent = parentUnlocked(item);
      var baseUnlocked = item.type === "base" ? !!state.sets[item.setId] : true;
      var stateClass = equipped ? " equipped" : !owned ? " locked" : "";
      var boardId = tab === "board" ? item.id : state.equipped.board;
      var pieceId = tab === "pieces" ? item.id : state.equipped.pieces;
      var action = "";

      if (equipped) {
        action = '<span class="gs-state on">使用中</span>';
      } else if (owned) {
        action = '<button type="button" class="gs-btn" data-action="equip">装备</button>';
      } else if (item.type === "base" && !baseUnlocked) {
        action = '<span class="gs-lock">解锁：' + item.unlockText + '</span>';
      } else if (item.type === "variant" && !unlockedParent) {
        action = '<span class="gs-lock">先解锁 ' + (SETS[item.parent] ? SETS[item.parent].name : "基础皮肤") + '</span>';
      } else if (item.type === "variant") {
        var can = state.vouchers >= PART_PRICE;
        action =
          '<button type="button" class="gs-btn' + (can ? "" : " disabled") + '" data-action="buy"' + (can ? "" : " disabled") + '>' +
          PART_PRICE + ' 券</button>';
        var variantSet = SETS[item.id];
        if (
          variantSet &&
          variantSet.type === "variant" &&
          !owns("board", variantSet.board) &&
          !owns("pieces", variantSet.pieces)
        ) {
          var canSet = state.vouchers >= SET_PRICE;
          action +=
            '<button type="button" class="gs-btn ghost' + (canSet ? "" : " disabled") + '" data-action="buy-set"' + (canSet ? "" : " disabled") + '>' +
            "整套 " + SET_PRICE + " 券</button>";
        }
      }

      return (
        '<div class="gs-card' + stateClass + '" data-slot="' + tab + '" data-id="' + item.id + '" tabindex="0">' +
          '<div class="gs-card-preview"><canvas data-preview-board="' + boardId + '" data-preview-pieces="' + pieceId + '"></canvas></div>' +
          '<div class="gs-card-body">' +
            '<div class="gs-card-title"><strong>' + item.name + '</strong><span class="gs-kind">' + (tab === "board" ? "棋盘" : "棋子") + '</span></div>' +
            '<p>' + item.desc + '</p>' +
            '<div class="gs-card-footer">' + action + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    grid.querySelectorAll("canvas").forEach(function (canvas) {
      var boardId = canvas.getAttribute("data-preview-board");
      var pieceId = canvas.getAttribute("data-preview-pieces");
      var boardP = BOARDS[boardId] ? BOARDS[boardId].palette : boardPalette();
      var pieceP = PIECES[pieceId] ? PIECES[pieceId].pieceStyle : piecePalette();
      if (ui.gameId === "chinese-chess") drawPreviewXiangqi(canvas, boardP, pieceP);
      else drawPreviewGomoku(canvas, boardP, pieceP);
    });
    updateWallet();
    updateEquippedLine();
  }

  function updateWallet() {
    if (!modal) return;
    var el = modal.querySelector("#gs-voucher");
    if (el) el.textContent = String(state.vouchers);
    var eq = modal.querySelector(".gs-equipped");
    if (eq) eq.textContent = "当前装备：棋盘 · " + getEquippedNames().board + " / 棋子 · " + getEquippedNames().pieces;
  }

  function updateEquippedLine() {
    updateWallet();
  }

  function showToast(text, kind) {
    if (!modal) return;
    var el = modal.querySelector(".gs-toast");
    if (!el) return;
    el.textContent = text;
    el.className = "gs-toast show" + (kind ? " " + kind : "");
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(function () {
      el.className = "gs-toast";
    }, 1800);
  }

  function handleCardClick(card, action) {
    if (!card) return;
    var slot = card.getAttribute("data-slot");
    var id = card.getAttribute("data-id");
    var catalog = slot === "board" ? BOARDS : PIECES;
    var item = catalog[id];
    if (!item) return;

    if (action === "equip" || (!action && owns(slot, id))) {
      if (!owns(slot, id)) return;
      if (equip(slot, id)) {
        showToast("已装备 " + item.name);
        renderCards();
      }
      return;
    }
    if (action === "buy") {
      if (buy(slot, id)) {
        showToast("已购买并装备 " + item.name, "good");
        renderCards();
      } else {
        showToast(state.vouchers < PART_PRICE ? "皮肤券不足" : "暂时无法购买", "warn");
      }
      return;
    }
    if (action === "buy-set") {
      if (buySet(item.id)) {
        var set = SETS[item.id];
        showToast("已购买 " + set.name + " 整套异色", "good");
        renderCards();
      } else {
        showToast("皮肤券不足或已拥有", "warn");
      }
    }
  }

  function open(options) {
    var opts = options || {};
    load();
    refreshUnlocks(false);
    close();
    ui.tab = opts.tab === "pieces" ? "pieces" : "board";
    ui.gameId = opts.gameId === "chinese-chess" ? "chinese-chess" : "gomoku";
    ui.onChange = typeof opts.onChange === "function" ? opts.onChange : null;

    modal = document.createElement("div");
    modal.className = "gs-overlay";
    modal.innerHTML =
      '<div class="gs-modal" role="dialog" aria-modal="true" aria-label="棋盘与棋子皮肤">' +
        '<button type="button" class="gs-close" aria-label="关闭">×</button>' +
        '<div class="gs-head">' +
          '<div><div class="gs-kicker">棋盘收藏</div><h2>棋盘与棋子皮肤</h2>' +
          '<p>棋盘和棋子独立装备，可以整套使用，也可以混搭。</p></div>' +
          '<div class="gs-wallet"><span>皮肤券</span><b id="gs-voucher">' + state.vouchers + '</b></div>' +
        '</div>' +
        '<div class="gs-toolbar">' +
          '<div class="gs-tabs">' +
            '<button type="button" data-tab="board" class="' + (ui.tab === "board" ? "on" : "") + '">棋盘</button>' +
            '<button type="button" data-tab="pieces" class="' + (ui.tab === "pieces" ? "on" : "") + '">棋子</button>' +
          '</div>' +
          '<div class="gs-games">' +
            '<button type="button" data-game="gomoku" class="' + (ui.gameId === "gomoku" ? "on" : "") + '">五子棋</button>' +
            '<button type="button" data-game="chinese-chess" class="' + (ui.gameId === "chinese-chess" ? "on" : "") + '">中国象棋</button>' +
          '</div>' +
        '</div>' +
        '<div class="gs-equipped"></div>' +
        '<div class="gs-grid"></div>' +
        '<p class="gs-note">基础皮肤在任一棋种达成段位与挑战条件即可解锁，两款棋通用；异色变体使用皮肤券购买。皮肤券来自人机胜场，越级挑战和晋级赛会额外获得。</p>' +
        '<div class="gs-toast" role="status"></div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelector(".gs-close").addEventListener("click", close);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });
    modal.querySelectorAll(".gs-tabs button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.tab = btn.getAttribute("data-tab");
        modal.querySelectorAll(".gs-tabs button").forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        renderCards();
      });
    });
    modal.querySelectorAll(".gs-games button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ui.gameId = btn.getAttribute("data-game");
        modal.querySelectorAll(".gs-games button").forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        renderCards();
      });
    });
    modal.querySelector(".gs-grid").addEventListener("click", function (e) {
      var actionBtn = e.target.closest("[data-action]");
      var card = e.target.closest(".gs-card");
      if (!card) return;
      e.preventDefault();
      handleCardClick(card, actionBtn ? actionBtn.getAttribute("data-action") : null);
    });
    modal.querySelector(".gs-grid").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest(".gs-card");
      if (!card) return;
      e.preventDefault();
      handleCardClick(card, null);
    });
    keyHandler = function (e) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    document.addEventListener("keydown", keyHandler, true);
    renderCards();
    updateWallet();
  }

  function close() {
    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
    }
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    modal = null;
    ui.onChange = null;
  }

  function onRankResult(result) {
    if (!result) return { earned: 0, total: state.vouchers, newUnlocks: [] };
    load();
    var unlocked = loadUnlocks.slice();
    loadUnlocks = [];
    var earned = 0;
    if (result.result === "win") {
      var ai = (window.GameRank && window.GameRank.aiRating && window.GameRank.aiRating[result.difficulty]) || 1100;
      earned = ai <= result.before - 250 ? 1 : 2;
      if (result.challenge) earned += 3;
      if (result.promotionWon) earned += 5;
    }
    if (earned > 0) {
      state.vouchers += earned;
      state.lifetimeVouchers += earned;
      state.lastReward = { earned: earned, at: Date.now(), gameId: result.gameId || null };
      save();
    }
    var more = refreshUnlocksInto(state, true);
    if (more.length) unlocked = unlocked.concat(more);
    save();
    refreshButtons();
    return { earned: earned, total: state.vouchers, newUnlocks: unlocked };
  }

  function getState() {
    return clone(state);
  }

  window.GameSkins = {
    open: open,
    close: close,
    reload: load,
    mountButton: mountButton,
    refreshButtons: refreshButtons,
    refreshUnlocks: refreshUnlocks,
    onRankResult: onRankResult,
    boardPalette: boardPalette,
    piecePalette: piecePalette,
    getEquippedNames: getEquippedNames,
    getEquipment: getEquipment,
    getState: getState,
    equip: equip,
    buy: buy,
    buySet: buySet,
    catalog: { sets: SETS, boards: BOARDS, pieces: PIECES },
    prices: { part: PART_PRICE, set: SET_PRICE }
  };
})();
