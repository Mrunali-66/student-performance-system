# EduTrack Frontend v3.0

**Student Performance Management System** — React + Vite + Tailwind CSS + Axios + Context API

---

## ✨ What's New in v3

| Feature | Details |
|---|---|
| **Auth pages** | Login (username + password) · Register (username + password + role + branch) |
| **2-step Register** | Step 1: credentials · Step 2: role picker + branch dropdown |
| **Password strength** | Visual indicator on register |
| **Show/hide password** | Toggle button on both auth pages |
| **Branch support** | Data Science · Python Development · Java Development · AI & Machine Learning |
| **Centralised API** | Single Axios instance at `src/services/api.js` |
| **Service layer** | `authService`, `studentService`, `teacherService` |
| **Form validation** | `useFormValidation` hook + `validators.js` utilities |
| **Route file** | `src/routes/index.jsx` — all routes in one place |
| **Layouts** | `AuthLayout` (split-screen brand) · `AppLayout` (sidebar + topbar) |
| **Context folder** | `src/context/AuthContext.jsx` + `ThemeContext.jsx` |
| **Tailwind CSS** | Full Tailwind v3 integration on top of existing design tokens |
| **Branch in sidebar/topbar** | User's branch shown in sidebar chip + topbar pill |

---

## 📁 Folder Structure

```
frontend/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── src/
    ├── App.jsx                    # Thin shell → renders routes
    ├── main.jsx                   # React root + providers
    ├── index.css                  # Tailwind directives + all CSS vars
    │
    ├── context/
    │   ├── AuthContext.jsx        # JWT auth state (login/logout/verify)
    │   └── ThemeContext.jsx       # Dark/light theme
    │
    ├── services/
    │   ├── api.js                 # Axios instance + interceptors (SINGLE SOURCE)
    │   ├── authService.js         # login(), register(), verify()
    │   ├── studentService.js      # getReport(), updateRecord()
    │   └── teacherService.js      # getStudents(), addStudent(), etc.
    │
    ├── hooks/
    │   ├── useFormValidation.js   # Generic form state + field validation
    │   └── useLocalStorage.js     # Persisted state hook
    │
    ├── utils/
    │   ├── validators.js          # required(), minLength(), compose(), authValidators
    │   ├── exportUtils.js         # CSV + PDF export helpers
    │   └── api.js                 # Shim → re-exports src/services/api.js
    │
    ├── routes/
    │   └── index.jsx              # All route definitions (public / student / teacher)
    │
    ├── layouts/
    │   ├── AuthLayout.jsx         # Split-screen: brand panel + form
    │   └── AppLayout.jsx          # Sidebar + Topbar wrapper
    │
    ├── components/
    │   ├── ProtectedRoute.jsx     # Auth + role guard
    │   ├── Sidebar.jsx            # Navigation sidebar (role-aware)
    │   ├── Topbar.jsx             # Header bar with theme toggle
    │   ├── LoadingSpinner.jsx     # Animated spinner (fullScreen or inline)
    │   ├── FormField.jsx          # Labeled input/select with error display
    │   ├── AnalysisModal.jsx      # ML analysis modal
    │   ├── MLAnalysisPanel.jsx    # ML gauge + breakdown panel
    │   └── MLAnalysisDisplay.jsx  # ML display component
    │
    └── pages/
        ├── Login.jsx              # ★ Username + password
        ├── Register.jsx           # ★ Username + password + role + branch
        ├── StudentDashboard.jsx
        ├── TeacherDashboard.jsx
        ├── Dashboard.jsx          # Legacy teacher overview
        ├── Students.jsx
        ├── WeakStudents.jsx
        ├── AddStudent.jsx
        ├── PredictScore.jsx
        └── Analytics.jsx
```

---

## 🚀 Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables (optional)
Create `.env.local`:
```
VITE_API_URL=http://localhost:5000
```

### 3. Run dev server
```bash
npm run dev
# → http://localhost:5173
```

### 4. Build for production
```bash
npm run build
npm run preview
```

---

## 🔐 Authentication Flow

```
User visits /login
    │
    ├─ Fills username + password
    ├─ POST /login → { user, token }
    ├─ AuthContext.login() → saves token + user to localStorage
    └─ Navigate to /teacher-dashboard or /student-dashboard
```

**Register flow (2-step)**:
- Step 1: username + password (with strength indicator)
- Step 2: role card picker + branch dropdown
- POST /register → { user, token } → auto-login

---

## 🌿 Backend API Contract

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| POST | `/login` | `{ username, password }` | `{ user, token }` |
| POST | `/register` | `{ username, password, role, branch }` | `{ user, token }` |
| GET | `/auth/verify` | — (JWT header) | `{ user }` |
| GET | `/health` | — | `{ status: "ok" }` |

**User object shape:**
```json
{
  "id": 1,
  "username": "teacher1",
  "name": "Dr. Sharma",
  "role": "teacher",
  "branch": "Data Science"
}
```

---

## 🛡️ Route Protection

| Route | Access |
|---|---|
| `/login`, `/register` | Public (redirect if already logged in) |
| `/student-dashboard` | `role === 'student'` only |
| `/teacher-dashboard`, `/students`, etc. | `role === 'teacher'` only |
| Wrong role | Redirected to own role's home |
| No token | Redirected to `/login` |
| Expired token | Auto-logout on next API call (401 interceptor) |

---

## 📦 Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | ^18.3 | UI |
| React Router DOM | ^6.24 | Routing |
| Axios | ^1.7 | HTTP client |
| Tailwind CSS | ^3.4 | Utility classes |
| react-hot-toast | ^2.4 | Toast notifications |
| lucide-react | ^0.395 | Icons |
| Vite | ^5.3 | Build tool |
