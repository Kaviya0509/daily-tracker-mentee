import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserProfile } from "../types";

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerMentee = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  const profile: UserProfile = {
    uid: user.uid,
    displayName,
    email,
    role: "mentee",
    active: true,
    createdAt: serverTimestamp() as UserProfile["createdAt"],
  };

  try {
    await setDoc(doc(db, "users", user.uid), profile);
  } catch (err) {
    console.warn("Firestore user profile save warning:", err);
  }

  // Sync to local bridge
  try {
    fetch("http://localhost:5050/api/mentees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: user.uid,
        displayName,
        email,
        role: "mentee",
        active: true,
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return user;
};

export const signOut = () => firebaseSignOut(auth);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};
