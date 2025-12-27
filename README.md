# JEXAM - Enterprise Education Platform

JEXAM is a production-ready Learning Management System (LMS) built with React, TypeScript, and Firebase. It supports real-time classes, interactive whiteboards, video hosting, and exam management.

## Architecture

*   **Frontend**: React 19, Vite, Tailwind CSS.
*   **Backend**: Firebase (Serverless).
    *   **Auth**: Managed User Sessions.
    *   **Firestore**: NoSQL Database for classes, users, and real-time state.
    *   **Storage**: Cloud storage for video lectures and exam assets.
*   **Mobile**: Capacitor (wraps React app into Android/iOS binaries).

## Setup & Deployment

### 1. Prerequisites
*   Node.js 18+
*   Firebase Account

### 2. Configuration
1.  Create a Firebase Project at [console.firebase.google.com](https://console.firebase.google.com).
2.  Enable **Authentication** (Email/Password).
3.  Enable **Firestore Database**.
4.  Enable **Storage**.
5.  Create a `.env` file in the root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Build Web Bundle
```bash
npm install
npm run build
# Output is in /dist folder, ready for Firebase Hosting or Netlify.
```

### 4. Build Android APK
```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
# In Android Studio -> Build -> Build Bundle(s) / APK(s) -> Build APK
```

## Security Rules
Deploy the contents of `firestore.rules` to your Firebase Console under Firestore -> Rules to secure the database.

## Testing
*   **Unit**: `npm run test`
*   **End-to-End**: Manual verification of Class creation flow via `npm run dev`.

## License
Commercial License included. You are free to modify and resell this software.
