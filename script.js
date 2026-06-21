// DOM Elements
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

// Game State Variables
let state = 'idle'; 
let startTime = 0;
let timeoutId = null;
let currentUser = null;

// Global Databases from LocalStorage
let usersDatabase = JSON.parse(localStorage.getItem('usersDatabase')) || {};
let globalLeaderboard = JSON.parse(localStorage.getItem('globalLeaderboard')) || [];

// --- AUTHENTICATION FLOW ---

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (!username) return;

    currentUser = username;
    
    // Check if user already exists in local DB, if not, initialize them
    if (!usersDatabase[currentUser]) {
        usersDatabase[currentUser] = {
            allTimes: [],
            bestTime: Number.MAX_SAFE_INTEGER
        };
        saveDatabase();
    }

    // Switch screens
    authModal.classList.add('hidden');
    mainLayout.classList.remove('hidden');
    
    // Update dashboard profile
    userDisplay.textContent = currentUser;
    updateUserStatsUI();
    updateLeaderboardUI();
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    usernameInput.value = '';
    
    // Reset display numbers
    currentTimeDisplay.textContent = '0';
    bestTimeDisplay.textContent = '0';
    averageTimeDisplay.textContent = '0';

    // Toggle screen visibility back to sign-in modal
    mainLayout.classList.add('hidden');
    authModal.classList.remove('hidden');
});


// --- GAME LOGIC ---

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
    
    // Save performance directly to current profile
    const userProfile = usersDatabase[currentUser];
    userProfile.allTimes.push(reactionTime);
    
    if (reactionTime < userProfile.bestTime) {
        userProfile.bestTime = reactionTime;
    }
    
    saveDatabase();
    updateUserStatsUI();
    handleGlobalLeaderboard(currentUser, reactionTime);
}

// --- DATA PROCESSING & UI CONTROLS ---

function updateUserStatsUI() {
    const profile = usersDatabase[currentUser];
    
    // Update Personal Best
    if (profile.bestTime === Number.MAX_SAFE_INTEGER) {
        bestTimeDisplay.textContent = '0';
    } else {
        bestTimeDisplay.textContent = profile.bestTime;
    }

    // Update Personal Average
    if (profile.allTimes.length > 0) {
        const sum = profile.allTimes.reduce((total, t) => total + t, 0);
        averageTimeDisplay.textContent = Math.round(sum / profile.allTimes.length);
    } else {
        averageTimeDisplay.textContent = '0';
    }
}

function handleGlobalLeaderboard(username, score) {
    // Add entry into leaderboard array containing username tag
    globalLeaderboard.push({ name: username, score: score });
    
    // Sort scores ascendingly (lower ms means higher ranking)
    globalLeaderboard.sort((a, b) => a.score - b.score);
    
    // Chop down array to strictly keep top 5 global scores
    globalLeaderboard = globalLeaderboard.slice(0, 5);
    
    localStorage.setItem('globalLeaderboard', JSON.stringify(globalLeaderboard));
    updateLeaderboardUI();
}

function updateLeaderboardUI() {
    leaderboardList.innerHTML = '';
    
    globalLeaderboard.forEach((entry) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${entry.name}</strong>: ${entry.score} ms`;
        leaderboardList.appendChild(li);
    });
}

function saveDatabase() {
    localStorage.setItem('usersDatabase', JSON.stringify(usersDatabase));
}

// System reset button
clearBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to completely erase all user accounts and leaderboards?")) {
        localStorage.clear();
        usersDatabase = {};
        globalLeaderboard = [];
        logoutBtn.click(); // boot user out to sign-in modal
    }
});