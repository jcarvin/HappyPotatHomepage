# ⚠️ DEPRECATED - See DATABASE_SETUP.md Instead

**This file contains the old insecure setup method.**

Please use `DATABASE_SETUP.md` for the **new secure authentication setup** using Supabase Auth with proper password hashing.

---

# Old Supabase Setup Guide (DEPRECATED)

This guide shows the OLD way of setting up authentication. **Do not use this for new projects.**

## Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

## Step 2: Create a New Project

1. Click "New Project"
2. Choose your organization (or create a new one)
3. Fill in project details:
   - **Project name**: `happypotat-auth` (or whatever you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click "Create new project"
5. Wait 1-2 minutes for your project to be provisioned

## Step 3: Get Your API Credentials

1. In your project dashboard, go to **Settings** → **API**
2. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`
3. Copy these values - you'll need them in the next step

## Step 4: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual credentials:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file
4. **Important**: Never commit this file to Git! It's already in `.gitignore`

## Step 5: Create the Users Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Paste this SQL:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  api_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on username for faster lookups
CREATE INDEX idx_users_username ON users(username);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows inserts (for registration)
CREATE POLICY "Allow public user registration" ON users
  FOR INSERT
  WITH CHECK (true);

-- Create a policy that allows users to read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (true);
```

4. Click "Run" or press `Ctrl+Enter`
5. You should see "Success. No rows returned"

## Step 6: Test Your Setup

1. Start your development server:
```bash
npm run dev
```

2. You can test the auth by importing the `AuthExample` component in your app
3. Try registering a new user and logging in

## Step 7: View Your Data (Optional)

1. Go to **Table Editor** in your Supabase dashboard
2. Select the `users` table
3. You should see any users you've registered

## Security Notes ⚠️

### Current Setup (Development)
- Passwords are stored as plain text (NOT SECURE!)
- This is fine for learning/development
- **DO NOT use this in production**

### For Production Use:
You'll need to implement proper password hashing. Here are two approaches:

#### Option A: Use Supabase Auth (Recommended)
Supabase has built-in authentication that handles hashing automatically:
```typescript
// Use Supabase's auth instead of your custom table
const { data, error } = await supabase.auth.signUp({
  email: username,
  password: password,
});
```

#### Option B: Add Database Functions for Hashing
Create a PostgreSQL function in Supabase:
```sql
-- Install pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;
```

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file exists and has the correct values
- Restart your dev server after adding environment variables

### "Failed to fetch" or CORS errors
- Check that your Supabase project is running
- Verify your API URL is correct
- Make sure you're using the `anon` key, not the `service_role` key

### "relation 'users' does not exist"
- Make sure you ran the SQL to create the table
- Check the Table Editor to confirm the table exists

## Next Steps

- [ ] Implement proper password hashing for production
- [ ] Add password strength requirements
- [ ] Add email verification
- [ ] Implement "forgot password" flow
- [ ] Add rate limiting to prevent brute force attacks
- [ ] Consider using Supabase Auth instead of custom table

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

