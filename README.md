# Portfolio Aditya — React + Vite + Supabase

Website portfolio yang dibangun dengan React, Vite, dan Supabase sebagai backend.

## 🚀 Tech Stack

- **React 18** — UI framework
- **Vite 6** — Build tool
- **Supabase** — Database & Auth backend
- **Zustand** — State management
- **Immer** — Immutable state updates

## 🛠️ Setup Lokal

```bash
# 1. Clone repository
git clone https://github.com/USERNAME/REPO-NAME.git
cd REPO-NAME

# 2. Install dependencies
npm install

# 3. Buat file .env.local dari template
cp .env.example .env.local

# 4. Isi nilai di .env.local dengan kredensial Supabase kamu
#    (Supabase Dashboard → Project Settings → API)

# 5. Jalankan development server
npm run dev
```

## 🌐 Deploy ke Vercel

1. Push kode ke GitHub
2. Buka [vercel.com](https://vercel.com) → Import Git Repository
3. Tambahkan **Environment Variables** di Vercel:
   - `VITE_SUPABASE_URL` = URL project Supabase kamu
   - `VITE_SUPABASE_ANON_KEY` = Anon key Supabase kamu
4. Klik **Deploy** ✅

> ⚠️ **Jangan pernah** commit file `.env` atau `.env.local` ke GitHub. Gunakan Environment Variables di Vercel.

## 📁 Struktur Proyek

```
src/
├── components/     # Komponen UI (WorkGrid, Modals)
├── hooks/          # Custom React hooks
├── lib/            # Konfigurasi Supabase client
├── services/       # API calls ke Supabase
├── store/          # Zustand state management
├── App.jsx         # Root component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## 📜 Scripts

```bash
npm run dev      # Development server (localhost:5173)
npm run build    # Build untuk production
npm run preview  # Preview hasil build
```
