# Google Sign-In Setup Guide

This guide will help you set up Google Sign-In for the admin panel, which works identically to the existing email/password authentication system.

## Prerequisites

- Google Cloud Console account
- Access to your project's environment variables

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: "OMOTECH HUB Admin"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (your admin emails) if in testing mode
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "OMOTECH HUB Admin Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://omotech.co.ke` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `https://omotech.co.ke` (for production)
7. Click **Create**
8. Copy the **Client ID** (you'll need this)

## Step 2: Configure Environment Variables

Add the following to your `.env.local` (development) and production environment:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

**Important Notes**:
- `GOOGLE_CLIENT_ID` is used on the backend (server-side)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is used on the frontend (client-side)
- Both should have the same value
- Never commit these values to version control

## Step 3: Update Existing Admin Users (Optional)

If you want existing admin users to be able to use Google Sign-In:

1. They must sign in with their Google account email that matches their admin account email
2. The system will automatically link their Google account to their existing admin account
3. They can then use either email/password or Google Sign-In

## Step 4: Test Google Sign-In

1. Start your development server: `npm run dev`
2. Navigate to `/admin/login`
3. You should see a Google Sign-In button below the email/password form
4. Click the button and sign in with a Google account that has an admin account
5. You should be redirected to `/admin` after successful authentication

## How It Works

### Authentication Flow

1. **User clicks Google Sign-In button**
   - Google Identity Services script loads
   - User selects their Google account
   - Google returns an ID token

2. **Frontend sends ID token to backend**
   - POST request to `/api/auth/google-login`
   - Includes the Google ID token

3. **Backend verifies token**
   - Uses `google-auth-library` to verify the token
   - Extracts user information (email, name, Google ID)

4. **Backend finds or creates user**
   - Looks up user by email or Google ID
   - If user exists and is admin, links Google account
   - If user doesn't exist, returns error (security: no auto-creation)

5. **Backend generates JWT token**
   - Same format as email/password login
   - Same 7-day expiry
   - Same user data structure

6. **Frontend stores token**
   - Saves to `localStorage` as `authToken`
   - Saves user data as `authUser`
   - Updates AuthContext state

7. **User redirected to admin panel**
   - Same redirect flow as email/password login
   - Same permission checks apply

### Security Features

- ✅ **No auto-account creation**: Admin accounts must exist before Google Sign-In
- ✅ **Role verification**: Regular users are blocked from admin login
- ✅ **Approval check**: Pending approval admins are handled the same way
- ✅ **Token verification**: Google ID tokens are verified server-side
- ✅ **Same JWT format**: Uses existing JWT system for consistency
- ✅ **Same permissions**: Page permissions work identically

## Troubleshooting

### Google Sign-In button doesn't appear

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
3. Ensure Google Identity Services script loads (check Network tab)
4. Check that authorized JavaScript origins include your domain

### "Invalid Google token" error

1. Verify `GOOGLE_CLIENT_ID` matches `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
2. Check that the OAuth client ID is correct
3. Ensure authorized JavaScript origins are configured correctly

### "Account not found" error

- This is expected if the Google email doesn't match an existing admin account
- Create the admin account first using email/password signup
- Then the user can use Google Sign-In

### Token verification fails

1. Check server logs for detailed error messages
2. Verify `google-auth-library` package is installed: `npm install google-auth-library`
3. Ensure `GOOGLE_CLIENT_ID` environment variable is set on the server

## Migration Notes

### Backward Compatibility

- ✅ Email/password login still works
- ✅ Existing tokens work the same way
- ✅ All admin pages work identically
- ✅ API routes work the same way
- ✅ Permissions system unchanged

### User Model Changes

The User model now includes:
- `googleId?: string` - Google OAuth ID
- `authProvider: 'email' | 'google'` - Authentication method
- `password?: string` - Optional (required only for email auth)

### Database Migration

No migration needed! The schema changes are backward compatible:
- Existing users continue to work
- New fields are optional
- Google users don't need passwords

## Production Checklist

Before deploying to production:

- [ ] Google OAuth client ID created in Google Cloud Console
- [ ] Production domain added to authorized JavaScript origins
- [ ] `GOOGLE_CLIENT_ID` set in production environment
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set in production environment
- [ ] Test Google Sign-In on production domain
- [ ] Verify admin accounts can sign in with Google
- [ ] Verify email/password login still works
- [ ] Check that permissions work correctly

## Support

For issues or questions:
- Check the main authentication documentation: `AUTHENTICATION_DOCUMENTATION.md`
- Review server logs for detailed error messages
- Verify environment variables are set correctly
- Test with a known admin account first

