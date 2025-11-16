# Google Sign-In Troubleshooting Guide

## Common Error: "Network error. Please check your connection"

This error usually indicates one of the following issues:

### 1. Missing Environment Variables ⚠️ MOST COMMON

**Check if these are set in your `.env.local` file:**

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**To fix:**
1. Open `.env.local` in your project root
2. Add both variables with your Google OAuth Client ID
3. Restart your development server (`npm run dev`)

**Verify:**
- Open browser console (F12)
- Check for error: "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set"
- If you see this, the environment variable is missing

### 2. Google OAuth Not Configured

**Check Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Verify your OAuth 2.0 Client ID exists
4. Check **Authorized JavaScript origins** includes:
   - `http://localhost:3000` (for development)
   - Your production domain (for production)

**To fix:**
- Add your domain to authorized origins
- Wait a few minutes for changes to propagate
- Clear browser cache and try again

### 3. Check Browser Console

**Open browser console (F12) and look for:**

1. **"Google Sign-In button rendered successfully"** - Good! Button loaded
2. **"Calling Google login API..."** - Good! Request sent
3. **"Google login API response status: XXX"** - Check the status code:
   - `200` = Success
   - `400` = Bad request (check token)
   - `401` = Unauthorized (check Google Client ID)
   - `404` = Account not found
   - `500` = Server error (check server logs)

### 4. Check Server Logs

**Look in your terminal/console where you ran `npm run dev`:**

1. **"Google login API called"** - Request received
2. **"Google ID token received, length: XXX"** - Token received
3. **"✅ Admin Google login successful"** - Success!
4. **Error messages** - Will show what went wrong

### 5. Network Connectivity Issues

**Check:**
- Internet connection is working
- Can access `https://accounts.google.com/gsi/client` (try in browser)
- No firewall blocking Google services
- No VPN interfering with Google services

### 6. CORS Issues

**If you see CORS errors in console:**
- Check that your domain is in Google OAuth authorized origins
- Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` matches the Client ID in Google Console
- Ensure you're using HTTPS in production

## Step-by-Step Debugging

### Step 1: Verify Environment Variables

```bash
# Check if .env.local exists
ls -la .env.local

# Check contents (don't share publicly!)
cat .env.local | grep GOOGLE
```

Should show:
```
GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

### Step 2: Check Browser Console

1. Open `/admin/login` page
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for errors or logs starting with "Google"

### Step 3: Check Network Tab

1. In Developer Tools, go to Network tab
2. Click Google Sign-In button
3. Look for request to `/api/auth/google-login`
4. Check:
   - Status code (should be 200 for success)
   - Response body (click on the request)
   - Request payload (should contain `idToken`)

### Step 4: Test API Directly

You can test the API endpoint directly:

```bash
curl -X POST http://localhost:3000/api/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test-token"}'
```

Expected response if token is invalid:
```json
{"error":"Invalid Google token"}
```

### Step 5: Verify Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Verify:
   - **Authorized JavaScript origins** includes your domain
   - **Authorized redirect URIs** includes your domain
   - Client ID matches your `.env.local` file

## Quick Fixes

### Fix 1: Restart Development Server

```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

### Fix 2: Clear Browser Cache

1. Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
2. Clear cached images and files
3. Refresh page

### Fix 3: Check Environment Variables Are Loaded

Add this temporarily to your login page to verify:

```typescript
console.log('Google Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
```

If it shows `undefined`, the environment variable is not set correctly.

### Fix 4: Verify Google Script Loads

Check browser console for:
- "Google Identity Services not loaded" - Script failed to load
- "Failed to load Google Identity Services script" - Network issue

## Still Not Working?

1. **Check server terminal** for detailed error messages
2. **Check browser console** for client-side errors
3. **Verify Google OAuth credentials** are correct
4. **Test with a different browser** (Chrome recommended)
5. **Check if email/password login works** (to verify auth system is working)

## Getting Help

When asking for help, provide:
1. Browser console errors (screenshot)
2. Server terminal errors (screenshot)
3. Environment variables (without values): `GOOGLE_CLIENT_ID` is set: Yes/No
4. Google OAuth Client ID first few characters: `123456789-...`
5. Domain you're testing on: `localhost:3000` or production URL

