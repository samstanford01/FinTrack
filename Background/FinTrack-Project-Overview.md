# FinTrack — Project Overview

## What It Is

FinTrack is a web-based financial literacy and budgeting assistant aimed at UK university students. It helps users manage money, see spending patterns, and build better financial habits through a conversational AI assistant and light gamification.

## Tech Stack

- **Frontend:** React (Tailwind CSS or similar)
- **Backend:** Python (Flask or FastAPI)
- **Database:** SQLite in development, PostgreSQL in production
- **NLP/AI:** OpenAI API or a HuggingFace model for the assistant
- **Hosting:** Vercel (frontend), Railway or Render (backend)

## Planned Features

1. **User authentication** — Email/password sign-up and login with persistent sessions.
2. **Transaction management** — Add, edit, and delete transactions with category (Food, Transport, Entertainment, Rent, Income), date, and amount.
3. **Budget dashboard** — Monthly view of total income, total spent, and savings; category budget bars showing percentage used.
4. **AI Financial Assistant (FinBot)** — Chatbot that answers questions about spending, gives saving tips, explains concepts (ISAs, compound interest, 50/30/20), and can flag overspending, using the user’s transaction data for context.
5. **Gamification** — XP for logging transactions, staying under budget, and using FinBot; badges (e.g. “First Budget Set”, “Saver Starter”, “3-Month Streak”); level progression.

## Design

Dark theme, clean and modern. Palette: dark background (`#0a0a0f`), purple accent (`#7c6cfc`), green secondary (`#4fd1a5`). Four main areas: **Dashboard**, **AI Assistant**, **Transactions**, **Achievements**. Aim is a polished, professional look.

## Ethics and Accessibility

- No real banking or payment credentials; users enter transactions manually to avoid sensitive data risk.
- Clear data privacy notice at registration.
- Accessible colour contrast.
- Tone and copy aimed at students under financial pressure — supportive and non-judgemental.

## Context

Cardiff University **CM3202 Emerging Technologies** group project. Focus technologies: **NLP/ML** and **Fintech**. Demo in Week 10; assessment covers technical quality, design and usability, societal/ethical impact, and robustness. Individual report: Introduction, Related Work, Technical Implementation, Impact, Critical Reflection, Conclusions.

## Out of Scope

- Real payment processing or bank integrations
- Native mobile app (web only)
- Multi-currency support

