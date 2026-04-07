/**
 * PPO SYSTEM — FIREBASE BACKEND CORE
 * Stable | Secure | Role-Ready | Firestore-Based
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   1. FIREBASE CONFIG
================================ */
const firebaseConfig = {
  apiKey: "AIzaSyA6MAPqz4zt6Ed9vdLH6x01Imfqc6PjlI8",
  authDomain: "ppo-system.firebaseapp.com",
  projectId: "ppo-system",
  storageBucket: "ppo-system.appspot.com",
  messagingSenderId: "928903097456",
  appId: "1:928903097456:web:6862effa063911af7bd8b5"
};

/* ===============================
   2. INITIALIZE
================================ */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===============================
   3. AUTH GUARD + ROLE CHECK
================================ */
export function checkAuth() {
  onAuthStateChanged(auth, async user => {
    const page = window.location.pathname;
    const publicPages = ["signin.html", "signup.html", "index.html"];
    const isPublic = publicPages.some(p => page.includes(p));

    if (!user) {
      if (!isPublic) window.location.replace("signin.html");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      let userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          fullname: user.displayName || "",
          role: user.email === "pajaresaiza1@gmail.com" ? "admin" : "user",
          createdAt: serverTimestamp()
        });
        userSnap = await getDoc(userRef);
      }

      const userData = userSnap.data();
      if (page.includes("dashboard") && userData.role !== "admin") {
        window.location.replace("signin.html");
      }

    } catch (err) {
      console.error("Auth guard error:", err);
    }
  });
}

/* ===============================
   4. LOGIN
================================ */
export async function handleLogin(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  
  // Save full name if available
  const userRef = doc(db, "users", result.user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    localStorage.setItem("ppoUserName", data.fullname || email);
  }

  window.location.replace("dashboardmenu.html");
  return result.user;
}

/* ===============================
   4b. GOOGLE LOGIN
================================ */
export async function handleGoogleLogin() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save user in Firestore if not exists
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        fullname: user.displayName || "",
        role: "user",
        createdAt: serverTimestamp()
      });
    }

    // Save full name to localStorage
    localStorage.setItem("ppoUserName", user.displayName || user.email);

    return {
      fullname: user.displayName || "",
      email: user.email,
      role: "user"
    };

  } catch (err) {
    console.error("Google login failed:", err);
    throw err;
  }
}

/* ===============================
   5. LOGOUT
================================ */
export async function handleLogout() {
  await signOut(auth);
  window.location.replace("signin.html");
}

/* ===============================
   6. ADMIN ADD DOCUMENT
================================ */
export async function adminUploadFile(file, category) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();
  if (userData.role !== "admin") throw new Error("Unauthorized");

  await addDoc(collection(db, "ppo_documents"), {
    title: file.name,
    category: category,
    department: "PPO",
    status: "ACTIVE",
    date: new Date().toLocaleDateString(),
    uploadedBy: user.email,
    createdAt: serverTimestamp()
  });

  return { success: true };
}

/* ===============================
   7. LOAD GRID DATA
================================ */
export async function loadGridData(category) {
  const grid = document.getElementById("dataGrid");
  if (!grid) return;

  grid.innerHTML = `<div style="padding:20px">Loading...</div>`;

  try {
    const q = query(
      collection(db, "ppo_documents"),
      where("category", "==", category)
    );

    const snapshot = await getDocs(q);
    grid.innerHTML = "";

    if (snapshot.empty) {
      grid.innerHTML = `<div style="padding:20px">No records found.</div>`;
      return;
    }

    snapshot.forEach(docItem => {
      const d = docItem.data();
      const row = document.createElement("div");
      row.className = "data-row";
      row.innerHTML = `
        <div class="cell-date">${d.date || "---"}</div>
        <div class="cell-doc">${d.title || "Untitled"}</div>
        <div class="cell-dept">${d.department || "N/A"}</div>
        <div class="status-tag">${d.status || "ACTIVE"}</div>
      `;
      grid.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div style="color:red;padding:20px">Database error</div>`;
  }
}

/* ===============================
   8. SEARCH FILTER
================================ */
export function initSearch() {
  const input = document.querySelector(".search-input");
  if (!input) return;

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();
    document.querySelectorAll(".data-row").forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(value)
        ? "grid"
        : "none";
    });
  });
}

/* ===============================
   9. AUTO INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  initSearch();

  const logoutLink = document.querySelector("[data-logout]");
  if (logoutLink) {
    logoutLink.addEventListener("click", e => {
      e.preventDefault();
      handleLogout();
    });
  }
});