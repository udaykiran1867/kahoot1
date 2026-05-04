document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.input-section');
    const fileInput = document.getElementById('pdf-upload');
    const customFileInput = document.querySelector('.custom-file-input');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    const continueBtn = document.getElementById('continue-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`${target}-section`).classList.add('active');
        });
    });

    // File Input Label Update
    fileInput.addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
        customFileInput.textContent = `File: ${fileName}`;
    });

    // Submit Action
    submitBtn.addEventListener('click', async () => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const title = document.getElementById('quiz-title').value;
        const count = document.getElementById('num-questions').value;
        const difficulty = document.getElementById('difficulty').value;

        if (!title) {
            alert('Please enter a quiz title');
            return;
        }

        submitBtn.innerHTML = '<span class="icon">⌛</span> Generating...';
        submitBtn.disabled = true;

        try {
            let result;
            if (activeTab === 'pdf') {
                const file = fileInput.files[0];
                if (!file) {
                    alert('Please upload a PDF');
                    submitBtn.innerHTML = '<span class="icon">✨</span> Submit';
                    submitBtn.disabled = false;
                    return;
                }
                
                const formData = new FormData();
                formData.append('file', file);
                
                // First upload
                const uploadRes = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                
                // Then generate
                const genRes = await fetch('/generate-mcq', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        title, 
                        count, 
                        difficulty 
                    })
                });
                result = await genRes.json();
            } else {
                const text = document.getElementById('text-input').value;
                if (!text) {
                    alert('Please enter some text');
                    submitBtn.innerHTML = '<span class="icon">✨</span> Submit';
                    submitBtn.disabled = false;
                    return;
                }
                
                const genRes = await fetch('/generate-mcq', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, title, count, difficulty })
                });
                result = await genRes.json();
            }

            statusMessage.innerHTML = `<p>Generated ${count} questions successfully</p>`;
            statusMessage.classList.remove('hide');
            continueBtn.disabled = false;
            regenerateBtn.disabled = false;

            if (result && result.mcqs) {
                renderQuestions(result.mcqs);
            }

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during generation.');
        } finally {
            submitBtn.innerHTML = '<span class="icon">✨</span> Submit';
            submitBtn.disabled = false;
        }
    });

    function renderQuestions(mcqsData) {
        const container = document.getElementById('questions-container');
        const list = document.getElementById('questions-list');
        
        list.innerHTML = '';
        container.classList.remove('hide');

        // mcqsData might be an object like {"1": {...}, "2": {...}} or an array
        let questions = [];
        if (Array.isArray(mcqsData)) {
            questions = mcqsData;
        } else if (typeof mcqsData === 'object') {
            questions = Object.values(mcqsData);
        }

        questions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'question-card';
            
            // Handle different question property names (mcq, question)
            const questionText = q.mcq || q.question;
            const options = q.options || [];
            const correctAnswer = q.correct || q.answer;

            // Options might be an object {a: '...', b: '...'} or array
            let optionsHtml = '';
            if (Array.isArray(options)) {
                optionsHtml = options.map(opt => `
                    <button class="option-btn ${opt === correctAnswer ? 'correct' : ''}">
                        ${opt}
                    </button>
                `).join('');
            } else {
                optionsHtml = Object.entries(options).map(([key, value]) => `
                    <button class="option-btn ${value === correctAnswer || key === correctAnswer ? 'correct' : ''}">
                        ${value}
                    </button>
                `).join('');
            }

            card.innerHTML = `
                <div class="question-text">${index + 1}. ${questionText}</div>
                <div class="options-grid">
                    ${optionsHtml}
                </div>
            `;
            list.appendChild(card);
        });
        
        // Scroll to question section
        container.scrollIntoView({ behavior: 'smooth' });
    }
});
