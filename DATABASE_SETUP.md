# 🔐 Secure Authentication Setup with Supabase

This guide shows you how to set up **secure authentication** using Supabase's built-in Auth system.

## ✅ What Makes This Secure?

- ✨ **Automatic password hashing** using bcrypt
- 🔒 **JWT-based sessions** for authentication
- 🛡️ **Row Level Security (RLS)** to protect user data
- 📧 **Email verification** support
- 🔑 **OAuth support** (Google, GitHub, etc.) - optional

## 📋 Prerequisites

1. Supabase account (free tier is fine)
2. Environment variables configured in `.env` and Vercel
3. This codebase running locally

## 🚀 Setup Instructions

### Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select existing one
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: The long string starting with `eyJ...`

### Step 2: Configure Environment Variables

#### Local Development
Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add both variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Make sure to set them for all environments (Production, Preview, Development)

### Step 3: Create Database Tables

Go to your Supabase dashboard → **SQL Editor** and run this:

```sql
-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
-- This stores additional user data that's not in Supabase Auth
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  api_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster username lookups
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Allow profile creation during signup
CREATE POLICY "Allow profile creation" ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 4: Configure Supabase Auth Settings

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Under **Email Auth**:
   - ✅ Enable email signups
   - Choose whether to require email confirmation (recommended for production)
3. Under **Site URL**:
   - Local: `http://localhost:5173`
   - Production: Your Vercel URL (e.g., `https://your-app.vercel.app`)
4. Under **Redirect URLs**:
   - Add: `http://localhost:5173/**`
   - Add: `https://your-app.vercel.app/**`

### Step 5: Test Your Setup

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173/login`

3. Create a test account:
   - Enter an email, username, and password
   - Click "Create Account"
   - Note: API token is not entered here - it will be generated separately

4. Check your Supabase dashboard:
   - Go to **Authentication** → **Users** to see the auth user
   - Go to **Table Editor** → **user_profiles** to see the profile

## 🎯 How It Works

### Registration Flow
```
User fills form → Supabase Auth creates user (password auto-hashed)
  → User ID returned → Profile created in user_profiles table
  → Email verification sent (if enabled)
```

### Login Flow
```
User enters email/password → Supabase Auth verifies (secure comparison)
  → JWT session token issued → Profile data loaded from user_profiles
  → User logged in
```

### Session Management
- Sessions are stored in browser localStorage
- JWT tokens auto-refresh
- Sessions expire after inactivity
- Secure HttpOnly cookies option available

## 🔒 Security Features

### What's Automatically Secured

✅ **Password Hashing**: Bcrypt with salt rounds
✅ **SQL Injection Prevention**: Parameterized queries
✅ **XSS Protection**: Sanitized outputs
✅ **CSRF Protection**: JWT-based auth
✅ **Session Management**: Automatic token refresh
✅ **Rate Limiting**: Built-in by Supabase

### Row Level Security (RLS)

Your user profiles are protected by RLS policies:
- Users can only see their own profile
- Users can only update their own profile
- No one can delete profiles (handled by CASCADE on auth user deletion)

## 📱 Usage in Your App

### Get Current User
```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.username}!</div>;
}
```

### Protected Routes
```typescript
function ProtectedComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  return <div>Protected content</div>;
}
```

### Sign Out
```typescript
function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button onClick={signOut}>
      Sign Out
    </button>
  );
}
```

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file exists and has correct values
- Restart dev server after adding environment variables
- In Vercel, redeploy after adding environment variables

### "Failed to create user profile"
- Make sure you ran the SQL to create `user_profiles` table
- Check Table Editor to verify table exists
- Look at SQL logs in Supabase for errors

### "Invalid email or password"
- Email/password must match exactly
- Passwords are case-sensitive
- Check if email confirmation is required

### Email confirmation required but not receiving emails
- Check Supabase **Email Templates** settings
- For testing, disable email confirmation in Auth settings
- Check spam folder

## 🎨 Customization

### Change Password Requirements
In `LoginPage.tsx`, modify the validation:
```typescript
if (password.length < 8) {
  setError('Password must be at least 8 characters');
  return;
}
```

### Add OAuth Providers
1. Enable in Supabase dashboard → **Authentication** → **Providers**
2. Add to login page:
```typescript
const signInWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
};
```

### Customize Email Templates
Go to **Authentication** → **Email Templates** in Supabase to customize:
- Confirmation emails
- Password reset emails
- Magic link emails

## 🚀 Production Checklist

Before going to production:

- [ ] Enable email confirmation
- [ ] Set up custom SMTP (optional but recommended)
- [ ] Add password strength requirements
- [ ] Implement rate limiting on frontend
- [ ] Set up proper error tracking
- [ ] Test password reset flow
- [ ] Configure proper redirect URLs
- [ ] Set up monitoring for failed login attempts
- [ ] Review and test all RLS policies
- [ ] Enable 2FA (available in Supabase)

## 📚 Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Auth Guide](https://supabase.com/docs/guides/auth/auth-helpers/react)

## 🆘 Need Help?

If you run into issues:
1. Check Supabase logs in dashboard
2. Look at browser console for errors
3. Review this guide's troubleshooting section
4. Ask in Supabase Discord or GitHub discussions

