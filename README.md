<p align="center">
  <img src="docs/logo.png" width="100" alt="ShopSnap logo">
</p>

# ShopSnap

Turn WhatsApp order screenshots into a daily sales report. Built for small shops. The AI runs on your own PC. Customer numbers and sales never leave it.

Built for the Hacktoberfest 2026 Open-Source AI Challenge, Week 2: Side Hustle.

## What it does

1. Drop WhatsApp screenshots and pick the business date.
2. A local vision model reads the chat. A local text model turns it into orders.
3. You review and fix the orders. Nothing is saved until you click Confirm.
4. See total sales, who has not paid, and per-customer totals.
5. Mark orders paid (full or part) and copy a follow-up message for WhatsApp.

Chats that show only a saved name go to a Pending list. You attach a phone number once, and ShopSnap remembers that name for next time.

## Requirements

- [Bun](https://bun.sh) 1.x
- [Ollama](https://ollama.com/download), installed and running
- About 6 GB free disk for the models and 8 GB RAM

## Setup

```bash
git clone https://github.com/sasmeee/shopsnap.git
cd shopsnap
git checkout dev
bun install
bun run dev
```

Open http://localhost:3000. On first run the app downloads the two AI models by itself (one time, needs internet). After that it works offline.

For a production run:

```bash
bun run build
bun run start
```

## Settings (optional)

Put these in `.env.local`:

| Variable       | Default                  | Meaning                         |
| -------------- | ------------------------ | ------------------------------- |
| `VISION_MODEL` | `gemma3:4b`              | Model that reads the screenshot |
| `TEXT_MODEL`   | `qwen2.5:3b`             | Model that extracts orders      |
| `OLLAMA_URL`   | `http://localhost:11434` | Where Ollama runs               |
| `DB_PATH`      | `data/shopsnap.db`       | SQLite file                     |

## How it works

```
screenshot -> resize -> vision model (text) -> text model (JSON)
-> code checks -> you review -> SQLite -> report
```

- Phone number is the only customer ID. A chat name never creates a customer.
- Code, not the model, decides if the chat header is a number or a name.
- Every amount the model returns must appear in the chat text. Items must add up to the total. Failed checks block Confirm.
- "Paid" is only accepted if the chat has payment words. Otherwise it becomes unknown and you decide.
- The same screenshot twice is never counted twice (hash plus order position).
- Only the screenshot hash is stored, never the image.

## Accuracy

Measured on 10 fake screenshots with `bun run eval`. See the write-up for the full table and what failed.

```bash
bun run samples   # makes samples/ (fake chats, gitignored)
bun run eval      # runs the pipeline and prints accuracy
```

Real chats are messier than the fake ones. Expect lower numbers. Always use the review screen.

## Privacy

Everything stays on your PC. The database is `data/shopsnap.db` and is gitignored. Demo data is fake.

## Stack

Next.js (App Router, TypeScript), shadcn/ui, Tailwind, SQLite (better-sqlite3), Ollama, zod, libphonenumber-js, sharp.

## Limits

- English and romanized Sinhala ("Singlish") only. Sinhala script is not tested.
- Small models misread some chats. A forced re-read can find an order the first read missed.
- Payment slip reading, desktop packaging and more languages are future work.
