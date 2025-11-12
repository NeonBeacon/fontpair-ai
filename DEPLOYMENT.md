# Production Deployment Guide

This guide walks you through deploying FontPair AI to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Options](#deployment-options)
4. [Post-Deployment Tasks](#post-deployment-tasks)
5. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] **Supabase Production Database**
  - Created a production Supabase project
  - Run `supabase-schema.sql` in production SQL editor
  - Verified Row Level Security (RLS) policies are enabled
  - Added real license keys (not test keys)

- [ ] **Gemini API Key**
  - Obtained production API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
  - Verified API quota limits (default: 15 req/min, 1M tokens/day)
  - Enabled billing if needed for higher limits

- [ ] **Payment Integration** (Optional)
  - Set up Gumroad product or payment provider
  - Configured webhook for license generation
  - Tested payment flow end-to-end

- [ ] **Code Quality**
  - Run `npm run build` locally to verify build succeeds
  - Test all features in production mode (`npm run preview`)
  - Verify license validation works with production Supabase

---

## Environment Configuration

### Step 1: Create Production Environment File

1. Copy `.env.example` to `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. Edit `.env.production` with your production values:

```env
# ============================================
# FONTPAIR AI - PRODUCTION CONFIG
# ============================================

# Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key

# Payment (optional)
VITE_GUMROAD_PURCHASE_URL=https://your-product.gumroad.com/l/fontpair-ai
```

### Step 2: Verify .gitignore

Ensure `.env.production` is in your `.gitignore`:
```
.env
.env.local
.env.production
.env.production.local
```

⚠️ **NEVER commit `.env.production` to version control!**

---

## Deployment Options

### Option 1: Vercel (Recommended)

**Pros:** Zero-config, automatic HTTPS, global CDN, serverless

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Build the app**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add each variable from `.env.production`:
     - `GEMINI_API_KEY`
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_GUMROAD_PURCHASE_URL` (optional)
   - Select "Production" environment
   - Save and redeploy

5. **Configure Custom Domain** (optional):
   - Go to Project Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

**Important Vercel Notes:**
- Environment variables prefixed with `VITE_` are exposed to the client
- `GEMINI_API_KEY` without prefix is only available server-side
- Free tier includes 100GB bandwidth/month

---

### Option 2: Netlify

**Pros:** Easy setup, built-in forms, good for static sites

1. **Create `netlify.toml`** in project root:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy via CLI**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

3. **Set Environment Variables**:
   - Go to Site Settings → Build & Deploy → Environment
   - Add variables from `.env.production`
   - Redeploy

4. **Configure Custom Domain**:
   - Go to Domain Settings
   - Add custom domain
   - Update DNS as instructed

---

### Option 3: Cloudflare Pages

**Pros:** Free unlimited bandwidth, global CDN, fast builds

1. **Push to GitHub/GitLab**:
   ```bash
   git push origin main
   ```

2. **Create Cloudflare Pages Project**:
   - Go to Cloudflare Dashboard → Pages
   - Connect your GitHub repository
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output: `dist`

3. **Set Environment Variables**:
   - Go to Settings → Environment Variables
   - Add production variables
   - Save and redeploy

4. **Custom Domain**:
   - Go to Custom Domains
   - Add domain (automatic if using Cloudflare DNS)

---

### Option 4: Self-Hosted (Docker)

**Pros:** Full control, can run anywhere

1. **Create `Dockerfile`**:
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create `nginx.conf`**:
   ```nginx
   server {
     listen 80;
     server_name _;
     root /usr/share/nginx/html;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }

     # Security headers
     add_header X-Frame-Options "SAMEORIGIN" always;
     add_header X-Content-Type-Options "nosniff" always;
     add_header X-XSS-Protection "1; mode=block" always;
   }
   ```

3. **Build and Run**:
   ```bash
   docker build -t fontpair-app .
   docker run -p 80:80 \
     -e VITE_SUPABASE_URL=https://xxx.supabase.co \
     -e VITE_SUPABASE_ANON_KEY=xxx \
     fontpair-app
   ```

---

## Post-Deployment Tasks

### 1. Verify Deployment

- [ ] Visit production URL
- [ ] Test license key activation
- [ ] Upload a font and verify AI analysis works
- [ ] Test PDF export
- [ ] Check browser console for errors
- [ ] Test on mobile devices

### 2. Configure Supabase for Production

1. **Update CORS Settings** (if needed):
   - Go to Supabase Dashboard → Settings → API
   - Add production domain to allowed origins

2. **Set up Database Backups**:
   - Go to Database → Backups
   - Enable point-in-time recovery (paid plans)

3. **Monitor Usage**:
   - Check API requests in Supabase dashboard
   - Set up alerts for quota limits

### 3. Set Up Monitoring

**Vercel Analytics** (if using Vercel):
```bash
npm install @vercel/analytics
```

Add to `main.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

// In your root component
<Analytics />
```

**Sentry for Error Tracking** (optional):
```bash
npm install @sentry/react @sentry/vite-plugin
```

### 4. Performance Optimization

1. **Enable Gzip Compression**:
   - Most platforms enable this by default
   - Verify in Network tab: `Content-Encoding: gzip`

2. **Optimize Images**:
   - Preview images are already optimized with html2canvas
   - CDN assets are served from jsdelivr/cdnjs

3. **Monitor Bundle Size**:
   ```bash
   npm run build -- --mode production
   npx vite-bundle-visualizer
   ```

---

## Troubleshooting

### License Validation Fails

**Symptoms:** Users see "License validation is not configured" error

**Solution:**
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
2. Check Supabase RLS policies are enabled
3. Verify RPC functions exist: `validate_license_key`, `get_license_info`, `deactivate_device`
4. Test with browser dev tools → Network tab to see actual API calls

### Gemini API Errors

**Symptoms:** Font analysis fails with API errors

**Solution:**
1. Verify `GEMINI_API_KEY` is set (check deployment platform)
2. Check API quota limits in Google AI Studio
3. Ensure API key is valid and not expired
4. Test API key with curl:
   ```bash
   curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"
   ```

### Build Fails

**Symptoms:** `npm run build` fails with errors

**Solution:**
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check for TypeScript errors: `npx tsc --noEmit`
3. Update dependencies: `npm update`

### PDF Export Not Working

**Symptoms:** PDF export button shows error

**Solution:**
1. Verify `jspdf` is installed: `npm list jspdf`
2. Check browser console for specific error
3. Ensure build includes jspdf in bundle
4. Test in different browsers

### CORS Errors

**Symptoms:** Supabase requests blocked by CORS

**Solution:**
1. Add production domain to Supabase allowed origins:
   - Dashboard → Settings → API → CORS allowed origins
2. Include protocol: `https://your-domain.com`
3. Redeploy after Supabase config change

---

## Security Best Practices

### Environment Variables

- ✅ Use `VITE_` prefix ONLY for client-side variables
- ✅ Keep `GEMINI_API_KEY` server-side (no prefix)
- ✅ Never commit `.env.production` to git
- ✅ Rotate API keys periodically

### Supabase Security

- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Use anon key (not service_role key) in client code
- ✅ Review RLS policies before production
- ✅ Monitor for suspicious activity

### Content Security Policy

Add CSP headers in hosting platform:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;
```

---

## Scaling Considerations

### High Traffic

If expecting high traffic:

1. **Upgrade Supabase Plan**:
   - Pro plan: 500MB database, unlimited API requests
   - Check pricing at supabase.com/pricing

2. **Increase Gemini API Quota**:
   - Enable billing in Google Cloud Console
   - Set up rate limiting in your code

3. **Use CDN**:
   - Most deployment platforms include CDN
   - Cache static assets aggressively

### Multi-Region Deployment

For global users:
- Deploy to edge network (Vercel Edge, Cloudflare Workers)
- Use Supabase multi-region (enterprise)
- Consider read replicas for database

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Review deployment platform logs
3. Test locally with production build: `npm run build && npm run preview`
4. Verify all environment variables are set correctly
5. Check Supabase logs for API errors

## Next Steps

After successful deployment:

- [ ] Set up monitoring and alerts
- [ ] Configure custom domain
- [ ] Enable analytics
- [ ] Set up error tracking
- [ ] Plan backup strategy
- [ ] Document runbook for common issues
