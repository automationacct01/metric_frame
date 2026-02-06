# Website Deployment Guide

This guide explains how to deploy the MetricFrame landing page and download page to your public website.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR DOMAIN (e.g., metricframe.com)                           │
│                                                                 │
│  ┌─────────────────┐     ┌──────────────────────────────────┐  │
│  │  Landing Page   │     │  Download Page                   │  │
│  │  (Static HTML)  │     │  - Desktop downloads → GitHub    │  │
│  │                 │     │  - Install script → GitHub raw   │  │
│  │                 │     │  - Offline bundle → GitHub       │  │
│  └─────────────────┘     └──────────────────────────────────┘  │
│           │                           │                         │
│           └───────────┬───────────────┘                         │
│                       ▼                                         │
│              Hosted on Vercel/Netlify/VPS                       │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼ (Downloads point to)
┌─────────────────────────────────────────────────────────────────┐
│  GitHub (automationacct01/metric_frame)                        │
│  - /releases → Desktop apps (.dmg, .exe, .AppImage)            │
│  - /raw/main/install.sh → Install script                       │
│  - /releases → Offline bundles                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Option A: Deploy to Vercel (Recommended)

**Best for:** Fast setup, automatic deployments, free tier available.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Create Vercel configuration

Create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### Step 3: Set environment variables

Create `frontend/.env.production`:

```env
VITE_API_BASE_URL=
VITE_STATIC_SITE=true
```

### Step 4: Deploy

```bash
cd frontend
vercel --prod
```

### Step 5: Connect your domain

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Domains**
4. Add your domain (e.g., `metricframe.com`)
5. Update your DNS:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Or A record for apex domain

---

## Option B: Deploy to Netlify

**Best for:** Simple drag-and-drop, form handling, free tier.

### Step 1: Build locally

```bash
cd frontend
npm run build
```

### Step 2: Deploy via Netlify CLI

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Step 3: Or drag-and-drop

1. Go to https://app.netlify.com/drop
2. Drag the `frontend/dist` folder
3. Configure domain in Netlify dashboard

### Step 4: Add redirects

Create `frontend/public/_redirects`:

```
/*    /index.html   200
```

---

## Option C: Deploy to Cloudflare Pages

**Best for:** Global CDN, DDoS protection, generous free tier.

### Step 1: Connect repository

1. Go to https://dash.cloudflare.com → Pages
2. Click **Create a project** → Connect to Git
3. Select `automationacct01/metric_frame`

### Step 2: Configure build settings

- **Build command:** `cd frontend && npm install && npm run build`
- **Build output directory:** `frontend/dist`
- **Root directory:** `/`

### Step 3: Add environment variables

- `VITE_STATIC_SITE` = `true`

### Step 4: Deploy and add domain

1. After first deploy, go to **Custom domains**
2. Add your domain
3. Cloudflare will auto-configure DNS if domain is on Cloudflare

---

## Option D: Deploy to VPS (Full Control)

**Best for:** Running full MetricFrame stack, custom configurations.

### Step 1: Set up a VPS

Recommended providers:
- DigitalOcean ($6/mo)
- Linode ($5/mo)
- Vultr ($5/mo)
- Hetzner ($4/mo)

### Step 2: Install Docker

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | bash

# Install Docker Compose
apt-get install docker-compose-plugin
```

### Step 3: Clone and deploy

```bash
git clone https://github.com/automationacct01/metric_frame.git
cd metric_frame
docker compose -f docker-compose.prod.yml up -d
```

### Step 4: Set up SSL with Caddy (recommended)

Create `Caddyfile`:

```
metricframe.com {
    reverse_proxy localhost:3000
}
```

Run Caddy:

```bash
docker run -d \
  --name caddy \
  --network host \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:latest
```

---

## Option E: GitHub Pages (Free, Static Only)

**Best for:** Zero cost, simple setup.

### Step 1: Create GitHub Action for Pages

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build
        working-directory: frontend
        env:
          VITE_STATIC_SITE: 'true'
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 2: Enable GitHub Pages

1. Go to repo **Settings → Pages**
2. Source: **GitHub Actions**

### Step 3: Add custom domain

1. In repo Settings → Pages → Custom domain
2. Enter your domain
3. Add DNS records:
   - CNAME: `www` → `automationacct01.github.io`
   - A records for apex: GitHub's IPs

---

## DNS Configuration Quick Reference

### For Vercel
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### For Netlify
```
Type    Name    Value
A       @       75.2.60.5
CNAME   www     your-site.netlify.app
```

### For Cloudflare Pages
```
Type    Name    Value
CNAME   @       your-project.pages.dev
CNAME   www     your-project.pages.dev
```

### For GitHub Pages
```
Type    Name    Value
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
CNAME   www     automationacct01.github.io
```

---

## Post-Deployment Checklist

- [ ] Landing page loads at your domain
- [ ] Download page shows all platforms
- [ ] Desktop download links work (point to GitHub releases)
- [ ] Install script copy button works
- [ ] Offline bundle download works
- [ ] SHA256 checksum link works
- [ ] SSL certificate is valid (https)
- [ ] Mobile responsive layout works

---

## Updating the Site

### For Vercel/Netlify/Cloudflare (Git-connected)

Just push to `public main`:

```bash
git push public main
```

Site auto-deploys in 1-2 minutes.

### For VPS

```bash
ssh root@your-server
cd metric_frame
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Recommended Setup

For most users, I recommend:

1. **Vercel** for the landing/download page (free, fast, auto-SSL)
2. **GitHub Releases** for actual file hosting (already configured)
3. **GitHub raw** for install scripts (already configured)

This gives you:
- Zero hosting costs
- Global CDN
- Automatic SSL
- No server maintenance
