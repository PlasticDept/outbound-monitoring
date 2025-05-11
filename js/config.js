// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAftyswK9lUac7Glft4jpFhzh5We__Fnn8",
  authDomain: "outbound-job.firebaseapp.com",
  databaseURL: "https://outbound-job-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "outbound-job",
  storageBucket: "outbound-job.appspot.com",
  messagingSenderId: "474062052494",
  appId: "1:474062052494:web:f0dc128cc1693ddea73ddf"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
