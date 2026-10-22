# ONNA-GO Deployment & Hosting Guide

This guide provides step-by-step instructions for deploying and hosting **ONNA-GO** across cloud providers.

---

## Architecture Overview

ONNA-GO is architected to support two hosting models out of the box:

1. **Unified Fullstack Service (Recommended):**
   - The FastAPI backend directly serves both the REST API (`/api/v1/*`) and the built React + Vite Single Page Application (`/`).
   - **Advantages:** Zero CORS configuration required, same-domain HttpOnly session cookies, single URL, single hosting bill/free tier.
2. **Decoupled Architecture (Static Frontend + API Backend):**
   - Frontend deployed on a global CDN (e.g., **Vercel**, **Cloudflare Pages**, or **Netlify**).
   - Backend deployed on a container/Python runtime (e.g., **Render**, **Railway**, or **Fly.io**).

---

## Option 1: 1-Click Hosting on Render (Fastest & Simplest)

Render provides free/low-cost web services with native Python and Node.js support.

### Steps:
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** &rarr; **Blueprint** (or **Web Service**).
2. Connect your GitHub repository: `https://github.com/niranjanmardi/Onna-Go`.
3. If using **Blueprint**, Render will automatically detect [`render.yaml`](../render.yaml).
4. If setting up manually as a **Web Service**:
   - **Name:** `onna-go`
   - **Runtime:** `Python 3`
   - **Build Command:** `bash build.sh`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Configure Environment Variables in the Render settings:
   - `SECRET_KEY`: *[Generate a 32+ character random string]*
   - `SECURE_COOKIE`: `true`
   - `DATABASE_URL`: `sqlite:///./splitmate.db` *(or PostgreSQL URL if using Render Postgres)*
   - *(Optional Google Auth)*:
     - `GOOGLE_CLIENT_ID`: `your-client-id.apps.googleusercontent.com`
     - `VITE_GOOGLE_CLIENT_ID`: `your-client-id.apps.googleusercontent.com`
6. Click **Deploy**. Once finished, your application will be live at `https://onna-go.onrender.com`.

---

## Option 2: Vercel (Frontend) + Render / Railway (Backend)

Ideal if you prefer hosting the React frontend on Vercel's global Edge CDN.

### Step 1: Deploy Backend on Render / Railway
1. Create a Web Service on [Render](https://render.com) or [Railway](https://railway.app).
2. Set:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
3. Copy your live backend URL (e.g., `https://onna-go-api.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Go to [Vercel](https://vercel.com/) and click **Add New...** &rarr; **Project**.
2. Select the repository `niranjanmardi/Onna-Go`.
3. Set the project configuration:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://onna-go-api.onrender.com/api/v1`
   - *(Optional Google Auth)* `VITE_GOOGLE_CLIENT_ID`: `your-client-id.apps.googleusercontent.com`
5. Click **Deploy**. Vercel will use [`frontend/vercel.json`](../frontend/vercel.json) to handle SPA client-side routing.
6. In your Backend Render/Railway settings, update `BACKEND_CORS_ORIGINS`:
   - `BACKEND_CORS_ORIGINS`: `https://your-app.vercel.app`

---

## Option 3: Docker & Railway / Fly.io / VPS

ONNA-GO includes a production-ready, multi-stage [`Dockerfile`](../Dockerfile) and [`docker-compose.yml`](../docker-compose.yml).

### Local or Self-Hosted VPS (DigitalOcean / EC2 / Linode):
```bash
# Clone the repository
git clone https://github.com/niranjanmardi/Onna-Go.git
cd Onna-Go

# Build and start the container in the background
docker compose up --build -d
```
Access the application at `http://YOUR_SERVER_IP:8000`.

### Deploying on Railway:
1. Create a new project on [Railway](https://railway.app).
2. Connect the `Onna-Go` repository.
3. Railway detects the `Dockerfile` and builds both frontend and backend automatically.
4. Add a persistent volume for `/app/backend/uploads` if you want uploaded avatars to persist across redeploys.

---

## Option 4: Deploying to Production PostgreSQL

While SQLite works out of the box for quick deployments, ONNA-GO natively supports PostgreSQL:

1. Provision a PostgreSQL database (e.g., Neon, Supabase, Railway Postgres, or Render Postgres).
2. Set the `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL=postgresql+psycopg://username:password@hostname:5432/dbname
   ```
3. Run migrations on startup (or tables will auto-generate via SQLAlchemy metadata on initial launch).

---

## Post-Deployment Checklist

- [ ] **Custom Domain:** Add your custom domain (e.g., `app.onna-go.com`) and verify SSL certificates.
- [ ] **Google OAuth:** Add your live production domain to the **Authorized JavaScript Origins** in the Google Cloud Console.
- [ ] **Security:** Verify `SECURE_COOKIE=true` and set a strong, private `SECRET_KEY`.
