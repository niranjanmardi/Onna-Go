# ONNA-GO Android APK Distribution

This folder stores static download assets served directly by the web server.

## How it works

1. **Self-Hosting on Render (Default)**:
   - When building the Android app via Gradle (`gradlew assembleDebug` or `assembleRelease`), copy the output APK to this folder as `onna-go.apk`:
     ```bash
     cp frontend/android/app/build/outputs/apk/debug/app-debug.apk frontend/public/downloads/onna-go.apk
     ```
   - During `npm run build`, Vite automatically copies everything in `frontend/public/` to `frontend/dist/`.
   - FastAPI serves any file located at `frontend/dist/{full_path:path}`.
   - The APK will be directly downloadable at `https://onna-go.onrender.com/downloads/onna-go.apk`.

2. **External Hosting (GitHub Releases / Cloudflare R2 / AWS S3)**:
   - Upload `onna-go.apk` to your preferred host (e.g., GitHub Releases).
   - Set the environment variable in `frontend/.env` or on Render:
     ```env
     VITE_ANDROID_APK_URL=https://github.com/niranjanmardi/Onna-Go/releases/download/v1.0.0/onna-go.apk
     ```
   - The download page will automatically point to this URL.
