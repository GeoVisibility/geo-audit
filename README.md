# WOMP — Web Operations Monitoring Platform

Self-hosted uptime, SEO & GEO (AI visibility) monitoring dashboard. Tracks whether your sites are up, whether search engines can index them, and whether AI systems (ChatGPT, Claude, Perplexity, Google AI Overviews) can find and cite them.

## Modules

Uptime, SEO and GEO share a single crawl pass per site (one fetch of the HTML, `robots.txt`, `sitemap.xml`, `llms.txt`, `ai.txt`) — no duplicate requests, no duplicate checks. Signals that matter to both SEO and AI visibility (sitemap, canonical, Organization/Article/FAQ schema, word count, heading structure, external links, date signals, alt text) are owned by **GEO only**, since that's the module they matter most for.

| Module | Description |
|--------|-------------|
| **Uptime (Hız)** | HTTP status, TTFB, response time, SSL days remaining, DNS, redirects |
| **SEO** | robots.txt / noindex / snippet directives, title & description length, Open Graph tags, hreflang, IndexNow, internal links, BreadcrumbList/HowTo/Product schema |
| **GEO** | AI bot access (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), llms.txt/ai.txt, sitemap & canonical, structured data (Organization/Article/FAQ), content depth & heading structure, citation readiness, entity coverage, AI readability (JS-independence, semantic HTML, alt text) |

A single **Rapor** (report) per site combines all three into one overall score (weighted: 25% speed, 30% SEO, **45% GEO** — GEO is the primary focus) and shows results in one screen, ordered **GEO → SEO → Hız**.

## Requirements

- [Node.js](https://nodejs.org) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/geo-audit.git
cd geo-audit

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values
cp .env.example .env

# 4. Start PostgreSQL with Docker
docker-compose up -d

# 5. Run database migrations
npx prisma migrate deploy

# 6. Generate Prisma client
npx prisma generate

# 7. Start the app
npm run dev
```

Open in browser: http://localhost:3000

## Usage

1. Click **"Site Ekle"** to add a website
2. Click **"Kontrol Et"** on a site card for a quick uptime ping
3. Click **"Rapor (Hız + SEO + GEO)"** to run the full check and open the combined report — one overall score, GEO shown first
4. Click **"Tümünü Kontrol Et"** to run a quick uptime check on all sites at once

## Status Colors

| Color | Meaning |
|-------|---------|
| Green | Healthy — HTTP 2xx/3xx, TTFB < 1s, SSL > 30 days |
| Yellow | Warning — TTFB > 1s, SSL < 30 days, HTTP 4xx |
| Red | Critical — unreachable, HTTP 5xx, SSL < 15 days |

## Tech Stack

- [Next.js](https://nextjs.org) — App Router, TypeScript
- [Prisma 7](https://www.prisma.io) — ORM with `@prisma/adapter-pg`
- [PostgreSQL 16](https://www.postgresql.org) — via Docker
- [Cheerio](https://cheerio.js.org) — server-side HTML parsing
- [Tailwind CSS](https://tailwindcss.com)

## Notes

- This tool is designed to run **locally only** — not intended for production deployment
- `docker-compose.yml` reads its Postgres user/password/db from `.env` (falls back to local-only dev defaults if unset) — never point it at a real database
- The sites you track are stored only in your local database, never committed to this repo
- Run weekly or on-demand; no background scheduling required
