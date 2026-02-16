# SahyogAI — Setup Guide

Two terminals. Five minutes.

## Backend (Python + FastAPI + Gemini)

```bash
cd backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your Gemini API key
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY

# 3. Run
GEMINI_API_KEY=your_key_here uvicorn main:app --reload --port 8000
```

API will be live at http://localhost:8000
Docs at http://localhost:8000/docs

---

## Frontend (React + Vite)

```bash
cd frontend

# 1. Install
npm install

# 2. Run
npm run dev
```

Dashboard at http://localhost:3000

---

## Get a Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy it into your `.env` file

Free tier is sufficient for hackathon use.

---

## Architecture at a Glance

```
POST /analyse  →  Financial Context Builder
               →  Scheme Discovery Engine (x5 schemes)
               →  Loan Suitability Engine
               →  Decision Comparison Layer
               ←  Full JSON response
```

All four engines run sequentially, each passing context to the next.
The frontend renders results across 5 dashboard tabs.
