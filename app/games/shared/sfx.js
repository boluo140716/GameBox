/* GameBox · 轻量音效引擎
 * 优先使用 Web Audio（可同时叠放任意数量的短音效），不可用时退回 HTMLAudio 池。
 * 所有素材均为本地文件；不联网。
 */
(function (root) {
  'use strict';

  function create(options) {
    var defs = options.defs || {};
    var base = options.base || '';
    var key = options.key || 'gamebox_sound';
    var fallbackSize = options.pool || 4;
    var enabled = true;
    try { enabled = localStorage.getItem(key) !== 'off'; } catch (e) {}

    var ctx = null;
    var buffers = {};
    var loading = {};
    var active = [];
    var fallback = {};
    var unlocked = false;
    var preloaded = false;

    function urlFor(name) {
      return base + defs[name].file;
    }

    function ensureContext() {
      if (ctx) return ctx;
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC({ latencyHint: 'interactive' }); }
      catch (e) {
        try { ctx = new AC(); } catch (e2) { ctx = null; }
      }
      return ctx;
    }

    function load(name) {
      if (!ctx || buffers[name] || loading[name] || !defs[name]) return;
      if (typeof fetch !== 'function') return;
      loading[name] = fetch(urlFor(name))
        .then(function (res) {
          if (!res.ok) throw new Error('audio ' + res.status);
          return res.arrayBuffer();
        })
        .then(function (data) {
          return new Promise(function (resolve, reject) {
            var ret = ctx.decodeAudioData(data, resolve, reject);
            if (ret && ret.then) ret.then(resolve, reject);
          });
        })
        .then(function (buffer) { buffers[name] = buffer; })
        .catch(function () {})
        .then(function () { delete loading[name]; });
    }

    function preload() {
      if (!ctx) return;
      Object.keys(defs).forEach(load);
    }

    function unlock() {
      if (!enabled) return;
      var c = ensureContext();
      if (!c) return;
      unlocked = true;
      if (c.state === 'suspended' && c.resume) {
        var p = c.resume();
        if (p && p.catch) p.catch(function () {});
      }
      if (!preloaded) {
        preloaded = true;
        preload();
      }
    }

    function getFallback(name) {
      if (fallback[name]) return fallback[name];
      if (typeof Audio !== 'function') return null;
      var def = defs[name];
      var list = [];
      for (var i = 0; i < fallbackSize; i++) {
        var a = new Audio(urlFor(name));
        a.preload = 'auto';
        a.volume = def.volume;
        list.push(a);
      }
      fallback[name] = { list: list, i: 0 };
      return fallback[name];
    }

    function pickFallback(pool) {
      for (var i = 0; i < pool.list.length; i++) {
        var a = pool.list[i];
        if (a.paused || a.ended) return a;
      }
      // 池子都在响时克隆一个，避免把上一声硬切掉。
      if (pool.list.length < 12) {
        var clone = new Audio(pool.list[0].src);
        clone.preload = 'auto';
        clone.volume = pool.list[0].volume;
        pool.list.push(clone);
        return clone;
      }
      var b = pool.list[pool.i++ % pool.list.length];
      return b;
    }

    function playFallback(name, opts) {
      var pool = getFallback(name);
      if (!pool) return;
      var a = pickFallback(pool);
      var def = defs[name];
      try {
        a.currentTime = 0;
        a.volume = opts && opts.volume != null ? opts.volume : def.volume;
        a.playbackRate = opts && opts.rate ? opts.rate : 1;
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }

    function play(name, opts) {
      if (!enabled || !defs[name]) return;
      var c = ensureContext();
      if (!c) { playFallback(name, opts); return; }
      if (c.state === 'suspended' && c.resume) {
        var r = c.resume();
        if (r && r.catch) r.catch(function () {});
      }
      if (!unlocked) {
        unlocked = true;
        preload();
      }
      var buffer = buffers[name];
      if (!buffer) {
        load(name);
        playFallback(name, opts);
        return;
      }
      try {
        var def = defs[name];
        var src = c.createBufferSource();
        var gain = c.createGain();
        src.buffer = buffer;
        src.playbackRate.value = opts && opts.rate ? opts.rate : 1;
        gain.gain.value = opts && opts.volume != null ? opts.volume : def.volume;
        src.connect(gain);
        gain.connect(c.destination);
        src.onended = function () {
          var idx = active.indexOf(src);
          if (idx >= 0) active.splice(idx, 1);
          try { src.disconnect(); gain.disconnect(); } catch (e) {}
        };
        active.push(src);
        src.start(0);
      } catch (e) {
        playFallback(name, opts);
      }
    }

    function stopAll() {
      active.slice().forEach(function (src) {
        try { src.stop(); } catch (e) {}
      });
      active.length = 0;
      Object.keys(fallback).forEach(function (name) {
        fallback[name].list.forEach(function (a) {
          try { a.pause(); a.currentTime = 0; } catch (e) {}
        });
      });
    }

    function setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch (e) {}
      if (!enabled) stopAll();
      else unlock();
      return enabled;
    }

    // 浏览器要求首次手势后才能出声；捕获阶段监听，先于游戏按钮。
    if (root.document) {
      var onGesture = function () { unlock(); };
      root.document.addEventListener('pointerdown', onGesture, true);
      root.document.addEventListener('touchstart', onGesture, true);
      root.document.addEventListener('keydown', onGesture, true);
    }

    return {
      play: play,
      preload: function () { unlock(); preload(); },
      unlock: unlock,
      stopAll: stopAll,
      isEnabled: function () { return enabled; },
      setEnabled: setEnabled,
      toggle: function () { return setEnabled(!enabled); }
    };
  }

  root.GameBoxSfx = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
