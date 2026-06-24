const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  } else {
    const { cert } = require('firebase-admin/app');
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

module.exports = { getAuth, getFirestore };
