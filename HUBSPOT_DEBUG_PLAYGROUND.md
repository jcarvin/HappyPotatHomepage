# 🔍 HubSpot API Debug Playground

## Overview

The HubSpot Debug Playground is a visual tool for exploring HubSpot's API using your stored access token. Perfect for testing API calls and understanding what data is available.

## Access

**URL:** `/debug/hubspot`

**Example:** `https://happy-potat-homepage.vercel.app/debug/hubspot`

## Features

### 🚀 Quick Actions

Pre-built buttons for common HubSpot API calls:

- **📋 Token Info** - View details about your current access token
- **📊 API Usage** - Check your daily API usage limits
- **👥 List Contacts** - Fetch first 5 contacts from your CRM
- **🏢 List Companies** - Fetch first 5 companies
- **💰 List Deals** - Fetch first 5 deals
- **👤 List Users** - View users in your HubSpot account
- **🏷️ Contact Properties** - See all available contact properties
- **📐 CRM Schemas** - View your custom object schemas

### 🛠️ Custom Request

Send custom API calls to any HubSpot endpoint:
1. Enter the endpoint path (e.g., `/crm/v3/objects/tickets`)
2. Click "Send"
3. View the response below

### 📨 Response Viewer

- **Real-time results** - See responses as they come in
- **Status codes** - Clearly marked success (2xx) and error (4xx, 5xx) responses
- **Collapsible details** - Click to expand/collapse JSON responses
- **Timestamp** - Track when each request was made
- **Clear all** - Reset the response list

## How It Works

### Token Management

The playground uses `getValidAccessToken()` which:
1. ✅ Checks if your access token is expired
2. ✅ Automatically refreshes it if needed using your refresh token
3. ✅ Returns a valid token ready to use

### Authentication Required

- You **must be logged in** to use the playground
- The page checks for your Supabase authentication
- Your stored HubSpot access token is automatically used

### API Calls

All requests:
- Use your stored access token from the database
- Include proper authorization headers
- Go directly to HubSpot's API (not through a proxy)
- Display both success and error responses

## Common Endpoints

Here are some useful HubSpot API endpoints to try:

### CRM Objects
```
/crm/v3/objects/contacts
/crm/v3/objects/companies
/crm/v3/objects/deals
/crm/v3/objects/tickets
/crm/v3/objects/products
/crm/v3/objects/quotes
```

### Properties & Schemas
```
/crm/v3/properties/contacts
/crm/v3/properties/companies
/crm/v3/schemas
```

### Settings
```
/settings/v3/users
/account-info/v3/details
/account-info/v3/api-usage/daily
```

### OAuth
```
/oauth/v1/access-tokens/{token}
```

### Lists & Segments
```
/crm/v3/lists
```

## Example Use Cases

### 1. Check Token Scopes
```
Endpoint: /oauth/v1/access-tokens/{your-token}
Purpose: See what permissions your token has
```

### 2. Find Available Properties
```
Endpoint: /crm/v3/properties/contacts
Purpose: Discover what fields you can read/write
```

### 3. Test a Query
```
Endpoint: /crm/v3/objects/contacts?limit=1&properties=email,firstname,lastname
Purpose: Test filtering and property selection
```

### 4. Check Rate Limits
```
Endpoint: /account-info/v3/api-usage/daily
Purpose: Monitor your API usage
```

## Response Status Codes

- **200-299** 🟢 Success - Request completed successfully
- **400-499** 🔴 Client Error - Problem with your request
  - **401** - Unauthorized (token expired or invalid)
  - **403** - Forbidden (insufficient permissions)
  - **404** - Not found (endpoint or resource doesn't exist)
  - **429** - Rate limited (too many requests)
- **500-599** 🔴 Server Error - Problem on HubSpot's side

## Tips

1. **Start Simple** - Try the quick actions first to ensure your token works
2. **Check Scopes** - If you get 403 errors, your token might not have the required scope
3. **Read the Docs** - HubSpot's API documentation shows all available endpoints
4. **Test Before Building** - Use this to understand API responses before implementing features
5. **Watch Rate Limits** - HubSpot has API rate limits; the playground shows your usage

## Troubleshooting

### "No access token available"
- Go through the OAuth flow to connect your HubSpot account
- Visit `/oauth` to authenticate

### 401 Unauthorized
- Your access token has expired
- The playground should auto-refresh it, but if not, try reconnecting via `/oauth`

### 403 Forbidden
- Your token doesn't have the required OAuth scope
- You'll need to request additional scopes when connecting

### 404 Not Found
- Double-check the endpoint path
- Ensure you're using v3 or the correct API version
- Some endpoints require specific scopes to even appear

## Security Notes

- ✅ Your access token is stored securely in Supabase
- ✅ Tokens are automatically refreshed before expiring
- ✅ All API calls go directly from your browser to HubSpot
- ✅ Only you can see your API responses
- ⚠️ Don't share your access token or refresh token with anyone

## Resources

- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [CRM API Reference](https://developers.hubspot.com/docs/api/crm/understanding-the-crm)
- [OAuth Scopes](https://developers.hubspot.com/docs/api/working-with-oauth)

---

**Pro Tip:** Use browser DevTools Network tab alongside the playground to see the raw requests and responses!

