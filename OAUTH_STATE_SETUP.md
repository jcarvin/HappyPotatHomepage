# OAuth State Management Setup

This guide shows how to set up secure OAuth state management using Supabase.

## Security Model

The `oauth_states` table doesn't use RLS because:
1. **State tokens are cryptographically random** (256-bit entropy) - unguessable
2. **Single-use only** - marked as used after first access
3. **Time-limited** - expire after 10 minutes
4. **User-bound** - each state is tied to a specific user

Think of the state token like a one-time password - the randomness provides the security.

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Create oauth_states table for managing OAuth flow state
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,

  -- Index for fast lookups
  CONSTRAINT oauth_states_state_token_key UNIQUE (state_token)
);

-- Create index for faster state token lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token) WHERE is_used = FALSE;

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at) WHERE is_used = FALSE;

-- No RLS on this table - security is provided by unguessable state_token
-- This allows the OAuth callback to access it without authentication

-- Function to clean up expired/used states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_oauth_states()
RETURNS void AS $$
BEGIN
  -- Delete states that are either used or expired
  DELETE FROM oauth_states
  WHERE is_used = TRUE
     OR expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT SELECT, INSERT, UPDATE ON oauth_states TO authenticated;
GRANT SELECT, INSERT, UPDATE ON oauth_states TO anon;

-- Create a function to create state with proper security
CREATE OR REPLACE FUNCTION create_oauth_state(
  p_state_token TEXT,
  p_user_id UUID,
  p_expires_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_state_id UUID;
BEGIN
  INSERT INTO oauth_states (state_token, user_id, expires_at)
  VALUES (p_state_token, p_user_id, NOW() + (p_expires_minutes || ' minutes')::INTERVAL)
  RETURNING id INTO v_state_id;

  RETURN v_state_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to consume state and get user_id
CREATE OR REPLACE FUNCTION consume_oauth_state(p_state_token TEXT)
RETURNS TABLE (
  user_id UUID,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_state RECORD;
BEGIN
  -- Try to find the state
  SELECT * INTO v_state
  FROM oauth_states
  WHERE state_token = p_state_token
  FOR UPDATE; -- Lock the row

  -- State not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Invalid state token'::TEXT;
    RETURN;
  END IF;

  -- State already used
  IF v_state.is_used THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'State token already used'::TEXT;
    RETURN;
  END IF;

  -- State expired
  IF v_state.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'State token expired'::TEXT;
    RETURN;
  END IF;

  -- Mark as used
  UPDATE oauth_states
  SET is_used = TRUE, used_at = NOW()
  WHERE state_token = p_state_token;

  -- Return success
  RETURN QUERY SELECT v_state.user_id, TRUE, NULL::TEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_oauth_state TO authenticated;
GRANT EXECUTE ON FUNCTION consume_oauth_state TO anon;
GRANT EXECUTE ON FUNCTION consume_oauth_state TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_oauth_states TO postgres;
```

## How It Works

### 1. Creating State (Pre-Authorization)
- User is authenticated in main window
- Generate cryptographically random state token
- Save to database with user_id and expiration
- Redirect to HubSpot OAuth with state

### 2. Consuming State (OAuth Callback)
- OAuth callback receives state parameter
- Look up state in database (no auth required)
- Validate: exists, not used, not expired
- Mark as used
- Get associated user_id
- Update that user's api_token

### 3. Security
- State tokens are 256-bit random values (unguessable)
- Single-use prevents replay attacks
- Expiration prevents old states from working
- Cleanup function removes old states

## Testing

After running the SQL, test the functions:

```sql
-- Test creating a state
SELECT create_oauth_state(
  'test_state_' || gen_random_uuid()::TEXT,
  (SELECT id FROM auth.users LIMIT 1),
  10
);

-- Test consuming a state (replace with actual state_token)
SELECT * FROM consume_oauth_state('test_state_...');

-- Test cleanup
SELECT cleanup_oauth_states();
```

## Notes

- Run `cleanup_oauth_states()` periodically via a cron job or Supabase Edge Function
- Monitor the `oauth_states` table size
- Consider adding logging for security audits

