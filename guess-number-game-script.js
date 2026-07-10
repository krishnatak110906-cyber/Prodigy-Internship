
let gameState = {
    secretNumber: null,
    maxRange: 100,
    difficulty: 'medium',
    attempts: 0,
    guessHistory: [],
    hintsUsed: 0,
    maxHints: 3,
    gameOver: false,
    gameStartTime: null,
    gameEndTime: null
};

const difficultyScreen = document.getElementById('difficultyScreen');
const gameScreen = document.getElementById('gameScreen');
const guessInput = document.getElementById('guessInput');
const guessBtn = document.getElementById('guessBtn');
const hintBtn = document.getElementById('hintBtn');
const newGameBtn = document.getElementById('newGameBtn');
const feedbackSection = document.getElementById('feedbackSection');
const feedbackMessage = document.getElementById('feedbackMessage');
const historyList = document.getElementById('historyList');
const errorMessage = document.getElementById('errorMessage');
const attemptsDisplay = document.getElementById('attemptsDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const difficultyBadge = document.getElementById('difficultyBadge');
const gameRange = document.getElementById('gameRange');
const hintsDisplay = document.getElementById('hintsDisplay');
const winModal = document.getElementById('winModal');
const playAgainBtn = document.getElementById('playAgainBtn');
const changeDifficultyBtn = document.getElementById('changeDifficultyBtn');
const themeToggle = document.getElementById('themeToggle');

const gamesPlayedStat = document.getElementById('gamesPlayedStat');
const bestScoreStat = document.getElementById('bestScoreStat');
const avgAttemptsStat = document.getElementById('avgAttemptsStat');

const winNumber = document.getElementById('winNumber');
const winAttempts = document.getElementById('winAttempts');
const winTime = document.getElementById('winTime');

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    setupDifficultyButtons();
    updateStatistics();
});


document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', startGame);
});

guessBtn.addEventListener('click', handleGuess);

guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !gameState.gameOver) {
        handleGuess();
    }
});

hintBtn.addEventListener('click', giveHint);

newGameBtn.addEventListener('click', startNewGame);

playAgainBtn.addEventListener('click', startNewGame);
changeDifficultyBtn.addEventListener('click', changeDifficulty);

themeToggle.addEventListener('click', toggleTheme);



function setupDifficultyButtons() {
    const buttons = document.querySelectorAll('.difficulty-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', (e) => {
            const range = e.currentTarget.dataset.range;
            gameRange.textContent = `between 1 and ${range}`;
        });
    });
}


function startGame(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    const maxRange = parseInt(e.currentTarget.dataset.range);

    gameState.difficulty = difficulty;
    gameState.maxRange = maxRange;
    gameState.secretNumber = generateRandomNumber(1, maxRange);
    gameState.attempts = 0;
    gameState.guessHistory = [];
    gameState.hintsUsed = 0;
    gameState.gameOver = false;
    gameState.gameStartTime = Date.now();
    gameState.gameEndTime = null;

    updateDifficultyDisplay();
    showGameScreen();
    clearError();
    clearFeedback();
    updateHistoryDisplay();
    updateHintsDisplay();

    guessInput.focus();

    startTimer();
}


function updateDifficultyDisplay() {
    const difficultyNames = {
        easy: '🌱 Easy',
        medium: '🔥 Medium',
        hard: '💎 Hard'
    };
    
    difficultyBadge.textContent = difficultyNames[gameState.difficulty];
    gameRange.textContent = `between 1 and ${gameState.maxRange}`;
    guessInput.max = gameState.maxRange;
    guessInput.placeholder = `Enter number (1-${gameState.maxRange})`;
}



function showGameScreen() {
    difficultyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}


function showDifficultyScreen() {
    gameScreen.classList.add('hidden');
    difficultyScreen.classList.remove('hidden');
}



function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function handleGuess() {

    clearError();

    const guessValue = guessInput.value.trim();

    const validationError = validateGuessInput(guessValue);
    if (validationError) {
        showError(validationError);
        return;
    }
    
    const guess = parseInt(guessValue);

    if (guess < 1 || guess > gameState.maxRange) {
        showError(`⚠️ Please enter a number between 1 and ${gameState.maxRange}`);
        return;
    }

    processGuess(guess);
}


function validateGuessInput(input) {
    if (input === '') {
        return '⚠️ Please enter a number';
    }
    
    if (isNaN(input)) {
        return '⚠️ Please enter a valid number';
    }
    
    if (input.includes('.')) {
        return '⚠️ Please enter a whole number (no decimals)';
    }
    
    return null;
}


function processGuess(guess) {

    gameState.attempts++;

    gameState.guessHistory.push(guess);

    attemptsDisplay.textContent = gameState.attempts;

    updateHistoryDisplay();

    if (guess === gameState.secretNumber) {
        winGame();
    } else if (guess < gameState.secretNumber) {
        showFeedback('📈 Too Low! Try a higher number.', 'too-low');
    } else {
        showFeedback('📉 Too High! Try a lower number.', 'too-high');
    }

    guessInput.value = '';
    guessInput.focus();
}


function winGame() {
    gameState.gameOver = true;
    gameState.gameEndTime = Date.now();

    feedbackSection.style.display = 'none';

    saveGameStatistics();

    createConfetti();

    setTimeout(() => {
        showWinModal();
    }, 300);
}


function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback-message';
    
    if (type) {
        feedbackMessage.classList.add(type);
    }
    
    feedbackSection.style.display = 'block';
}


function clearFeedback() {
    feedbackSection.style.display = 'none';
    feedbackMessage.textContent = '';
}



function giveHint() {

    if (gameState.hintsUsed >= gameState.maxHints) {
        showError('❌ No more hints available!');
        return;
    }
    
    if (gameState.gameOver) {
        showError('❌ Game is over!');
        return;
    }
    
    gameState.hintsUsed++;
    updateHintsDisplay();

    const hint = generateHint();
    showFeedback(`💡 Hint: ${hint}`, 'success');
}


function generateHint() {
    const secretNum = gameState.secretNumber;
    const quarter = gameState.maxRange / 4;
    
    if (secretNum <= quarter) {
        return `The number is in the lower quarter (1-${quarter.toFixed(0)})`;
    } else if (secretNum <= quarter * 2) {
        return `The number is in the lower-middle quarter (${Math.ceil(quarter)}-${(quarter * 2).toFixed(0)})`;
    } else if (secretNum <= quarter * 3) {
        return `The number is in the upper-middle quarter (${Math.ceil(quarter * 2)}-${(quarter * 3).toFixed(0)})`;
    } else {
        return `The number is in the upper quarter (${Math.ceil(quarter * 3)}-${gameState.maxRange})`;
    }
}


function updateHintsDisplay() {
    const hints = document.querySelectorAll('.hint-dot');
    hints.forEach((hint, index) => {
        if (index < gameState.hintsUsed) {
            hint.classList.add('used');
        } else {
            hint.classList.remove('used');
        }
    });

    hintBtn.disabled = gameState.hintsUsed >= gameState.maxHints;
}



function updateHistoryDisplay() {
    historyList.innerHTML = '';
    
    if (gameState.guessHistory.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No guesses yet</p>';
        return;
    }

    const reversedHistory = [...gameState.guessHistory].reverse();
    reversedHistory.forEach((guess, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        let status = '';
        if (guess === gameState.secretNumber) {
            status = ' ✓ (Correct!)';
        } else if (guess < gameState.secretNumber) {
            status = ' (Too Low)';
        } else {
            status = ' (Too High)';
        }
        
        historyItem.textContent = `Guess ${gameState.attempts - index}: ${guess}${status}`;
        historyList.appendChild(historyItem);
    });
}



function saveGameStatistics() {
    let stats = JSON.parse(localStorage.getItem('guessGameStats')) || {
        gamesPlayed: 0,
        totalAttempts: 0,
        bestScore: Infinity,
        gameRecords: []
    };

    stats.gamesPlayed++;
    stats.totalAttempts += gameState.attempts;
    
    if (gameState.attempts < stats.bestScore) {
        stats.bestScore = gameState.attempts;
    }

    const timeTaken = Math.round((gameState.gameEndTime - gameState.gameStartTime) / 1000);
    stats.gameRecords.push({
        difficulty: gameState.difficulty,
        attempts: gameState.attempts,
        time: timeTaken,
        date: new Date().toLocaleDateString()
    });

    if (stats.gameRecords.length > 10) {
        stats.gameRecords = stats.gameRecords.slice(0, 10);
    }

    localStorage.setItem('guessGameStats', JSON.stringify(stats));

    updateStatistics();
}


function updateStatistics() {
    let stats = JSON.parse(localStorage.getItem('guessGameStats')) || {
        gamesPlayed: 0,
        totalAttempts: 0,
        bestScore: Infinity
    };
    
    gamesPlayedStat.textContent = stats.gamesPlayed;
    bestScoreStat.textContent = stats.bestScore === Infinity ? '-' : stats.bestScore;
    
    if (stats.gamesPlayed > 0) {
        const avgAttempts = Math.round(stats.totalAttempts / stats.gamesPlayed);
        avgAttemptsStat.textContent = avgAttempts;
    } else {
        avgAttemptsStat.textContent = '-';
    }
}


let timerInterval = null;


function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!gameState.gameOver) {
            const elapsedSeconds = Math.round((Date.now() - gameState.gameStartTime) / 1000);
            timerDisplay.textContent = `${elapsedSeconds}s`;
        }
    }, 1000);
}


function getFormattedTime(milliseconds) {
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}



function showWinModal() {
    const timeTaken = gameState.gameEndTime - gameState.gameStartTime;
    
    winNumber.textContent = gameState.secretNumber;
    winAttempts.textContent = gameState.attempts;
    winTime.textContent = getFormattedTime(timeTaken);
    
    winModal.classList.remove('hidden');
}


function hideWinModal() {
    winModal.classList.add('hidden');
}


function createConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    
    const confettiCount = 50;
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }
}



function startNewGame() {
    hideWinModal();
    clearInterval(timerInterval);

    gameState.secretNumber = generateRandomNumber(1, gameState.maxRange);
    gameState.attempts = 0;
    gameState.guessHistory = [];
    gameState.hintsUsed = 0;
    gameState.gameOver = false;
    gameState.gameStartTime = Date.now();
    gameState.gameEndTime = null;

    attemptsDisplay.textContent = '0';
    timerDisplay.textContent = '0s';
    guessInput.value = '';
    clearError();
    clearFeedback();
    updateHistoryDisplay();
    updateHintsDisplay();

    guessInput.focus();

    startTimer();
}


function changeDifficulty() {
    hideWinModal();
    clearInterval(timerInterval);
    showDifficultyScreen();
}



function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    setTimeout(() => {
        clearError();
    }, 4000);
}


function clearError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
}



function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateThemeIcon();
}


function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeIcon();
}


function updateThemeIcon() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

console.log('%cGuess the Number Game v1.0', 'font-size: 24px; font-weight: bold; color: #667eea;');
console.log('%cBuilt with ❤️ by ProDigy InfoTech Intern', 'font-size: 14px; color: #667eea;');
console.log('%cChallenge yourself and beat your best score!', 'font-size: 12px; color: #999;');
