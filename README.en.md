<p align="center">
  <img src="docs/images/icon.png" width="116" alt="GameBox icon" />
</p>

<h1 align="center">GameBox</h1>

---

<p align="center"><strong>35 classic mini games. Open and play.</strong></p>

<p align="center">Werewolf · Childhood collection · 2048 · Dou Dizhu · Mahjong · Chinese Chess · Aeroplane Chess · Monopoly</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33.4-47848F?logo=electron&logoColor=white&labelColor=2B2B2B" alt="Electron" />
  <img src="https://img.shields.io/badge/Capacitor-6.2-119EFF?logo=capacitor&logoColor=white&labelColor=2B2B2B" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Windows-10%2B-0078D4?logo=windows&logoColor=white&labelColor=2B2B2B" alt="Windows" />
  <img src="https://img.shields.io/badge/Android-5.1%2B-3DDC84?logo=android&logoColor=white&labelColor=2B2B2B" alt="Android" />
  <img src="https://img.shields.io/badge/Games-35-FF6B6B?labelColor=2B2B2B" alt="35 games" />
  <img src="https://img.shields.io/badge/License-MIT-3DA639?labelColor=2B2B2B" alt="License" />
</p>

<p align="center"><a href="README.md">简体中文</a> ｜ <strong>English</strong></p>

---

## What is GameBox

GameBox merges the **childhood game collection** with a set of **rebuilt offline mini games** into one app, packaged for Windows (EXE) and Android (APK). Every game is single-player and starts against AI by default — no network required.

## Screenshots

| GameBox home | Dou Dizhu |
|:---:|:---:|
| ![GameBox home](docs/images/home.png) | ![Dou Dizhu](docs/images/ddz-room.png) |

| Mahjong | Chinese Chess |
|:---:|:---:|
| ![Mahjong](docs/images/mahjong.png) | ![Chinese Chess](docs/images/chinese-chess.png) |

| Childhood collection | 2048 |
|:---:|:---:|
| ![Childhood collection](docs/images/childhood.png) | ![2048](docs/images/g2048.png) |

## Included games (35)

**Classic four**: 2048, Gomoku, Chinese Chess, Klotski.

**Table games (3, rebuilt by GameBox)**

- **Dou Dizhu**: you vs two AI players — chips, room tiers, bidding, bombs, rocket, hints, rematch.
- **Mahjong**: push-down hu, you vs three AI players — chi, pon, kong, hu, wall draw.
- **Werewolf**: 6- or 9-player offline games, you vs five or eight rule-based AI players — speeches, seer checks, witch potions, votes, last words, spectator mode and a post-game replay.

**Childhood card & board games (27, from [AloysHF/childhood](https://github.com/AloysHF/childhood))**

- Cards: Knife Kill Chicken, Dragon Tiger Fight, Beast Chess, Junshi Lutuan Ying, Cat and Mouse, Little Emperor, Bulletin Chess.
- Boards: Reversi, Gomoku, International Draughts, Chinese Chess, International Chess, Junqi, Chinese Checkers, Go, Dou Shou Qi, Shogi.
- Dice: Aeroplane Chess, Monopoly.
- Retro: Tic-tac-toe, Wolf and Sheep, Bie Mao Keng, Kitten Fishing, Drilling the Horn, Four Dragons, Ants Moving, Four-step Nail.

**Arcade casual (5, rebuilt by GameBox)**

- 2048: classic 4×4 with undo, best score, keyboard and touch swipe.
- Match-3: swap adjacent tiles, clear three or more, chain, combo, move goals and stars.
- Klotski: drag or arrow keys, undo, best move count.
- Spider Solitaire: one / two / four suits, undo, hints.
- Minesweeper: three difficulties, safe first click, flags, chord reveal.

## Build

```bash
# Browser preview
node server.js            # http://127.0.0.1:8899

# Run in Electron
npm start

# Build portable Windows EXE
npm run dist:win

# Build debug Android APK
npx cap sync android
cd android
gradlew.bat assembleDebug
```

## Changes from the original projects

- Added a unified launcher that merges both game sets.
- Rebuilt 2048 as a pure front-end 4×4 game with undo, best score, keyboard and touch.
- Replaced the original link-link game with a match-3 game: swap, clear, fall, chain, combo, move goals, levels and stars.
- Added offline Dou Dizhu and Mahjong (chi / pon / kong / hu, AI opponents) without a server.
- Added an offline Werewolf game: 6- and 9-player modes, seer / witch / hunter abilities, last words and spectator mode, plus a post-game replay. AI speeches are composed locally by `speech.js` with per-scenario length budgets and two-level de-duplication — no model, API or network.
- Childhood games now default to single-player vs AI; hid multiplayer / online buttons and mode menus, skipped rock-paper-scissors, and removed external links.
- Rebuilt Minesweeper, Spider Solitaire and Klotski as pure front-end games with the GameBox theme and touch support.
- Removed analytics scripts and CDN dependencies; unified card and board backgrounds.
- Fixed the Monopoly dice result, board layout on phones / tablets, and the Aeroplane Chess three-sixes turn handling.

## Known limitations

1. The server-based Dou Dizhu, Mahjong, Gomoku and Chinese Chess from the childhood collection are not included because they need a Go + WebSocket server and SQLite. GameBox provides offline simplified versions instead.
2. Dou Dizhu and Mahjong use simplified rule sets: no wild cards, doubling, rob-the-landlord, fan counting, or rob-kong-hu; the AI is lightweight and suitable for casual play.
3. The APK uses a debug signature. Publishing to an app store requires your own release keystore.
4. Match-3 difficulty is casual; balance may still need tuning based on real play.
5. Werewolf AI speech is generated from local rule templates plus random composition, not a language model. Roughly 9–10% of lines repeat verbatim across games, mostly very short generic lines and fixed claim sentences.
6. Werewolf currently supports only 6- and 9-player setups — no sheriff, white wolf king or other expansion roles.

## Credits & License

- [AloysHF/childhood](https://github.com/AloysHF/childhood) — Apache License 2.0
- 2048 is an independent remake of the classic game; early versions referenced [xthuji/xgames](https://github.com/xthuji/xgames) (MIT), which is no longer bundled since 1.7.0.
- jQuery 4.0.0 (MIT License) is used locally by Monopoly / Aeroplane Chess.
- GameBox itself is MIT licensed. Please keep the original licenses and copyright notices.
