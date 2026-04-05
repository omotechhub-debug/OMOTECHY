# Environment Variables Setup for Google Sign-In

## Both Variables Use the SAME Value!

You already have:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=129934894624-hfj5cg2ijvgn2t3ldb6r7uvvu7safk50.apps.googleusercontent.com
```

## Add This to Your .env.local File:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=129934894624-hfj5cg2ijvgn2t3ldb6r7uvvu7safk50.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=129934894624-hfj5cg2ijvgn2t3ldb6r7uvvu7safk50.apps.googleusercontent.com
```

## Why Two Variables?

- **`GOOGLE_CLIENT_ID`** - Used on the **backend/server** (API routes)
- **`NEXT_PUBLIC_GOOGLE_CLIENT_ID`** - Used on the **frontend/browser** (React components)

The `NEXT_PUBLIC_` prefix tells Next.js to make this variable available in the browser.

## They Must Have the SAME Value!

Both variables should contain your Google OAuth Client ID:
```
129934894624-hfj5cg2ijvgn2t3ldb6r7uvvu7safk50.apps.googleusercontent.com
```

## Complete .env.local Example

Your `.env.local` file should have both:

```env
# ... your other variables ...

# Google OAuth Configuration
GOOGLE_CLIENT_ID=129934894624-hfj5cg2ijvgn2t3ldb6r7uvvu7safk50.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=129934894624-hfj5cg2ijvgn2t3ldb6r7uvvu7safk50.apps.googleusercontent.com
```

## After Adding:

1. **Save** the `.env.local` file
2. **Restart** your development server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```
3. **Test** Google Sign-In on `/admin/login`

## That's It!

You don't need to get a different Client ID - just use the same one for both variables!

