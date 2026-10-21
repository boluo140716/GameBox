/* 游戏盒 GameBox — 游戏清单
 * childhood（27 款）来源：https://github.com/AloysHF/childhood
 * 另外 7 款由游戏盒重制为纯前端单机玩法，不依赖服务端。
 */
window.GAMEBOX_GAMES = [
  // ── 经典四件套（首屏推荐）──
  {
    id: 'g2048', name: '2048', icon: '🔢', cat: 'arcade', tag: '街机休闲', featured: true,
    kind: 'local', src: 'games/g2048/index.html',
    desc: '重制版 2048：经典 4×4 合并玩法，撤销、最高分、键盘与触屏滑动。',
  },
  {
    id: 'gomoku', name: '五子棋', icon: '⚫', cat: 'childhood', tag: '棋类', featured: true,
    kind: 'childhood', src: 'childhood/apps/board-game/gomoku/index.html',
    img: 'childhood/images/board-game/五子棋.jpg',
    desc: '15×15 棋盘，双人对战或人机对战，先连成五子者胜。',
  },
  {
    id: 'chinese-chess', name: '中国象棋', icon: '車', cat: 'childhood', tag: '棋类', featured: true,
    kind: 'childhood', src: 'childhood/apps/board-game/chinese-chess/index.html',
    img: 'childhood/images/board-game/象棋.jpg',
    desc: '完整象棋规则，支持双人与人机对战，可悔棋。',
  },
  {
    id: 'klotski', name: '华容道', icon: '🧩', cat: 'arcade', tag: '益智', featured: true,
    kind: 'local', src: 'games/klotski/index.html',
    desc: '重制版华容道：横刀立马、拖动/方向键、撤销、最佳步数。',
  },

  // ── 自研单机牌桌 ──
  {
    id: 'ddz', name: '斗地主', icon: '🃏', cat: 'table', tag: '牌桌',
    kind: 'local', src: 'games/ddz/index.html',
    desc: '单机三人斗地主，你 vs 两个 AI，支持提示、炸弹、王炸。',
  },
  {
    id: 'mahjong', name: '麻将', icon: '🀄', cat: 'table', tag: '牌桌',
    kind: 'local', src: 'games/mahjong/index.html',
    desc: '推倒胡单机版，你 vs 三个 AI，支持吃、碰、杠、胡。',
  },
  // ── 童年棋牌：卡牌 ──
  {
    id: 'knife-kills-chicken', name: '刀杀鸡', icon: '🔪', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/knife-kills-chicken/index.html',
    img: 'childhood/images/card-game/刀杀鸡.jpg', desc: '经典童年卡牌对战。',
  },
  {
    id: 'dragon-tiger-fight', name: '龙虎斗', icon: '🐉', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/dragon-tiger-fight/index.html',
    img: 'childhood/images/card-game/龙虎斗.jpg', desc: '翻牌比大小的童年卡牌游戏。',
  },
  {
    id: 'animal-chess-card', name: '兽棋', icon: '🐘', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/animal-chess/index.html',
    img: 'childhood/images/card-game/兽旗.jpg', desc: '动物卡牌对战，大吃小。',
  },
  {
    id: 'card-army-chess', name: '军师旅团营', icon: '🎖️', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/chinese-army-chess/index.html',
    img: 'childhood/images/card-game/军师旅团营.jpg', desc: '翻翻棋玩法的军棋卡牌。',
  },
  {
    id: 'cat-and-mouse', name: '猫捉老鼠', icon: '🐱', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/cat-and-mouse/index.html',
    img: 'childhood/images/card-game/猫捉老鼠.jpg', desc: '猫鼠追逐的经典卡牌游戏。',
  },
  {
    id: 'little-emperor', name: '小皇帝', icon: '👑', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/little-emperor/index.html',
    img: 'childhood/images/card-game/小皇帝.jpg', desc: '童年卡牌角色对战。',
  },
  {
    id: 'guan-da-zhuo-zei', name: '布告棋', icon: '📜', cat: 'card', tag: '卡牌',
    kind: 'childhood', src: 'childhood/apps/card-game/guan-da-zhuo-zei/index.html',
    img: 'childhood/images/card-game/官打捉贼.jpg', desc: '官打捉贼，经典洋画片游戏。',
  },

  // ── 童年棋牌：棋盘 ──
  {
    id: 'reversi', name: '黑白棋', icon: '⚪', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/reversi/index.html',
    img: 'childhood/images/board-game/黑白棋.jpg', desc: '奥赛罗玩法，夹住即可翻子。',
  },
  {
    id: 'checkers', name: '国际跳棋', icon: '🔴', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/checkers/index.html',
    img: 'childhood/images/board-game/国际跳棋.jpg', desc: '经典国际跳棋规则。',
  },
  {
    id: 'international-chess', name: '国际象棋', icon: '♞', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/international-chess/index.html',
    img: 'childhood/images/board-game/国际象棋.jpg', desc: '完整国际象棋规则，支持人机。',
  },
  {
    id: 'board-army-chess', name: '军棋', icon: '🪖', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/chinese-army-chess/index.html',
    img: 'childhood/images/board-game/军棋.jpg', desc: '陆战棋盘版军棋。',
  },
  {
    id: 'chinese-checkers', name: '中国跳棋', icon: '⭐', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/chinese-checkers/index.html',
    img: 'childhood/images/board-game/中国跳棋.jpg', desc: '六角星棋盘，跳子占营。',
  },
  {
    id: 'go', name: '围棋', icon: '⚫', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/go/index.html',
    img: 'childhood/images/board-game/围棋.jpg', desc: '围地吃子，经典围棋对局。',
  },
  {
    id: 'dou-shou-qi', name: '斗兽棋', icon: '🦁', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/dou-shou-qi/index.html',
    img: 'childhood/images/board-game/斗兽棋.jpg', desc: '象狮虎豹狼狗猫鼠，大吃小。',
  },
  {
    id: 'shogi', name: '将棋', icon: '🀄', cat: 'childhood', tag: '棋类',
    kind: 'childhood', src: 'childhood/apps/board-game/shogi/index.html',
    img: 'childhood/images/board-game/将棋.jpg', desc: '日本传统将棋，吃子可再用。',
  },

  // ── 童年棋牌：骰子 ──
  {
    id: 'flying-chess', name: '飞行棋', icon: '✈️', cat: 'childhood', tag: '骰子',
    kind: 'childhood', src: 'childhood/apps/dice-game/flying-chess/index.html',
    img: 'childhood/images/dice-game/飞行棋.jpg', desc: '掷骰起飞，先把四架飞机送回终点。',
  },
  {
    id: 'monopoly', name: '大富翁', icon: '🎩', cat: 'childhood', tag: '骰子',
    kind: 'childhood', src: 'childhood/apps/dice-game/monopoly/index.html',
    img: 'childhood/images/dice-game/大富翁.jpg', desc: '买地收租，经典地产大亨。',
  },

  // ── 童年棋牌：怀旧棋盘 ──
  {
    id: 'tic-tac-toe', name: '井字棋', icon: '❌', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/tic-tac-toe/index.html',
    img: 'childhood/images/childhood-board-game/井字棋.jpg', desc: '三连即胜，双人 / 人机。',
  },
  {
    id: 'lang-chi-yang', name: '狼吃羊', icon: '🐺', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/lang-chi-yang/index.html',
    img: 'childhood/images/childhood-board-game/狼吃羊.jpg', desc: '狼羊博弈的怀旧棋盘游戏。',
  },
  {
    id: 'bie-mao-keng', name: '憋茅坑', icon: '🕳️', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/bie-mao-keng/index.html',
    img: 'childhood/images/childhood-board-game/憋茅坑.jpg', desc: '地方传统棋盘游戏。',
  },
  {
    id: 'xiao-mao-diao-yu', name: '小猫钓鱼', icon: '🐟', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/xiao-mao-diao-yu/index.html',
    img: 'childhood/images/childhood-board-game/小猫钓鱼.jpg', desc: '童年怀旧棋盘游戏。',
  },
  {
    id: 'zuan-niu-jiao-jian', name: '钻牛角尖', icon: '🐂', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/zuan-niu-jiao-jian/index.html',
    img: 'childhood/images/childhood-board-game/钻牛角尖.jpg', desc: '童年怀旧棋盘游戏。',
  },
  {
    id: 'bai-si-long', name: '摆四龙', icon: '🐲', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/bai-si-long/index.html',
    img: 'childhood/images/childhood-board-game/摆四龙.jpg', desc: '童年怀旧棋盘游戏。',
  },
  {
    id: 'ma-yi-ban-jia', name: '蚂蚁搬家', icon: '🐜', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/ma-yi-ban-jia/index.html',
    img: 'childhood/images/childhood-board-game/蚂蚁搬家.jpg', desc: '童年怀旧棋盘游戏。',
  },
  {
    id: 'si-bu-ding', name: '四步钉', icon: '📌', cat: 'childhood', tag: '怀旧',
    kind: 'childhood', src: 'childhood/apps/childhood-board-game/si-bu-ding/index.html',
    img: 'childhood/images/childhood-board-game/四步钉.jpg', desc: '童年怀旧棋盘游戏。',
  },

  // ── 街机休闲（游戏盒重制）──
  {
    id: 'spider', name: '蜘蛛纸牌', icon: '🕷️', cat: 'arcade', tag: '纸牌',
    kind: 'local', src: 'games/spider/index.html',
    desc: '重制版蜘蛛纸牌：单/双/四花色、撤销、提示、最佳成绩。',
  },
  {
    id: 'minesweeper', name: '扫雷', icon: '💣', cat: 'arcade', tag: '益智',
    kind: 'local', src: 'games/minesweeper/index.html',
    desc: '重制版扫雷：三种难度、首击安全、长按插旗、最佳成绩。',
  },
  {
    id: 'link', name: '消消乐', icon: '🍬', cat: 'arcade', tag: '消除',
    kind: 'local', src: 'games/linklink/index.html',
    desc: '相邻滑动三连消除：连锁、连击、步数目标与关卡进度，手机触屏友好。',
  },


];
