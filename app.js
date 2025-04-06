const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`💬 server on port ${PORT}`));
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

let socketsConnected = new Set();
const groups = {
    city: {},
    college: {},
    university: {},
    custom: {}
};

function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

io.on('connection', (socket) => {
    socketsConnected.add(socket.id);

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
        callback(customRoomId);
    });

    socket.on('message', (data) => {
        const groupId = data.groupId;
        socket.to(groupId).emit('chat-message', data);
    });

    socket.on('feedback', (data) => {
        const groupId = data.groupId;
        socket.to(groupId).emit('feedback', data);
    });

    socket.on('disconnect', () => {
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
    });
});