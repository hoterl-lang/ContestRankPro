// public/rankings.js

document.addEventListener('DOMContentLoaded', () => {
    const rankingForm = document.getElementById('rankingForm');
    const rankingTableBody = document.getElementById('rankingTableBody');
    const rankingsOutput = document.getElementById('rankings-output');
    const rankingContestName = document.getElementById('rankingContestName');
    const noResults = document.getElementById('noResults');

    rankingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const contestCode = document.getElementById('contestCodeInput').value.trim();
        
        const response = await fetch(`/api/rankings/${contestCode}`);
        const data = await response.json();

        rankingTableBody.innerHTML = '';
        noResults.classList.add('hidden');
        rankingsOutput.classList.remove('hidden');

        if (data.success) {
            rankingContestName.textContent = `Rankings for: ${data.contestName}`;

            if (data.rankings.length === 0) {
                rankingTableBody.innerHTML = '';
                noResults.textContent = `No results have been submitted yet for ${data.contestName}.`;
                noResults.classList.remove('hidden');
                return;
            }

            let currentRank = 1;
            let previousScore = null;

            data.rankings.forEach((result, index) => {
                if (previousScore === null || result.total_score < previousScore) {
                    currentRank = index + 1;
                }
                previousScore = result.total_score;

                const row = rankingTableBody.insertRow();

                row.insertCell().textContent = currentRank; 
                row.insertCell().textContent = result.school_name;
                row.insertCell().textContent = result.total_score;
                
                if (currentRank === 1) {
                    row.classList.add('top-rank');
                }
            });

        } else {
            rankingContestName.textContent = "Error";
            noResults.textContent = data.message || "Could not retrieve rankings.";
            noResults.classList.remove('hidden');
        }
    });
});

