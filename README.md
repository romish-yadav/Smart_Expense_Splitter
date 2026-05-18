# Smart Expense Splitter

A Splitwise-style app for groups of friends, flatmates, and travel groups to track shared expenses. Features AI-powered natural language expense entry and bill parsing.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Poetry (Python package manager)
- An OpenAI API key (for AI features)

### Setup & Run

```bash
# Clone the repo
git clone https://github.com/romish-yadav/Smart_Expense_Splitter.git
cd Smart_Expense_Splitter

# Backend
cd backend
poetry install
echo "OPENAI_API_KEY=your-key-here" > .env
poetry run uvicorn app.main:app --reload --port 8000

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` with the API at `http://localhost:8000`.

The database is seeded automatically on first run with:
- 8 sample users
- 3 groups (Goa Trip, Flat 4B, Office Lunch Crew)
- 25 realistic expenses across the groups

## Features

### Core Features (Working)
- **Group management** — Create groups, add members, view all groups
- **Manual expense entry** — Full form with 4 split modes:
  - Equal split (all members)
  - Equal subset (selected members)
  - Custom amounts (per-person amounts, validated to sum to total)
  - Weight-based split (ratio-based)
- **Balance view** — Who owes whom at a glance
- **Settle-up algorithm** — Minimum transactions to settle all debts (greedy on net balances)
- **Expense history** — Filterable by payer, date range, and description search
- **REST API** — Clean endpoints, server-side validation, proper HTTP status codes
- **Money as integers** — All amounts stored as paise (1 INR = 100 paise), never floats
- **User switcher** — Simulate different users without auth flow
- **Mobile-first responsive design** — Designed for phone screens first

### AI Features (Working — requires OpenAI API key)
- **Natural language expense entry** — Type "I paid 2400 for dinner, split between me, Aman and Priya" and the AI parses it into a structured expense
- **Bill text parsing** — Paste a restaurant bill, AI extracts line items, then assign items to people
- **Confidence scoring** — AI self-assesses parsing quality; low confidence triggers manual entry fallback
- **Graceful failure** — API errors, low confidence, or unparseable input all fall back to manual entry with clear messaging

### What's Not Implemented
- Real authentication (using user-switcher instead)
- Image-based bill OCR
- WebSocket real-time updates
- Multi-currency support
- CSV/PDF export
- Recurring expenses
- Dark mode

## Tech Stack
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **Money handling**: Integer paise (never floats)

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for the auto-generated Swagger UI with all endpoints documented.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models.py         # ORM models (User, Group, Expense, etc.)
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── seed.py           # Sample data seeder
│   │   ├── routes/
│   │   │   ├── users.py      # User CRUD
│   │   │   ├── groups.py     # Group CRUD + membership
│   │   │   ├── expenses.py   # Expense CRUD + balances + settle-up
│   │   │   └── ai.py         # AI parsing endpoints
│   │   └── services/
│   │       ├── settle_up.py  # Minimum transaction algorithm
│   │       └── ai_parser.py  # OpenAI integration
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/client.ts     # Typed API client
│   │   ├── types/index.ts    # TypeScript interfaces
│   │   ├── components/       # Layout, UserSwitcher
│   │   ├── pages/            # All page components
│   │   └── App.tsx           # Router
│   └── package.json
├── ARCHITECTURE.md           # Design decisions & schema
├── PROMPTS.md               # AI prompt documentation
└── README.md                # This file
```
