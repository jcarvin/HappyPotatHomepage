# MCP OAuth Issue - Summary

## What You Said
> "The url that we're using for our mcpUrl is `https://happy-potat-homepage.vercel.app/api/mcp/handler` - This is expected to handle the mcp specific oauth handshake. But it doesn't seem to be doing this task."

## The Actual Issue

You were **partially correct** - but the problem wasn't that `/api/mcp/handler` should handle OAuth (it shouldn't). The real issue was:

### The OAuth flow WAS working, but it was missing a critical piece of data! ❌

**What was broken:**
```
User connects MCP → OAuth flow completes → MCP token created
                                                    ↓
                                        "What portal does this token belong to?" 🤷
                                                    ↓
                                        System guesses (incorrectly)
```

## The Architecture (How It Should Work)

The MCP system has **3 separate endpoints**, not one:

### 1. `/api/oauth/authorize` - Authorization ✅
- HubSpot redirects here when user clicks "Connect MCP"
- Generates temporary auth code
- **NOW FIXED:** Captures portal ID from HubSpot

### 2. `/api/oauth/token` - Token Exchange ✅  
- HubSpot calls this to exchange auth code for access token
- **NOW FIXED:** Stores portal ID with the MCP token

### 3. `/api/mcp/handler` - Tool Execution ✅
- HubSpot calls this to execute tools (create contact, etc.)
- Receives the MCP access token
- **NOW FIXED:** Looks up which portal using stored portal ID
- Uses that portal's HubSpot credentials

## What We Fixed

### Before (Broken) 🔴
```typescript
// In token.ts - line 145
// Store token registration (simplified - no portal tracking) ❌
const { error } = await supabase
  .from('mcp_user_registrations')
  .insert({
    access_token: accessToken,
    // Missing: hubspot_portal_id ❌
  });
```

```typescript
// In auth.ts - lines 126-139
// Just guessing which portal to use ❌
let query = supabase
  .from('app_tokens')
  .eq('app_name', 'loadedpotat')
  .order('created_at', { ascending: false })  // Most recent = wrong portal?
  .limit(1);
```

### After (Fixed) ✅
```typescript
// In token.ts - NOW FIXED
const { error } = await supabase
  .from('mcp_user_registrations')
  .insert({
    access_token: accessToken,
    hubspot_portal_id: authCodeData.hubspot_portal_id, // ✅ STORED!
  });
```

```typescript
// In auth.ts - NOW FIXED
const targetPortalId = registration.hubspot_portal_id; // ✅ FROM TOKEN

let query = supabase
  .from('app_tokens')
  .eq('app_name', 'loadedpotat')
  .eq('user_id', targetPortalId); // ✅ EXACT PORTAL MATCH
```

## Why This Matters

### Scenario: You have the app installed in 2 portals

**Before (Broken):**
```
Portal A: 123456789 (installed Feb 10)
Portal B: 987654321 (installed Feb 12) ← Most recent

User from Portal A connects MCP
  → OAuth completes
  → Token stored (no portal ID)
  → User asks to create contact
  → System picks Portal B (most recent) ❌ WRONG PORTAL!
  → Creates contact in wrong portal ❌
```

**After (Fixed):**
```
Portal A: 123456789 (installed Feb 10)
Portal B: 987654321 (installed Feb 12)

User from Portal A connects MCP
  → OAuth completes with portal_id=123456789
  → Token stored WITH portal ID ✅
  → User asks to create contact
  → System looks up Portal A from token ✅ CORRECT!
  → Creates contact in Portal A ✅
```

## Files Changed

1. **migrations/add_portal_id_to_mcp_registrations.sql** - Database schema
2. **api/oauth/types.ts** - TypeScript types
3. **api/oauth/authorize.ts** - Capture portal ID
4. **api/oauth/token.ts** - Store portal ID
5. **api/mcp/auth.ts** - Use portal ID for lookup

## Next Steps

1. **Run the database migration** in Supabase
2. **Deploy the code** (git push)
3. **Test the flow** (disconnect and reconnect MCP)
4. **Verify logs** show portal ID being captured and used

See `MCP_PORTAL_TRACKING_FIX.md` for detailed deployment instructions.

## Key Insight

The `/api/mcp/handler` URL **is working correctly** - it handles MCP tool calls as designed. The bug was in the **OAuth endpoints** not capturing portal context, which meant the handler couldn't determine which portal's credentials to use.

The OAuth handshake was completing, but it was like getting a key without knowing which door it opens! 🔑🚪❓

Now we track which door (portal) each key (token) belongs to. ✅
