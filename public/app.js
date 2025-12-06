// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    const setupForm = document.getElementById('setupForm');
    const aiOutput = document.getElementById('aiOutput');
    const proposalText = document.getElementById('proposalText');
    const confirmBtn = document.getElementById('confirmBtn');

    setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const contestDesc = document.getElementById('contestDesc').value;

        // Send the description to the Node.js server
        const response = await fetch('/api/setup-contest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contestDesc })
        });

        const data = await response.json();

        if (data.success) {
            // Display the AI's proposal
            const proposal = data.proposal;
            
            let output = `Contest Name: ${proposal.ranking_rule}\n`;
            output += `Total Max Score: ${proposal.total_max_score}\n\n`;
            output += `--- Subject Breakdown ---\n`;
            
            proposal.subjects.forEach(sub => {
                output += `${sub.name}:\n`;
                output += `  Max Score: ${sub.max_score}\n`;
                output += `  Weight: ${sub.weight}\n\n`;
            });

            proposalText.textContent = output;
            aiOutput.classList.remove('hidden'); 
            confirmBtn.disabled = false;
            
        } else {
            alert('AI analysis failed. Please try again.');
        }
    });
    
    // Placeholder for Confirmation action
    confirmBtn.addEventListener('click', () => {
        alert('Contest confirmed! Generating Secret Submission Codes...');
    });
});

