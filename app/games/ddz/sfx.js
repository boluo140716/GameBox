/* 斗地主 · 音效（复用童年棋牌的音频素材，不新增音频文件） */
(function () {
  'use strict';

  var DEFS = {
    deal: { file: 'common/draw.mp3', volume: 0.32 },
    tap: { file: 'common/click.mp3', volume: 0.32 },
    play: { file: 'card/move.mp3', volume: 0.5 },
    bomb: { file: 'card/destroy.mp3', volume: 0.45 },
    win: { file: 'common/victory.mp3', volume: 0.42 },
    lose: { file: 'common/lose.mp3', volume: 0.38 }
  };

  if (!window.GameBoxSfx) throw new Error('GameBoxSfx must load before ddz/sfx.js');

  window.DDZ_SFX = window.GameBoxSfx.create({
    base: '../../childhood/apps/audio/',
    key: 'gamebox_ddz_sound',
    defs: DEFS,
    pool: 4
  });
})();
