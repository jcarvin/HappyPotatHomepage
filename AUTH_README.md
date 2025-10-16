# 🔐 Authentication System - Quick Start

Your secure authentication system is now set up! Here's everything you need to know.

## ✅ What Was Built

### 1. **Secure Authentication with Supabase Auth**
   - ✨ Automatic bcrypt password hashing
   - 🔒 JWT-based session management
   - 📧 Email verification support
   - 🛡️ Row Level Security (RLS) enabled

### 2. **Pages Created**
   - `/login` - Beautiful login/signup page with form validation
   - `/profile` - User profile management (view/edit username and API token)
   - `/` - Homepage (shows user info when logged in)

### 3. **Auth System**
   - `AuthContext` - Global authentication state
   - `useAuth()` hook - Access user data anywhere in your app
   - Session persistence - Users stay logged in across page refreshes

### 4. **User Data Structure**
   ```typescript
   {
     id: string;           // UUID from Supabase Auth
     email: string;        // User's email (login credential)
     username: string;     // Display name
     apiToken: string | null; // Generated separately (not during signup)
   }
   ```

## 🚀 Next Steps

### 1. Update Your Database (REQUIRED)

Go to your Supabase dashboard → **SQL Editor** and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  api_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster username lookups
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation during signup
CREATE POLICY "Allow profile creation" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Configure Supabase Auth Settings

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**: Enable email signups
3. Under **Site URL**: Add your URLs
   - Local: `http://localhost:5173`
   - Production: `https://your-app.vercel.app`
4. Under **Redirect URLs**: Add wildcards
   - `http://localhost:5173/**`
   - `https://your-app.vercel.app/**`

### 3. Test It Out!

```bash
npm run dev
```

1. Visit `http://localhost:5173/login`
2. Create an account (just email, username, password)
3. Check Supabase dashboard to see your user
4. Log in and visit `/profile`
5. API token will be `null` initially - it gets generated separately

## 📖 Usage Examples

### Get Current User Anywhere
```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Hello, {user.username}!</div>;
}
```

### Protect a Route
```typescript
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ProtectedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) return <div>Loading...</div>;

  return <div>Protected content for {user?.username}</div>;
}
```

### Sign Out
```typescript
import { useAuth } from './hooks/useAuth';

function SignOutButton() {
  const { signOut } = useAuth();

  return <button onClick={signOut}>Sign Out</button>;
}
```

## 🗂️ File Structure

```
src/
├── lib/
│   ├── supabase.ts              # Supabase client config
│   └── auth.ts                  # Auth functions (register, login, etc.)
├── contexts/
│   ├── AuthContextType.ts       # Auth context type definition
│   └── AuthContext.tsx          # Auth provider component
├── hooks/
│   └── useAuth.ts               # Hook to access auth state
├── pages/
│   ├── LoginPage.tsx            # Login/signup page
│   ├── LoginPage.css
│   ├── ProfilePage.tsx          # User profile page
│   └── ProfilePage.css
├── main.tsx                     # App entry with AuthProvider
└── App.tsx                      # Routes configuration
```

## 🔒 Security Features

✅ **Password Security**
- Automatic bcrypt hashing
- Minimum 6 characters (configurable)
- Passwords never stored in plain text

✅ **Session Security**
- JWT tokens with automatic refresh
- Secure HttpOnly cookies (when configured)
- Automatic session expiration

✅ **Database Security**
- Row Level Security (RLS) enabled
- Users can only access their own data
- SQL injection protection

✅ **Input Validation**
- Email format validation
- Password confirmation check
- XSS protection

## 🐛 Troubleshooting

### Build/Run Issues

**"Cannot find module" errors**
```bash
npm install
```

**Environment variables not working**
- Restart dev server after changing `.env`
- In Vercel, redeploy after adding env vars

### Authentication Issues

**"Failed to create user profile"**
- Make sure you ran the SQL to create `user_profiles` table
- Check Table Editor in Supabase

**"Invalid email or password"**
- Credentials are case-sensitive
- Check if email confirmation is required

**Email confirmation not working**
- For testing, disable in Auth settings
- Check spam folder
- Verify SMTP settings in Supabase

### Routing Issues

**Login page not showing**
- Make sure you're using the correct URL: `/login`
- Check that `BrowserRouter` is set up in `main.tsx`

## 📚 Learn More

For complete details, see:
- [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) - Full setup guide
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [React Router Docs](https://reactrouter.com/)

## 🎉 You're All Set!

Your authentication system is production-ready with:
- Secure password hashing
- Session management
- User profiles with custom fields
- Beautiful UI components
- Full TypeScript support

Deploy to Vercel and you're live! 🚀

