import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// 🔥 YOUR REAL CONFIG (DON'T TOUCH THIS)
const firebaseConfig = {
  apiKey: "AIzaSyByLz8joHL-pvbt7xX6QAKrU8Ha6w6bAqU",
  authDomain: "veloura-ventures.firebaseapp.com",
  databaseURL: "https://veloura-ventures-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "veloura-ventures",
  storageBucket: "veloura-ventures.appspot.com",
  messagingSenderId: "241659967673",
  appId: "1:241659967673:web:cca4d73f8ac33c7866c368"
};

// 🔥 INIT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// ================= GLOBAL STATE =================
let currentUserId = null;
let balance = 0;
let transactions = [];
let subscriptionsBought = 0;

// ================= AUTH =================
const form = document.getElementById("auth-form");
const toggleAuth = document.getElementById("toggleAuth");
const signupFields = document.getElementById("signup-fields");

let isSignup = false;

toggleAuth.onclick = () => {
  isSignup = !isSignup;
  signupFields.style.display = isSignup ? "block" : "none";
};

// 🔐 AUTH STATE
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";

    document.querySelector(".nav-logo").textContent =
      `Welcome, ${user.displayName || user.email}`;

    // 🔥 IMPORTANT ADD THESE
    await loadWallet();
    await loadMembership();   // 👈 ADD THIS
    

  } else {
    currentUserId = null;
    loginSection.style.display = "flex";
    dashboardSection.style.display = "none";
  }
});

// 🔐 LOGIN / SIGNUP
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    if (isSignup) {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      await set(ref(db, `users/${user.uid}`), {
        email,
        balance: 0,
        transactions: []
      });

      alert("Account Created 🎉");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login Successful ✅");
    }
  } catch (err) {
    alert(err.message);
  }
});

// 🔐 GOOGLE LOGIN
document.getElementById("googleLogin").onclick = async () => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  await set(ref(db, `users/${user.uid}`), {
    email: user.email,
    balance: 0,
    transactions: []
  });
};

// 🔐 LOGOUT
document.getElementById("logout-btn").onclick = () => signOut(auth);

// ================= WALLET CORE =================

// LOAD WALLET
async function loadWallet() {
  const snap = await get(ref(db, `users/${currentUserId}`));

  if (snap.exists()) {
    const data = snap.val();

    balance = data.balance || 0;
    transactions = data.transactions || [];
    subscriptionsBought = data.subscriptionsBought || 0;

    updateUI();
  }
}

// SAVE WALLET
async function saveWallet() {
  await update(ref(db, `users/${currentUserId}`), {
    balance,
    transactions
  });
}

// UPDATE UI
function updateUI() {
  document.getElementById("walletBalance").innerText = "₹" + balance;
  document.getElementById("withdrawBalance").innerText = "₹" + balance;
  
  // Update subscription section wallet balance
  const walletDisplay = document.getElementById("walletBalanceDisplay");
  if (walletDisplay) {
    walletDisplay.innerText = "₹" + balance;
  }

  const subscriptionsDisplay = document.getElementById("subscriptionsBoughtDisplay");
  if (subscriptionsDisplay) {
    subscriptionsDisplay.innerText = subscriptionsBought;
  }

  const list = document.getElementById("transactionList");
  if (!list) return;

  list.innerHTML = "";

  transactions.slice().reverse().forEach(t => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${t.type}</strong> ₹${t.amount}
      <br><small>${t.time}</small>
    `;

    list.appendChild(li);
  });
}

// ADD TRANSACTION
function addTransaction(type, amount) {
  transactions.push({
    type,
    amount,
    time: new Date().toLocaleString()
  });
}

// ➕ ADD MONEY
document.getElementById("addMoneyBtn").onclick = async () => {
  const amt = Number(document.getElementById("addAmount").value);

  if (amt <= 0) return alert("Enter valid amount");

  balance += amt;
  addTransaction("ADD", amt);

  updateUI();
  await saveWallet();
};

// 💸 WITHDRAW
document.getElementById("withdrawBtn").onclick = async () => {
  const amt = Number(document.getElementById("withdrawAmount").value);
  const msg = document.getElementById("withdrawMsg");

  if (amt <= 0) {
    msg.innerText = "Invalid amount";
    return;
  }

  if (amt > balance) {
    msg.innerText = "Insufficient balance";
    return;
  }

  balance -= amt;
  addTransaction("WITHDRAW", amt);

  msg.innerText = "Success ✅";

  updateUI();
  await saveWallet();
};

// 🎁 BONUS (FOR FUTURE USE)
function giveBonus(amount) {
  balance += amount;
  addTransaction("BONUS", amount);
  updateUI();
  saveWallet();
}

// ================= NAV =================
// ================= NAV =================

document.querySelectorAll(".nav-item[data-target]").forEach(item => {
  item.onclick = () => {

    const target = item.dataset.target;
    console.log("Clicked:", target);

    // remove active
    document.querySelectorAll(".content-panel").forEach(p => {
      p.classList.remove("active");
    });

    // add active
    const panel = document.getElementById(target);
    if (panel) {
      panel.classList.add("active");
    } else {
      console.log("❌ Panel not found:", target);
    }
  };
});

// ================= MEMBERSHIP SYSTEM =================

let membership = null;

// LOAD MEMBERSHIP
async function loadMembership() {
  const snap = await get(ref(db, `users/${currentUserId}/membership`));

  if (snap.exists()) {
    membership = snap.val();
    updateMembershipUI();
  }
}

// UPDATE UI
function updateMembershipUI() {
  const el = document.getElementById("membershipStatus");

  if (!membership) {
    el.innerText = "No active membership";
    return;
  }

  const now = Date.now();

  if (now > membership.expiry) {
    el.innerText = "Expired ❌";
    return;
  }

  const daysLeft = Math.floor((membership.expiry - now) / (1000 * 60 * 60 * 24));

  el.innerText = `
    Active Plan: ₹${membership.plan}
    | Expires in ${daysLeft} days
  `;
}

// BUY PLAN
window.buyPlan = async (price, validityDays) => {
  if (balance < price) {
    alert("Not enough balance ❌");
    return;
  }

  const confirmBuy = confirm(`Buy plan for ₹${price}?`);
  if (!confirmBuy) return;

  // Deduct money
  balance -= price;

  // Create membership
  const expiry = Date.now() + validityDays * 24 * 60 * 60 * 1000;

  membership = {
    plan: price,
    expiry
  };

  // Save to Firebase
  await update(ref(db, `users/${currentUserId}`), {
    balance,
    membership,
    transactions
  });

  addTransaction("MEMBERSHIP", price);

  updateUI();
  updateMembershipUI();

  alert("Membership Activated 🚀");
};

// ================= SUBSCRIPTION SECTION =================

// Setup subscription quantity controls
function setupSubscriptionControls() {
  const qtyInput = document.getElementById("subscriptionQty");
  const decreaseBtn = document.getElementById("decreaseQty");
  const increaseBtn = document.getElementById("increaseQty");
  const totalPriceSpan = document.getElementById("totalPrice");

  if (!qtyInput || !decreaseBtn || !increaseBtn) return;

  function updateTotalPrice() {
    const qty = parseInt(qtyInput.value) || 1;
    const totalPrice = qty * 350;
    totalPriceSpan.innerText = `Total: ₹${totalPrice}`;
  }

  decreaseBtn.onclick = () => {
    let qty = parseInt(qtyInput.value) || 1;
    if (qty > 1) {
      qtyInput.value = qty - 1;
      updateTotalPrice();
    }
  };

  increaseBtn.onclick = () => {
    let qty = parseInt(qtyInput.value) || 1;
    qtyInput.value = qty + 1;
    updateTotalPrice();
  };

  qtyInput.addEventListener("change", updateTotalPrice);
  qtyInput.addEventListener("input", updateTotalPrice);
}

// Call setup when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupSubscriptionControls);
} else {
  setupSubscriptionControls();
}

// BUY SUBSCRIPTION
window.buySubscription = async () => {
  const qtyInput = document.getElementById("subscriptionQty");
  const qty = parseInt(qtyInput.value) || 1;
  const totalPrice = qty * 350;

  if (balance < totalPrice) {
    alert(`Insufficient balance! You need ₹${totalPrice} but have ₹${balance} ❌`);
    return;
  }

  const confirmBuy = confirm(`Buy ${qty} subscription(s) for ₹${totalPrice}?`);
  if (!confirmBuy) return;

  // Deduct money
  balance -= totalPrice;
  subscriptionsBought += qty;
  addTransaction("SUBSCRIPTION", totalPrice);

  // Save to Firebase
  await update(ref(db, `users/${currentUserId}`), {
    balance,
    transactions,
    subscriptionsBought
  });

  updateUI();

  alert(`Successfully purchased ${qty} subscription(s)! 🚀`);
  
  // Reset quantity
  qtyInput.value = 1;
  document.getElementById("totalPrice").innerText = "Total: ₹350";
};