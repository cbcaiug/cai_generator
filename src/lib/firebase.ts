import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, getDocFromServer } from "firebase/firestore";
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or connection.");
    }
  }
}
testConnection();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

export const saveToCloud = async (userId: string, sheetName: string, data: any) => {
  const sheetPath = `users/${userId}/sheets/${sheetName}`;
  const metaPath = `users/${userId}`;
  try {
    // Save to a sub-collection 'sheets' for multiple file support
    const docRef = doc(db, 'users', userId, 'sheets', sheetName);
    await setDoc(docRef, {
      name: sheetName,
      data: JSON.stringify(data),
      updatedAt: serverTimestamp()
    }); // Changed from merge: true to full set to match rules strictness
    
    // Also update a 'metadata' doc for easy listing
    const metaRef = doc(db, 'users', userId);
    await setDoc(metaRef, {
      lastSavedSheet: sheetName,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, sheetPath);
    return false;
  }
};

export const listCloudSheets = async (userId: string) => {
  const path = `users/${userId}/sheets`;
  try {
    const { collection, getDocs, query, orderBy } = await import("firebase/firestore");
    const sheetsRef = collection(db, 'users', userId, 'sheets');
    const q = query(sheetsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const loadFromCloud = async (userId: string, sheetName: string) => {
  const path = `users/${userId}/sheets/${sheetName}`;
  try {
    const docRef = doc(db, 'users', userId, 'sheets', sheetName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const docData = docSnap.data();
      if (docData.data) {
         return JSON.parse(docData.data);
      }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const deleteCloudSheet = async (userId: string, sheetName: string) => {
  const path = `users/${userId}/sheets/${sheetName}`;
  try {
    const { deleteDoc } = await import("firebase/firestore");
    const docRef = doc(db, 'users', userId, 'sheets', sheetName);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
};

