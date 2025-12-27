import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  // ⚠️ PASTE YOUR REAL KEYS HERE
  apiKey: "AIzaSyAl-w0LJKmxv0OTqfkDdERyM3C1BvRTvjc",
  authDomain: "my-lms-d60d3.firebaseapp.com",
  databaseURL: "https://my-lms-d60d3-default-rtdb.firebaseio.com/",
  projectId: "my-lms-d60d3",
  storageBucket: "my-lms-d60d3.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);