# EduLanka — School & Tuition Management System

A full-stack web application for managing tuition institutes, teachers, and students. Built with React + Node.js/Express + Prisma + PostgreSQL (Supabase), deployed on Render.

---

## Features

### Institute
- Dashboard with live stats (students, teachers, classes, attendance, income, pending fees)
- Manage classes (create, edit, delete, assign teachers)
- Manage students and teachers
- QR code attendance scanning with live log
- Fee/payment management with monthly reports
- Messaging (broadcast to all students, all teachers, or a specific class)
- Attendance and income reports
- Teacher connection system (search, invite, accept/reject)

### Teacher
- Dashboard with class and student stats
- Manage own classes across multiple institutes
- Enroll/remove students per class
- Mark attendance (QR scan or manual toggle per student)
- Create and publish MCQ exams with auto-grading and rankings
- Per-class payments, messages, attendance, and exam reports
- Institute connection system (search and connect)

### Student
- Dashboard with personal QR code for attendance scanning
- Browse and join classes by searching institutes
- View attendance history by month and class
- View and submit exams
- View payment/fee history
- Inbox for messages from institutes and teachers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, MUI v9, React Router v6, Axios |
| Backend | Node.js, Express 5, Prisma ORM |
| Database | PostgreSQL via Supabase |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| QR Codes | html5-qrcode (scanning), qrcode.react (display) |
| Email | Nodemailer (Gmail SMTP) |
| Hosting | Render (backend: Node web service, frontend: static site) |

---

## Project Structure

```
EduLanka/
├── render.yaml
├── backend/
│   ├── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       │   └── prisma.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── attendanceController.js
│       │   ├── examController.js
│       │   ├── instituteController.js
│       │   ├── messageController.js
│       │   └── paymentController.js
│       ├── middleware/
│       │   └── auth.js
│       └── routes/
│           ├── auth.js
│           ├── institute.js
│           ├── institutes.js
│           ├── teacher.js
│           ├── student.js
│           ├── attendance.js
│           ├── payments.js
│           ├── messages.js
│           ├── exams.js
│           └── connections.js
└── frontend/
    └── src/
        ├── context/AuthContext.js
        ├── services/api.js
        ├── components/
        │   ├── Layout.js
        │   └── QrScannerModal.js
        └── pages/
            ├── auth/       (Landing, Login, Register, ForgotPassword, ResetPassword)
            ├── institute/  (Dashboard, Students, Teachers, Classes, Attendance, Payments, Messages, Reports)
            ├── teacher/    (Dashboard, Classes, Attendance, Exams, Messages, Reports)
            └── student/    (Dashboard, Classes, Attendance, Exams, Payments, Messages)
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Supabase free tier recommended)

### Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npm install
npx prisma migrate dev
npm run dev            # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm start              # http://localhost:3000
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooled) |
| `DIRECT_URL` | Direct PostgreSQL connection (for Prisma migrations) |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRE` | JWT expiry e.g. `7d` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins |
| `FRONTEND_URL` | Frontend URL (used in password reset emails) |
| `EMAIL_HOST` | SMTP host (default: smtp.gmail.com) |
| `EMAIL_PORT` | SMTP port (default: 587) |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password / app password |

### Frontend

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL |

---

## Deployment (Render)

The project deploys via `render.yaml` at the repo root using Render Blueprints.

1. Render dashboard → **New → Blueprint** → connect this repo
2. Render reads `render.yaml` and creates both services automatically
3. Set `DATABASE_URL` and `DIRECT_URL` manually in the Render dashboard (they are marked `sync: false`)

**Backend** — Node.js web service
- Build: `npm install && npx prisma generate`
- Start: `node server.js`
- Health check: `/api/health`

**Frontend** — Static site
- Build: `npm install && npm run build`
- Publish dir: `build`
- SPA rewrite: `/* → /index.html`

> Free tier web services spin down after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

## API Reference

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register/institute` | Public | Register institute |
| POST | `/api/auth/register/user` | Public | Register teacher/student |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/profile` | All | Get own profile |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Reset password |
| GET | `/api/institute/dashboard` | Institute | Stats |
| GET/POST | `/api/institute/classes` | Institute | List/create classes |
| PUT/DELETE | `/api/institute/classes/:id` | Institute | Update/delete class |
| GET | `/api/teacher/dashboard` | Teacher | Stats |
| GET/POST | `/api/teacher/classes` | Teacher | List/create classes |
| GET | `/api/teacher/classes/:id/students` | Teacher | Students in a class |
| POST | `/api/teacher/classes/:id/enroll` | Teacher | Enroll student |
| GET | `/api/student/dashboard` | Student | Stats + student ID |
| GET | `/api/student/classes` | Student | Enrolled classes |
| POST | `/api/student/classes/join` | Student | Join a class |
| GET | `/api/institutes/search` | Student | Search institutes |
| GET | `/api/institutes/:id/classes` | Student | Classes at an institute |
| POST | `/api/attendance/mark-by-qr` | Institute/Teacher | QR attendance |
| POST | `/api/attendance/manual` | Institute/Teacher | Manual attendance |
| GET | `/api/payments/class/:class_id` | Institute/Teacher | Class payment records |
| POST | `/api/payments/class/:class_id/generate` | Institute/Teacher | Generate monthly fees |
| POST | `/api/payments/class/:class_id/record` | Institute/Teacher | Record payment as paid |
| POST | `/api/exams` | Institute/Teacher | Create exam |
| GET | `/api/exams/class/:class_id` | Institute/Teacher | Exams for a class |
| DELETE | `/api/exams/:exam_id` | Institute/Teacher | Delete exam |
| GET | `/api/exams/student` | Student | Student's exams |
| POST | `/api/messages/send` | Institute/Teacher | Send message |
| GET | `/api/messages/inbox` | Student/Teacher | Inbox |
| GET | `/api/connections/search/teachers` | Institute | Search teachers |
| GET | `/api/connections/search/institutes` | Teacher | Search institutes |
| POST | `/api/connections/request` | Institute/Teacher | Send connection request |
| PUT | `/api/connections/:id/accept` | Institute/Teacher | Accept connection |
| GET | `/api/health` | Public | Health check |
