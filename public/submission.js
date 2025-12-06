// public/submission.js

document.addEventListener('DOMContentLoaded', () => {
    const codeForm = document.getElementById('codeForm');
    const submissionArea = document.getElementById('submissionArea');
    const fileForm = document.getElementById('fileForm');
    
    let currentContestId = null; 

    // Handle code verification
    if (codeForm) { 
        codeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submissionCode = document.getElementById('submissionCode').value.trim();
    
            const response = await fetch('/api/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionCode })
            });
            
            if (!response.ok) {
                alert(`Verification failed due to a server error. Check Termux console.`);
                return;
            }
    
            const data = await response.json();
    
            if (data.success) {
                currentContestId = data.contestId; 
                document.getElementById('contestTitle').textContent = data.contestName;
                
                if (codeForm) codeForm.classList.add('hidden');
                if (submissionArea) submissionArea.classList.remove('hidden');
                
                alert(`Starting submission for ${data.contestName}`);
            } else {
                alert(data.message);
            }
        });
    }

    
    // Handle file submission (with client-side validation)
    if (fileForm) { 
        fileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Client-Side School Name Validation
            const schoolName = document.getElementById('schoolName').value.trim();
            if (schoolName.length < 2) {
                alert('School/Team Name must be entered.');
                return; 
            }

            const formData = new FormData(fileForm);
            
            if (currentContestId) {
                formData.append('contestId', currentContestId);
            }

            const response = await fetch('/api/submit-results', {
                method: 'POST',
                body: formData
            });
    
            const data = await response.json();
            
            if (data.success) {
                alert('Submission successful: ' + data.message);
                fileForm.reset(); 
            } else {
                alert('Submission failed: ' + data.message);
            }
        });
    }
});

