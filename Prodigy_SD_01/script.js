const temperatureInput = document.getElementById('temperature');
const fromUnitSelect = document.getElementById('fromUnit');
const toUnitSelect = document.getElementById('toUnit');
const convertBtn = document.getElementById('convertBtn');
const resetBtn = document.getElementById('resetBtn');
const swapBtn = document.getElementById('swapBtn');
const copyBtn = document.getElementById('copyBtn');
const resultSection = document.getElementById('resultSection');
const inputValue = document.getElementById('inputValue');
const outputValue = document.getElementById('outputValue');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeToggle = document.getElementById('themeToggle');
const loadingSpinner = document.getElementById('loadingSpinner');

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadHistory();
});

convertBtn.addEventListener('click', handleConversion);

temperatureInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleConversion();
    }
});

resetBtn.addEventListener('click', resetForm);

swapBtn.addEventListener('click', swapUnits);

copyBtn.addEventListener('click', copyToClipboard);

themeToggle.addEventListener('click', toggleTheme);

clearHistoryBtn.addEventListener('click', clearHistory);

temperatureInput.addEventListener('input', () => {
    if (temperatureInput.value && !temperatureInput.value.includes('e')) {
        handleConversion();
    }
});

function handleConversion() {
    clearError();
    
    const tempValue = parseFloat(temperatureInput.value);
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;
    
    const validationError = validateInput(tempValue, fromUnit);
    if (validationError) {
        showError(validationError);
        resultSection.style.display = 'none';
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        const result = convertTemperature(tempValue, fromUnit, toUnit);
        
        hideLoading();
        
        displayResult(tempValue, fromUnit, result, toUnit);
        
        addToHistory(tempValue, fromUnit, result, toUnit);
        
        showSuccessMessage();
    }, 300);
}

function convertTemperature(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) {
        return value;
    }
    
    let celsius;
    
    switch (fromUnit) {
        case 'celsius':
            celsius = value;
            break;
        case 'fahrenheit':
            celsius = (value - 32) * 5 / 9;
            break;
        case 'kelvin':
            celsius = value - 273.15;
            break;
        default:
            celsius = value;
    }
    
    let result;
    switch (toUnit) {
        case 'celsius':
            result = celsius;
            break;
        case 'fahrenheit':
            result = (celsius * 9 / 5) + 32;
            break;
        case 'kelvin':
            result = celsius + 273.15;
            break;
        default:
            result = celsius;
    }
    
    return Math.round(result * 100) / 100;
}

function validateInput(value, unit) {
    if (temperatureInput.value.trim() === '') {
        return '⚠️ Please enter a temperature value';
    }
    
    if (isNaN(value)) {
        return '⚠️ Please enter a valid number';
    }
    
    if (unit === 'kelvin' && value < 0) {
        return '⚠️ Kelvin cannot be below 0 (Absolute Zero)';
    }
    
    if (Math.abs(value) > 1000000) {
        return '⚠️ Temperature value is too extreme';
    }
    
    return null;
}

function displayResult(inputVal, fromUnit, resultVal, toUnit) {
    const unitSymbols = {
        celsius: '°C',
        fahrenheit: '°F',
        kelvin: 'K'
    };
    
    inputValue.textContent = `${inputVal} ${unitSymbols[fromUnit]}`;
    outputValue.textContent = `${resultVal} ${unitSymbols[toUnit]}`;
    
    resultSection.style.display = 'block';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function clearError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
}

function showSuccessMessage() {
    successMessage.style.display = 'block';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 2000);
}

function showLoading() {
    loadingSpinner.style.display = 'block';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function resetForm() {
    temperatureInput.value = '';
    
    fromUnitSelect.value = 'celsius';
    toUnitSelect.value = 'fahrenheit';
    
    resultSection.style.display = 'none';
    
    clearError();
    
    temperatureInput.focus();
}

function swapUnits() {
    const tempFromUnit = fromUnitSelect.value;
    const tempToUnit = toUnitSelect.value;
    
    fromUnitSelect.value = tempToUnit;
    toUnitSelect.value = tempFromUnit;
    
    if (temperatureInput.value) {
        handleConversion();
    }
}

function copyToClipboard() {
    const resultText = outputValue.textContent;
    
    navigator.clipboard.writeText(resultText).then(() => {
        successMessage.textContent = '✓ Copied to clipboard!';
        successMessage.style.display = 'block';
        
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 2000);
    }).catch(() => {
        showError('Failed to copy. Please try again.');
    });
}

function addToHistory(inputVal, fromUnit, resultVal, toUnit) {
    let history = JSON.parse(localStorage.getItem('temperatureHistory')) || [];
    
    const unitSymbols = {
        celsius: '°C',
        fahrenheit: '°F',
        kelvin: 'K'
    };
    
    const entry = {
        id: Date.now(),
        input: `${inputVal} ${unitSymbols[fromUnit]}`,
        output: `${resultVal} ${unitSymbols[toUnit]}`,
        timestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };
    
    history.unshift(entry);
    
    if (history.length > 5) {
        history = history.slice(0, 5);
    }
    
    localStorage.setItem('temperatureHistory', JSON.stringify(history));
    
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('temperatureHistory')) || [];
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No conversions yet. Start converting!</p>';
        return;
    }
    
    history.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-text">
                <span>${entry.input}</span>
                <span class="history-arrow">→</span>
                <span>${entry.output}</span>
            </div>
            <small style="color: var(--text-secondary);">${entry.timestamp}</small>
        `;
        historyList.appendChild(historyItem);
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all conversion history?')) {
        localStorage.removeItem('temperatureHistory');
        
        loadHistory();
    }
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

function getUnitName(unit) {
    const units = {
        celsius: 'Celsius',
        fahrenheit: 'Fahrenheit',
        kelvin: 'Kelvin'
    };
    return units[unit] || unit;
}
