# MCP OAuth Debug Guide

## Overview

Comprehensive logging has been added to the MCP OAuth endpoints to help diagnose the popup closing issue.

## What Was Added

### 1. Authorization Endpoint (`/api/oauth/authorize`)

**Logs Include:**
- 🔵 Request received marker
- All incoming query parameters
- Request headers (host, user-agent, referer, origin)
- Each validation step (response_type, client_id, redirect_uri, scopes)
- Portal ID extraction
- Auth code generation
- Database insert operation
- Final redirect URL being sent to HubSpot
- All errors with full details

### 2. Token Exchange Endpoint (`/api/oauth/token`)

**Logs Include:**
- 🟢 Request received marker
- All incoming request body parameters
- Request headers
- Client validation steps
- Authorization code lookup
- Code expiration check
- redirect_uri verification
- PKCE validation (if used)
- Token generation
- Database operations
- Final response being sent to HubSpot
- All errors with full details

## How to Debug

### Step 1: Deploy the Changes

```bash
git add .
git commit -m "Add comprehensive OAuth debugging logs"
git push
```

Wait for Vercel deployment.

### Step 2: Attempt MCP Connection

1. Go to Breeze Agent Studio
2. Try to add the MCP server
3. Let the popup open/close

### Step 3: Check Vercel Logs

Go to: https://vercel.com/your-project/logs

#### Look for Authorization Logs (Blue markers 🔵)

**Successful flow should show:**
```
🔵 ============================================
🔵 MCP OAUTH AUTHORIZE REQUEST RECEIVED
🔵 ============================================
📋 Request Method: GET
📋 All Query Parameters: { ... }
✓ Validating response_type...
✅ response_type valid: code
✓ Validating client_id...
✅ client_id valid: loadedpotat-mcp
✓ Validating redirect_uri...
✅ redirect_uri present: https://...
✅ redirect_uri whitelisted
✓ Validating scopes...
✅ Scopes valid: [ 'crm:read', 'crm:write' ]
🔐 Generating authorization code...
✅ Auth code generated: ...
💾 Inserting auth code into database...
✅ Auth code stored in database
🔄 Building redirect URL...
✅ OAuth authorization successful
🚀 Redirecting to HubSpot callback (302)...
```

**Error scenarios:**

❌ **Invalid client_id:**
```
❌ Invalid client_id: some-wrong-id Expected: loadedpotat-mcp
```
**Fix:** Check VITE_LOADEDPOTAT_MCP_CLIENT_ID matches what HubSpot is sending

❌ **redirect_uri not whitelisted:**
```
❌ redirect_uri not whitelisted: https://some-domain.com/callback
```
**Fix:** Add the domain to `allowedDomains` in authorize.ts

❌ **Database error:**
```
❌ Failed to store authorization code: { message: '...' }
```
**Fix:** Check Supabase configuration and table schema

#### Look for Token Exchange Logs (Green markers 🟢)

**Successful flow should show:**
```
🟢 ============================================
🟢 MCP OAUTH TOKEN EXCHANGE REQUEST
🟢 ============================================
📋 Request Body: { grant_type: 'authorization_code', ... }
✓ Validating client_id...
✅ client_id valid
💾 Looking up authorization code in database...
✅ Authorization code found
✓ Checking code expiration...
✅ Code not expired
✓ Verifying redirect_uri match...
✅ redirect_uri matches
🔐 Generating new tokens...
✅ Tokens generated
💾 Storing token registration...
✅ Token registration stored
🟢 ============================================
✅ OAUTH token exchange completed
🟢 ============================================
```

**Error scenarios:**

❌ **Code not found:**
```
❌ Authorization code not found in database
```
**Fix:** Authorization step may have failed or code already used

❌ **Code expired:**
```
❌ Authorization code expired
  Expires at: 2026-02-12T10:00:00.000Z
  Current time: 2026-02-12T10:06:00.000Z
```
**Fix:** User waited too long (>5 min), need to restart flow

❌ **redirect_uri mismatch:**
```
❌ redirect_uri mismatch
  Original: https://app.hubspot.com/callback
  Provided: https://app.hubspotqa.com/callback
```
**Fix:** HubSpot is using different redirect_uri in token exchange

❌ **PKCE validation failed:**
```
❌ PKCE validation failed - challenge mismatch
```
**Fix:** code_verifier doesn't match code_challenge from authorization

### Step 4: Common Issues and Solutions

#### Issue 1: Popup closes immediately, no authorize logs

**Symptom:** No 🔵 logs appear at all

**Possible causes:**
- HubSpot not actually calling our authorize endpoint
- Wrong URL in app configuration
- Network error preventing request

**Check:**
1. App config has correct authorizationUrl
2. Network tab in browser dev tools
3. Any CORS errors in browser console

#### Issue 2: Authorize succeeds but token exchange fails

**Symptom:** See 🔵 success but no 🟢 logs

**Possible causes:**
- HubSpot can't reach token endpoint
- Wrong tokenUrl in app configuration
- HubSpot rejecting our redirect for some reason

**Check:**
1. App config has correct tokenUrl
2. Look for HubSpot error in their UI
3. Check if redirect URL is properly formed

#### Issue 3: Portal ID not being captured

**Symptom:** Logs show `portal_id: not provided`

**Possible causes:**
- HubSpot not sending portal_id parameter
- Parameter name is different

**Check:**
1. Look at "All Query Parameters" in logs
2. Check if portal_id is in different field
3. May need to parse from state parameter

#### Issue 4: Database errors

**Symptom:** `❌ Failed to store authorization code` or `❌ Failed to store user registration`

**Possible causes:**
- Missing database columns (portal_id)
- RLS policies blocking inserts
- Supabase credentials wrong

**Check:**
1. Run database migration from MCP_DEPLOY_NOW.md
2. Check RLS policies in Supabase
3. Verify SUPABASE_SERVICE_ROLE_KEY in Vercel

## Log Markers Reference

| Marker | Endpoint | Meaning |
|--------|----------|---------|
| 🔵 | authorize | Authorization request section |
| 🟢 | token | Token exchange section |
| 📋 | both | Information logging |
| ✓ | both | Starting validation step |
| ✅ | both | Validation/operation successful |
| ❌ | both | Error occurred |
| 🔐 | both | Cryptographic operation |
| 💾 | both | Database operation |
| 🔄 | authorize | Building redirect |
| 🚀 | authorize | Performing redirect |
| 🗑️ | token | Deleting data |
| 📤 | token | Sending response |
| ℹ️ | both | Informational note |

## What to Share for Help

If you need help debugging, share:

1. **Full log output** from both authorize and token endpoints
2. **App configuration** (authorizationUrl, tokenUrl, clientId)
3. **HubSpot error message** (if visible in their UI)
4. **Browser console errors** (if any)
5. **Network tab** showing the authorize request

## Next Steps After Identifying Issue

Once you identify the problem from logs:

1. **Authorization issues** → Fix app config or authorize.ts validation
2. **Token exchange issues** → Check database, fix token.ts
3. **Portal ID issues** → May need UI for portal selection
4. **HubSpot rejection** → May need to contact HubSpot support

---

**Pro Tip:** Use Vercel's log filtering to search for:
- `❌` - Find errors quickly
- `🔵 MCP OAUTH` - See all authorize requests
- `🟢 MCP OAUTH` - See all token requests
- `portal_id:` - Track portal ID throughout flow
