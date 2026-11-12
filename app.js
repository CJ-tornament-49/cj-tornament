// @ts-nocheck
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA9_KRsM8G-7Y8qeyUcuTFAqhx8cj80sJc",
    authDomain: "cj-tornament.firebaseapp.com",
    databaseURL: "https://cj-tornament-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "cj-tornament",
    storageBucket: "cj-tornament.firebasestorage.app",
    messagingSenderId: "28495455308",
    appId: "1:28495455308:web:6fe5ee4c0e8c4cb916c0e9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const $ = id => document.getElementById(id);
const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let currentUser = null;
let allMatches = [];
let matchType = "ongoing";
let leaderboardData = [];

function openPage(pageName) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    $(pageName + "Page").classList.add("active");
    
    document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.page === pageName);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => openPage(btn.dataset.page));
});

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
        return;
    }
    currentUser = user;
    loadProfile(user);
    loadLeaderboard();
    loadTournaments();
});

function loadProfile(user) {
    const name = user.displayName || "Player";
    $("pName").innerText = name;
    $("pDetailName").innerText = name;
    
    if (name !== "Player") {
        $("avatar").innerText = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    }

    const email = user.email || "No Email";
    $("pEmail").innerText = email;
    $("pDetailEmail").innerText = email;
}

window.logoutUser = function() {
    signOut(auth).then(() => {
        window.location.replace("index.html");
    });
};

window.changePassword = async function() {
    const oldPass = $("currPass").value;
    const newPass = $("newPass").value;
    const confPass = $("confPass").value;
    const msg = $("passMsg");

    msg.style.color = "#ff5267";
    if (!oldPass || !newPass || !confPass) { msg.innerText = "Fill all fields."; return; }
    if (newPass.length < 6) { msg.innerText = "Password must be 6+ chars."; return; }
    if (newPass !== confPass) { msg.innerText = "Passwords do not match."; return; }

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPass);
        
        msg.style.color = "#00ff00";
        msg.innerText = "Password changed successfully!";
        $("currPass").value = ""; $("newPass").value = ""; $("confPass").value = "";
    } catch (error) {
        msg.innerText = error.code === "auth/invalid-credential" ? "Current password is wrong." : error.message;
    }
};

function loadLeaderboard() {
    onValue(ref(db, "leaderboard"), (snapshot) => {
        const data = snapshot.val() || {};
        leaderboardData = Object.entries(data).map(([uid, item]) => ({
            uid,
            name: item?.name || item?.playerName || "Unknown",
            points: Number(item?.points) || 0
        })).sort((a, b) => b.points - a.points);

        renderLeaderboard();
    }, (error) => {
        $("rankingList").innerHTML = `<div style="color:#ff5267; text-align:center; font-size:12px;">Error: ${error.message}</div>`;
    });
}

function renderLeaderboard() {
    const listDiv = $("rankingList");
    const podiumDiv = $("podium");

    if (leaderboardData.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center; color:#888; font-size:12px;">No rankings available yet.</div>';
        podiumDiv.innerHTML = '';
        return;
    }

    const top = leaderboardData.slice(0, 3);
    const pos = [top[1], top[0], top[2]]; 
    const classes = ["second", "first", "third"];
    const crowns = ["", "👑", ""];

    podiumDiv.innerHTML = pos.map((p, i) => `
        <div class="podium-box ${classes[i]}">
            ${crowns[i] ? `<div class="crown">${crowns[i]}</div>` : ''}
            <div class="podium-avatar" style="background-image: url('https://api.dicebear.com/7.x/avataaars/svg?seed=${p?.name || 'a'}');"></div>
            <strong>${safe(p?.name || "—")}</strong>
            <small>${p ? p.points : 0} PTS</small>
        </div>
    `).join("");

    listDiv.innerHTML = leaderboardData.map((p, i) => `
        <div class="rank-row ${p.uid === currentUser?.uid ? 'my-row' : ''}">
            <div class="rank-no">${i + 1}</div>
            <div class="rank-user">
                <strong>${safe(p.name)}</strong>
                <small>${p.uid === currentUser?.uid ? '<span style="color:var(--red);">YOU</span>' : 'CJ PLAYER'}</small>
            </div>
            <div class="rank-score">${p.points} PTS</div>
        </div>
    `).join("");

    const myIdx = leaderboardData.findIndex(p => p.uid === currentUser?.uid);
    if (myIdx !== -1) {
        $("myRank").innerText = "#" + (myIdx + 1);
        $("myPoints").innerText = leaderboardData[myIdx].points;
    } else {
        $("myRank").innerText = "#--";
        $("myPoints").innerText = "0";
    }
}

const slides = [
    { title: "CJ<br>TORNAMENT", text: "PLAY • COMPETE • WIN", art: "⚔️" },
    { title: "LONE<br>WOLF", text: "1V1 • SHOW YOUR SKILL", art: "🥷" },
    { title: "CLASH<br>SQUAD", text: "CS • BATTLE • VICTORY", art: "🔫" },
    { title: "BATTLE<br>ROYALE", text: "BR • DUO • COMPETE", art: "🪂" }
];
let slideIdx = 0;

function showSlide() {
    const s = slides[slideIdx];
    $("bannerTitle").innerHTML = s.title;
    $("bannerText").innerText = s.text;
    $("bannerArt").innerText = s.art;
    document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === slideIdx));
}

window.nextSlide = function() {
    slideIdx = (slideIdx + 1) % slides.length;
    showSlide();
};
window.prevSlide = function() {
    slideIdx = (slideIdx + slides.length - 1) % slides.length;
    showSlide();
};

$("nextBanner").addEventListener("click", nextSlide);
$("prevBanner").addEventListener("click", prevSlide);
setInterval(nextSlide, 4000); 

function loadTournaments() {
    onValue(ref(db, "tournaments"), (snapshot) => {
        const data = snapshot.val() || {};
        allMatches = Object.entries(data).map(([id, item]) => ({ id, ...(item || {}) }));
        renderMatches();
    }, (error) => {
        $("matchList").innerHTML = `<div style="color:#ff5267; text-align:center; font-size:12px;">Error: ${error.message}</div>`;
    });
}

function renderMatches() {
    const statusMap = { ongoing: ["ongoing"], upcoming: ["upcoming"], completed: ["completed"] };
    const filtered = allMatches.filter(m => statusMap[matchType].includes(String(m.status || "").toLowerCase()));
    
    const list = $("matchList");
    if (filtered.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#888; padding:20px; font-size:12px;">No ${matchType} matches available.</div>`;
        return;
    }

    list.innerHTML = filtered.map(m => {
        const icon = String(m.title || "").toLowerCase().includes("wolf") ? "🥷" : "🔥";
        
        return `
            <div class="match-card">
                <div class="match-img">${icon}</div>
                <div class="match-details">
                    <h4>${safe(m.title || "Match")}</h4>
                    <p>${safe(m.mode || "Tournament")} • ${safe(m.date || "TBA")}</p>
                    <span class="status-badge ${matchType}">${matchType}</span>
                </div>
                <button class="btn-small">DETAILS →</button>
            </div>
        `;
    }).join("");
}

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        matchType = tab.dataset.type;
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        renderMatches();
    });
});

openPage("play");
