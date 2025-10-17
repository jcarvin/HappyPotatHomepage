# Vercel Serverless API Functions

This project now includes backend API functions that run server-side on Vercel, avoiding CORS issues.

## Structure

```
/api
  └── hubspot-token-info.ts   # Fetches HubSpot token info server-side
```

## How It Works

1. **Frontend calls your API**: `/api/hubspot-token-info`
2. **Your API calls HubSpot**: Server-side, no CORS issues
3. **Response returns to frontend**: Clean and secure

## API Endpoints

### POST /api/hubspot-token-info

Fetches token information from HubSpot's API server-side to avoid CORS issues.

**Request Body:**
```json
{
  "access_token": "your-hubspot-access-token"
}
```

**Response:**
```json
{
  "token": "...",
  "user": "...",
  "hub_domain": "...",
  "scopes": [...],
  "hub_id": 123456,
  "app_id": 123,
  "expires_in": 21600,
  "user_id": 123,
  "token_type": "access"
}
```

## Local Development

To test the API functions locally, use Vercel CLI:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Run local development server
vercel dev
```

This will start a local server at `http://localhost:3000` with your API functions available.

## Deployment

API functions are automatically deployed with your frontend when you deploy to Vercel:

```bash
vercel deploy
```

The API functions will be available at:
- **Production**: `https://your-domain.vercel.app/api/hubspot-token-info`
- **Preview**: `https://your-preview-url.vercel.app/api/hubspot-token-info`

## Configuration

### vercel.json

The `vercel.json` file is configured to:
- Exclude `/api/*` routes from the frontend catch-all rewrite
- Allow API functions to be accessed directly

```json
{
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

## Adding More API Functions

To add new API endpoints, simply create new files in the `/api` directory:

```typescript
// api/my-new-endpoint.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Your code here
  return res.status(200).json({ message: 'Hello!' });
}
```

This will be automatically available at `/api/my-new-endpoint`.

## Benefits

✅ No CORS issues (server-side requests)
✅ Same deployment as frontend
✅ Shared environment variables
✅ TypeScript support
✅ Automatic HTTPS
✅ Serverless (scales automatically)
✅ Free on Vercel's hobby plan

