# Potential OAuth Issue: Missing Consent Screen

## Current Behavior

The `/api/oauth/authorize` endpoint currently:
1. Validates parameters ✅
2. Generates auth code ✅
3. **Immediately redirects to HubSpot** ⚡
4. No user interaction required ❌

## Potential Problem

**OAuth 2.0 typically requires a consent screen** where the user explicitly approves the connection. The current implementation auto-approves and redirects immediately.

This could cause issues:
- **Popup closes too fast** because there's no UI to show
- **HubSpot might reject** if expecting user interaction
- **User has no way to cancel** or see what permissions they're granting

## Expected OAuth Flow

```
1. User clicks "Connect MCP" in Breeze
2. Popup opens to YOUR authorize endpoint
3. YOUR SITE shows consent screen:
   ┌─────────────────────────────────────┐
   │  LoadedPotat wants to access:       │
   │  ✓ Read CRM data                    │
   │  ✓ Write CRM data                   │
   │                                     │
   │  [Cancel]  [Allow]                  │
   └─────────────────────────────────────┘
4. User clicks "Allow"
5. Your site redirects to HubSpot with code
6. Popup closes
```

## Current Implementation (Missing Step 3)

```
1. User clicks "Connect MCP" in Breeze
2. Popup opens to YOUR authorize endpoint
3. 💥 IMMEDIATE REDIRECT (no UI shown)
4. Popup closes
```

## How to Fix

### Option 1: Add Simple Consent Page

Create a page that shows before redirect:

```typescript
// /src/pages/MCPConsentPage.tsx
import React from 'react';

export function MCPConsentPage() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id');
  const scopes = params.get('scope')?.split(' ') || [];
  
  const handleApprove = async () => {
    // Call authorize endpoint with approval
    // Endpoint then generates code and redirects
  };
  
  return (
    <div className="consent-screen">
      <h1>LoadedPotat MCP wants to access your HubSpot data</h1>
      
      <div className="scopes">
        <h2>Permissions requested:</h2>
        <ul>
          {scopes.includes('crm:read') && <li>✓ Read CRM contacts and deals</li>}
          {scopes.includes('crm:write') && <li>✓ Create and update CRM records</li>}
        </ul>
      </div>
      
      <div className="actions">
        <button onClick={() => window.close()}>Cancel</button>
        <button onClick={handleApprove}>Allow Access</button>
      </div>
    </div>
  );
}
```

### Option 2: Check If User Already Consented

Modify authorize endpoint to check if user already has active token:

```typescript
// In authorize.ts, before generating new code:

// Check if user already has valid MCP registration
const { data: existingReg } = await supabase
  .from('mcp_user_registrations')
  .select('*')
  .eq('client_id', client_id)
  .eq('hubspot_portal_id', portalId)
  .gte('token_expires_at', new Date().toISOString())
  .single();

if (existingReg) {
  // User already consented - auto-approve
  console.log('ℹ️  User already has valid token - auto-approving');
  // ... generate code and redirect
} else {
  // First time - show consent screen
  console.log('ℹ️  First time connection - redirecting to consent page');
  return res.redirect(302, `/mcp-consent?${req.url.split('?')[1]}`);
}
```

### Option 3: Add Delay (Quick Test)

As a quick test to see if this is the issue, add a delay before redirect:

```typescript
// In authorize.ts, before the redirect:

console.log('⏳ Waiting 3 seconds before redirect (for testing)...');
await new Promise(resolve => setTimeout(resolve, 3000));
console.log('🚀 Redirecting now...');
return res.redirect(302, callbackUrl.toString());
```

If the popup stays open for 3 seconds and then the error appears, this confirms the issue is timing/consent related.

## Which Option to Try First?

### Quick Test (5 minutes)
1. Add the delay (Option 3) to see if popup behavior changes
2. If popup stays open = timing issue confirmed
3. If popup still closes immediately = different issue (CORS, redirect problem, etc.)

### If Timing Issue Confirmed
1. Implement Option 1 (consent page) for proper UX
2. Or implement Option 2 (auto-approve for existing users)

### If Not Timing Issue
- Check Vercel logs with new debugging
- Look for validation errors
- Check redirect URL format
- Verify HubSpot app configuration

## Testing the Fix

After implementing consent screen:

1. Connect MCP in Breeze
2. Popup should stay open and show consent UI
3. Click "Allow"
4. Should redirect to HubSpot
5. Popup closes
6. MCP connection successful

## Additional Debugging

If you want to test the authorize endpoint directly:

```bash
# Construct test URL (replace with your values)
https://happy-potat-homepage.vercel.app/api/oauth/authorize?
  response_type=code&
  client_id=loadedpotat-mcp&
  redirect_uri=https://app.hubspot.com/oauth-callback&
  scope=crm:read%20crm:write&
  state=test123

# Open in browser
# Should either:
# - Show consent screen (if implemented)
# - Immediately redirect (current behavior)
```

## Related Files

- `/api/oauth/authorize.ts` - Current endpoint (needs consent page redirect)
- `/src/pages/MCPConsentPage.tsx` - New page to create
- `/src/App.tsx` - Add route for consent page

---

**Next Step:** Try Option 3 (delay) first to confirm the issue, then implement Option 1 (consent page) for the proper fix.
