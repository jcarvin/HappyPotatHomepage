# Vercel Environment Variables

These environment variables must be set in your Vercel project settings for the app to work properly.

## Required Variables

### Frontend (Client-side)

These are automatically available since they start with `VITE_`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_HUBSPOT_CLIENT_ID=your-hubspot-client-id
VITE_HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
VITE_HUBSPOT_REDIRECT_URI=https://your-domain.vercel.app/oauth
```

### Backend (API Functions)

These need to be added to Vercel environment variables:

```bash
# Supabase Service Role Key (for bypassing RLS in API functions)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click "Settings"
3. Click "Environment Variables"
4. Add each variable:
   - **Key**: Variable name (e.g., `SUPABASE_SERVICE_ROLE_KEY`)
   - **Value**: The actual value from Supabase/HubSpot
   - **Environments**: Select Production, Preview, and Development

## Where to Find These Values

### Supabase Variables

1. Go to https://app.supabase.com
2. Select your project
3. Go to "Settings" → "API"
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

### HubSpot Variables

1. Go to https://app.hubspot.com
2. Navigate to "Settings" → "Integrations" → "Private Apps"
3. Find your app or create one
4. Copy:
   - **Client ID** → `VITE_HUBSPOT_CLIENT_ID`
   - **Client Secret** → `VITE_HUBSPOT_CLIENT_SECRET`
5. Set redirect URI:
   - **Redirect URI** → `VITE_HUBSPOT_REDIRECT_URI`

## Security Notes

⚠️ **NEVER commit these values to git!**

- `VITE_*` variables are exposed to the browser - they should be public keys only
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only and bypasses RLS - keep it secret!
- The `SUPABASE_SERVICE_ROLE_KEY` should NEVER be prefixed with `VITE_`

## Verifying Setup

After adding environment variables:

1. **Redeploy** your project (Vercel auto-deploys on push)
2. Check the build logs for any missing variable errors
3. Test the API endpoints to ensure they work

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY is undefined"
- The variable is not set in Vercel
- You set it with `VITE_` prefix (remove that prefix)
- You need to redeploy after adding the variable

### "VITE_* is undefined in browser"
- Variables must start with `VITE_` to be exposed to browser
- Rebuild your project after adding them

### Changes don't take effect
- **Redeploy** your project after changing environment variables
- Clear your browser cache
- Check Vercel deployment logs for errors

