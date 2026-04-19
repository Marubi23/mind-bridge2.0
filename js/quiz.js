/**
 * Wellness Assessment Quiz
 * Interactive mental health check-in with personalized results
 */

const quizQuestions = [
    {
        id: 1,
        question: "How often have you felt down, depressed, or hopeless in the past two weeks?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "depression"
    },
    {
        id: 2,
        question: "How often have you felt nervous, anxious, or on edge?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "anxiety"
    },
    {
        id: 3,
        question: "How often have you had trouble sleeping or sleeping too much?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "sleep"
    },
    {
        id: 4,
        question: "How often have you felt tired or had little energy?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "energy"
    },
    {
        id: 5,
        question: "How often have you had poor appetite or overeating?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "appetite"
    },
    {
        id: 6,
        question: "How often have you felt bad about yourself or that you're a failure?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "selfesteem"
    },
    {
        id: 7,
        question: "How often have you had trouble concentrating on things?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "focus"
    },
    {
        id: 8,
        question: "How often have you felt that you would be better off dead or hurt yourself?",
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
        category: "safety",
        critical: true
    }
];

let currentQuestion = 0;
let answers = {};

function startQuiz() {
    // Create modal or redirect to quiz page
    const quizModal = document.createElement('div');
    quizModal.className = 'quiz-modal';
    quizModal.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-header">
                <button class="quiz-close">&times;</button>
                <div class="quiz-progress">
                    <div class="progress-bar" id="quizProgress"></div>
                </div>
            </div>
            <div class="quiz-content">
                <div class="quiz-question" id="quizQuestion"></div>
                <div class="quiz-options" id="quizOptions"></div>
            </div>
            <div class="quiz-footer">
                <button class="btn btn-outline" id="prevQuestion" disabled>Previous</button>
                <button class="btn btn-primary" id="nextQuestion">Next</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(quizModal);
    quizModal.classList.add('active');
    
    // Add close functionality
    quizModal.querySelector('.quiz-close').addEventListener('click', () => {
        quizModal.remove();
    });
    
    // Load first question
    loadQuestion();
    
    // Add event listeners
    document.getElementById('prevQuestion').addEventListener('click', previousQuestion);
    document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
}

function loadQuestion() {
    const question = quizQuestions[currentQuestion];
    const questionEl = document.getElementById('quizQuestion');
    const optionsEl = document.getElementById('quizOptions');
    const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
    
    document.getElementById('quizProgress').style.width = `${progress}%`;
    
    questionEl.innerHTML = `
        <span class="question-number">Question ${currentQuestion + 1} of ${quizQuestions.length}</span>
        <h3>${question.question}</h3>
    `;
    
    optionsEl.innerHTML = question.options.map((option, index) => `
        <label class="quiz-option ${answers[currentQuestion] === index ? 'selected' : ''}">
            <input type="radio" name="quiz" value="${index}" ${answers[currentQuestion] === index ? 'checked' : ''}>
            <span class="option-text">${option}</span>
            <span class="option-check"></span>
        </label>
    `).join('');
    
    // Add change event listeners
    document.querySelectorAll('input[name="quiz"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            answers[currentQuestion] = parseInt(e.target.value);
            updateNavigation();
        });
    });
    
    updateNavigation();
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevQuestion');
    const nextBtn = document.getElementById('nextQuestion');
    
    prevBtn.disabled = currentQuestion === 0;
    
    if (currentQuestion === quizQuestions.length - 1) {
        nextBtn.textContent = 'See Results';
    } else {
        nextBtn.textContent = 'Next';
    }
}

function previousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
    }
}

function nextQuestion() {
    if (answers[currentQuestion] === undefined) {
        showNotification('Please select an answer before continuing', 'warning');
        return;
    }
    
    if (currentQuestion === quizQuestions.length - 1) {
        showResults();
    } else {
        currentQuestion++;
        loadQuestion();
    }
}

function showResults() {
    // Calculate scores
    let totalScore = 0;
    let categoryScores = {
        depression: 0,
        anxiety: 0,
        sleep: 0,
        energy: 0,
        appetite: 0,
        selfesteem: 0,
        focus: 0
    };
    
    quizQuestions.forEach((q, i) => {
        const score = answers[i] || 0;
        totalScore += score;
        if (categoryScores[q.category] !== undefined) {
            categoryScores[q.category] += score;
        }
    });
    
    // Determine severity
    let severity = '';
    let message = '';
    let recommendations = [];
    
    if (totalScore <= 4) {
        severity = 'Minimal';
        message = 'You seem to be doing well! Keep taking care of your mental health.';
        recommendations = [
            'Practice daily mindfulness',
            'Maintain social connections',
            'Exercise regularly',
            'Get enough sleep'
        ];
    } else if (totalScore <= 8) {
        severity = 'Mild';
        message = 'You may be experiencing some mild symptoms. Consider talking to someone you trust.';
        recommendations = [
            'Talk to a friend or family member',
            'Try journaling your thoughts',
            'Practice deep breathing exercises',
            'Consider our self-help resources'
        ];
    } else if (totalScore <= 12) {
        severity = 'Moderate';
        message = 'Your responses suggest moderate symptoms. Speaking with a therapist could be helpful.';
        recommendations = [
            'Book a session with one of our therapists',
            'Join a support group',
            'Try our guided meditation resources',
            'Practice stress management techniques'
        ];
    } else {
        severity = 'Severe';
        message = 'Your responses indicate significant distress. We strongly encourage you to speak with a mental health professional.';
        recommendations = [
            'Please book an appointment with a therapist today',
            'Call our crisis helpline for immediate support',
            'You don\'t have to go through this alone',
            'Emergency support is available 24/7'
        ];
    }
    
    // Check for critical responses
    const criticalQuestion = quizQuestions.find(q => q.critical);
    const criticalAnswer = answers[quizQuestions.findIndex(q => q.critical)];
    
    if (criticalAnswer && criticalAnswer >= 3) {
        showEmergencyWarning();
        return;
    }
    
    // Show results modal
    const resultsModal = document.createElement('div');
    resultsModal.className = 'quiz-modal results-modal';
    resultsModal.innerHTML = `
        <div class="quiz-container results-container">
            <div class="quiz-header">
                <button class="quiz-close">&times;</button>
            </div>
            <div class="results-content">
                <div class="results-icon ${severity.toLowerCase()}">
                    <i class="fas ${severity === 'Minimal' ? 'fa-smile' : severity === 'Mild' ? 'fa-meh' : severity === 'Moderate' ? 'fa-frown' : 'fa-sad-tear'}"></i>
                </div>
                <h2>Your Wellness Check Results</h2>
                <div class="severity-badge ${severity.toLowerCase()}">${severity} Symptoms</div>
                <p class="results-message">${message}</p>
                
                <div class="recommendations">
                    <h3>Recommendations for You</h3>
                    <ul>
                        ${recommendations.map(rec => `<li><i class="fas fa-check-circle"></i> ${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="results-actions">
                    <a href="therapists.html" class="btn btn-primary">
                        <i class="fas fa-calendar-alt"></i>
                        Book a Session
                    </a>
                    <a href="resources.html" class="btn btn-outline">
                        <i class="fas fa-book-open"></i>
                        Explore Resources
                    </a>
                </div>
                
                <p class="disclaimer">This is not a medical diagnosis. For professional advice, please consult a licensed therapist.</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(resultsModal);
    resultsModal.classList.add('active');
    
    resultsModal.querySelector('.quiz-close').addEventListener('click', () => {
        resultsModal.remove();
        document.querySelector('.quiz-modal')?.remove();
    });
}

function showEmergencyWarning() {
    const emergencyModal = document.createElement('div');
    emergencyModal.className = 'quiz-modal emergency-results';
    emergencyModal.innerHTML = `
        <div class="quiz-container emergency-container">
            <div class="emergency-content">
                <div class="emergency-icon">
                    <i class="fas fa-heartbeat"></i>
                </div>
                <h2>Your Well-being Matters</h2>
                <p>Your responses suggest you may be going through a difficult time. Please reach out for support — you don't have to face this alone.</p>
                
                <div class="emergency-helplines">
                    <h3>Immediate Support Available</h3>
                    <div class="helpline-card">
                        <i class="fas fa-phone-alt"></i>
                        <div>
                            <strong>Kenya Red Cross</strong>
                            <a href="tel:+254119999999">Call 1199</a>
                        </div>
                    </div>
                    <div class="helpline-card">
                        <i class="fas fa-comments"></i>
                        <div>
                            <strong>Befrienders Kenya</strong>
                            <a href="tel:+254722178177">+254 722 178 177</a>
                        </div>
                    </div>
                    <div class="helpline-card">
                        <i class="fas fa-hand-holding-heart"></i>
                        <div>
                            <strong>Talk to a Therapist Now</strong>
                            <a href="therapists.html">Book emergency session →</a>
                        </div>
                    </div>
                </div>
                
                <div class="emergency-actions">
                    <button class="btn btn-primary" id="closeEmergencyModal">I Understand</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(emergencyModal);
    emergencyModal.classList.add('active');
    
    document.getElementById('closeEmergencyModal').addEventListener('click', () => {
        emergencyModal.remove();
        document.querySelector('.quiz-modal')?.remove();
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }, 100);
}

// Initialize quiz button
document.addEventListener('DOMContentLoaded', () => {
    const startQuizBtn = document.getElementById('startQuizBtn');
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', startQuiz);
    }
});