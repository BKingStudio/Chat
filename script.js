// Database and state management
let currentUser = null;
let peer = null;
let currentConnection = null;
let activeRandomSearch = false;
let randomMatchInterval = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const currentUsernameSpan = document.getElementById('current-username');
const accountTypeSpan = document.getElementById('account-type');
const daysRemainingSpan = document.getElementById('days-remaining');
const logoutBtn = document.getElementById('logout-btn');
const searchUsernameInput = document.getElementById('search-username');
const searchBtn = document.getElementById('search-btn');
const searchResultsDiv = document.getElementById('search-results');
const startRandomChatBtn = document.getElementById('start-random-chat');
const randomChatStatus = document.getElementById('random-chat-status');
const chatSection = document.getElementById('chat-section');
const peerUsernameSpan = document.getElementById('peer-username');
const chatMessagesDiv = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const endChatBtn = document.getElementById('end-chat-btn');
const currentPointsSpan = document.getElementById('current-points');
const watchAdBtn = document.getElementById('watch-ad-btn');
const buyButtons = document.querySelectorAll('.buy-btn');

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update active tab content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    });
});

// Initialize the app
function initApp() {
    checkLoginStatus();
    setupEventListeners();
    updateRandomChatAvailability();
}

// Check if user is logged in
function checkLoginStatus() {
    const activeUser = db.getActiveUser();
    if (activeUser) {
        loginUser(activeUser.username);
    }
}

// Setup event listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    searchBtn.addEventListener('click', handleSearch);
    startRandomChatBtn.addEventListener('click', startRandomChat);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    endChatBtn.addEventListener('click', endCurrentChat);
    watchAdBtn.addEventListener('click', showAdForPoints);
    
    buyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const days = parseInt(button.getAttribute('data-days'));
            const points = parseInt(button.getAttribute('data-points'));
            buyPremium(days, points);
        });
    });
}

// Handle login
function handleLogin() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    // Check if username exists and is premium
    const existingUser = db.getUser(username);
    if (existingUser && existingUser.premiumExpiry > Date.now()) {
        // Premium user - log them in
        loginUser(username);
        return;
    }
    
    // Check if username is available (not temporary or expired)
    if (existingUser && existingUser.premiumExpiry === 0) {
        alert('This username was temporary and has expired. Please choose another or go premium.');
        return;
    }
    
    // Create new user (temporary by default)
    db.createUser(username);
    loginUser(username);
}

// Login user
function loginUser(username) {
    currentUser = db.getUser(username);
    
    // Initialize PeerJS with username as ID
    peer = new Peer(username, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true
    });
    
    peer.on('open', () => {
        console.log('PeerJS connection open');
    });
    
    peer.on('connection', (conn) => {
        handleIncomingConnection(conn);
    });
    
    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
    });
    
    // Update UI
    currentUsernameSpan.textContent = currentUser.username;
    
    if (currentUser.premiumExpiry > Date.now()) {
        accountTypeSpan.textContent = 'Premium';
        accountTypeSpan.classList.add('premium');
        
        const daysLeft = Math.ceil((currentUser.premiumExpiry - Date.now()) / (1000 * 60 * 60 * 24));
        daysRemainingSpan.textContent = `${daysLeft} days remaining`;
    } else {
        accountTypeSpan.textContent = 'Temporary';
        accountTypeSpan.classList.remove('premium');
        daysRemainingSpan.textContent = 'Expires in 24 hours';
        
        // Set timeout to expire temporary user
        setTimeout(() => {
            if (currentUser && currentUser.premiumExpiry === 0) {
                alert('Your temporary username has expired. Please create a new one or go premium.');
                handleLogout();
            }
        }, 24 * 60 * 60 * 1000);
    }
    
    // Show app section
    loginSection.classList.remove('active');
    appSection.classList.add('active');
    
    // Update points display
    updatePointsDisplay();
    
    // Clear input
    usernameInput.value = '';
}

// Handle logout
function handleLogout() {
    endCurrentChat();
    
    if (peer) {
        peer.destroy();
        peer = null;
    }
    
    currentUser = null;
    
    // Show login section
    appSection.classList.remove('active');
    loginSection.classList.add('active');
    
    // Reset tabs
    tabButtons[0].click();
}

// Handle search
function handleSearch() {
    const searchTerm = searchUsernameInput.value.trim();
    
    if (!searchTerm) {
        alert('Please enter a username to search');
        return;
    }
    
    // Don't allow searching for yourself
    if (searchTerm.toLowerCase() === currentUser.username.toLowerCase()) {
        alert("You can't search for yourself!");
        return;
    }
    
    searchResultsDiv.innerHTML = '<p>Searching...</p>';
    
    // In a real app, you'd search your database or signaling server
    // For this demo, we'll simulate a search with a timeout
    setTimeout(() => {
        const results = db.searchUsers(searchTerm);
        displaySearchResults(results);
    }, 500);
}

// Display search results
function displaySearchResults(users) {
    searchResultsDiv.innerHTML = '';
    
    if (users.length === 0) {
        searchResultsDiv.innerHTML = '<p>No users found</p>';
        return;
    }
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-result';
        
        const isOnline = db.isUserOnline(user.username);
        
        userElement.innerHTML = `
            <div>
                <strong>${user.username}</strong>
                <span>${user.premiumExpiry > Date.now() ? 'Premium' : 'Temporary'}</span>
            </div>
            <div class="status ${isOnline ? 'online' : ''}"></div>
            <button class="connect-btn" data-username="${user.username}">Connect</button>
        `;
        
        searchResultsDiv.appendChild(userElement);
    });
    
    // Add event listeners to connect buttons
    document.querySelectorAll('.connect-btn').forEach(button => {
        button.addEventListener('click', () => {
            const peerUsername = button.getAttribute('data-username');
            connectToUser(peerUsername);
        });
    });
}

// Connect to another user
function connectToUser(peerUsername) {
    if (currentConnection) {
        alert('You are already in a chat. Please end the current chat first.');
        return;
    }
    
    const conn = peer.connect(peerUsername);
    
    conn.on('open', () => {
        currentConnection = conn;
        setupConnectionListeners(conn);
        showChatWithUser(peerUsername);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        alert('Failed to connect to user');
    });
}

// Handle incoming connection
function handleIncomingConnection(conn) {
    if (currentConnection) {
        conn.close();
        return;
    }
    
    currentConnection = conn;
    setupConnectionListeners(conn);
    showChatWithUser(conn.peer);
}

// Setup connection listeners
function setupConnectionListeners(conn) {
    conn.on('data', (data) => {
        if (data.type === 'chat-message') {
            displayMessage(data.message, 'received');
        }
    });
    
    conn.on('close', () => {
        endCurrentChat();
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        endCurrentChat();
    });
}

// Show chat with user
function showChatWithUser(username) {
    peerUsernameSpan.textContent = username;
    chatMessagesDiv.innerHTML = '';
    chatSection.classList.remove('hidden');
}

// End current chat
function endCurrentChat() {
    if (currentConnection) {
        currentConnection.close();
        currentConnection = null;
    }
    
    chatSection.classList.add('hidden');
    
    if (activeRandomSearch) {
        activeRandomSearch = false;
        clearInterval(randomMatchInterval);
        startRandomChatBtn.textContent = 'Start Random Chat';
        updateRandomChatAvailability();
    }
}

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || !currentConnection) return;
    
    currentConnection.send({
        type: 'chat-message',
        message: message
    });
    
    displayMessage(message, 'sent');
    messageInput.value = '';
}

// Display message
function displayMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    chatMessagesDiv.appendChild(messageElement);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

// Random chat functionality
function updateRandomChatAvailability() {
    const activeUsers = db.getActiveUsers();
    
    if (activeUsers.length >= 2) {
        startRandomChatBtn.disabled = false;
        randomChatStatus.textContent = 'Random chat is available';
    } else {
        startRandomChatBtn.disabled = true;
        randomChatStatus.textContent = 'Not enough users online for random chat';
    }
}

function startRandomChat() {
    if (activeRandomSearch) {
        // Cancel search
        activeRandomSearch = false;
        clearInterval(randomMatchInterval);
        startRandomChatBtn.textContent = 'Start Random Chat';
        return;
    }
    
    activeRandomSearch = true;
    startRandomChatBtn.textContent = 'Cancel Search';
    
    // Simulate searching for a random user
    randomMatchInterval = setInterval(() => {
        const activeUsers = db.getActiveUsers();
        const otherUsers = activeUsers.filter(user => user.username !== currentUser.username);
        
        if (otherUsers.length > 0) {
            const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
            connectToUser(randomUser.username);
            clearInterval(randomMatchInterval);
        }
    }, 3000);
}

// Premium features
function updatePointsDisplay() {
    currentPointsSpan.textContent = currentUser.points || 0;
}

function showAdForPoints() {
    // In a real app, you would show an actual ad and wait for completion callback
    // For this demo, we'll simulate watching an ad with a timeout
    
    watchAdBtn.disabled = true;
    watchAdBtn.textContent = 'Loading ad...';
    
    setTimeout(() => {
        // Randomly select one of the direct ad links
        const adLinks = [
            'https://www.profitableratecpm.com/fkjarah13a?key=51e1d91c03f440721d88c11e332e09f9',
            'https://www.profitableratecpm.com/cw83b7snx?key=fe83ad8c037b7a9440339e891ac17b3a',
            'https://www.profitableratecpm.com/hfvumbdx?key=cbf7ac3a2fa35a81eb09ecfaf6cdb75c'
        ];
        const randomAd = adLinks[Math.floor(Math.random() * adLinks.length)];
        
        // Open ad in new tab
        window.open(randomAd, '_blank');
        
        // Award points (simulating ad completion)
        db.addPoints(currentUser.username, 5);
        currentUser = db.getUser(currentUser.username);
        updatePointsDisplay();
        
        watchAdBtn.disabled = false;
        watchAdBtn.textContent = 'Watch Ad to Earn Points';
        
        alert('Thanks for watching! You earned 5 points.');
    }, 1000);
}

function buyPremium(days, points) {
    if (!currentUser) return;
    
    if (currentUser.points < points) {
        alert(`You need ${points} points to buy this package. You currently have ${currentUser.points} points.`);
        return;
    }
    
    const expiryDate = currentUser.premiumExpiry > Date.now() 
        ? currentUser.premiumExpiry + (days * 24 * 60 * 60 * 1000)
        : Date.now() + (days * 24 * 60 * 60 * 1000);
    
    db.setPremium(currentUser.username, expiryDate);
    db.deductPoints(currentUser.username, points);
    
    currentUser = db.getUser(currentUser.username);
    
    // Update UI
    accountTypeSpan.textContent = 'Premium';
    accountTypeSpan.classList.add('premium');
    
    const daysLeft = Math.ceil((currentUser.premiumExpiry - Date.now()) / (1000 * 60 * 60 * 24));
    daysRemainingSpan.textContent = `${daysLeft} days remaining`;
    
    updatePointsDisplay();
    
    alert(`Success! Your premium account is now active for ${days} days.`);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
