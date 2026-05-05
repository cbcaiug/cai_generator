import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDG5GWTIJGBSdi1_8FRqC3quVbuah1Tezw",
  authDomain: "cai-score-manager.firebaseapp.com",
  projectId: "cai-score-manager",
  storageBucket: "cai-score-manager.firebasestorage.app",
  messagingSenderId: "467863144067",
  appId: "1:467863144067:web:e906b25637fe78b2827db6",
  measurementId: "G-K19LFM1JTW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const saveToCloud = async (userId: string, data: any) => {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      data: JSON.stringify(data),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving to cloud", error);
    throw error;
  }
};

export const loadFromCloud = async (userId: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const docData = docSnap.data();
      if (docData.data) {
         return JSON.parse(docData.data);
      }
    }
    return null;
  } catch (error) {
    console.error("Error loading from cloud", error);
    throw error;
  }
};

