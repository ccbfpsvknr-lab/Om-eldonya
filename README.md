# أم الدنيا 🇪🇬

لعبة جماعية مصرية الطابع (Egyptian-themed party/board game) — **المرحلة الأولى: الأساس فقط**.

This repository currently contains the **Stage 1 foundation**: architecture, routing,
state management, theme system, reusable components, modal system, full Arabic **RTL**
support, and the responsive UI shell. **Gameplay is intentionally not implemented yet**,
and online/multiplayer mode is deferred to a later stage.

## ✨ Overview

أم الدنيا is built mobile-first with a Pharaonic visual identity — midnight-Nile blue,
pharaoh gold, Nile teal, and terracotta accents, with decorative Arabic display type
(Rakkas) over a clean body face (Cairo). Everything renders right-to-left by default.

The app flows through six screens:

| Screen | Route | Purpose |
| --- | --- | --- |
| `MainMenu` | `/` | يلا بينا · ادخل على لعبة · قواعد اللعب |
| `CreateGame` | `/create-game` | اختيار نوع اللعبة وعدد اللاعبين والجولات |
| `PlayerSetup` | `/player-setup` | إضافة وإزالة اللاعبين |
| `RandomReveal` | `/random-reveal` | شاشة القرعة (هيكل مبدئي) |
| `GameBoard` | `/game-board` | طاولة اللعب (هيكل فقط) |
| `WinnerScreen` | `/winner` | الفائز والألقاب والإحصائيات |

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite 5** (dev server + build)
- **Tailwind CSS 3** (token-driven theme via CSS variables)
- **Zustand 4** (game, players, and modal stores)
- **React Router 6** (centralized, lazy-loaded routes)

## 🚀 Installation & Running

> Requires Node.js 18+.

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# type-check + production build
npm run build

# preview the production build locally
npm run preview

# lint
npm run lint
```

## 📁 Folder Structure

```
om-el-donya/
├── index.html              # RTL + Arabic <html dir="rtl" lang="ar">, fonts, #modal-root
├── public/
│   └── scarab.svg          # favicon
├── src/
│   ├── main.tsx            # React 18 entry point
│   ├── App.tsx             # ThemeProvider + Router + global ModalRoot
│   ├── index.css           # Tailwind layers + theme tokens (CSS vars) + RTL base
│   │
│   ├── router/
│   │   ├── routes.ts       # centralized, lazy-loaded route table
│   │   └── index.tsx       # data router + GameLayout shell + Suspense
│   │
│   ├── store/              # Zustand stores
│   │   ├── useGameStore.ts     # phase, config, result
│   │   ├── usePlayersStore.ts  # players list + selectors
│   │   ├── useModalStore.ts    # stack-based modal system
│   │   └── index.ts
│   │
│   ├── theme/
│   │   ├── tokens.ts       # programmatic theme tokens + applyTheme()
│   │   └── ThemeProvider.tsx
│   │
│   ├── components/
│   │   ├── ui/             # Button, Card, Input, IconButton, Badge, Spinner, Modal
│   │   ├── layout/         # GameLayout, ScreenContainer, TopBar
│   │   ├── feedback/       # ModalRoot (portal), ConfirmDialog
│   │   └── decor/          # Logo, PatternBackground
│   │
│   ├── features/           # one folder per screen
│   │   ├── main-menu/MainMenu.tsx
│   │   ├── create-game/CreateGame.tsx
│   │   ├── player-setup/PlayerSetup.tsx
│   │   ├── random-reveal/RandomReveal.tsx
│   │   ├── game-board/GameBoard.tsx
│   │   └── winner/WinnerScreen.tsx
│   │
│   ├── hooks/
│   │   └── useModal.tsx    # open/close + promise-based confirm()
│   │
│   ├── lib/
│   │   ├── cn.ts           # className combiner
│   │   └── constants.ts    # ROUTES, palette, limits, id/room-code helpers
│   │
│   └── types/
│       └── index.ts        # domain types (Player, GameConfig, GamePhase, …)
│
├── tailwind.config.js      # theme tokens → Tailwind, fonts, animations
├── postcss.config.js
├── vite.config.ts          # @ alias → ./src
├── tsconfig.json / tsconfig.node.json
└── .eslintrc.cjs
```

## 🧭 Notes & Next Stages

- **No gameplay logic yet.** `RandomReveal` and `GameBoard` are layout shells; the
  "إنهاء (مؤقت)" button on the board is temporary scaffolding to reach the winner screen.
- **Winner titles** (كبير البلد، ابن حظ، فقري، بيل جيتس، زبون البوكس، كبير السماسرة، المعلم)
  and statistics are placeholders awaiting the scoring system.
- **Online mode** (joining a room by code) is UI-only for now.
- Adding a new screen is a single entry in `src/router/routes.ts`.

---

نسخة تجريبية — الأساس جاهز، واللعب جاي 🎲
