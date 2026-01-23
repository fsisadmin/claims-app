# Simplified Client Management Setup

## What Changed

I've simplified your interface to focus on client management:

### 1. Removed Navigation Tabs
- Removed: Locations, EPI, COI tabs
- Kept: Admin links (Users, Invite) for admins only
- Cleaner, simpler header focused on your core workflow

### 2. Added Client Logo Upload
- Upload company logos when adding clients
- Supports PNG, JPG, GIF up to 2MB
- Preview image before submitting
- Logos are stored in Supabase Storage
- Falls back to colored initials if no logo uploaded

### 3. Added State Dropdown
- All 50 US states + DC
- Easy dropdown selection
- Displayed on client cards

## Setup Required

### Step 1: Update Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Add logo_url and state columns to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2);

-- Create index for state lookups
CREATE INDEX IF NOT EXISTS idx_clients_state ON clients(state);
```

### Step 2: Create Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Name it: `clients`
4. **Public bucket**: Yes (so logos are publicly accessible)
5. Click **Create bucket**

### Step 3: Set Storage Policies

After creating the bucket, set up access policies:

1. Click on the `clients` bucket
2. Go to **Policies** tab
3. Click **New Policy**

**Allow SELECT (public read):**
```sql
-- Policy name: Public read access
-- Allowed operation: SELECT
-- Policy definition:
true
```

**Allow INSERT (authenticated users):**
```sql
-- Policy name: Authenticated users can upload
-- Allowed operation: INSERT
-- Policy definition:
auth.uid() IS NOT NULL
```

**Allow DELETE (own organization only):**
```sql
-- Policy name: Users can delete from their org folder
-- Allowed operation: DELETE
-- Policy definition:
auth.uid() IS NOT NULL
```

## New Features

### Add Client Form

Now includes:
- **Client Name** - Required
- **Client Logo** - Optional image upload with preview
- **State** - Dropdown with all US states
- **AMS Code** - Optional
- **Client Number** - Optional
- **Producer Name** - Optional
- **Account Manager** - Optional

### Client Cards

Display:
- Logo image (if uploaded) or colored initials (fallback)
- Client name
- State code (if provided)
- AMS code
- Client number
- Producer name
- Account Manager

### File Structure

**New Files:**
- [lib/constants.js](lib/constants.js) - US state codes list
- [supabase-clients-update.sql](supabase-clients-update.sql) - Database schema updates
- [SIMPLIFIED-CLIENT-SETUP.md](SIMPLIFIED-CLIENT-SETUP.md) - This file

**Modified Files:**
- [components/Header.js](components/Header.js) - Removed navigation tabs
- [app/clients/add/page.js](app/clients/add/page.js) - Added logo upload & state dropdown
- [components/ClientCard.js](components/ClientCard.js) - Shows logo image & state

## How to Use

### Adding a Client with Logo

1. Click **"Add Client"** button
2. Enter client name (required)
3. Click **"Choose File"** to upload a logo
   - Supports: PNG, JPG, GIF
   - Max size: 2MB
   - Preview shows immediately
4. Select state from dropdown
5. Fill in other optional fields
6. Click **"Add Client"**

The logo is uploaded to Supabase Storage and the URL is saved in the database.

### Storage Organization

Logos are organized by organization:
```
clients/
└── client-logos/
    └── {organization_id}/
        ├── randomhash-timestamp.png
        ├── randomhash-timestamp.jpg
        └── ...
```

This keeps each organization's files separate and organized.

## Troubleshooting

### "Failed to upload logo" error

**Possible causes:**
1. Storage bucket not created
2. Storage bucket not public
3. No upload policy set

**Solution:**
- Follow Step 2 & 3 above to set up storage correctly

### Logo not displaying on card

**Check:**
1. Is `logo_url` column added to database?
2. Did the upload succeed? Check Supabase Storage to verify file exists
3. Is the bucket public?

### "Column logo_url does not exist" error

**Solution:**
- Run the SQL from Step 1 to add the new columns

### Image too large

**Solution:**
- Compress the image before uploading
- Use tools like TinyPNG or Squoosh
- Keep logos under 2MB

## Benefits

### Simplified Interface
- No unnecessary navigation tabs
- Focus on core functionality: adding and viewing clients
- Cleaner, less cluttered UI

### Professional Client Cards
- Real company logos instead of just initials
- More professional appearance
- Better visual recognition

### Better Organization
- State information for geographic organization
- Easy filtering by state (can be added later)
- All client info in one place

## Next Steps

You can further enhance this by:

1. **Add filtering by state** - Filter client list by state dropdown
2. **Add logo editing** - Allow uploading new logo for existing clients
3. **Resize images** - Automatically resize large images on upload
4. **Add more fields** - Phone, email, address, etc.
5. **Bulk import** - CSV upload for multiple clients
6. **Export clients** - Download client list as CSV/Excel

## Storage Limits

Supabase free tier includes:
- 1 GB storage
- 2 GB bandwidth per month

For production use with many logos:
- Consider upgrading to Pro plan (100 GB storage)
- Or use external CDN for image hosting
- Optimize images before upload

## Security

Logos are stored in a public bucket because:
- They're displayed on cards for all org members
- No sensitive information in logos
- Faster loading (no auth required)

**However:**
- Users can only upload if authenticated
- Files are organized by organization ID
- Only users in the org can access via the app

If you need private logos:
- Make bucket private
- Update policies to restrict access
- Images will load slower (auth required)
