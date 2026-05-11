# Stock Predictor

Stock Predictor is a full-stack web application scaffold built with Next.js 14, FastAPI, Supabase, and a PyTorch LSTM model for stock-price forecasting.

## Monorepo structure

```text
stock-predictor/
├── frontend/
├── backend/
└── supabase/
```

## Quick start

### Frontend

1. Install dependencies:
   `cd frontend && npm install`
2. Update `frontend/.env.local` with your values.
3. Start the dev server:
   `npm run dev`

### Backend

1. Create a virtual environment and install dependencies:
   `cd backend && pip install -r requirements.txt`
2. Update `backend/.env` with your values.
3. Start the API:
   `uvicorn app.main:app --reload`

## Deployment targets

- Frontend: Vercel
- Backend: Render
- Database and Realtime: Supabase

## External setup still required

- Create the Supabase project and run `supabase/migrations/001_init.sql`.
- Enable Realtime for `public.stock_prices` and `public.predictions`.
- Replace placeholder values in `frontend/.env.local` and `backend/.env`.
- Deploy `frontend/` to Vercel and `backend/` to Render.

