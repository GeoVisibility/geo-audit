# WOMP — Web Operations Monitoring Platform

Local website monitoring tool built with Next.js and PostgreSQL. Tracks uptime, SEO health, and GEO (Generative Engine Optimization) visibility for your sites.

## Modules

| Module | Description |
|--------|-------------|
| **Uptime** | HTTP status, TTFB, response time, SSL days remaining, DNS, redirects |
| **SEO** | Title/description lengths, canonical, OG tags, structured data, heading hierarchy, word count, robots.txt, IndexNow |
| **GEO** | AI bot access (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), llms.txt, ai.txt, FAQ schema, citation readiness, entity coverage, AI readability |

## Requirements

- [Node.js](https://nodejs.org) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/womp.git
cd womp

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
2. Click **"Kontrol Et"** on a site card to run an instant check
3. Click **"Tümünü Kontrol Et"** to check all sites at once
4. Use the **SEO** and **GEO** tabs on each site card for detailed analysis

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
- Database credentials in `docker-compose.yml` are for local use only
- Run weekly or on-demand; no background scheduling required
