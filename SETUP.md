# Claims App Setup Guide

This guide will help you set up your Franklin Street Claims App with Supabase integration.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

## Setup Instructions

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to **Project Settings** > **API**
3. Copy your **Project URL** and **anon/public key**

### 2. Create the Database Table

1. In your Supabase project, go to the **SQL Editor**
2. Open the `supabase-schema.sql` file in this project
3. Copy and paste the entire SQL script into the Supabase SQL Editor
4. Click **Run** to create the table and insert sample data

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## Features

### Home Page
- Displays all clients in a responsive grid layout
- Search functionality to filter clients by name, AMS code, client number, producer, or account manager
- Click on any client card to view details (page to be created)

### Add Client
- Click the "Add Client" button to add a new client
- All fields except client name are optional
- Automatically redirects to home page after successful addition

### Client Cards
- Each card displays a color-coded placeholder with company initials
- Shows client name, AMS code, client number, producer, and account manager

## Project Structure

```
app/
├── page.js                 # Home page with clients grid
├── layout.js               # Root layout
├── globals.css             # Global styles
└── clients/
    └── add/
        └── page.js         # Add client page

components/
├── Header.js               # Header with navigation and welcome banner
└── ClientCard.js           # Individual client card component

lib/
└── supabase.js             # Supabase client configuration
```

## Next Steps

To extend this application, you might want to:

1. Create a client detail page at `/clients/[id]`
2. Add edit and delete functionality
3. Implement user authentication
4. Add image upload for company logos
5. Create pages for Locations, EPI, and COI menu items
6. Add pagination for large client lists

## Troubleshooting

### "Error loading clients" message
- Make sure your Supabase credentials are correctly set in `.env.local`
- Verify that the clients table was created successfully
- Check that your Supabase project is active

### No clients showing up
- Run the SQL script in `supabase-schema.sql` to insert sample data
- Or click "Add Client" to manually add clients

### Build errors
- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Run `npm run dev`
