import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

export function createAuthClient() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  return {
    onChange(callback) {
      return onAuthStateChanged(auth, callback);
    },

    signIn() {
      return signInWithPopup(auth, provider);
    },

    signOut() {
      return signOut(auth);
    },

    async loadSwitchBotAccess() {
      const snapshot = await getDoc(doc(db, "secrets", "switchbot"));

      if (!snapshot.exists()) {
        throw new Error("Missing Firestore document secrets/switchbot.");
      }

      const secret = snapshot.data();
      const clientKey = secret.CLIENTKEY;
      const workerUrl = secret.WORKERURL;

      if (typeof clientKey !== "string" || clientKey.length === 0) {
        throw new Error("Missing Firestore field secrets/switchbot.CLIENTKEY.");
      }

      if (typeof workerUrl !== "string" || workerUrl.length === 0) {
        throw new Error("Missing Firestore field secrets/switchbot.WORKERURL.");
      }

      return { clientKey, workerUrl };
    },
  };
}
