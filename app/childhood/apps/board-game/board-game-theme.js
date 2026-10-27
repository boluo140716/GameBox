// ============================================================
// Shared board & piece theme for classic board games
// (apps/board-game). Supplies the common wooden palette and
// canvas helpers so every game renders the same material look
// while keeping its own layout, labels and piece shapes.
// ============================================================

(function () {
  "use strict";

  const PALETTE = {
    woodLight: "#e8c98e",
    woodMid: "#d8ad6a",
    woodDark: "#c9974f",
    carve: "#5a3b20",
    frame: "#7a4a1d",
  };

  const DEFAULT_BOARD = Object.freeze({
    style: "wood",
    surfaceA: PALETTE.woodLight,
    surfaceB: PALETTE.woodMid,
    surfaceC: PALETTE.woodDark,
    edge: "#8a5a27",
    grid: PALETTE.carve,
    star: PALETTE.carve,
    frame: PALETTE.frame,
    river: "rgba(90, 59, 32, .72)",
    riverText: PALETTE.carve,
    texture: "rgba(122, 74, 22, .10)",
    glow: "rgba(255, 255, 255, .16)",
    shadow: "rgba(0, 0, 0, .28)",
    win: "#c62828",
  });

  const DEFAULT_PIECES = Object.freeze({
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
      last: "#c62828",
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
      textShadow: "rgba(0, 0, 0, .20)",
    },
  });

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full =
      value.length === 3
        ? value
            .split("")
            .map((c) => c + c)
            .join("")
        : value;
    const num = Number.parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function mix(hex, target, ratio) {
    const from = hexToRgb(hex);
    const to = hexToRgb(target);
    const channel = (key) => Math.round(from[key] + (to[key] - from[key]) * ratio);
    return `rgb(${channel("r")}, ${channel("g")}, ${channel("b")})`;
  }

  function drawWoodGrain(ctx, width, height, palette) {
    const grain = palette.texture || "rgba(122, 74, 22, .10)";
    ctx.strokeStyle = grain;
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 5) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i + Math.sin(i * 0.035) * 2.4);
      ctx.stroke();
    }
    ctx.strokeStyle = palette.glow || "rgba(255, 255, 255, .10)";
    for (let i = 8; i < width; i += 46) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + Math.sin(i * 0.06) * 8, height);
      ctx.stroke();
    }
  }

  // Fill a canvas with a board surface. Classic wood keeps the warm
  // recognizable material; premium skins supply their own palette.
  function drawBoardSurface(ctx, width, height, palette) {
    const p = palette || DEFAULT_BOARD;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, p.surfaceA);
    bg.addColorStop(0.52, p.surfaceB);
    bg.addColorStop(1, p.surfaceC || p.surfaceB);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (p.style === "wood") {
      drawWoodGrain(ctx, width, height, p);
    } else {
      const texture = p.texture || "rgba(255,255,255,.04)";
      ctx.strokeStyle = texture;
      ctx.lineWidth = 1;
      for (let i = 0; i < height; i += 7) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i + Math.sin(i * 0.04) * 2);
        ctx.stroke();
      }
    }

    // Shared lighting pass: a soft top-left sheen and a quiet edge vignette.
    const glow = ctx.createRadialGradient(
      width * 0.3,
      height * 0.14,
      2,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.74
    );
    glow.addColorStop(0, p.glow || "rgba(255,255,255,.10)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.28,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.10)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  // Glossy circular piece with a shared highlight / rim treatment.
  // base is the team color; light and dark stops are derived from it.
  function glossyDisc(ctx, cx, cy, r, base, options) {
    const opts = options || {};
    const light = mix(base, "#ffffff", opts.light === undefined ? 0.55 : opts.light);
    const dark = mix(base, "#000000", opts.dark === undefined ? 0.35 : opts.dark);
    const rgb = hexToRgb(base);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

    if (opts.shadow !== false) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.arc(cx + 1.5, cy + 2.5, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const gradient = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.3, 2, cx, cy, r);
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.5, base);
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle =
      opts.highlight ||
      (luminance < 0.5 ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.75)");
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.3, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle =
      opts.rim || (luminance < 0.5 ? "rgba(0, 0, 0, 0.6)" : "rgba(120, 120, 120, 0.5)");
    ctx.lineWidth = opts.rimWidth || 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sharp, responsive stone used by gomoku. Palette comes from the
  // equipped piece skin, so boards and stones can mix independently.
  function drawStoneDisc(ctx, cx, cy, r, side, palette, options) {
    const p = palette || DEFAULT_PIECES.stone;
    const isBlack = side === "black" || side === "b" || side === 1;
    const a = isBlack ? p.blackA : p.whiteA;
    const b = isBlack ? p.blackB : p.whiteB;
    const rim = isBlack ? p.blackRim : p.whiteRim;
    const opts = options || {};

    ctx.save();
    if (p.glow && p.glow !== "transparent") {
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowColor = p.shadow || "rgba(0,0,0,.30)";
      ctx.shadowBlur = opts.shadowBlur === undefined ? 3 : opts.shadowBlur;
    }
    ctx.shadowOffsetY = 1.5;
    const gradient = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.4, 1, cx, cy, r);
    gradient.addColorStop(0, a);
    gradient.addColorStop(0.56, a);
    gradient.addColorStop(1, b);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, r - 0.5), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = p.highlight || "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.31, r * 0.23, 0, Math.PI * 2);
    ctx.fill();

    if (opts.last) {
      ctx.strokeStyle = p.last || "#c62828";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Chinese-chess disc. Text, face and rim all come from the equipped
  // piece skin; layout stays owned by the game.
  function drawPieceDisc(ctx, cx, cy, r, text, side, palette, options) {
    const p = palette || DEFAULT_PIECES.chess;
    const opts = options || {};
    const isRed = side === "red" || side === "r";

    ctx.save();
    if (p.glow && p.glow !== "transparent") {
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowColor = p.shadow || "rgba(0,0,0,.30)";
      ctx.shadowBlur = 4;
    }
    ctx.shadowOffsetY = 2;
    const gradient = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.4, 1, cx, cy, r);
    gradient.addColorStop(0, p.faceA);
    gradient.addColorStop(0.62, p.faceA);
    gradient.addColorStop(1, p.faceB);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = p.rim;
    ctx.lineWidth = Math.max(1.2, r * 0.075);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, r - 0.5), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = p.innerRim || "rgba(0,0,0,.18)";
    ctx.lineWidth = Math.max(0.8, r * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.77, 0, Math.PI * 2);
    ctx.stroke();

    const color = isRed ? p.red : p.black;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'bold ' + Math.round(r * 0.98) + "px " + (p.font || DEFAULT_PIECES.chess.font);
    if (p.textShadow) {
      ctx.fillStyle = p.textShadow;
      ctx.fillText(text, cx + 1, cy + 1.5);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy + r * 0.04);
    ctx.restore();
  }

  // Fill the canvas with the classic wooden board base and subtle grain.
  function drawWoodenBoard(ctx, width, height) {
    drawBoardSurface(ctx, width, height, DEFAULT_BOARD);
  }

  window.BoardGameTheme = {
    PALETTE,
    DEFAULT_BOARD,
    DEFAULT_PIECES,
    drawWoodenBoard,
    drawBoardSurface,
    glossyDisc,
    drawStoneDisc,
    drawPieceDisc,
  };
})();
