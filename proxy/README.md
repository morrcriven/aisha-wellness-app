# Aisha OpenAI proxy (Cloudflare Worker)

A tiny Cloudflare Worker that forwards `POST /v1/chat/completions` calls from
the deployed Aisha frontend to OpenAI, with the API key stored as a
server-side secret rather than in the browser bundle.

## One-time deploy steps

You'll do these on your own machine (Cloudflare ties resources to *your*
account, so this part can't be scripted away).

### 1. Sign up at Cloudflare

Free plan is fine: https://dash.cloudflare.com/sign-up

### 2. Install dependencies inside this folder

```bash
cd proxy
npm install
```

That pulls in `wrangler` (no global install needed).

### 3. Log in to your Cloudflare account

```bash
npx wrangler login
```

This opens a browser; allow access when prompted.

### 4. Store the OpenAI API key as a secret

```bash
npx wrangler secret put OPENAI_API_KEY
```

When it prompts, paste the key from your `.env.local` (the
`sk-proj-…` value). The secret is encrypted at rest and never appears in
logs or the dashboard.

### 5. Deploy

```bash
npx wrangler deploy
```

Wrangler prints a URL like:

```
https://aisha-wellness-proxy.<your-subdomain>.workers.dev
```

**Send this URL back to me.** I'll add it to `.env.production` so the
GitHub Pages build picks it up automatically.

### 6. Set a hard OpenAI spend cap

Last line of defence: https://platform.openai.com/account/limits → set
"hard limit" to something like `$5`. Even if someone bypasses the origin
check, the bill can't exceed this.

## Day-to-day commands (run from `proxy/`)

| Command | What it does |
|---|---|
| `npx wrangler dev` | Runs the worker locally on `http://localhost:8787` |
| `npx wrangler deploy` | Redeploys after editing `src/index.js` |
| `npx wrangler tail` | Streams live request logs |
| `npx wrangler secret put OPENAI_API_KEY` | Rotates the stored key |

## How the protection works

- **Origin allow-list** ([src/index.js](src/index.js)): rejects any request
  whose `Origin` header isn't `https://aishamitha4321.github.io` or a
  localhost Vite dev server. A `curl` from a random script has no `Origin`
  and is blocked.
- **Path allow-list**: only `/v1/chat/completions` is forwarded; other
  OpenAI endpoints (fine-tuning, embeddings, etc.) return 404.
- **Method allow-list**: GETs return 405.

What this does *not* protect against: someone determined enough to spoof an
`Origin` header from a browser. The hard spend cap in step 6 is the
backstop.

## Updating the allow-list

If your Pages URL ever changes (custom domain, etc.), edit
`ALLOWED_ORIGINS` in [src/index.js](src/index.js) and run
`npx wrangler deploy` again.
