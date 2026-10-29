/**
 * ONNA-GO Android APK Configuration
 *
 * Hosting options:
 * 1. Self-hosted on Render / FastAPI:
 *    Place your built APK into `frontend/public/downloads/onna-go.apk`.
 *    Vite will copy it to `frontend/dist/downloads/onna-go.apk`, and FastAPI
 *    serves it at `https://onna-go.onrender.com/downloads/onna-go.apk`.
 *
 * 2. External CDN / GitHub Releases / Cloudflare R2 / AWS S3:
 *    Set the environment variable `VITE_ANDROID_APK_URL` in `frontend/.env` or Render Dashboard:
 *    VITE_ANDROID_APK_URL=https://github.com/niranjanmardi/Onna-Go/releases/download/v1.0.0/onna-go.apk
 */

export interface AndroidApkConfig {
  appName: string;
  tagline: string;
  version: string;
  versionCode: number;
  packageId: string;
  minAndroidVersion: string;
  targetAndroidVersion: string;
  apkSizeFormatted: string;
  apkSizeBytes: number;
  releaseDate: string;
  fileName: string;
  downloadUrl: string;
  architecture: string;
  framework: string;
}

export const ANDROID_APK_CONFIG: AndroidApkConfig = {
  appName: 'ONNA-GO',
  tagline: 'Ride Together. Vibe Together. Split Together.',
  version: '1.0.0',
  versionCode: 1,
  packageId: 'com.onnago.app',
  minAndroidVersion: 'Android 7.0 (API 24) or higher',
  targetAndroidVersion: 'Android 15 (API 36)',
  apkSizeFormatted: '4.5 MB',
  apkSizeBytes: 4680325,
  releaseDate: 'October 2026',
  fileName: 'onna-go.apk',
  // Configurable download URL: defaults to local static path `/downloads/onna-go.apk`
  // Can be overridden with any CDN / release URL via `VITE_ANDROID_APK_URL`
  downloadUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_APK_URL) || '/downloads/onna-go.apk',
  architecture: 'Universal (arm64-v8a, armeabi-v7a, x86_64)',
  framework: 'Capacitor 8 • React 19 • Vite 6',
};
