// Mock database using localStorage
const db = {
    // Get all users
    getUsers: function() {
        const users = localStorage.getItem('chatAppUsers');
        return users ? JSON.parse(users) : [];
    },
    
    // Save all users
    saveUsers: function(users) {
        localStorage.setItem('chatAppUsers', JSON.stringify(users));
    },
    
    // Get a specific user
    getUser: function(username) {
        const users = this.getUsers();
        return users.find(user => user.username.toLowerCase() === username.toLowerCase());
    },
    
    // Create a new user (temporary by default)
    createUser: function(username) {
        const users = this.getUsers();
        
        // Check if username exists (even if expired)
        const existingUser = users.find(user => user.username.toLowerCase() === username.toLowerCase());
        
        if (existingUser) {
            // If user exists but is expired, remove it
            if (existingUser.premiumExpiry === 0 || existingUser.premiumExpiry < Date.now()) {
                this.deleteUser(existingUser.username);
            } else {
                return; // Username exists and is valid
            }
        }
        
        const newUser = {
            username: username,
            premiumExpiry: 0, // 0 means temporary (24 hours)
            points: 0,
            lastActive: Date.now()
        };
        
        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    },
    
    // Delete a user
    deleteUser: function(username) {
        let users = this.getUsers();
        users = users.filter(user => user.username.toLowerCase() !== username.toLowerCase());
        this.saveUsers(users);
    },
    
    // Set premium status
    setPremium: function(username, expiryTimestamp) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.username.toLowerCase() === username.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex].premiumExpiry = expiryTimestamp;
            this.saveUsers(users);
        }
    },
    
    // Add points to user
    addPoints: function(username, points) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.username.toLowerCase() === username.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex].points = (users[userIndex].points || 0) + points;
            this.saveUsers(users);
        }
    },
    
    // Deduct points from user
    deductPoints: function(username, points) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.username.toLowerCase() === username.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex].points = Math.max(0, (users[userIndex].points || 0) - points);
            this.saveUsers(users);
        }
    },
    
    // Get active user (from localStorage)
    getActiveUser: function() {
        const activeUser = localStorage.getItem('chatAppActiveUser');
        if (!activeUser) return null;
        
        const user = this.getUser(activeUser);
        if (!user) return null;
        
        // Check if temporary user is expired
        if (user.premiumExpiry === 0 || user.premiumExpiry < Date.now()) {
            this.deleteUser(user.username);
            localStorage.removeItem('chatAppActiveUser');
            return null;
        }
        
        return user;
    },
    
    // Set active user
    setActiveUser: function(username) {
        localStorage.setItem('chatAppActiveUser', username);
    },
    
    // Search users
    searchUsers: function(searchTerm) {
        const users = this.getUsers();
        return users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (user.premiumExpiry > Date.now() || user.premiumExpiry === 0)
        );
    },
    
    // Get active users (online in last 5 minutes)
    getActiveUsers: function() {
        const users = this.getUsers();
        return users.filter(user => 
            (user.premiumExpiry > Date.now() || user.premiumExpiry === 0) &&
            (user.lastActive > Date.now() - 5 * 60 * 1000)
        );
    },
    
    // Check if user is online
    isUserOnline: function(username) {
        const user = this.getUser(username);
        if (!user) return false;
        
        return user.lastActive > Date.now() - 5 * 60 * 1000;
    },
    
    // Update user's last active time
    updateLastActive: function(username) {
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.username.toLowerCase() === username.toLowerCase());
        
        if (userIndex !== -1) {
            users[userIndex].lastActive = Date.now();
            this.saveUsers(users);
        }
    },
    
    // Clean up expired users
    cleanupExpiredUsers: function() {
        const users = this.getUsers();
        const activeUsers = users.filter(user => 
            user.premiumExpiry > Date.now() || 
            (user.premiumExpiry === 0 && user.lastActive > Date.now() - 24 * 60 * 60 * 1000)
        );
        
        if (users.length !== activeUsers.length) {
            this.saveUsers(activeUsers);
        }
    }
};

// Run cleanup on startup
db.cleanupExpiredUsers();

// Export for use in other files
window.db = db;
