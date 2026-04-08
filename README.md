# EduPilot AI

EduPilot AI is a full-stack platform for evaluating student answers using AI.
It supports document upload (PDF, image, TXT, CSV), text extraction, answer scoring, feedback generation, and analytics tracking.

## Description

This project combines:

- A `Next.js` frontend for upload, result history, and analytics dashboards
- A `FastAPI` backend for OCR, parsing, and AI evaluation
- `Supabase` for data storage and file storage
- `OpenRouter` for model-based answer evaluation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | FastAPI, Uvicorn, Python |
| AI | OpenRouter |
| Database | Supabase Postgres |
| File Storage | Supabase Storage |

## Project Structure

```text
.
|-- app/                  # Next.js routes/pages
|-- backend/              # FastAPI app (routes, services)
|-- components/           # Shared UI components
|-- lib/                  # Frontend API + Supabase helpers
|-- supabase/setup.sql    # Database + storage bootstrap SQL
|-- vercel.json           # Multi-service Vercel config
`-- README.md
```

## Prerequisites

- Node.js `>=22 <23`
- npm
- Python `3.10+`
- Git
- Tesseract OCR installed and available in PATH
- Supabase project
- OpenRouter API key

## Environment Setup

Create the following environment files.

### Root `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### `backend/.env`

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=arcee-ai/trinity-large-preview:free
```

## Supabase Setup

1. Open Supabase SQL Editor.
2. Run SQL from `supabase/setup.sql`.
3. Verify the setup created:
- `public.submissions` table
- `public.results` table
- `submissions` storage bucket
- RLS policies for tables and bucket access

## Installation

### Frontend

```bash
npm install
```

### Backend (Windows)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Backend (macOS/Linux)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

## Run Locally

Use two terminals.

### Terminal 1: Backend

```powershell
cd backend
venv\Scripts\activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Frontend

```bash
npm run dev
```

Open these URLs:

- Frontend: `http://localhost:3000`
- Backend health: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/upload` | Extract text from uploaded file |
| `POST` | `/evaluate` | Evaluate student answer against model answer |
| `POST` | `/analytics` | Generate weak-topic analytics from mistakes |
| `GET` | `/health` | Health check |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build frontend for production |
| `npm run start` | Start production frontend server |
| `npm run lint` | Run ESLint |

## Deployment

Multi-service deployment is configured via `vercel.json`:

- `frontend` service at `/` (Next.js)
- `backend` service at `/_/backend`

Set all required environment variables in Vercel before deployment.

### Vercel Environment Variables

Set these in **Project Settings -> Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-project.vercel.app/_/backend
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=arcee-ai/trinity-large-preview:free
```

Notes:

- Do not use `http://127.0.0.1:8000` in Vercel.
- OCR/PDF routes require runtime dependencies (`pytesseract`, `pdfplumber`) and Tesseract binary for image OCR.
- If OCR/PDF dependencies are unavailable in a serverless runtime, upload endpoints now return clear `422` messages instead of crashing app startup.

## Troubleshooting

| Problem | Fix |
|---|---|
| `git` not recognized | Install Git, then reopen terminal |
| `OPENROUTER_API_KEY is missing` | Add key in `backend/.env` |
| OCR not working | Install Tesseract and add it to PATH |
| CORS issue in local dev | Keep frontend at `http://localhost:3000` |

## License

Proprietary/internal project.
