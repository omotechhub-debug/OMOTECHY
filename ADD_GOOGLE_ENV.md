# Quick Guide: Add Google Client ID to .env.local

## Step 1: Get Your Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Find your **OAuth 2.0 Client ID** (or create one if you don't have it)
5. Copy the **Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

## Step 2: Add to .env.local

Open your `.env.local` file in the project root and add these two lines:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

**Replace `your-client-id-here.apps.googleusercontent.com` with your actual Client ID**

## Step 3: Restart Your Server

After adding the variables:
1. Stop your development server (Ctrl+C)
2. Start it again: `npm run dev`

## Example .env.local

Your `.env.local` should look something like this:

```env
# Existing variables...
JWT_SECRET=your-jwt-secret
MONGODB_URI=your-mongodb-uri
# ... other variables ...

# Google OAuth Configuration (ADD THESE)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

## Important Notes

- ✅ Both variables must have the **same value**
- ✅ Use your actual Google Client ID (not the example)
- ✅ Don't add quotes around the value
- ✅ Restart the server after adding
- ✅ Never commit `.env.local` to git

## Verify It's Working

After restarting, check:
1. Browser console should NOT show "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set"
2. Google Sign-In button should appear on `/admin/login`
3. Server logs should NOT show "Google Client ID not configured"

