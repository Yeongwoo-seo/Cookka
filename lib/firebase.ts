import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase 설정이 있는지 확인하는 함수
const hasFirebaseConfig = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

// Firebase 앱 초기화 (조건부, 빌드 시점 오류 방지)
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

const initializeFirebase = (): FirebaseApp | null => {
  if (!hasFirebaseConfig()) {
    // 환경 변수가 없으면 null 반환 (빌드 시점 오류 방지)
    return null;
  }

  if (app) {
    return app;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  } catch (error) {
    // 빌드 시점 오류 방지
    console.warn('Firebase initialization failed:', error);
    return null;
  }

  return app;
};

// Firestore 초기화 (lazy, 조건부)
const getDbInstance = (): Firestore | null => {
  if (!hasFirebaseConfig()) {
    return null;
  }
  if (!dbInstance) {
    const firebaseApp = initializeFirebase();
    if (firebaseApp) {
      try {
        dbInstance = getFirestore(firebaseApp);
      } catch (error) {
        console.warn('Firestore initialization failed:', error);
        return null;
      }
    }
  }
  return dbInstance;
};

// Auth 초기화 (lazy, 조건부)
const getAuthInstanceInternal = (): Auth | null => {
  if (!hasFirebaseConfig()) {
    return null;
  }
  if (!authInstance) {
    const firebaseApp = initializeFirebase();
    if (firebaseApp) {
      try {
        authInstance = getAuth(firebaseApp);
      } catch (error) {
        console.warn('Auth initialization failed:', error);
        return null;
      }
    }
  }
  return authInstance;
};

// Storage 초기화 (lazy, 조건부)
const getStorageInstanceInternal = (): FirebaseStorage | null => {
  if (!hasFirebaseConfig()) {
    return null;
  }
  if (!storageInstance) {
    const firebaseApp = initializeFirebase();
    if (firebaseApp) {
      try {
        storageInstance = getStorage(firebaseApp);
      } catch (error) {
        console.warn('Storage initialization failed:', error);
        return null;
      }
    }
  }
  return storageInstance;
};

// 기존 API 유지 (함수로 래핑하여 lazy initialization)
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;

// Lazy getter 함수들 (이름 충돌 방지)
const getDbLazy = (): Firestore => {
  if (!_db) {
    const instance = getDbInstance();
    if (!instance) {
      throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
    }
    _db = instance;
  }
  return _db;
};

const getAuthLazy = (): Auth => {
  if (!_auth) {
    const instance = getAuthInstanceInternal();
    if (!instance) {
      throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
    }
    _auth = instance;
  }
  return _auth;
};

const getStorageLazy = (): FirebaseStorage => {
  if (!_storage) {
    const instance = getStorageInstanceInternal();
    if (!instance) {
      throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
    }
    _storage = instance;
  }
  return _storage;
};

// 실제 인스턴스를 반환하는 getter 함수들 (firestore.ts에서 사용)
export const getDb = (): Firestore => {
  return getDbLazy();
};

export const getAuthInstance = (): Auth => {
  return getAuthLazy();
};

export const getStorageInstance = (): FirebaseStorage => {
  return getStorageLazy();
};

// 하위 호환성을 위한 export (Proxy 사용 - 속성 접근용)
// 주의: collection(db, ...) 같은 함수 호출에는 getDb()를 사용해야 함
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDbLazy() as any)[prop];
  },
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAuthLazy() as any)[prop];
  },
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    return (getStorageLazy() as any)[prop];
  },
});

// Firebase가 설정되어 있는지 확인
export const isFirebaseConfigured = (): boolean => {
  return hasFirebaseConfig();
};

export default initializeFirebase;
