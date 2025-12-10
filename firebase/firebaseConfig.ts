// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAiaFNDXOxxzSi1NTvlZiWQX3-t5fUtG40",
  authDomain: "astrologia-historica.firebaseapp.com",
  projectId: "astrologia-historica",
  storageBucket: "astrologia-historica.firebasestorage.app",
  messagingSenderId: "459282486246",
  appId: "1:459282486246:web:67cc5668dd6a69b3bffc27",
  measurementId: "G-W2PXNWNML9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);

export { auth };
//export { analytics };