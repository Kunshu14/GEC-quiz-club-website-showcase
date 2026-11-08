# 🎯 Quiz Club Council Suite — Tournament & Operations Platform

> A full-stack tournament management system, question curation repository, and live scoring platform engineered for collegiate trivia competitions.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)

---

## 🌟 Interactive Showcase (1-Click Demo Mode)

This repository includes a **1-Click Recruiter Sandbox** on the landing page. No registration or OAuth approvals required:

* 🛡️ **Admin Persona**: Full governance access — configure the RBAC permissions matrix, manage user access requests, inspect audit trails, and approve question submissions.
* 🎙️ **Quizmaster Persona**: Operational access — design quiz running orders, import rosters from Google Forms, assign desk seating, and manage live scoring rounds.
* 💡 **Club Member Persona**: Participant access — draft and submit questions with live duplicate detection, browse approved categories, and view tournament leaderboards.

---

## 🛠️ Key Technical Features

### 1. 📋 Smart Google Form / Sheets Roster Parser
* **Format Agnostic**: Accepts copy-pasted tab-separated (TSV) rows straight from Google Sheets or uploaded `.csv` files.
* **Auto-Slotting & Heuristics**: Automatically maps columns for multi-member teams (`Member 1`, `Member 2 Name`, `Email`, `College`) and solo participants without strict column ordering.
* **Desk Check-in**: Pre-assigns sequential table/seat numbers and supports live on-spot walk-ins and no-show flags.

### 2. 🏗️ Dynamic Quiz Builder & Export Engine
* **Running Order Assembly**: Drag/organize questions across preliminary and final rounds with target difficulty/category pacing.
* **Automated Presentations**: Exports complete presentation slide decks in **Microsoft PowerPoint (`.pptx`)** and **Canva (`.csv`)** batch format directly from the database.

### 3. 🔍 Question Bank with Duplicate Detection
* **Category & Difficulty Classification**: Multi-tag categorisation (Pop Culture, History, Tech, Entertainment, etc.).
* **Fuzzy Duplicate Checking**: Heuristic duplicate screening prevents submitting similar or repeated trivia questions.
* **Audit Trail**: Every modification, approval, and rejection records an immutable audit log with editor timestamps.

### 4. 📊 Real-Time Tournament Scoring Desk
* **Live Score Entry**: Fast, keyboard-accessible table scoring for multi-round tournaments.
* **Tie-Breaker & Ranking Engine**: Automatically computes rankings, handles tie resolutions, and saves verified final standings.
* **Historical Leaderboards**: Aggregates participant records across seasons into cumulative winner and submission leaderboards.

### 5. 🔐 Database-Driven RBAC (Role-Based Access Control)
* Dynamic permission bitmask architecture (`manage_users`, `manage_questions`, `build_quizzes`, `view_full_pool`).
* Permissions are evaluated fresh on request from the database, ensuring zero-latency permission revocations across server components.

---

## 🏗️ Architecture Overview

```
quiz-club-showcase/
├── prisma/
│   ├── schema.prisma       # Relational models (Users, RBAC, Questions, Quizzes, Rosters, Scores)
│   ├── migrations/         # 10 production SQL migrations
│   └── seed_demo.js        # Synthetic showcase dataset (Users, Trivia, Tournaments, Teams)
├── src/
│   ├── app/                # Next.js 16 App Router (Server Components & Server Actions)
│   │   ├── api/            # Route Handlers (Auth, Health check, Roster Import, PPTX Export)
│   │   ├── dashboard/      # Council member dashboard
│   │   ├── questions/      # Question bank & submission interfaces
│   │   ├── quizzes/        # Quiz builder, running orders, and score sheets
│   │   └── admin/          # RBAC & system governance
│   ├── components/         # Reusable Neo-Brutalist design system
│   │   ├── auth/           # 1-Click Demo role selectors & OAuth
│   │   ├── roster/         # Google Form parser modal & desk check-in
│   │   ├── quizzes/        # PowerPoint & Canva exporter modals
│   │   └── scoring/        # Real-time multi-round score sheets
│   └── lib/                # Core business logic (access control, scoring, imports)
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* Node.js 18+ (tested with Node 20 / 22)
* A PostgreSQL instance (local or hosted on [Supabase](https://supabase.com))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/quiz-club-showcase.git
cd quiz-club-showcase
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Postgres connection strings and generate an `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Apply Migrations & Seed Showcase Data
```bash
# Push database migrations
npx prisma migrate deploy

# Seed with 3 demo personas, 20+ trivia questions, and sample tournaments
npm run seed:demo
```

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Click any of the **1-Click Demo Role** buttons to explore!

---

## 📄 License
MIT © [Your Name]

