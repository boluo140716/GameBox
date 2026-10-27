/* 消消乐 · 音效（复用童年棋牌的音频素材，不新增音频文件） */
(function () {
  'use strict';

  var DEFS = {
    swap: { file: 'board/slide.mp3', volume: 0.36 },
    match: { file: 'board/remove.mp3', volume: 0.4 },
    big: { file: 'board/take.mp3', volume: 0.46 },
    fail: { file: 'common/error.mp3', volume: 0.26 },
    tap: { file: 'common/click.mp3', volume: 0.28 },
    shuffle: { file: 'board/place.mp3', volume: 0.34 },
    win: { file: 'common/victory.mp3', volume: 0.42 },
    lose: { file: 'common/lose.mp3', volume: 0.38 }
  };

  if (!window.GameBoxSfx) throw new Error('GameBoxSfx must load before linklink/sfx.js');

  window.LINK_SFX = window.GameBoxSfx.create({
    base: '../../childhood/apps/audio/',
    key: 'gamebox_link_sound',
    defs: DEFS,
    pool: 4
  });
})();
