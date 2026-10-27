/* eslint-disable prefer-arrow-callback */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AIDifficulty = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const LEVELS = Object.freeze(["easy", "normal", "hard", "master", "grandmaster"]);
  const LABELS = Object.freeze({
    easy: "简单",
    normal: "普通",
    hard: "困难",
    master: "大师",
    grandmaster: "宗师",
  });
  const ORDER = { easy: 1, normal: 2, hard: 3, master: 4, grandmaster: 5 };
  const PILOT =
    typeof location !== "undefined" &&
    /\/board-game\/(gomoku|chinese-chess)\/index\.html/.test(location.pathname);
  let currentLevel = "normal";
  let baseline = "normal";
  let auto = PILOT;
  let grandmasterUnlocked = false;
  let currentMode = null;
  let control = null;
  let hint = null;

  function normalizeLevel(level) {
    return LEVELS.includes(level) ? level : "normal";
  }

  function getLevel() {
    return auto ? baseline : currentLevel;
  }

  function getBaseline() {
    return baseline;
  }

  function isAuto() {
    return auto;
  }

  function emitChange() {
    if (
      root &&
      typeof root.dispatchEvent === "function" &&
      typeof root.CustomEvent === "function"
    ) {
      root.dispatchEvent(new root.CustomEvent("ai-difficulty-change", { detail: { level: getLevel() } }));
    }
  }

  function updateControl() {
    if (!control) return;
    const autoOption = control.querySelector('option[value="auto"]');
    if (autoOption) autoOption.textContent = "推荐（" + LABELS[baseline] + "）";
    const gmOption = control.querySelector('option[value="grandmaster"]');
    if (gmOption) {
      gmOption.disabled = !grandmasterUnlocked;
      gmOption.textContent = grandmasterUnlocked ? LABELS.grandmaster : "宗师（大师解锁）";
    }
    control.value = auto ? "auto" : currentLevel;
    const level = getLevel();
    const gap = Math.max(0, (ORDER[level] || 2) - (ORDER[baseline] || 2));
    if (hint) {
      hint.title = "";
      if (auto) {
        hint.textContent = "按段位推荐";
      } else if (gap > 0) {
        const winMult = [1, 1.5, 1.75, 2][Math.min(gap, 3)];
        const lossMult = [1, 1.25, 1.4, 1.5][Math.min(gap, 3)];
        hint.textContent = "胜×" + winMult + " 负×" + lossMult;
        hint.title = "越级挑战：胜利积分 ×" + winMult + "，失败扣分 ×" + lossMult;
      } else if (ORDER[level] < ORDER[baseline]) {
        hint.textContent = "练习模式";
      } else {
        hint.textContent = "推荐难度";
      }
    }
    const wrap = control.closest(".ai-difficulty-control");
    if (wrap) wrap.classList.toggle("is-challenge", PILOT && !auto && ORDER[level] > ORDER[baseline]);
  }

  function setLevel(level) {
    if (level === "auto") {
      if (!PILOT) return getLevel();
      auto = true;
      updateControl();
      emitChange();
      return getLevel();
    }
    const next = normalizeLevel(level);
    if (next === "grandmaster" && !grandmasterUnlocked) return getLevel();
    auto = false;
    currentLevel = next;
    updateControl();
    emitChange();
    return currentLevel;
  }

  function setBaseline(level) {
    baseline = normalizeLevel(level);
    if (auto) {
      updateControl();
      emitChange();
    } else {
      updateControl();
    }
    return baseline;
  }

  function setGrandmasterUnlocked(value) {
    grandmasterUnlocked = !!value;
    if (!grandmasterUnlocked && getLevel() === "grandmaster") {
      auto = true;
      currentLevel = baseline;
    }
    updateControl();
    return grandmasterUnlocked;
  }

  function setMode(mode) {
    currentMode = mode;
    if (control) control.parentElement.hidden = mode !== "pve";
  }

  function getProfile(level, profiles) {
    const key = level === "auto" ? baseline : normalizeLevel(level || getLevel());
    return profiles[key] || profiles.normal;
  }

  function pickRandom(items, random) {
    if (!items || items.length === 0) return null;
    const randomFn = typeof random === "function" ? random : Math.random;
    return items[Math.floor(randomFn() * items.length)];
  }

  function hasComputerSeat() {
    for (const select of document.querySelectorAll("select")) {
      if (select.value === "computer" || select.value === "npc") return true;
    }
    return false;
  }

  function inferModeFromClick(target) {
    if (!target || typeof target.closest !== "function") return;
    const button = target.closest("button");
    if (!button) return;
    if (button.dataset.oppType) return setMode(button.dataset.oppType);
    if (button.id === "btn-pve") return setMode("pve");
    if (button.id === "btn-pvp") return setMode("pvp");
    if (button.id === "btn-online" || button.classList.contains("btn-online"))
      return setMode("online");
    if (["begin", "btn-begin", "btn-start"].includes(button.id)) {
      setMode(hasComputerSeat() ? "pve" : "pvp");
    }
  }

  function mount() {
    if (control || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.textContent =
      ".ai-difficulty-control{position:fixed;right:16px;bottom:16px;z-index:9000;display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:rgba(20,25,35,.88);box-shadow:0 4px 16px rgba(0,0,0,.3);color:#fff;font:14px/1.2 sans-serif;backdrop-filter:blur(6px)}" +
      ".ai-difficulty-control[hidden]{display:none}.ai-difficulty-control select{min-width:86px;padding:5px 8px;border:1px solid rgba(255,255,255,.35);border-radius:7px;background:#fff;color:#222;font:inherit;cursor:pointer}" +
      ".ai-difficulty-control select:focus{outline:2px solid #64b5f6;outline-offset:2px}" +
      ".ai-difficulty-control .ai-difficulty-hint{font-size:10px;letter-spacing:.3px;color:#9fb0c6;white-space:nowrap}" +
      ".ai-difficulty-control.is-challenge{border-color:rgba(255,159,67,.65);box-shadow:0 4px 18px rgba(255,120,60,.18)}" +
      ".ai-difficulty-control.is-challenge .ai-difficulty-hint{color:#ffd08a;font-weight:700}" +
      "@media(max-width:600px){.ai-difficulty-control{right:8px;bottom:8px;padding:7px 10px;font-size:13px}.ai-difficulty-control .ai-difficulty-hint{display:none}}";
    document.head.appendChild(style);

    const wrapper = document.createElement("label");
    wrapper.className = "ai-difficulty-control";
    wrapper.hidden = currentMode !== "pve";
    wrapper.append("AI 难度");
    control = document.createElement("select");
    control.setAttribute("aria-label", "AI 难度");

    if (PILOT) {
      const autoOption = document.createElement("option");
      autoOption.value = "auto";
      autoOption.textContent = "推荐（普通）";
      control.appendChild(autoOption);
    }
    const shownLevels = PILOT ? LEVELS : LEVELS.filter((level) => level !== "grandmaster");
    for (const level of shownLevels) {
      const option = document.createElement("option");
      option.value = level;
      option.textContent = LABELS[level];
      option.selected = !auto && level === currentLevel;
      control.appendChild(option);
    }
    control.addEventListener("change", () => setLevel(control.value));
    wrapper.appendChild(control);
    hint = document.createElement("span");
    hint.className = "ai-difficulty-hint";
    hint.textContent = "按段位推荐";
    hint.hidden = !PILOT;
    wrapper.appendChild(hint);
    document.body.appendChild(wrapper);
    document.addEventListener("click", (event) => inferModeFromClick(event.target), true);
    updateControl();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
    else mount();
  }

  return {
    LEVELS,
    LABELS,
    normalizeLevel,
    getLevel,
    getBaseline,
    isAuto,
    setLevel,
    setBaseline,
    setGrandmasterUnlocked,
    setMode,
    getProfile,
    pickRandom,
    mount,
  };
});
