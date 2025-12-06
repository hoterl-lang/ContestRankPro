// public/tally.js

document.addEventListener('DOMContentLoaded', () => {
    const tallyForm = document.getElementById('tallyForm');
    const tallyTableBody = document.getElementById('tallyTableBody');
    const tallyOutput = document.getElementById('tally-output');
    const tallyContestName = document.getElementById('tallyContestName');
    const noTallyResults = document.getElementById('noTallyResults');

    tallyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const contestCode = document.getElementById('tallyCodeInput').value.trim();
        
        const response = await fetch(`/api/tally/${contestCode}`);
        const data = await response.json();

        tallyTableBody.innerHTML = '';
        noTallyResults.classList.add('hidden');
        tallyOutput.classList.remove('hidden');

        if (data.success) {
            tallyContestName.textContent = `Raw Tally for: ${data.contestName}`;

            if (data.tallyData.length === 0) {
                noTallyResults.textContent = `No submissions recorded yet for ${data.contestName}.`;
                noTallyResults.classList.remove('hidden');
                return;
            }

            data.tallyData.forEach(result => {
                const row = tallyTableBody.insertRow();
                row.insertCell().textContent = result.school_name;
                row.insertCell().textContent = result.total_score;
                row.insertCell().textContent = new Date(result.submission_time).toLocaleString();
            });

        } else {
            tallyContestName.textContent = "Error";
            noTallyResults.textContent = data.message || "Could not retrieve tally data.";
            noTallyResults.classList.remove('hidden');
        }
    });
});

