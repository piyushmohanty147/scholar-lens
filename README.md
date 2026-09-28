# Scholar Lens

Scholar Lens is a minimal AI-powered research paper discovery app. Enter a plain-language research question and it searches Semantic Scholar, then uses Gemini to rank the candidate papers against the actual question.

## Run locally

1. Install Node.js 20.9 or later.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a local environment file and add your Gemini API key:
   ```bash
   cp .env.example .env.local
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | A Google Gemini API key. It is read only by the server-side `/api/search` route and is never sent to the browser. |

## Deployment

Deploy as a Next.js project on Vercel and set `GEMINI_API_KEY` in the project environment variables. No database or login configuration is needed.
