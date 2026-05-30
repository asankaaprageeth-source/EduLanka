# EduLanka — School & Tuition Management System

A full-stack web application for managing institutes, teachers, students, attendance, payments, and exams.

**Stack:** React 19 · Node.js/Express · MySQL · MUI · JWT Auth

---

## Local Development

### Prerequisites
- Node.js 18+
- MySQL 8.0
- Git

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/EduLanka.git
cd EduLanka
```

### 2. Database
```bash
# Create database and run schema
mysql -u root -p < backend/src/config/schema.sql
```

### 3. Backend
```bash
cd backend
cp .env.example .env          # then edit .env with your DB password
npm install
npm run dev                   # runs on http://localhost:5000
```

### 4. Frontend
```bash
cd frontend
npm install
npm start                     # runs on http://localhost:3000
```

---

## Deploy to Render.com (Free Tier)

### Step 0 — Free MySQL Database (required first)

Render free tier does not include MySQL. Choose one:

| Service | Free Tier | Notes |
|---|---|---|
| **[Aiven](https://aiven.io)** | 1 GB MySQL | Recommended |
| **[Railway](https://railway.app)** | $5/month credits | Easiest setup |
| **[PlanetScale](https://planetscale.com)** | Free MySQL-compatible | No foreign keys |

After creating the DB, run the schema:
```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DB < backend/src/config/schema.sql
```

---

### Step 1 — Push to GitHub

```bash
cd EduLanka
git remote add origin https://github.com/YOUR_USERNAME/EduLanka.git
git push -u origin master
```

---

### Step 2 — Deploy Backend (Web Service)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Settings:

| Field | Value |
|---|---|
| Name | `edulanka-api` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Plan | Free |

4. **Environment Variables** (set in Render dashboard):

```
NODE_ENV=production
PORT=10000
DB_HOST=<your-mysql-host>
DB_PORT=3306
DB_USER=<your-mysql-user>
DB_PASSWORD=<your-mysql-password>
DB_NAME=edulanka
JWT_SECRET=<generate-a-long-random-string>
JWT_EXPIRE=7d
ALLOWED_ORIGINS=https://edulanka-frontend.onrender.com
FRONTEND_URL=https://edulanka-frontend.onrender.com
EMAIL_USER=<your-gmail>          (optional)
EMAIL_PASS=<your-app-password>   (optional)
```

5. Click **Create Web Service**. Note the URL: `https://edulanka-api.onrender.com`

---

### Step 3 — Deploy Frontend (Static Site)

1. **Render → New → Static Site**
2. Connect the same GitHub repo
3. Settings:

| Field | Value |
|---|---|
| Name | `edulanka-frontend` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `build` |
| Plan | Free |

4. **Environment Variable:**

```
REACT_APP_API_URL=https://edulanka-api.onrender.com/api
```

5. Click **Create Static Site**

---

### Step 4 — Update CORS (after both services are live)

In your backend Render service → **Environment**, confirm:
```
ALLOWED_ORIGINS=https://edulanka-frontend.onrender.com
```
If your frontend URL is different, update it here.

---

### Step 5 — Verify

- Frontend: `https://edulanka-frontend.onrender.com`
- Backend health: `https://edulanka-api.onrender.com/api/health`

> **Note:** Free tier web services spin down after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

### Auto-deploy with render.yaml

This repo includes `render.yaml` for Blueprint deployments:

1. Render dashboard → **New → Blueprint**
2. Connect repo — Render reads `render.yaml` automatically
3. Set the `sync: false` environment variables manually in the dashboard

---

## Project Structure

```
EduLanka/
├── render.yaml                  ← Render deploy config
├── backend/
│   ├── server.js
│   ├── .env.example             ← copy to .env
│   └── src/
│       ├── config/
│       │   ├── database.js
│       │   └── schema.sql       ← run this to create tables
│       ├── controllers/
│       ├── middleware/
│       └── routes/
└── frontend/
    ├── .env.production          ← REACT_APP_API_URL for production
    └── src/
        ├── pages/
        │   ├── auth/            (Landing, Login, Register, ForgotPassword, ResetPassword)
        │   ├── institute/
        │   ├── teacher/
        │   └── student/
        ├── components/
        ├── context/
        └── services/
            └── api.js           ← uses REACT_APP_API_URL
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (all roles) |
| POST | `/api/auth/register/institute` | Register institute |
| POST | `/api/auth/register/user` | Register teacher/student |
| POST | `/api/auth/forgot-password` | Request password reset |
| GET | `/api/auth/verify-token/:token` | Verify reset token |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/institute/dashboard` | Institute dashboard stats |
| GET | `/api/institute/classes` | List classes |
| POST | `/api/institute/classes` | Create class |
| GET | `/api/teacher/classes` | Teacher's classes |
| POST | `/api/teacher/classes` | Teacher creates class |
| GET | `/api/teacher/institutes` | Teacher's connected institutes |
| POST | `/api/attendance/manual` | Record attendance |
| POST | `/api/attendance/qr` | QR attendance |
| GET | `/api/health` | Health check |
