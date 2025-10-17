# OAuth Flow Fix - Database-Backed State Management

## The Problem

The OAuth callback was happening in an iframe/new context where the user wasn't authenticated with Supabase. This meant we couldn't associate the HubSpot access token with the correct user account.

## The Solution

Implemented a **database-backed OAuth state management system** that:

1. ✅ Stores state tokens in the database with user associations
2. ✅ Allows OAuth callbacks to work without Supabase authentication
3. ✅ Maintains CSRF protection through cryptographically secure tokens
4. ✅ Prevents replay attacks with single-use tokens
5. ✅ Time-limits states (10-minute expiration)

## Security Model

The `oauth_states` table doesn't use Row Level Security (RLS) because:

- **State tokens are cryptographically random** (256-bit entropy) - unguessable
- **Single-use only** - marked as used after first access
- **Time-limited** - expire after 10 minutes
- **User-bound** - each state is tied to a specific user

Think of the state token like a one-time password - the randomness provides the security.

## Setup Instructions

### Step 1: Run Database Migration

Open your Supabase SQL Editor and run the SQL from `OAUTH_STATE_SETUP.md`. This creates:

- `oauth_states` table
- Helper functions: `create_oauth_state()` and `consume_oauth_state()`
- Indexes for performance
- Cleanup function for old states

### Step 2: Verify Environment Variables

Make sure your `.env` file has:

```env
VITE_HUBSPOT_CLIENT_ID=your_client_id
VITE_HUBSPOT_CLIENT_SECRET=your_secret
VITE_HUBSPOT_REDIRECT_URI=your_redirect_uri
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Step 3: Test the Flow

1. **Start dev server**: `npm run dev`
2. **Navigate to OAuth page** with proper query params
3. **Login with your credentials**
4. **Authorization flow creates state in database**
5. **OAuth callback validates state and saves token**

## How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User authenticates with Supabase                         │
│    ✓ Email + password login                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Create OAuth state token                                 │
│    • Generate 256-bit random token                          │
│    • Save to database with user_id                          │
│    • Set 10-minute expiration                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Redirect to HubSpot OAuth                                │
│    • Include state token in URL                             │
│    • HubSpot shows authorization screen                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. HubSpot redirects back (in iframe)                       │
│    • Returns with code + state parameters                   │
│    • No Supabase session in this context!                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Validate state token (no auth needed)                    │
│    • Look up state in database                              │
│    • Verify: exists, not used, not expired                  │
│    • Get associated user_id                                 │
│    • Mark state as used (single-use)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Exchange code for access token                           │
│    • Call HubSpot token endpoint                            │
│    • Receive access token                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Save token to correct user                               │
│    • Use user_id from validated state                       │
│    • Update user_profiles.api_token                         │
│    • No authentication required!                            │
└─────────────────────────────────────────────────────────────┘
```

## Changes Made

### New Files

1. **`OAUTH_STATE_SETUP.md`** - Database setup instructions
2. **`OAUTH_FIX_SUMMARY.md`** - This file!

### Modified Files

#### `src/lib/auth.ts`

**Added:**
- `generateStateToken()` - Creates cryptographically secure tokens
- `createOAuthState()` - Saves state to database with user association
- `consumeOAuthState()` - Validates and consumes state, returns user ID
- `updateApiTokenForUser()` - Updates token for specific user (no auth needed)

**Enhanced:**
- `updateApiToken()` - Added `ensureUserProfile()` helper
- Better logging throughout

#### `src/pages/OAuthPage.tsx`

**Removed:**
- Cookie-based state management (`setSecureCookie`, `getCookie`, etc.)
- `generateStateParameter()` (moved to auth.ts)
- `saveStateToggle` checkbox (always save to DB now)

**Updated:**
- `handleAuthorizeSubmit()` - Now async, uses `createOAuthState()`
- `handleFinalizeStep()` - Now async, uses `consumeOAuthState()`
- `exchangeCodeForToken()` - Accepts optional `userId` parameter
- `displayWelcomeMessage()` - Uses toggle state instead of cookies

**Fixed:**
- Environment variables now use `VITE_` prefix correctly

## Security Features

### CSRF Protection
- State tokens are cryptographically random (can't be guessed)
- State must exist in database (can't be forged)
- State tied to specific user (can't be hijacked)

### Replay Attack Prevention
- States are single-use (marked as used after consumption)
- Attempting to reuse returns error

### Time-Based Security
- States expire after 10 minutes
- Old states cleaned up automatically

### Database Security
- No RLS on `oauth_states` table (accessible without auth)
- Security provided by token randomness
- Each token is unique and unguessable

## Testing Checklist

- [ ] Run database migration SQL
- [ ] Verify environment variables are set
- [ ] Test authorization flow (creates state in DB)
- [ ] Test OAuth callback (validates and consumes state)
- [ ] Verify token saves to correct user
- [ ] Check that used states can't be reused
- [ ] Confirm expired states are rejected

## Debugging

### Check State Creation

```sql
SELECT * FROM oauth_states
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check State Consumption

Look for states with `is_used = true`:

```sql
SELECT
  state_token,
  user_id,
  created_at,
  used_at,
  expires_at,
  is_used
FROM oauth_states
WHERE is_used = true
ORDER BY used_at DESC
LIMIT 10;
```

### Console Logging

The implementation includes extensive console logging:

- `🔐 Creating OAuth state...`
- `✅ State token created successfully`
- `🔍 Validating state token from database...`
- `✅ State validation successful`
- `🔑 Using userId from state token`
- `💾 Saving HubSpot access token...`
- `✅ Token updated successfully`

Watch the browser console during the OAuth flow to see exactly what's happening.

## Maintenance

### Cleanup Old States

Run periodically (consider setting up a cron job):

```sql
SELECT cleanup_oauth_states();
```

This removes:
- Used states older than 1 hour
- Expired states

### Monitor Table Size

```sql
SELECT
  COUNT(*) as total_states,
  COUNT(*) FILTER (WHERE is_used = true) as used_states,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_states
FROM oauth_states;
```

## Troubleshooting

### "Not authenticated" when creating state
- User must be logged in with Supabase before starting OAuth flow
- Check that login is successful first

### "Invalid state token" in callback
- State might have expired (10 minutes)
- State might have already been used
- State token might not match database

### "Failed to update profile"
- Check RLS policies on `user_profiles` table
- Verify user_id from state is valid
- Check console logs for specific error

### State not found in database
- Database function might not be created
- User doesn't have permissions to create states
- Check Supabase logs for errors

## Next Steps

Consider adding:

1. **Monitoring** - Track failed state validations for security
2. **Metrics** - Count successful OAuth flows
3. **Cleanup Cron** - Automated cleanup of old states
4. **Rate Limiting** - Limit state creation per user
5. **Logging** - Enhanced audit trail for OAuth flows

## Questions?

- Check browser console for detailed logs
- Review Supabase logs in dashboard
- Check `oauth_states` table contents
- Verify environment variables are set correctly

