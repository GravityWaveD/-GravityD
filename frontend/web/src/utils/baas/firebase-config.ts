import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export function getFirebaseConfigFromEnv(): FirebaseClientConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gravityd-demo.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gravityd-demo",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gravityd-demo.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  };
}

export function initFirebaseApp(customConfig?: FirebaseClientConfig): FirebaseApp {
  const config = { ...getFirebaseConfigFromEnv(), ...customConfig };
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(config);
}
