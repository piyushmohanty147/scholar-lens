# Scholar Lens

Scholar Lens is an AI research intelligence app. It helps people:

- **Find papers** that actually answer a plain-language research question (OpenAlex, Semantic Scholar and RePEc, ranked by Gemini).
- **Deep dive** into any paper: plain summary, study design, findings, limitations, citations, related work.
- **Project Outlook**: opportunities, risks, scenarios and indicators for a project, built from research-activity data and recent papers. Every claim cites its sources and carries an evidence-strength label.
- **Trend Explorer** (free, public): compare how fast two topics are growing, with a simple projection.
- **Library**: saved outlooks and papers, private share links, Markdown and BibTeX export.

Stack: Next.js 15 (App Router), React 19, TypeScript, Supabase (login + database), Gemini API, OpenAlex API. Deployed on Vercel.

## Run locally

1. Install Node.js 20.9 or later, then `npm install`.
2. Set up Supabase (below) and copy the env file: `cp .env.example .env.local`, then fill in the keys.
3. `npm run dev` and open http://localhost:3000.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google Gemini API key. Server-side only. |
| `OPENALEX_API_KEY` | Yes | OpenAlex API key. Used by Project Outlook, deep dives, Trend Explorer and search. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase anon (public) key. |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Raises Semantic Scholar rate limits. |
| `GEMINI_MODEL` | No | Overrides the default Gemini model. |
| `NEXT_PUBLIC_SITE_URL` | No | Your public URL, used for links and metadata. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | No | Google Search Console verification code. |

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`. It creates the tables, security rules (row-level security) and the usage functions. If you already have tables, compare first (see the note at the top of the file).
3. **Authentication → Providers**: enable Email (magic link) and Google. Add your site URL and `http://localhost:3000` under **URL Configuration → Redirect URLs**.
4. To give a user the Pro plan, set `plan` to `pro` on their row in the `profiles` table (users cannot change it themselves).

## How daily limits work

Free accounts get 3 project outlooks, 15 searches and 20 deep dives per day (resets at midnight UTC); Pro accounts get more. The middleware checks the limit before a request runs, and the API route counts the use **only after it succeeds**, so a failed request never costs a use. Limits are set in `middleware.ts`.

## Deployment

Deploy to Vercel and add all required environment variables in the project settings. The API routes use up to 60 seconds, so make sure your Vercel plan allows that.
