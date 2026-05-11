import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Use initializeFirestore with experimentalForceLongPolling.
// This is CRITICAL for reliability in sandboxed/iframe environments.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// CRITICAL: Test connection as per integration instructions
async function testConnection() {
  try {
    // Try to reach the server directly to test connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      // If we get permission denied, it means we successfully reached the backend
      console.log("Firestore connection successful (received expected permission denied)");
    } else if (error.code === 'unavailable') {
      console.error("Firestore is unavailable. This may be due to reachability issues. Forcing long polling should help.");
    } else {
      console.error("Firestore connection test failed:", error.message);
    }
  }
}
testConnection();

export const googleProvider = new GoogleAuthProvider();

export const ensureUserDocument = async (user: any, additionalData?: any) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  
  try {
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const userData: any = {
        uid: user.uid,
        role: 'customer',
        createdAt: new Date().toISOString(),
        phoneVerified: false,
        ...additionalData
      };
      if (user.displayName && !userData.name) userData.name = user.displayName;
      if (user.email && !userData.email) userData.email = user.email;
      if (user.phoneNumber && !userData.phone) userData.phone = user.phoneNumber;
      
      await setDoc(userRef, userData);
    } else if (additionalData) {
      await setDoc(userRef, additionalData, { merge: true });
    }
  } catch (error: any) {
    console.error("ensureUserDocument failed:", error.message, "uid:", user.uid);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(result.user);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
};
