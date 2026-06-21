// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDYBWWlh7amFBKtO0PY3-UGHg-bPltGqMk",
    authDomain: "reaction-test-1e5ad.firebaseapp.com",
    databaseURL: "https://reaction-test-1e5ad-default-rtdb.asia-southeast1.firebasedatabase.app", 
    projectId: "reaction-test-1e5ad",
    storageBucket: "reaction-test-1e5ad.firebasestorage.app",
    messagingSenderId: "643790878744",
    appId: "1:643790878744:web:2ace746d5e2ca81e5feb6d"
};

// Initialize Firebase safely
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// --- DOM ELEMENTS ---
const authModal = document.getElementById('auth-modal');
const mainLayout = document.getElementById('main-layout');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username-input');
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');

const testZone = document.getElementById('test-zone');
const testText = document.getElementById('test-text');
const currentTimeDisplay = document.getElementById('current-time');
const bestTimeDisplay = document.getElementById('best-time');
const averageTimeDisplay = document.getElementById('average-time');
const leaderboardList = document.getElementById('leaderboard-list');
const clearBtn = document.getElementById('clear-btn');

// --- GAME STATE VARIABLES ---
let state = 'idle'; 
let startTime = 0;
let timeoutId = null;
let currentUser = null;

// Local tracking profile (Saves personal history on your local browser machine)
let localHistory = JSON.parse(localStorage.getItem('localReactionProfile')) || { allTimes: [], bestTime: Number.MAX_SAFE_INTEGER };

// --- LIVE GLOBAL LEADERBOARD SYNC ---
if (database) {
    database.ref('scores').orderByChild('score').limitToFirst(5).on('value', (snapshot) => {
        leaderboardList.innerHTML = '';
        
        // If no scores exist yet in the database
        if (!snapshot.exists()) {
            const li = document.createElement('li');
            li.style.listStyle = 'none';
            li.style.color = '#a0a0a5';
            li.textContent = 'No high scores yet. Be the first!';
            leaderboardList.appendChild(li);
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val();
            const li = document.createElement('li');
            li.innerHTML = `<strong>${entry.name}</strong>: ${entry.score} ms`;
            leaderboardList.appendChild(li);
        });
    }, (error) => {
        console.error("Leaderboard read failed (Check Firebase Rules):", error);
    });
}

// --- AUTHENTICATION FLOW ---
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    if (!username) return;

    currentUser = username;
    
    // UI Screen Switching
    authModal.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    
    // Populate user panel information
    userDisplay.textContent = currentUser;
    updateUserStatsUI();
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    usernameInput.value = '';
    
    currentTimeDisplay.textContent = '0';
    mainLayout.classList.add('hidden');
    authModal.classList.remove('hidden');
});

// --- CORE GAME ACTIONS ---
testZone.addEventListener('mousedown', () => {
    if (state === 'idle') {
        startTest();
    } else if (state === 'waiting') {
        triggerEarlyClick();
    } else if (state === 'ready') {
        endTest();
    }
});

function startTest() {
    state = 'waiting';
    testZone.className = 'waiting';
    testText.textContent = 'Wait for Green...';
    
    const randomDelay = Math.floor(Math.random() * 3000) + 2000;
    
    timeoutId = setTimeout(() => {
        state = 'ready';
        testZone.className = 'ready';
        testText.textContent = 'CLICK!';
        startTime = performance.now();
    }, randomDelay);
}

function triggerEarlyClick() {
    clearTimeout(timeoutId);
    state = 'idle';
    testZone.className = 'idle';
    testText.textContent = 'Too early! Click to try again.';
}

function endTest() {
    const endTime = performance.now();
    const reactionTime = Math.round(endTime - startTime);
    
    state = 'idle';
    testZone.className = 'idle';
    testText.textContent = `${reactionTime} ms! Click to try again.`;
    
    currentTimeDisplay.textContent = reactionTime;
    
    // Append to running statistics
    localHistory.allTimes.push(reactionTime);
    if (reactionTime < localHistory.bestTime) {
        localHistory.bestTime = reactionTime;
    }
    localStorage.setItem('localReactionProfile', JSON.stringify(localHistory));
    
    updateUserStatsUI();
    
    // Stream data instantly into Firebase Realtime database
    sendScoreToGlobalLeaderboard(currentUser, reactionTime);
}

// --- DATA PROCESSING & UI RENDERS ---
function updateUserStatsUI() {
    if (localHistory.bestTime === Number.MAX_SAFE_INTEGER) {
        bestTimeDisplay.textContent = '0';
    } else {
        bestTimeDisplay.textContent = localHistory.bestTime;
    }

    if (localHistory.allTimes.length > 0) {
        const sum = localHistory.allTimes.reduce((total, t) => total + t, 0);
        averageTimeDisplay.textContent = Math.round(sum / localHistory.allTimes.length);
    } else {
        averageTimeDisplay.textContent = '0';
    }
}

function sendScoreToGlobalLeaderboard(username, finalScore) {
    if (!database) return;
    
    database.ref('scores').push({
        name: username,
        score: finalScore,
        timestamp: Date.now()
    }).catch((error) => {
        console.error("Score submission failed (Check Firebase Rules):", error);
    });
}

// Local Reset button
clearBtn.addEventListener('click', () => {
    if (confirm("Reset your local history metrics? (This does not delete historical database node submissions).")) {
        localStorage.clear();
        localHistory = { allTimes: [], bestTime: Number.MAX_SAFE_INTEGER };
        logoutBtn.click();
    }
});
