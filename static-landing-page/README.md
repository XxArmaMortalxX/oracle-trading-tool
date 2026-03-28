# Axiarch Trading Algorithm — Static Landing Page

A standalone, SEO-optimized static landing page for **The Axiarch Trading Algorithm**. Built with plain HTML, CSS, and minimal vanilla JavaScript — no frameworks, no build step.

## Purpose

This page is designed to be hosted separately from the main React app for maximum SEO benefit:

- **Instant Google indexing** — static HTML is crawled and indexed immediately
- **Fast load times** — no JavaScript framework overhead, no hydration delay
- **Perfect link previews** — Open Graph, Twitter Card, and JSON-LD structured data baked in
- **Zero dependencies** — works on any static hosting platform

## Files

| File | Description |
|------|-------------|
| `index.html` | Full landing page with all marketing content, SEO meta tags, JSON-LD |
| `style.css` | Complete dark-theme stylesheet (red accent, monospace data feel) |
| `script.js` | Minimal JS: FAQ accordion, Social Radar demo animation, waitlist form, stat counters |
| `robots.txt` | Search engine crawler directives |
| `sitemap.xml` | XML sitemap for search engines |
| `README.md` | This file |

## Sections Included

1. **Navigation** — Fixed header with smooth-scroll links + mobile hamburger menu
2. **Hero** — Value proposition headline with red gradient, two CTAs, trust badges
3. **Stats Bar** — Animated counters (149+ stocks, 20 picks, 3 platforms, 6 tools)
4. **How It Works** — 4-phase algorithm pipeline (INGEST → ANALYZE → DETECT → DELIVER)
5. **Features** — 6-card grid (Screener, Dashboard, Social Radar, Methodology, Framework, Calculator)
6. **Signal Engine** — Split layout with 3 engines + signal preview card
7. **Social Radar Demo** — Animated table cycling 2 data sets every 8 seconds
8. **Pricing** — $29.99/month card with feature checklist
9. **FAQ** — 5-item accordion
10. **Waitlist** — Name + email form (submits to main app API)
11. **Final CTA** — Closing conversion section
12. **Footer** — Logo, disclaimer, navigation columns

## SEO Features

- Optimized `<title>` (45 characters)
- Meta description (131 characters)
- 6 focused keywords
- Open Graph tags (Facebook/LinkedIn)
- Twitter Card tags (X)
- JSON-LD structured data:
  - `SoftwareApplication` with pricing
  - `Organization`
  - `FAQPage` with 4 Q&As
- Canonical URL
- Robots directive
- XML Sitemap

## Hosting Options

### Option 1: GitHub Pages (Free)

```bash
# 1. Create a new GitHub repository
gh repo create axiarch-landing --public

# 2. Push the files
cd axiarch-landing-page
git init
git add .
git commit -m "Initial static landing page"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/axiarch-landing.git
git push -u origin main

# 3. Enable GitHub Pages
# Go to Settings → Pages → Source: Deploy from branch → Branch: main → Save

# 4. Add custom domain
# In Settings → Pages → Custom domain: axiarchtrading.live
# Add CNAME record in your DNS: axiarchtrading.live → YOUR_USERNAME.github.io
```

### Option 2: Netlify (Free tier)

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Deploy
cd axiarch-landing-page
netlify deploy --prod --dir .

# 3. Add custom domain in Netlify dashboard
# Site settings → Domain management → Add custom domain
```

### Option 3: Vercel (Free tier)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd axiarch-landing-page
vercel --prod

# 3. Add custom domain in Vercel dashboard
# Settings → Domains → Add domain
```

### Option 4: Cloudflare Pages (Free tier)

```bash
# 1. Connect your GitHub repo in Cloudflare dashboard
# Pages → Create a project → Connect to Git

# 2. Build settings:
#    Build command: (leave empty)
#    Build output directory: /

# 3. Add custom domain in Cloudflare dashboard
```

## DNS Configuration

If hosting on a separate platform from the main app, you'll need to set up DNS:

- **Landing page** (`axiarchtrading.live`) → Points to static host (GitHub Pages, Netlify, etc.)
- **Main app** (`app.axiarchtrading.live`) → Points to Manus hosting

Update all CTA links in `index.html` to point to `https://app.axiarchtrading.live` if using a subdomain for the main app.

## Customization

- **Colors**: Edit CSS variables in `:root` block in `style.css`
- **Content**: Edit HTML directly in `index.html`
- **Demo data**: Edit `radarDataSets` arrays in `script.js`
- **Waitlist endpoint**: Edit the `fetch` URL in `script.js` waitlist form handler

## CTA Links

All "Start Your Subscription" and "Launch App" buttons currently link to `https://axiarchtrading.live`. Update these if the main app moves to a subdomain.
