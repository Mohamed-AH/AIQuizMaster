let currentQuestion = 0;
let score = 0;
let streak = 0;
let timeLeft = 30;
let timer;
let questions = [];
let isMuted = false;
let maxQuestions = 10;
let currentCategory = "General public with tech interest";
let currentDifficulty = "Easy";

const sound = {
    correct: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-melodic-bonus-collect-1938.mp3'] }),
    incorrect: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-funny-fail-low-tone-2876.mp3'] }),
    complete: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3'] })
};

async function fetchQuestions() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQBkgE2d3Px02cElnfBelqjlE0Rs8ov9kzLffxmKACcam7qY0w5Wzbj6Z-wJwlNhrDdVK-AOIcZ39H/pub?gid=1743670085&single=true&output=csv';
    
    try {
        const response = await fetch(url);
        const csvData = await response.text();
        const rows = csvData.split('\n').slice(1); // Remove header row
        const allQuestions = rows.map(row => {
            const [sNo, question, optionA, optionB, optionC, optionD, optionE, correctAnswer, category, difficulty] = row.split(',').map(cell => cell.trim().replace(/(^"|"$)/g, ''));
            return {
                question,
                options: [optionA, optionB, optionC, optionD, optionE].filter(Boolean),
                correctAnswer: parseInt(correctAnswer) - 1,
                category,
                difficulty
            };
        });

        questions = getQuestions(allQuestions, currentCategory, currentDifficulty, maxQuestions);
        startQuiz();
    } catch (error) {
        console.error('Error fetching questions:', error);
    }
}

function getQuestions(allQuestions, category, difficulty, count) {
    let selectedQuestions = [];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    const categories = ['General public with tech interest', 'Business professionals', 'Gamers', 'Tech enthusiasts and AI professionals'];

    // Start with the selected category and difficulty
    selectedQuestions = filterQuestions(allQuestions, category, difficulty);

    // If we don't have enough questions, move to higher difficulties in the same category
    let difficultyIndex = difficulties.indexOf(difficulty);
    while (selectedQuestions.length < count && difficultyIndex < difficulties.length) {
        difficultyIndex++;
        if (difficultyIndex < difficulties.length) {
            selectedQuestions = selectedQuestions.concat(
                filterQuestions(allQuestions, category, difficulties[difficultyIndex])
            );
        }
    }

    // If we still don't have enough questions, move to other categories
    let categoryIndex = categories.indexOf(category);
    while (selectedQuestions.length < count && categoryIndex < categories.length) {
        categoryIndex++;
        if (categoryIndex < categories.length) {
            // Reset difficulty to the original selection for the new category
            difficultyIndex = difficulties.indexOf(difficulty);
            while (selectedQuestions.length < count && difficultyIndex < difficulties.length) {
                selectedQuestions = selectedQuestions.concat(
                    filterQuestions(allQuestions, categories[categoryIndex], difficulties[difficultyIndex])
                );
                difficultyIndex++;
            }
        }
    }

    // Shuffle and slice to get the required number of questions
    return shuffleArray(selectedQuestions).slice(0, count);
}

function filterQuestions(questions, category, difficulty) {
    return questions.filter(q => q.category === category && q.difficulty === difficulty);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz() {
    currentQuestion = 0;
    score = 0;
    streak = 0;
    updateQuestionCount();
    updateScore();
    updateStreak();

    // Inform the user if questions are from different difficulties or categories
    const differentDifficulties = new Set(questions.map(q => q.difficulty)).size > 1;
    const differentCategories = new Set(questions.map(q => q.category)).size > 1;

    if (differentDifficulties || differentCategories) {
        alert("To meet the requested number of questions, some questions may be from different difficulties or categories than initially selected.");
    }

    loadQuestion();
}

function loadQuestion() {
    const question = questions[currentQuestion];
    document.getElementById('question-text').textContent = question.question;
    
    const optionsHtml = question.options
        .map((option, index) => `<button onclick="checkAnswer(${index})">${option}</button>`)
        .join('');
    
    document.getElementById('options').innerHTML = optionsHtml;
    
    // Reset card flip
    document.querySelector('.card').classList.remove('flipped');
    
    // Change card icon randomly
    const icons = ['fa-microchip', 'fa-brain', 'fa-robot', 'fa-cog', 'fa-network-wired'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    document.querySelector('.card-icon i').className = `fas ${randomIcon}`;
    
    // Update front card text
    const frontTexts = [
        "Ready for the next challenge?",
        "Another AI puzzle awaits!",
        "Prepare to test your AI knowledge!",
        "Next question incoming!",
        "Are you up for this AI challenge?"
    ];
    const randomText = frontTexts[Math.floor(Math.random() * frontTexts.length)];
    document.querySelector('.card-front p').textContent = randomText;
    
    updateProgressBar();
    updateQuestionCount();
    adjustCardHeight();
    flipCard();
}

function flipCard() {
    document.querySelector('.card').classList.add('flipped');
    startTimer();
}

function startTimer() {
    timeLeft = 30;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        updateTimerBar();
        if (timeLeft <= 0) {
            clearInterval(timer);
            checkAnswer(-1);
        }
    }, 1000);
}

function updateTimerBar() {
    const percentage = (timeLeft / 30) * 100;
    const timerBar = document.getElementById('timer-bar').firstElementChild;
    timerBar.style.width = `${percentage}%`;
    timerBar.setAttribute('aria-valuenow', timeLeft);
}

function updateProgressBar() {
    const percentage = (currentQuestion / questions.length) * 100;
    const progressBar = document.getElementById('progress-bar').firstElementChild;
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
}

function updateQuestionCount() {
    document.getElementById('current-question').textContent = currentQuestion + 1;
    document.getElementById('total-questions').textContent = questions.length;
}

function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

function updateStreak() {
    document.getElementById('streak').textContent = `Streak: ${streak} 🔥`;
}

function checkAnswer(selectedIndex) {
    clearInterval(timer);
    const correct = questions[currentQuestion].correctAnswer === selectedIndex;
    if (correct) {
        score++;
        streak++;
        if (!isMuted) sound.correct.play();
    } else {
        streak = 0;
        if (!isMuted) sound.incorrect.play();
    }
    updateScore();
    updateStreak();
    currentQuestion++;
    if (currentQuestion < questions.length) {
        setTimeout(loadQuestion, 1000);
    } else {
        showResult();
    }
}

function showResult() {
    if (!isMuted) sound.complete.play();
    
    let levelMessage = '';
    if (currentDifficulty !== 'Hard') {
        levelMessage = `<p>Great job! Why not try a higher difficulty level next time?</p>`;
    }
    
    const resultHtml = `
        <h2>Quiz Completed!</h2>
        <p>Your score: ${score} out of ${questions.length}</p>
        <p>Highest streak: ${streak}</p>
        ${levelMessage}
        <button onclick="restartQuiz()">Restart Quiz</button>
        <button onclick="toggleSettingsModal()">Change Settings</button>
    `;
    
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('result').innerHTML = resultHtml;
    document.getElementById('result').style.display = 'block';
    document.getElementById('share-buttons').style.display = 'block';
    document.getElementById('result-customization').style.display = 'block';
    
    generateResultImage();
    
    const shareableLink = generateShareableLink();
    document.getElementById('twitter-share').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I scored ${score} out of ${questions.length} on the AI Quizmaster! Can you beat my score?`)}&url=${encodeURIComponent(shareableLink)}`;
    document.getElementById('facebook-share').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableLink)}`;
    document.getElementById('linkedin-share').href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareableLink)}&title=${encodeURIComponent('AI Quizmaster Challenge')}`;
}

function restartQuiz() {
    score = 0;
    streak = 0;
    currentQuestion = 0;
    document.getElementById('quiz').style.display = 'block';
    document.getElementById('result').innerHTML = '';
    document.getElementById('result').style.display = 'none';
    document.getElementById('share-buttons').style.display = 'none';
    document.getElementById('resultImage').style.display = 'none';
    document.getElementById('result-customization').style.display = 'none';
    
    updateScore();
    updateStreak();
    
    fetchQuestions();
}

function generateResultImage() {
    const canvas = document.getElementById('resultCanvas');
    const ctx = canvas.getContext('2d');
    const userName = document.getElementById('user-name').value;
    const borderColor = document.getElementById('border-color').value;
    const fillColor = document.getElementById('fill-color').value;
    const font = document.getElementById('font-select').value;
    const fontSize = document.getElementById('font-size').value;

    canvas.width = 600;
    canvas.height = 400;

    // Background
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Title
    ctx.fillStyle = '#4a90e2';
    ctx.font = `bold 30px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText('AI Quizmaster Results', canvas.width / 2, 50);

    // User name and result message
    ctx.font = `20px ${font}`;
    if (userName) {
        ctx.fillText(userName, canvas.width / 2, 100);
    }
    
    const scorePercentage = (score / questions.length) * 100;
    let resultMessage;
    if (scorePercentage < 50) {
        resultMessage = "There's room for improvement!";
    } else if (scorePercentage < 80) {
        resultMessage = "Good job!";
    } else {
        resultMessage = "Excellent work!";
    }
    ctx.fillText(resultMessage, canvas.width / 2, userName ? 130 : 100);

    // Score and streak
    ctx.fillStyle = '#333';
    ctx.font = `${fontSize}px ${font}`;
    ctx.fillText(`Score: ${score} out of ${questions.length}`, canvas.width / 2, 180);
    ctx.fillText(`Highest Streak: ${streak}`, canvas.width / 2, 220);

    // Date
    const date = new Date().toLocaleDateString();
    ctx.font = `18px ${font}`;
    ctx.fillText(`Date: ${date}`, canvas.width / 2, 260);

    // Footer
    ctx.fillStyle = '#4a90e2';
    ctx.font = `italic 20px ${font}`;
    ctx.fillText('Think you can beat this score?', canvas.width / 2, 350);

    const dataUrl = canvas.toDataURL('image/png');
    document.getElementById('resultImg').src = dataUrl;
    document.getElementById('resultImage').style.display = 'block';
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'AI_Quizmaster_Result.png';
    link.href = document.getElementById('resultImg').src;
    link.click();
}

function shareResultImage() {
    const canvas = document.getElementById('resultCanvas');
    canvas.toBlob(function(blob) {
        const file = new File([blob], "AI_Quizmaster_Result.png", { type: "image/png" });
        const filesArray = [file];
        
        const shareData = {
            title: 'AI Quizmaster Result',
            text: `I scored ${score} out of ${questions.length} on the AI Quizmaster! Can you beat my score?`,
            url: generateShareableLink(),
        };

        if (navigator.share && navigator.canShare({ files: filesArray })) {
            shareData.files = filesArray;
        }

        navigator.share(shareData)
            .then(() => console.log('Share was successful.'))
            .catch((error) => {
                console.log('Sharing failed', error);
                fallbackShare();
            });
    });
}

function fallbackShare() {
    const dummyTextArea = document.createElement('textarea');
    dummyTextArea.value = `I scored ${score} out of ${questions.length} on the AI Quizmaster! Can you beat my score? ${generateShareableLink()}`;
    document.body.appendChild(dummyTextArea);
    dummyTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(dummyTextArea);
    alert('Share link copied to clipboard! You can paste it wherever you want to share.');
}

function generateShareableLink() {
    const baseUrl = window.location.href.split('?')[0];
    return `${baseUrl}?score=${score}&total=${questions.length}`;
}

function shareOnTwitter() {
    const text = `I scored ${score} out of ${questions.length} on the AI Quizmaster! Can you beat my score?`;
    const url = encodeURIComponent(generateShareableLink());
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
}

function shareOnFacebook() {
    const text = `I just scored ${score} out of ${questions.length} on the AI Quizmaster! Can you beat my score?`;
    const url = encodeURIComponent(generateShareableLink());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`, '_blank');
}

function shareOnLinkedIn() {
    const text = `I achieved a score of ${score}/${questions.length} on the AI Quizmaster. Test your AI knowledge!`;
    const url = encodeURIComponent(generateShareableLink());
    const title = encodeURIComponent('AI Quizmaster Challenge');
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${encodeURIComponent(text)}`, '_blank');
}

function toggleCustomizationOptions() {
    const options = document.getElementById('customization-options');
    const toggleButton = document.getElementById('toggle-customization');
    if (options.style.display === 'none') {
        options.style.display = 'block';
        toggleButton.classList.add('active');
    } else {
        options.style.display = 'none';
        toggleButton.classList.remove('active');
    }
}

function regenerateImage() {
    generateResultImage();
}

function toggleInfoModal() {
    const modal = document.getElementById('info-modal');
    modal.style.display = 'block';
    modal.querySelector('.close-modal').focus();
}

function toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'block';
    modal.querySelector('.close-modal').focus();
}

function closeModals() {
    document.getElementById('info-modal').style.display = 'none';
    document.getElementById('settings-modal').style.display = 'none';
}

function applySettings() {
    currentCategory = document.getElementById('category-select').value;
    currentDifficulty = document.getElementById('difficulty-select').value;
    maxQuestions = parseInt(document.getElementById('question-count').value);
    document.getElementById('settings-modal').style.display = 'none';
    fetchQuestions();
}

function handleModalKeyboard(event) {
    if (event.key === 'Escape') {
        closeModals();
    }
}

function adjustCardHeight() {
    const cardContent = document.querySelector('.card-back .card-content');
    const questionText = document.getElementById('question-text');
    const options = document.getElementById('options');
    
    // Reset the height to auto to get the natural height
    cardContent.style.height = 'auto';
    
    // Get the total height of the content
    const totalHeight = questionText.offsetHeight + options.offsetHeight + 40; // 40px for padding
    
    // Set the minimum height to either the total content height or 300px, whichever is larger
    cardContent.style.minHeight = `${Math.max(totalHeight, 300)}px`;
}

document.getElementById('theme-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
});

document.getElementById('sound-toggle').addEventListener('click', function() {
    isMuted = !isMuted;
    this.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    document.body.classList.toggle('muted');
    Howler.mute(isMuted);
});

document.getElementById('info-toggle').addEventListener('click', toggleInfoModal);
document.getElementById('settings-toggle').addEventListener('click', toggleSettingsModal);
document.getElementById('apply-settings').addEventListener('click', applySettings);
document.getElementById('toggle-customization').addEventListener('click', toggleCustomizationOptions);

document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', closeModals);
});

document.getElementById('info-modal').addEventListener('keydown', handleModalKeyboard);
document.getElementById('settings-modal').addEventListener('keydown', handleModalKeyboard);

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModals();
    }
}

// Call this function when the page loads
window.onload = fetchQuestions;

// Call adjustCardHeight on window resize
window.addEventListener('resize', adjustCardHeight);
