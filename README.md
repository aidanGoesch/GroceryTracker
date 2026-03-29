# Grocery Tracker

Mobile-first grocery spending tracker built with React + Supabase.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` using `.env.example` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Create Supabase schema (`receipts`, `line_items`) and storage bucket `receipts`.

4. Configure and deploy the receipt parsing Edge Function:

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase secrets set ANTHROPIC_API_KEY=<YOUR_ANTHROPIC_KEY>
supabase functions deploy parse-receipt
```

5. Run the app:

```bash
npm run dev
```

## Why Edge Function?

Browsers cannot call Anthropic's API directly due to CORS and API key exposure. The app sends the image to a Supabase Edge Function (`parse-receipt`), which calls Claude server-side and returns parsed text safely.

## Deploy to GitHub Pages

This project is preconfigured for GitHub Pages on the `GroceryTracker` repository path.

1. Push `main` to GitHub.
2. In GitHub repo settings, go to **Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy-pages.yml` will build and deploy on each push to `main`.
4. In **Repo Settings -> Secrets and variables -> Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Published URL:

`https://aidangoesch.github.io/GroceryTracker/`
