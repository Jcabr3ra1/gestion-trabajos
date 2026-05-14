import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCYfuh5XB7mPJNtInKLElh6YorMLffpgZs",
  authDomain: "gestion-trabajos-1ea88.firebaseapp.com",
  projectId: "gestion-trabajos-1ea88",
  storageBucket: "gestion-trabajos-1ea88.firebasestorage.app",
  messagingSenderId: "914782447818",
  appId: "1:914782447818:web:e78798798cf93c223a2c33",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
