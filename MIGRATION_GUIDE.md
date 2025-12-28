# Firebase Migration Guide: Env Vars & OAuth Setup

## 1. Environment Variables (VITE_*)
Since Firebase Hosting serves static files, **environment variables must be embedded at build time**.

### Option A: Local Build (Recommended for simplicity)
1. Ensure your `.env` file contains all necessary keys:
   ```env
   VITE_GOOGLE_API_KEY=...
   VITE_GOOGLE_CLIENT_ID=...
   VITE_GEMINI_API_KEY=...
   VITE_GOOGLE_DRIVE_FOLDER_ID=...
   ```
2. Run `npm run build` locally.
3. Deploy the `dist` folder: `firebase deploy`.

### Option B: CI/CD (GitHub Actions)
If using GitHub Actions via Firebase, add secrets to your repository settings and expose them in the build step:
```yaml
- run: npm run build
  env:
    VITE_GOOGLE_API_KEY: ${{ secrets.VITE_GOOGLE_API_KEY }}
    # ... others
```

## 2. Google OAuth Configuration
Firebase Hosting provides a new domain (e.g., `https://your-project.web.app`). You update the Google Cloud Console to allow this domain.

### Steps:
1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Find your **OAuth 2.0 Client ID**.
3. Under **Authorized JavaScript origins**, ADD:
   - `https://your-project-id.web.app`
   - `https://your-project-id.firebaseapp.com`
4. Under **Authorized redirect URIs**, ADD:
   - `https://your-project-id.web.app`
   - `https://your-project-id.firebaseapp.com`
   *(Note: Fire-Sight uses popup/implicit flow, usually origins are sufficient, but adding redirects is safe).*

## 3. PWA & Service Worker
- `firebase.json` has been configured to serve `sw.js` with `Cache-Control: no-cache` to ensure users always get the latest worker.
- The `sw.js` has been patched to ignore `chrome-extension://` schemes, preventing errors in browser environments.

## 4. Final Verification
After deployment:
1. Check **Console** for specific explicit `403` errors (indicates OAuth domain mismatch).
2. Test **Offline Mode** by disconnecting network and refreshing (Service Worker check).
