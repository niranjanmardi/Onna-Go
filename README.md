# ONNA-GO (ஒண்ணா போ)

> **Ride Together. Vibe Together. Split Together.**

ONNA-GO is a modern, production-oriented group trip and expense management application designed for friends, motorcyclists, road-trippers, and travel groups.

It solves the headache of managing group travel costs: planning journeys, inviting buddies, recording individual expenses, splitting bills fairly down to the exact paisa with deterministic remainder allocation, simplifying multi-party debts into minimal transfers, and confirming settlements.

---

## Brand Identity & Meaning

- **Name:** ONNA-GO
- **Tamil Representation:** ஒண்ணா போ ("Go Together" / "Travel as One")
- **Tagline:** Ride Together. Vibe Together. Split Together.
- **Concept:** Road journeys, motorcycle expeditions, weekend escapes, music, hangouts, and crystal-clear financial fairness.

---

## Key Features

1. **Precision Splitting Engine**:
   - **Equal Split**: Deterministic integer remainder distribution (Hare-Niemeyer method). Sum strictly equals total expense.
   - **Exact Split**: User-defined rupee amounts with real-time discrepancy checking.
   - **Percentage Split**: Percentage allocations with exact remainder resolution.
   - **Custom Split**: Custom parts/weights.
2. **Deterministic Settlement Optimization (Debt Simplification)**:
   - Automated min-cash-flow greedy bipartite graph matching algorithm.
   - Reduces $N$ circular and chained debts into the absolute minimum number of direct payments while preserving exact net balances.
3. **Settlement Verification Lifecycle**:
   - Status transitions: `SUGGESTED` $\rightarrow$ `PENDING_CONFIRMATION` $\rightarrow$ `CONFIRMED` / `DISPUTED` / `CANCELLED`.
   - Strictly preserves financial integrity: only recipient-confirmed settlements alter net balances.
4. **Comprehensive Trip Management**:
   - Destination tracking, dates, customizable currencies (`INR`, `USD`, `EUR`, `GBP`), group budget progress gauges.
   - 1-click shareable 8-character invitation codes (`/trips/join`).
5. **Activity & Hangout Segmentation**:
   - Group expenses by sub-activities (e.g. Fuel stop, Highway Dhaba dinner, Camp stay).
6. **Reports & Exports**:
   - Visual category spending and member consumption distribution.
   - **Sanitized CSV export**: Prefixes dangerous formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with apostrophes to prevent spreadsheet formula injection attacks.
   - **Automated PDF report generation**: Generates clean, formatted printable trip invoices.
7. **Security & Session Architecture**:
   - Argon2id password hashing.
   - Dual-token session engine: HttpOnly SameSite cookies for browsers, Bearer Authorization headers for Capacitor/mobile clients.
   - Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`). Non-members cannot access private trip data.

---

## Technology Stack

### Frontend
- **Framework**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS v4, Plus Jakarta Sans & Inter typography
- **Icons**: Lucide React
- **Data & Forms**: TanStack Query, React Hook Form, Zod
- **Mobile Packaging**: Capacitor Android

### Backend
- **Framework**: Python 3.14+, FastAPI
- **ORM & Database**: SQLAlchemy 2.0+, PostgreSQL (production) / SQLite (zero-config development)
- **Migrations**: Alembic
- **Security**: Argon2-cffi, PyJWT, Rate limiting headers
- **Reporting**: ReportLab (PDFs), sanitized streaming CSVs
- **Testing**: Pytest, FastAPI TestClient

---

## Directory Structure

```text
Project Tamil/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Versioned REST API endpoints
│   │   │   ├── auth.py
│   │   │   ├── trips.py
│   │   │   ├── activities.py
│   │   │   ├── expenses.py
│   │   │   ├── balances.py
│   │   │   ├── settlements.py
│   │   │   ├── budgets.py
│   │   │   ├── reports.py
│   │   │   ├── notifications.py
│   │   │   └── receipts.py
│   │   ├── calculations/   # Financial core engines
│   │   │   ├── splits.py
│   │   │   ├── balances.py
│   │   │   └── settlements.py
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic v2 schemas
│   │   └── main.py         # Application entrypoint
│   ├── tests/              # Backend test suite
│   ├── alembic/            # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # AppLayout, Logo, Modals
│   │   ├── features/       # Auth, Dashboard, Trips, Expenses, Balances, etc.
│   │   ├── lib/            # Central typed API client, currency utils
│   │   ├── types/          # TypeScript contracts
│   │   └── App.tsx         # Routing table
│   ├── public/             # logo.svg, manifest.json
│   ├── capacitor.config.ts # Android configuration
│   └── package.json
├── docs/                   # Full documentation suite
└── README.md
```

---

## Getting Started

### 1. Backend Setup

```bash
# Navigate to backend and install dependencies
pip install -r backend/requirements.txt

# Run migrations
alembic -c alembic.ini upgrade head

# Start FastAPI server
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend API interactive documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running Automated Tests

```bash
# Run backend test suite (splits, zero-sum invariants, debt simplification, e2e workflows)
python -m pytest backend/tests/ -v

# Run frontend build check
cd frontend
npm run build
```

---

## License
MIT License. Built for seamless road trips and fair group spending.
