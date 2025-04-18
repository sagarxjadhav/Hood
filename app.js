
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`💬 server on port ${PORT}`));
const io = require('socket.io')(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Load meme list once
const memeFolderPath = path.join(__dirname, 'public', 'memes');
const memeFiles = fs.readdirSync(memeFolderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

// State management
let socketsConnected = new Set();
let redTeam = new Set();
let blueTeam = new Set();
let redScore = 0;
let blueScore = 0;
const groups = {
    city: {},
    college: {},
    university: {},
    custom: {}
};

// Utility function
function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    socketsConnected.add(socket.id);

    // Chat group handlers
    socket.on('join-group', (groupType, groupName) => {
        const groupId = `${groupType}-${groupName}`;
        socket.join(groupId);
        if (!groups[groupType][groupName]) {
            groups[groupType][groupName] = new Set();
        }
        groups[groupType][groupName].add(socket.id);
        io.to(groupId).emit('clients-total', groups[groupType][groupName].size);
    });

    socket.on('create-custom-room', (callback) => {
        const customRoomId = generateUniqueId();
        socket.join(`custom-${customRoomId}`);
        groups.custom[customRoomId] = new Set([socket.id]);
        callback(customRoomId); // Send the ID back to the client
    });
    

    socket.on('message', (data) => {
        const groupId = data.groupId;
        socket.to(groupId).emit('chat-message', data);
    });

    socket.on('feedback', (data) => {
        const groupId = data.groupId;
        socket.to(groupId).emit('feedback', data);
    });

    // Meme game handlers
    socket.on('join-meme-game', (username, joiningId) => {
        if (!joiningId) return;
    
        // Check if the joining ID is valid (you can implement your own logic here)
        if (redTeam.size <= blueTeam.size) {
            redTeam.add(socket.id);
            socket.emit('assign-team', 'Red');
        } else {
            blueTeam.add(socket.id);
            socket.emit('assign-team', 'Blue');
        }
        io.emit('update-team-counts', { red: redTeam.size, blue: blueTeam.size });

        socket.emit('send-meme-list', memeFiles);
        socket.emit('update-scores', { red: redScore, blue: blueScore });
    });
    

    socket.on('team-score', (team) => {
        if (team === 'Red') redScore++;
        else if (team === 'Blue') blueScore++;

        io.emit('update-scores', { red: redScore, blue: blueScore });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        // Clean up chat groups
        socketsConnected.delete(socket.id);
        for (const groupType in groups) {
            for (const groupName in groups[groupType]) {
                if (groups[groupType][groupName].has(socket.id)) {
                    groups[groupType][groupName].delete(socket.id);
                    io.to(`${groupType}-${groupName}`).emit('clients-total', 
                        groups[groupType][groupName].size);
                }
            }
        }

        // Clean up meme game teams
        redTeam.delete(socket.id);
        blueTeam.delete(socket.id);
    });
});