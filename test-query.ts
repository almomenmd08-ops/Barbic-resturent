"use strict";
import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const db = getFirestore(app, fbConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, 'almomensk72@gmail.com', '123456'); // assuming a password? or we can't do this easily.
    const q = collectionGroup(db, 'favorites');
    const snap = await getDocs(q);
    console.log("Success! Docs:", snap.docs.length);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

test();
