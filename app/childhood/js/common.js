document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = [
    ".github-icons{position:fixed;top:16px;right:16px;z-index:9999;display:flex;gap:10px;}",
    ".github-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;",
    "border-radius:50%;background:rgba(0,0,0,0.5);opacity:0.7;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);",
    "cursor:pointer;text-decoration:none;}",
    ".github-icon svg{width:20px;height:20px;fill:#fff;transition:fill 0.3s;}",
    ".github-icon:hover{opacity:1;transform:scale(1.25) rotate(8deg);",
    "background:rgba(255,255,255,0.95);box-shadow:0 0 16px rgba(255,255,255,0.6),0 4px 12px rgba(0,0,0,0.3);}",
    ".github-icon:hover svg{fill:#24292e;}",
    ".github-icon:active{transform:scale(0.9);transition:transform 0.1s;}",
    "@keyframes icon-bounce{0%,100%{transform:scale(1.25) rotate(8deg) translateY(0);}",
    "50%{transform:scale(1.3) rotate(8deg) translateY(-4px);}}",
    ".github-icon:hover{animation:icon-bounce 0.6s ease-in-out infinite;}",
    "@keyframes icon-glow-pulse{0%,100%{box-shadow:0 0 16px rgba(255,255,255,0.6),0 4px 12px rgba(0,0,0,0.3);}",
    "50%{box-shadow:0 0 24px rgba(255,255,255,0.9),0 4px 20px rgba(0,0,0,0.4);}}",
    ".github-icon:hover{animation:icon-bounce 0.6s ease-in-out infinite,icon-glow-pulse 1.2s ease-in-out infinite;}",
    ".back-home{position:fixed;top:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:6px;",
    "padding:6px 14px;border-radius:20px;background:rgba(0,0,0,0.45);color:#fff;",
    "font-size:14px;text-decoration:none;opacity:0.75;transition:opacity 0.2s;}",
    ".back-home:hover{opacity:1;}",
  ].join("");
  document.head.appendChild(style);

  // 单人使用：不显示 GitHub / 反馈 / QQ / 收藏图标

  // 单人离线版：不注册 Service Worker，避免缓存旧页面；同时清理历史缓存。
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }

  // 单人模式：默认人机对战，隐藏双人/联网入口，自动跳过猜拳
  (function setupSoloMode() {
    var style = document.createElement("style");
    style.textContent = [
      "#btn-pvp,#btn-online{display:none!important}",
      "#mode-selection{display:none!important}",
      "#rps-section{display:none!important}",
      ".github-icons{display:none!important}",
    ].join("");
    document.head.appendChild(style);

    // 游戏页背景：
    // 牌桌类 = 墨绿哑光绒布；棋类 = 中度深暖棕灰的柔和乌木木纹；
    // 大富翁 / 飞行棋 = 浅暖棕木纹桌面（中心微微提亮）。
    if (window.location.pathname.indexOf("/apps/") !== -1) {
      var path = window.location.pathname;
      var isCardTable = /\/card-game\//.test(path);
      var isLightWood = /\/dice-game\//.test(path);
      var isBoardTable = /\/board-game\/|\/childhood-board-game\//.test(path);
      var tone = document.createElement("style");
      var rules = [];

      // common.js 位于 childhood/js/，用 new URL 解析到 childhood/images/bg/，
      // 这样 http、file:// 和 Capacitor 本地资源路径都能正确加载。
      var bgBase = "";
      try {
        var commonScript = document.querySelector('script[src*="common.js"]');
        if (commonScript && commonScript.src) {
          bgBase = new URL("../images/bg/", commonScript.src).href;
        }
      } catch (e) { bgBase = ""; }
      var darkWood = bgBase
        ? 'url("' + bgBase + 'board-dark.webp")'
        : "linear-gradient(180deg,#3a302a,#332a25)";
      var lightWood = bgBase
        ? 'url("' + bgBase + 'board-light.webp")'
        : "linear-gradient(180deg,#d3b184,#c9a274)";

      if (isCardTable) {
        rules.push(
          "html,body{background-color:#1e2b25!important;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.014) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,rgba(0,0,0,.02) 0 1px,transparent 1px 3px),radial-gradient(ellipse 72% 62% at 50% 46%,rgba(255,255,255,.075),rgba(255,255,255,.02) 40%,transparent 72%),radial-gradient(ellipse 120% 100% at 50% 50%,transparent 52%,rgba(0,0,0,.38) 100%)!important;background-size:3px 3px,3px 3px,auto,auto!important;background-repeat:repeat,repeat,no-repeat,no-repeat!important;background-attachment:fixed!important;}"
        );
      } else if (isLightWood) {
        rules.push(
          "html,body{background-color:#cfad83!important;background-image:" + lightWood + "!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;background-attachment:fixed!important;}"
        );
        rules.push(
          "#board,#board-container,#board-canvas,#board-svg{outline:1px solid rgba(79,50,25,.16)!important;outline-offset:3px;filter:drop-shadow(0 14px 30px rgba(70,42,18,.12));}"
        );
      } else if (isBoardTable) {
        rules.push(
          "html,body{background-color:#362d27!important;background-image:" + darkWood + "!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;background-attachment:fixed!important;}"
        );
        rules.push(
          "#board,#board-container,#board-canvas,#board-svg{outline:1px solid rgba(255,226,190,.065)!important;outline-offset:3px;filter:drop-shadow(0 14px 28px rgba(0,0,0,.18));}"
        );
      } else {
        // 未分类的童年页面保持原来的深色底，避免影响未知布局。
        rules.push(
          "html,body{background-color:#1a1512!important;background-image:radial-gradient(ellipse 90% 70% at 50% 42%,rgba(255,235,210,.03),transparent 72%)!important;background-repeat:no-repeat!important;background-attachment:fixed!important;}"
        );
      }
      rules.push("#game-area{background:transparent!important;}");
      rules.push("#message{color:#e8e2d6!important;text-shadow:0 1px 4px rgba(0,0,0,.65);}");
      rules.push(
        "#solo-start-overlay{position:fixed;inset:0;z-index:9997;display:flex;align-items:center;justify-content:center;gap:10px;background:rgba(11,14,19,.88);color:#cfc6b4;font:13px/1 'Microsoft YaHei',sans-serif;letter-spacing:1px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);transition:opacity .2s ease;}"
      );
      rules.push(
        "#solo-start-overlay .ss-spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.16);border-top-color:#c9a45c;border-radius:50%;animation:ssSpin .8s linear infinite;}"
      );
      rules.push("@keyframes ssSpin{to{transform:rotate(360deg)}}");
      tone.textContent = rules.join("");
      document.head.appendChild(tone);
    }

    // RPS 结果原本会等待 1.5 秒再开局；这里只缩短这一次开局定时器
    var nativeSetTimeout = window.setTimeout;
    var fastStartUntil = 0;
    window.setTimeout = function (fn, delay) {
      var args = Array.prototype.slice.call(arguments, 2);
      if (fastStartUntil && Date.now() < fastStartUntil && typeof delay === "number" && delay >= 800) {
        fastStartUntil = 0;
        delay = 30;
      }
      return nativeSetTimeout.apply(window, [fn, delay].concat(args));
    };

    var lastMenuShown = false;
    var rpsCooldown = 0;

    // 启动过渡层：只在游戏确实还没显示时出现
    if (window.location.pathname.indexOf("/apps/") !== -1) {
      var soloT0 = performance.now();
      var readyWatch = setInterval(function () {
        var a = document.getElementById("game-area") || document.getElementById("game-main");
        if (a && getComputedStyle(a).display !== "none") {
          window.__soloReadyMs = Math.round(performance.now() - soloT0);
          clearInterval(readyWatch);
        }
      }, 50);
      setTimeout(function () {
        var area = document.getElementById("game-area") || document.getElementById("game-main");
        if (!area || getComputedStyle(area).display !== "none") return;
        var el = document.createElement("div");
        el.id = "solo-start-overlay";
        el.innerHTML = '<span class="ss-spin"></span><span>正在进入…</span>';
        document.body.appendChild(el);
        var iv = setInterval(function () {
          var a = document.getElementById("game-area") || document.getElementById("game-main");
          if (a && getComputedStyle(a).display !== "none") {
            clearInterval(iv);
            el.style.opacity = "0";
            setTimeout(function () { el.remove(); }, 220);
          }
        }, 100);
        setTimeout(function () {
          clearInterval(iv);
          if (el.parentNode) el.remove();
        }, 5000);
      }, 300);
    }

    function isDisabled(el) {
      return !el || el.disabled || el.getAttribute("aria-disabled") === "true";
    }

    function clickPve() {
      var pve = document.getElementById("btn-pve");
      if (pve && !isDisabled(pve)) {
        pve.click();
        return true;
      }

      // 部分游戏（如军棋）用 data-opp-type="pve" 标记人机按钮，没有 #btn-pve。
      // 军棋同时有翻棋 / 明棋 / 暗棋，默认选页面主打的明棋。
      var list = document.querySelectorAll('[data-opp-type="pve"], [data-mode="pve"], .btn-pve');
      var pick = null;
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (isDisabled(el)) continue;
        if (el.getAttribute("data-game-type") === "open") {
          pick = el;
          break;
        }
        if (!pick) pick = el;
      }
      if (pick) {
        pick.click();
        return true;
      }

      // 最后兜底：模式层里文字包含“人机”的按钮
      var menu = document.getElementById("mode-selection");
      if (menu) {
        var btns = menu.querySelectorAll("button");
        for (var j = 0; j < btns.length; j++) {
          var b = btns[j];
          if (b.classList.contains("btn-online") || isDisabled(b)) continue;
          if (/人机/.test(b.textContent || "")) {
            b.click();
            return true;
          }
        }
      }
      return false;
    }

    function clickLocalStart() {
      var ids = ["btn-begin", "begin", "btn-start"];
      for (var i = 0; i < ids.length; i++) {
        var b = document.getElementById(ids[i]);
        if (b && !b.disabled) {
          b.click();
          return true;
        }
      }
      return false;
    }

    function startSolo() {
      return clickPve() || clickLocalStart();
    }

    function tickMenu(force) {
      var menu = document.getElementById("mode-selection");
      if (!menu) return;
      var shown = menu.style.display !== "none";
      if (shown && (force || !lastMenuShown)) startSolo();
      lastMenuShown = shown;
    }

    function startLocalIfNeeded() {
      if (document.getElementById("mode-selection")) return;
      if (document.getElementById("btn-pve")) {
        clickPve();
        return;
      }
      clickLocalStart();
    }

    function tickRps() {
      var rps = document.getElementById("rps-section");
      if (!rps || rps.style.display === "none") return;
      var now = Date.now();
      if (now - rpsCooldown < 700) return;
      var btn =
        rps.querySelector('.btn-rps[data-player="human"]') ||
        rps.querySelector("#rps-player-buttons .btn-rps") ||
        rps.querySelector("#rps-pve .btn-rps") ||
        rps.querySelector('.btn-rps[data-player="online"]');
      if (!btn) return;
      rpsCooldown = now;
      fastStartUntil = now + 50;
      btn.click();
      fastStartUntil = 0;
    }

    setTimeout(function () {
      tickMenu(true);
      startLocalIfNeeded();
      tickRps();
      setTimeout(function () {
        tickMenu(true);
      }, 1200);
      setInterval(tickMenu, 500);
      setInterval(tickRps, 120);
    }, 90);
  })();
});
