# 🎓 Student Progress Analysis System

A full-stack application to track, analyse, and categorise student academic performance using **React + Vite**, **Flask**, **PostgreSQL**, and an **ML analysis engine**.

---

## 📁 Project Structure

```
student-progress-system/
├── frontend/              # React + Vite UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Summary stat cards
│   │   │   ├── StudentForm.jsx     # Add / Edit form
│   │   │   ├── StudentTable.jsx    # Full students table
│   │   │   ├── WeakStudents.jsx    # Weak students view
│   │   │   └── TopStudents.jsx     # Top performers view
│   │   ├── App.jsx                 # Root + routing
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/               # Flask REST API
│   ├── app.py                      # App factory + server
│   ├── routes/
│   │   └── student_routes.py       # All API endpoints
│   ├── models/
│   │   └── db.py                   # PostgreSQL connection
│   ├── utils/
│   │   └── csv_handler.py          # CSV sync helpers
│   └── requirements.txt
│
├── ml/
│   └── analyze_students.py         # Performance scoring + categorisation
│
├── dataset/
│   ├── students.csv                # Master dataset (auto-synced)
│   ├── weak_students.csv           # score < 40
│   ├── average_students.csv        # 40 ≤ score ≤ 75
│   └── top_students.csv            # score > 75
│
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu / Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database and user
psql -U postgres -c "CREATE DATABASE student_progress;"
# (table is created automatically on first backend run)
```

### 2. Backend (Flask)

```bash
cd backend
python -m venv venv

# Activate
source venv/bin/activate          # macOS / Linux
venv\Scripts\activate             # Windows

pip install -r requirements.txt

# Optional: set DB credentials via env vars (defaults shown)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=student_progress
export DB_USER=postgres
export DB_PASSWORD=postgres

python app.py
# → API running at http://localhost:5000
```

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# → UI running at http://localhost:5173
```

---

## 🌐 API Endpoints

| Method | Endpoint             | Description                          |
|--------|----------------------|--------------------------------------|
| POST   | /students            | Add a new student                    |
| GET    | /students            | Retrieve all students                |
| PUT    | /students/\<id\>     | Update a student by ID               |
| DELETE | /students/\<id\>     | Delete a student by ID               |
| GET    | /analysis            | ML summary (counts per category)     |
| GET    | /weak-students       | List of weak students (score < 40)   |
| GET    | /top-students        | List of top performers (score > 75)  |
| GET    | /health              | Health check                         |

---

## 🔄 Data Flow

### Frontend → Backend
- All API calls use **Axios** from React components to `http://localhost:5000`
- Vite dev server proxies `/api/*` to Flask (configured in `vite.config.js`)
- After every mutation (add/edit/delete), React bumps a `refresh` counter which triggers `useEffect` re-fetches across all components

### Backend → ML
- Every write operation (POST / PUT / DELETE) automatically calls `_sync_and_analyse(conn)`
- This function:
  1. Fetches all students from PostgreSQL
  2. Writes them to `dataset/students.csv` via `csv_handler.sync_csv_from_db()`
  3. Calls `ml/analyze_students.run_analysis()` which reads the CSV, computes scores, writes category CSVs
  4. Pushes updated `performance_score` and `category` columns back into PostgreSQL

### PostgreSQL ↔ CSV Synchronisation
- **PostgreSQL is the source of truth** for all writes
- After every mutation, the entire students table is exported to `dataset/students.csv`
- The ML engine reads from CSV, re-categorises, updates CSVs, then the backend pushes scores back to PostgreSQL
- This keeps both stores perfectly in sync at all times

---

## 📊 Performance Score Formula

```
performance_score =
    attendance        × 0.20 +
    assignment_score  × 0.20 +
    mid_exam_score    × 0.25 +
    final_exam_score  × 0.35
```

| Score Range | Category      |
|-------------|---------------|
| < 40        | Weak          |
| 40 – 75     | Average       |
| > 75        | Top Performer |

---

## 🗃️ PostgreSQL Schema

```sql
CREATE TABLE students (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    roll_no           VARCHAR(50)  NOT NULL UNIQUE,
    attendance        FLOAT        NOT NULL,
    assignment_score  FLOAT        NOT NULL,
    mid_exam_score    FLOAT        NOT NULL,
    final_exam_score  FLOAT        NOT NULL,
    performance_score FLOAT        DEFAULT 0,
    category          VARCHAR(20)  DEFAULT 'Unanalyzed'
);
```

---

## 🚀 Quick Start (all together)

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && python app.py

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.
