import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8pIZx070cUs1FDrOIL8ZNQ3FPuZ4mDAo",
  authDomain: "farmvision-al.firebaseapp.com",
  projectId: "farmvision-al",
  storageBucket: "farmvision-al.firebasestorage.app",
  messagingSenderId: "94019299950",
  appId: "1:94019299950:web:292e783e82c2a5f57f147f",
  measurementId: "G-89HNWB4DXP",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
