// public/index.js

document.addEventListener('DOMContentLoaded', () => {
    const setupForm = document.getElementById('setupForm');
    const proposalArea = document.getElementById('proposalArea');
    const finalSetupArea = document.getElementById('finalSetupArea');
    const confirmSetupBtn = document.getElementById('confirmSetupBtn');
    
    // Simulate AI analysis and proposal generation
    if (setupForm) {
        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const response = await fetch('/api/setup-contest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: document.getElementById('contestDesc').value })
            });

            const data = await response.json();

            if (data.success) {
                const proposal = data.proposal;

                document.getElementById('propContestName').textContent = proposal.name;
                document.getElementById('totalScore').textContent = proposal.total_max_score;
                document.getElementById('rankingRule').textContent = proposal.ranking_rule;

                const tbody = document.getElementById('proposalTableBody');
                tbody.innerHTML = ''; 

                proposal.subjects.forEach(subject => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = subject.name;
                    row.insertCell().textContent = subject.max_score;
                    row.insertCell().textContent = (subject.max_score / proposal.total_max_score * 100).toFixed(0) + '%';
                });

                document.getElementById('setupFormArea').classList.add('hidden');
                proposalArea.classList.remove('hidden');
            } else {
                alert('AI setup failed: ' + data.message);
            }
        });
    }

    // Confirm setup and display code
    if (confirmSetupBtn) {
        confirmSetupBtn.addEventListener('click', async () => {
             const response = await fetch('/api/setup-contest', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: '' })
            });

            const data = await response.json();
            
            if (data.success && data.submissionCode) {
                document.getElementById('contestName').textContent = data.proposal.name;
                document.getElementById('submissionCode').textContent = data.submissionCode;

                proposalArea.classList.add('hidden');
                finalSetupArea.classList.remove('hidden');
            } else {
                 alert('Failed to retrieve final submission code.');
            }
        });
    }

    // Host Reset System Handler
    const resetSystemBtn = document.getElementById('resetSystemBtn');
    if (resetSystemBtn) {
        resetSystemBtn.addEventListener('click', async () => {
            if (!confirm('WARNING: Are you sure you want to delete ALL contest data and clear the database? This cannot be undone.')) {
                return;
            }

            const response = await fetch('/api/reset-system', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                alert('System successfully reset! All data cleared. Please refresh the page to start a new contest.');
                location.reload();
            } else {
                alert('System reset failed: ' + data.message);
            }
        });
    }
});

