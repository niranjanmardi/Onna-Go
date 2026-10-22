# ONNA-GO — Android Build Guide (Capacitor)

## Prerequisites
- Node.js 18+ and npm
- Android Studio Ladybug (or newer) with Android SDK 34+
- Java 17 or Java 21 JDK configured

## Android Packaging Steps

### 1. Build the Web Distribution
```bash
cd frontend
npm run build
```

### 2. Initialize and Sync Capacitor Android
```bash
npx cap add android
npx cap sync android
```

### 3. Open in Android Studio
```bash
npx cap open android
```

### 4. Configuration Checklist
- Ensure `capacitor.config.ts` has `appName: 'ONNA-GO'` and `appId: 'com.onnago.app'`.
- Verify HTTPS API URL in `frontend/.env.production` (e.g. `VITE_API_BASE_URL=https://api.onnago.app/api/v1`).
- For local emulator testing with local FastAPI server, point API base URL to `http://10.0.2.2:8000/api/v1` and enable `cleartext: true` in `capacitor.config.ts` temporarily.

### 5. Generate APK / AAB
- In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- For Google Play Store release: **Build > Generate Signed Bundle / APK > Android App Bundle (AAB)**
