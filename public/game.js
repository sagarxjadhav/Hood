const socket = io();
const userData = JSON.parse(localStorage.getItem('userData'));
if (!userData) window.location.href = '/';



const memeImage = document.getElementById('memeImage');
const guessInput = document.getElementById('guessInput');
const submitGuess = document.getElementById('submitGuess');
const resultBox = document.getElementById('result');
const teamDisplay = document.getElementById('teamName');
const redScoreEl = document.getElementById('redScore');
const blueScoreEl = document.getElementById('blueScore');

let currentMeme = '';
let seenMemes = new Set();
let team = '';
let allMemes = [];
let redScore = 0;
let blueScore = 0;

socket.emit('join-meme-game', userData.name);

socket.on('assign-team', (assignedTeam) => {
    team = assignedTeam;
    teamDisplay.textContent = team;
});

socket.on('send-meme-list', (memes) => {
    allMemes = memes;
    showNextMeme();
});
document.getElementById('joinGameBtn').addEventListener('click', () => {
    const joiningId = document.getElementById('joiningIdInput').value.trim();
    if (joiningId) {
        socket.emit('join-meme-game', userData.name, joiningId);
    }
});

socket.on('update-team-counts', ({ red, blue }) => {
    document.getElementById('redTeamCount').textContent = `Red Team Count: ${red}`;
    document.getElementById('blueTeamCount').textContent = `Blue Team Count: ${blue}`;
});
submitGuess.addEventListener('click', () => {
    const guess = guessInput.value.trim().toLowerCase();
    if (guess === '') return;

    const correct = guess === currentMeme.toLowerCase();
    if (correct) {
        resultBox.textContent = '✅ Correct!';
        socket.emit('team-score', team);
    } else {
        resultBox.textContent = `❌ Wrong! Correct was: ${currentMeme}`;
    }

    guessInput.value = '';
    setTimeout(() => {
        resultBox.textContent = '';
        showNextMeme();
    }, 2000);
});

function showNextMeme() {
    if (seenMemes.size >= allMemes.length) {
        resultBox.textContent = '🎉 All memes shown!';
        memeImage.style.display = 'none';
        return;
    }

    let meme;
    do {
        meme = allMemes[Math.floor(Math.random() * allMemes.length)];
    } while (seenMemes.has(meme));

    seenMemes.add(meme);
    currentMeme = meme.split('.')[0];
    memeImage.src = `/memes/${meme}`;
}
  
socket.on('update-scores', ({ red, blue }) => {
    redScore = red;
    blueScore = blue;
    redScoreEl.textContent = redScore;
    blueScoreEl.textContent = blueScore;
});
