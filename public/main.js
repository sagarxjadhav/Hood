const socket = io();
const userData = JSON.parse(localStorage.getItem('userData'));
if (!userData) window.location.href = '/';

const clientsTotal = document.getElementById('client-total');
const messageContainer = document.getElementById('message-container');
const nameInput = document.getElementById('name-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messageToneSend = document.getElementById('messageToneSend');
const messageToneReceive = document.getElementById('messageToneReceive');
const logoutBtn = document.getElementById('logoutBtn');

nameInput.value = userData.name;
let currentGroup = localStorage.getItem('currentGroup') || null;
const MAX_MESSAGES = 1000;
let messages = JSON.parse(localStorage.getItem('messages')) || [];

// If there's a saved group, rejoin it on page load
if (currentGroup) {
    const [groupType, groupName] = currentGroup.split('-', 2);
    joinGroup(groupType, groupName);
}

function saveMessages() {
    if (messages.length > MAX_MESSAGES) {
        messages = messages.slice(-MAX_MESSAGES / 2);
    }
    localStorage.setItem('messages', JSON.stringify(messages));
}

function joinGroup(groupType, groupName) {
    currentGroup = `${groupType}-${groupName}`;
    socket.emit('join-group', groupType, groupName);
    messageContainer.innerHTML = '';
    messages.filter(m => m.groupId === currentGroup).forEach(m => 
        addMessageToUI(m.isOwnMessage, m.data));
    localStorage.setItem('currentGroup', currentGroup); // Save the current group
}

document.getElementById('cityGroupBtn').addEventListener('click', () => 
    joinGroup('city', userData.city));
document.getElementById('collegeGroupBtn').addEventListener('click', () => 
    joinGroup('college', userData.college));
document.getElementById('universityGroupBtn').addEventListener('click', () => 
    joinGroup('university', userData.university));
document.getElementById('customRoomBtn').addEventListener('click', () => {
    socket.emit('create-custom-room', (roomId) => {
        joinGroup('custom', roomId);
        alert(`Share this room ID: ${roomId}`);
    });
});
document.getElementById('joinCustomRoomBtn').addEventListener('click', () => {
    const roomId = document.getElementById('customRoomInput').value.trim();
    if (roomId) joinGroup('custom', roomId);
});

document.getElementById('customRoomBtn').addEventListener('click', () => {
    socket.emit('create-custom-room', (roomId) => {
        document.getElementById('roomIdDisplay').textContent = `Room ID: ${roomId}`; // Display the room ID
        joinGroup('custom', roomId); // Optionally join the room immediately
    });
});



messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
});

logoutBtn.addEventListener('click', () => {
    localStorage.clear(); // Clear all local storage data
    window.location.href = '/'; // Redirect to form page
});

socket.on('clients-total', (data) => {
    clientsTotal.innerText = `Total Clients: ${data}`;
});

function playSendTone() {
    messageToneSend.currentTime = 0;
    messageToneSend.play().catch(error => console.log('Send audio play failed:', error));
}

function playReceiveTone() {
    messageToneReceive.currentTime = 0;
    messageToneReceive.play().catch(error => console.log('Receive audio play failed:', error));
}

function sendMessage() {
    if (messageInput.value === '' || !currentGroup) return;
    const data = {
        name: userData.name,
        message: messageInput.value,
        dateTime: new Date(),
        groupId: currentGroup
    };
    socket.emit('message', data);
    addMessageToUI(true, data);
    messages.push({ isOwnMessage: true, data });
    saveMessages();
    playSendTone();
    messageInput.value = '';
}

socket.on('chat-message', (data) => {
    addMessageToUI(false, data);
    messages.push({ isOwnMessage: false, data });
    saveMessages();
    playReceiveTone();
});

function addMessageToUI(isOwnMessage, data) {
    clearFeedback();
    const element = `
        <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
            <p class="message">
                ${data.message}
                <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
            </p>
        </li>`;
    messageContainer.innerHTML += element;
    scrollToBottom();
}

function scrollToBottom() {
    messageContainer.scrollTo(0, messageContainer.scrollHeight);
}

messageInput.addEventListener('focus', () => {
    if (currentGroup) {
        socket.emit('feedback', {
            feedback: `✍️ ${userData.name} is typing a message`,
            groupId: currentGroup
        });
    }
});

messageInput.addEventListener('keypress', () => {
    if (currentGroup) {
        socket.emit('feedback', {
            feedback: `✍️ ${userData.name} is typing a message`,
            groupId: currentGroup
        });
    }
});

messageInput.addEventListener('blur', () => {
    if (currentGroup) {
        socket.emit('feedback', {
            feedback: '',
            groupId: currentGroup
        });
    }
});

socket.on('feedback', (data) => {
    clearFeedback();
    const element = `
        <li class="message-feedback">
            <p class="feedback" id="feedback">${data.feedback}</p>
        </li>`;
    messageContainer.innerHTML += element;
});

function clearFeedback() {
    document.querySelectorAll('li.message-feedback').forEach(element => {
        element.parentNode.removeChild(element);
    });
}



