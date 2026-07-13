import app from "../server";
import { initializeFirestoreDb } from "../server-db";

// Run firestore initialization on serverless startup
initializeFirestoreDb()
  .then(() => {
    console.log("Vercel Serverless: Firestore DB initialized successfully");
  })
  .catch((e) => {
    console.error("Vercel Serverless: Firestore DB initialization failed", e);
  });

export default app;
