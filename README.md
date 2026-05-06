# TaskFlow - Team Task Manager

A full-stack Team Task Manager built with Node.js, Express, PostgreSQL, and Vanilla JS/CSS.

## Features
- **Authentication**: JWT-based secure login & registration
- **Role-Based Access Control**: Admin vs Member permissions
- **Dashboard**: High-level overview, overdue tasks, team workload stats
- **Project Management**: Group tasks under projects, assign team members
- **Task Management**: Kanban board view, status updates, priority setting, and comments
- **Premium UI**: Custom CSS with dark mode aesthetic and responsive design

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg pool)
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Demo Accounts
- **Admin**: `admin@demo.com` / `admin123`
- **Member**: `alice@demo.com` / `member123`

---

## Local Development Guide

### 1. Prerequisites
- Node.js v18+
- PostgreSQL installed and running

### 2. Setup Database
Create a database in PostgreSQL:
```sql
CREATE DATABASE taskmanager;
```

### 3. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file based on `.env.example`:
   ```bash
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/taskmanager
   JWT_SECRET=your_super_secret_dev_key
   FRONTEND_URL=http://localhost:5000
   ```
4. Run migrations and seed data:
   ```bash
   npm run migrate
   npm run seed
   ```
5. Start server:
   ```bash
   npm run dev
   ```

### 4. Running the App
The frontend is statically served by Express. Just go to:
[http://localhost:5000](http://localhost:5000)

---

## Deployment Guide (Railway)

We will deploy this full-stack application natively on [Railway.app](https://railway.app).

### Steps:
1. Push this entire repository to GitHub.
2. Log into Railway.app and click **New Project**.
3. Select **Deploy from GitHub repo** and choose your repository.
4. Click **Add a Service** -> **Database** -> **Add PostgreSQL**.
5. Go back to your GitHub repo service in Railway.
6. Under the **Variables** tab, add the following Environment Variables:
   - `JWT_SECRET`: Generate a random long string
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Click "Reference Variable", select the PostgreSQL service, and pick `DATABASE_URL`.
7. Under the **Settings** tab -> **Domains**, click **Generate Domain** to get your live URL.
8. The `Dockerfile` handles installing backend dependencies, running `npm run migrate`, `npm run seed`, and finally `npm start`.

Your app is now live!
