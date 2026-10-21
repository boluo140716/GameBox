/* 轻量骰子滚动组件（兼容原 SlotMachine 的 active / nextActive / shuffle API）。
 * 仅用于大富翁与飞行棋的骰子动画，无外部依赖。
 */
(function () {
  'use strict';

  function clampIndex(value, max) {
    var n = Number(value);
    if (!isFinite(n)) return 0;
    n = Math.floor(n);
    if (n < 0) return 0;
    if (n > max) return max;
    return n;
  }

  function SlotMachine(element, options) {
    if (!(this instanceof SlotMachine)) return new SlotMachine(element, options);
    this.element = element;
    this.options = Object.assign(
      {
        active: 0,
        delay: 500,
        randomize: function () { return 0; },
      },
      options || {}
    );
    this._max = Math.max(0, element.children.length - 1);
    this._active = clampIndex(this.options.active, this._max);
    this._nextActive = undefined;
    this._hasNextActive = false;
    this._promise = null;
    this.running = false;

    var children = Array.prototype.slice.call(element.children);
    var strip = document.createElement('div');
    strip.className = 'dice-roller-strip';
    strip.style.cssText =
      'display:flex;flex-direction:column;transition:transform .12s cubic-bezier(.2,.7,.3,1);will-change:transform;';
    for (var i = 0; i < children.length; i++) strip.appendChild(children[i]);
    element.appendChild(strip);
    element.style.overflow = 'hidden';

    this.strip = strip;
    this._applyIndex(this._active, true);
  }

  Object.defineProperty(SlotMachine.prototype, 'active', {
    get: function () { return this._active; },
    set: function (value) {
      this._active = clampIndex(value, this._max);
      this._applyIndex(this._active, false);
    },
  });

  Object.defineProperty(SlotMachine.prototype, 'nextActive', {
    get: function () { return this._nextActive; },
    set: function (value) {
      this._nextActive = clampIndex(value, this._max);
      this._hasNextActive = true;
    },
  });

  SlotMachine.prototype._applyIndex = function (index, immediate) {
    var height = this.element.clientHeight || 110;
    if (immediate) this.strip.style.transition = 'none';
    this.strip.style.transform = 'translate3d(0,' + (-index * height) + 'px,0)';
    if (immediate) {
      void this.strip.offsetHeight;
      this.strip.style.transition = '';
    }
  };

  SlotMachine.prototype.shuffle = function (spins) {
    if (this.running) return this._promise || Promise.resolve(this._active);
    var self = this;
    var target;
    if (this._hasNextActive) {
      target = this._nextActive;
      this._hasNextActive = false;
    } else {
      target = this.options.randomize(this._active, this._max + 1);
    }
    target = clampIndex(target, this._max);
    var frames = 6 + Math.max(0, Math.floor(spins || 0)) * 3;
    var frame = 0;
    this.running = true;

    this._promise = new Promise(function (resolve) {
      function tick() {
        if (frame < frames) {
          var randomIndex = Math.floor(Math.random() * (self._max + 1));
          self._applyIndex(randomIndex, false);
          frame++;
          setTimeout(tick, 42);
          return;
        }
        self._active = target;
        self._nextActive = target;
        self._applyIndex(target, false);
        setTimeout(function () {
          self.running = false;
          self._promise = null;
          resolve(self._active);
        }, 130);
      }
      tick();
    });
    return this._promise;
  };

  SlotMachine.prototype.stop = function () {
    if (!this.running) return Promise.resolve(this._active);
    return this.shuffle(0);
  };

  window.SlotMachine = SlotMachine;
})();
