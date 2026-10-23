# SnailType

<p align="center">
  <strong>A little slower. A little better.</strong>
</p>

<p align="center">
  A calm, minimal typing speed test designed to help you measure your speed, improve accuracy, and build consistency.
</p>

<p align="center">
  <a href="https://snailtype.in">Live Website</a> ·
  <a href="https://github.com/Devrohitanand/snailtype">Source Code</a>
</p>

---

## Preview

![SnailType website preview](screenshots/homepage.png)

*SnailType — a distraction-free typing experience with a minimal dark interface and a soft pink accent.*

## Overview

SnailType is a single-page typing test application built with Next.js, React, TypeScript, and Tailwind CSS. It focuses on a quiet, deliberate typing experience with real-time performance tracking and a minimal interface.

The application runs entirely in the browser. It requires no account or backend service, and stores personal preferences and statistics locally.

## Features

- **Multiple test modes** — timed tests of 15, 30, or 60 seconds and word-count tests of 10, 25, or 50 words.
- **Performance metrics** — track words per minute (WPM), accuracy, correct characters, errors, and duration.
- **Typing engine** — character-level validation, backspace corrections, word-target completion, and responsive caret positioning.
- **Interactive preview** — a typewriter-style preview that transitions into the typing experience.
- **Settings and profile** — quick-access popovers without additional page navigation.
- **Keyboard shortcuts** — restart tests, switch passages, and correct input without leaving the keyboard.
- **Local persistence** — browser-based storage for preferences and personal statistics.
- **Responsive interface** — a dark, minimal design with restrained pink accents.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Tab` | Restart with the same passage |
| `Shift + Tab` | Restart with a new passage |
| `Enter` | Try again or restart |
| `Esc` | Load a new passage |
| `Backspace` | Correct a typed character |

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Persistence:** Browser `localStorage`

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Devrohitanand/snailtype.git
cd snailtype
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

## Quality Checks

Run the available checks before submitting changes:

```bash
npm run typecheck
npm run lint
npm run test
```

To verify the production build:

```bash
npm run build
```

## Project Structure

```text
snailtype/
├── public/                 # Static assets
├── scripts/                # Visual checks and verification utilities
├── src/
│   ├── app/                # App Router, metadata and global styles
│   ├── components/         # Typing interface and UI components
│   └── lib/                # Typing engine, passages and storage
├── tests/                  # Automated tests
├── package.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## Design Principles

SnailType is built around three principles:

- **Clarity:** keep attention on the text being typed.
- **Feedback:** make typing speed and accuracy easy to understand.
- **Restraint:** use minimal interface elements and subtle visual accents instead of unnecessary distractions.

The interface uses a near-black background, muted text, and a soft pink accent (`#FF6B9F`).

## Current Scope

- English-language typing passages.
- Local browser storage without cloud synchronization.
- No user accounts or remote personal-data storage.
- Font rendering depends on locally available fonts and the configured fallback stack.

## Contributing

Contributions, bug reports, and suggestions are welcome. For substantial changes, open an issue first to discuss the proposed improvement.

## License

No license has been specified yet. Unless a license is added to the repository, the project remains under its default copyright protection.

---

<p align="center">
  <strong>SnailType</strong><br />
  <em>A little slower. A little better.</em>
</p>
