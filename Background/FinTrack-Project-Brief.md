# Project Brief: FinTrack — Student Financial Literacy Web Application

## Overview

Build a web-based financial literacy and budgeting assistant designed for UK university students. The application should help students manage their money, understand their spending habits, and develop healthy financial behaviours through an NLP-powered assistant and gamification mechanics.

## Tech Stack

- **Frontend:** React (with Tailwind CSS or similar)
- **Backend:** Python with Flask or FastAPI
- **Database:** SQLite (development) / PostgreSQL (production)
- **NLP/AI:** OpenAI API or a HuggingFace model for the conversational assistant
- **Hosting:** Vercel (frontend) + Railway or Render (backend)

## Core Features to Build

1. **User Authentication** — register/login with email and password, persistent sessions
2. **Transaction Management** — add, edit, delete transactions with categories (Food, Transport, Entertainment, Rent, Income), date, and amount
3. **Budget Dashboard** — monthly overview showing total income, total spent, and savings progress; visual budget bars per category showing percentage used
4. **AI Financial Assistant (FinBot)** — a conversational NLP chatbot that can answer questions about the user's spending, give saving tips, explain financial concepts (ISAs, compound interest, budgeting rules like 50/30/20), and flag overspending in specific categories. Should have context awareness of the user's actual transaction data.
5. **Gamification Layer** — XP points awarded for logging transactions, staying under budget, and using FinBot; achievement badges (e.g. "First Budget Set", "Saver Starter", "3-Month Streak"); user level progression system

## Design Direction

Dark theme with a clean, modern aesthetic. The demo uses:

- Dark background: `#0a0a0f`
- Purple accent: `#7c6cfc`
- Green secondary accent: `#4fd1a5`

Four main navigation tabs: **Dashboard**, **AI Assistant**, **Transactions**, **Achievements**. Should feel polished and professional, not like a student project.

## Key Ethical/Accessibility Considerations to Build In

- No real banking credentials — users manually log transactions (avoids data security risk)
- Clear data privacy notice on registration
- Accessible colour contrast ratios
- Designed with financially struggling students in mind — non-judgemental language throughout

## Academic Context

This is for a **Cardiff University CM3202 Emerging Technologies** module group project. The two official emerging technologies being demonstrated are **NLP-ML** and **Fintech**. The project will be demoed in Week 10 and assessed on: technical quality and functionality, design and usability, societal/ethical impact, and robustness. The individual written report follows this structure: Introduction, Related Work, Technical Implementation, Impact, Critical Reflection, Conclusions.

## Out of Scope

- Real payment processing or bank integrations
- Mobile app (web only)
- Multi-currency support
