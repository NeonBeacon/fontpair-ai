# License Key System Setup Guide

This guide explains how to set up and configure the Supabase-based license key system for FontPair AI.

**Note:** License keys use the `` prefix for database compatibility. This technical identifier remains unchanged.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Setup](#supabase-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing the System](#testing-the-system)
6. [Managing Licenses](#managing-licenses)
7. [Troubleshooting](#troubleshooting)

## Overview

The license key system provides:

- **One-time payment validation** with device fingerprinting
- **Multi-device support** (default: 3 devices per license)
- **Offline grace period** (30 days after last validation)
- **Periodic revalidation** (every 7 days)
- **Device management** (users can deactivate devices to free up slots)
- **Secure backend** using Supabase RLS and RPC functions

## Prerequisites

- Node.js installed
- A [Supabase](https://supabase.com) account (free tier is sufficient)
- Basic understanding of SQL and PostgreSQL

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter project details:
   - **Name**: FontPair AI License System (or any name)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users
4. Wait for the project to finish setting up (~2 minutes)

### Step 2: Run the Database Schema

1. In your Supabase project, navigate to **SQL Editor** in the left sidebar
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this repo
4. Paste into the SQL editor
5. Click "Run" or press `Ctrl+Enter`
6. Verify success: You should see "Success. No rows returned"

This creates:
- `licenses` table - stores license keys and metadata
- `activations` table - tracks device activations
- `validation_attempts` table - security logging
- Three stored procedures:
  - `validate_license_key` - validates and activates licenses
  - `deactivate_device` - deactivates a device
  - `get_license_info` - retrieves license details
- Sample test licenses for development

### Step 3: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (e.g., ``)
   - **anon public** key (under "Project API keys")

## Environment Configuration

### Step 1: Create .env.local File

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:

   ```env
   # Your Gemini API key (for font analysis)
   GEMINI_API_KEY=your_actual_gemini_api_key

   # Your Supabase project URL
   VITE_SUPABASE_URL=

   # Your Supabase anon key
   VITE_SUPABASE_ANON_KEY=
   ```

### Step 2: Restart Development Server

```bash
npm run dev
```

The app will now check for a valid license on startup.

## Testing the System

### Creating Test Licenses

After running the SQL schema, create your own test licenses in Supabase:

1. Go to **Table Editor** > `licenses` table
2. Click "Insert" > "Insert row"
3. Create test licenses with your own keys (e.g., `YOUR-PREFIX-TEST-XXXX`)
4. Set appropriate `max_devices` values for testing

### Testing Flow

1. **First Launch**
   - App should show the License Key Screen
   - Enter your test license key
   - Click "Activate License"
   - Should show success and redirect to main app

2. **Second Launch**
   - App should remember your license
   - Should load directly to main app

3. **Settings Management**
   - Click Settings icon in header
   - View "License Management" section
   - See your device fingerprint, active devices count
   - Test "Deactivate This Device" button

4. **Multi-Device Testing**
   - Open app in different browser (counts as new device)
   - Or use private/incognito mode
   - Each will count as a separate device
   - Try exceeding max devices to test the limit

## Managing Licenses

### Creating New Licenses

Add licenses directly in Supabase:

1. Go to **Table Editor** > `licenses` table
2. Click "Insert" > "Insert row"
3. Fill in:
   - `license_key`: Unique key (e.g., ``)
   - `is_active`: `true`
   - `max_devices`: `3` (or desired limit)
   - `purchase_email`: Customer's email (optional)
   - `expires_at`: Leave blank for lifetime, or set expiry date
   - `notes`: Any internal notes (optional)

### Generating License Keys

Use a secure random generator. Example formats:
- `` (alphanumeric)
- Ensure keys are:
  - 12-32 characters (excluding dashes)
  - Alphanumeric (A-Z, 0-9)
  - Unique in your database

### Viewing Activations

1. Go to **Table Editor** > `activations` table
2. Filter by `license_key` to see all devices for a license
3. Columns show:
   - `device_fingerprint` - unique device ID
   - `activated_at` - first activation timestamp
   - `last_used` - most recent use
   - `is_active` - whether device is currently active

### Deactivating a Device

Two methods:

**Method 1: Via App UI**
- User clicks "Deactivate This Device" in Settings
- Frees up one device slot immediately

**Method 2: Via Supabase Dashboard**
1. Go to `activations` table
2. Find the activation record
3. Set `is_active` to `false`
4. Or delete the row entirely

### Disabling a License

1. Go to `licenses` table
2. Find the license
3. Set `is_active` to `false`
4. All devices using this license will be denied on next validation

## Troubleshooting

### "License validation is not configured"

**Cause**: Supabase environment variables not set or incorrect

**Fix**:
1. Check `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Restart dev server: `npm run dev`
3. Hard refresh browser: `Ctrl+F5`

### "Invalid license key"

**Causes**:
- Key doesn't exist in database
- Key is typed incorrectly
- Key has been deactivated

**Fix**:
1. Check spelling (case-insensitive, spaces/dashes ignored)
2. Verify key exists in `licenses` table
3. Check `is_active` is `true`

### "Maximum number of devices reached"

**Cause**: License is already active on max allowed devices

**Fix**:
1. Go to Supabase `activations` table
2. Find activations for this license key
3. Deactivate old/unused devices:
   - Set `is_active = false`
   - Or delete old activation records
4. Try activating again

### "Failed to validate license key"

**Causes**:
- Network/internet connection issue
- Supabase service temporarily down
- RPC functions not created

**Fix**:
1. Check internet connection
2. Verify Supabase project is active
3. Re-run `supabase-schema.sql` to ensure RPC functions exist
4. Check browser console for detailed error

### Offline Grace Period

If user has no internet:
- License is cached in localStorage
- App allows offline use for 30 days after last validation
- After 30 days, user must connect to internet to revalidate

### Database Query Issues

If you need to manually check database state:

```sql
-- View all licenses
SELECT * FROM licenses;

-- View all activations for a license
SELECT * FROM activations
WHERE license_key = '';

-- Count active devices for a license
SELECT COUNT(*) FROM activations
WHERE license_key = ''
AND is_active = true;

-- View recent validation attempts
SELECT * FROM validation_attempts
ORDER BY attempted_at DESC
LIMIT 20;
```

## Security Notes

- **Device Fingerprinting**: Uses FingerprintJS for unique browser identification
- **Server-Side Validation**: All checks performed via Supabase RPC (not client-side)
- **Row Level Security**: Supabase RLS policies protect sensitive data
- **Rate Limiting**: Track attempts via `validation_attempts` table
- **Local Storage**: Cached licenses stored in browser localStorage (not cookies)
- **No Personal Data**: Only device fingerprints and license keys stored

## Integration with Payment Providers

### Gumroad Integration Example

1. Set up a Gumroad product
2. Add webhook for "sale" event
3. Create serverless function to:
   - Receive Gumroad webhook
   - Generate unique license key
   - Insert into Supabase `licenses` table
   - Email license key to customer
4. Update `.env.local`:
   ```env
   VITE_GUMROAD_PURCHASE_URL=https://gumroad.com/l/your-product
   ```

### Other Payment Providers

Similar approach works with:
- Stripe
- Paddle
- LemonSqueezy
- PayPal

Key steps:
1. Generate unique license on purchase
2. Store in Supabase `licenses` table
3. Email to customer
4. Customer enters in app

## Production Deployment

### Vercel/Netlify

1. Add environment variables in deployment dashboard:
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Deploy: `npm run build`

3. Test license flow in production

### Custom Domain

Update CORS settings in Supabase if needed:
1. Go to **Settings** > **API**
2. Add your production domain to allowed origins

## Support

If you encounter issues:

1. Check browser console for errors
2. Review Supabase logs in **Logs** section
3. Query `validation_attempts` table for failed attempts
4. Ensure all SQL functions are created correctly

## License System Architecture

```
┌─────────────────┐
│  User Browser   │
│                 │
│  ┌───────────┐  │
│  │ App.tsx   │  │  Check license on startup
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼──────────────┐
│  │ LicenseKeyScreen  │  │  Show if no valid license
│  └─────┬──────────────┘
│        │ validateLicenseKey()
│        │
│  ┌─────▼────────────┐  │
│  │ licenseService   │  │  FingerprintJS + Supabase client
│  └─────┬────────────┘  │
│        │ RPC call      │
└────────┼────────────────┘
         │
         │ HTTPS
         ▼
┌────────────────────────────┐
│      Supabase Cloud        │
│                            │
│  ┌─────────────────────┐   │
│  │ validate_license_key│   │  PostgreSQL function
│  └──────────┬──────────┘   │
│             │              │
│  ┌──────────▼──────────┐   │
│  │   licenses table    │   │  Check key exists, active
│  └─────────────────────┘   │
│             │              │
│  ┌──────────▼──────────┐   │
│  │  activations table  │   │  Track devices, check limit
│  └─────────────────────┘   │
│             │              │
│  ┌──────────▼────────────┐ │
│  │ validation_attempts   │ │  Security logging
│  └───────────────────────┘ │
└────────────────────────────┘
```

## Next Steps

- Integrate with payment provider (Gumroad, Stripe, etc.)
- Customize license key format
- Set up automated email delivery
- Configure license expiration dates
- Add analytics/reporting dashboard
- Implement license key recovery flow
