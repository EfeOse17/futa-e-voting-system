console.log('Election Details JavaScript is running!');

// ========================================
// ELECTION DETAILS PAGE
// ========================================

const API_URL = 'http://https://futa-e-voting-system.onrender.com/api';

const studentToken = sessionStorage.getItem('studentToken');

// Get the election ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const electionId = urlParams.get('election_id');

// Get HTML elements
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const electionDetails = document.getElementById('electionDetails');

const electionTitle = document.getElementById('electionTitle');
const electionStatus = document.getElementById('electionStatus');

const electionStart = document.getElementById('electionStart');
const electionEnd = document.getElementById('electionEnd');

const candidatesContainer = document.getElementById('candidatesContainer');
const candidateCount = document.getElementById('candidateCount');

const votingMessage = document.getElementById('votingMessage');
const proceedToVote = document.getElementById('proceedToVote');

// Vote confirmation elements
const voteConfirmation = document.getElementById('voteConfirmation');
const selectedCandidateName = document.getElementById('selectedCandidateName');
const cancelVote = document.getElementById('cancelVote');
const confirmVote = document.getElementById('confirmVote');
const voteSubmissionMessage = document.getElementById('voteSubmissionMessage');

// Selected candidate
let selectedCandidate = null;

// ========================================
// CHECK STUDENT AUTHENTICATION
// ========================================

if (!studentToken) {
    window.location.href = 'login.html';
}


// ========================================
// FORMAT ELECTION DATES
// ========================================

function formatElectionDate(date) {

    if (!date) {
        return 'Not scheduled';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return 'Not scheduled';
    }

    return parsedDate.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


// ========================================
// DISPLAY ERROR MESSAGE
// ========================================

function showError(message) {

    loadingMessage.hidden = true;
    electionDetails.hidden = true;

    errorMessage.textContent = message;
    errorMessage.hidden = false;
}


// ========================================
// LOAD ELECTION DETAILS
// ========================================

async function loadElectionDetails() {

    try {

        // Validate election ID
        const parsedElectionId = Number(electionId);

        if (
            !electionId ||
            !Number.isSafeInteger(parsedElectionId) ||
            parsedElectionId <= 0
        ) {
            showError('Invalid election information. Please return to the dashboard.');
            return;
        }


        // ========================================
        // FETCH CANDIDATES AND ELECTION TITLE
        // ========================================

        const candidateResponse = await fetch(
            `${API_URL}/student/candidates/election/${parsedElectionId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${studentToken}`
                }
            }
        );

        const candidateData = await candidateResponse.json();


        if (
            candidateResponse.status === 401 ||
            candidateResponse.status === 403
        ) {
            sessionStorage.removeItem('studentToken');
            sessionStorage.removeItem('studentMatricNumber');

            window.location.href = 'login.html';
            return;
        }

        if (!candidateResponse.ok) {
            throw new Error(
                candidateData.message || 'Unable to retrieve election details.'
            );
        }


        // ========================================
        // FETCH STUDENT'S ELECTION PARTICIPATION
        // ========================================

        const electionResponse = await fetch(
            `${API_URL}/student/elections`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${studentToken}`
                }
            }
        );

        const electionData = await electionResponse.json();

        if (
            electionResponse.status === 401 ||
            electionResponse.status === 403
        ) {
            sessionStorage.removeItem('studentToken');
            sessionStorage.removeItem('studentMatricNumber');

            window.location.href = 'login.html';
            return;
        }

        if (!electionResponse.ok) {
            throw new Error(
                electionData.message || 'Unable to retrieve voting information.'
            );
        }


        // Find the selected election in the student's election list
        const selectedElection = (electionData.elections || []).find(
            election =>
                Number(election.election_id) === parsedElectionId
        );

        if (!selectedElection) {
            throw new Error('Election information could not be found.');
        }


        // ========================================
        // DISPLAY ELECTION INFORMATION
        // ========================================

        const election = candidateData.election;
        electionTitle.textContent = election.election_title;

        electionStart.textContent = formatElectionDate(
            selectedElection.start_date
        );

        electionEnd.textContent = formatElectionDate(
            selectedElection.end_date
        );


        // Display election status
        const status = selectedElection.election_status;
        electionStatus.textContent = status;

        electionStatus.className = 'election-status';

        electionStatus.classList.add(
            `status-${String(status).toLowerCase()}`
        );

        // ========================================
        // DISPLAY CANDIDATES
        // ========================================

        const hasVoted = selectedElection.has_voted;

        const now = Date.now();

        const startDate = selectedElection.start_date
            ? new Date(selectedElection.start_date).getTime()
            : null;

        const endDate = selectedElection.end_date
            ? new Date(selectedElection.end_date).getTime()
            : null;

            // Check whether the election is currently open
            const canVote =
            String(status).toLowerCase() === 'ongoing' &&
            !hasVoted &&
            (startDate === null || (Number.isFinite(startDate) && startDate <= now)) &&
            (endDate === null || (Number.isFinite(endDate) && endDate >= now));

            console.log('VOTING DEBUG:', {
                status,
                hasVoted,
                startDate,
                endDate,
                canVote
            });

            const candidates = candidateData.candidates || [];
            
            console.log('Candidates retrieved:', candidates);
            console.log('Number of candidates:', candidates.length);

            candidatesContainer.replaceChildren();

            candidateCount.textContent =
                `${candidates.length} Candidate${candidates.length === 1 ? '' : 's'}`;

            selectedCandidate = null;

            proceedToVote.hidden = true;
            voteConfirmation.hidden = true;


            if (candidates.length === 0) {
                const emptyMessage = document.createElement('p');
                emptyMessage.className = 'empty-candidates';
                emptyMessage.textContent =
                    'There are currently no candidates registered for this election.';
                candidatesContainer.appendChild(emptyMessage);
            } else {

                candidates.forEach((candidate, index) => {
                    const card = document.createElement('div');
                    card.className = 'candidate-card';

                // Candidate avatar
                const avatar = document.createElement('div');
                avatar.className = 'candidate-avatar';
                const initials = candidate.candidate_name
                    .trim()
                    .split(/\s+/)
                    .map(name => name.charAt(0))
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                avatar.textContent = initials;


                // Candidate information
                const information = document.createElement('div');
                information.className = 'candidate-info';

                const name = document.createElement('h3');

                name.className = 'candidate-name';
                name.textContent = candidate.candidate_name;

                const number = document.createElement('p');

                number.className = 'candidate-number';
                number.textContent = `Candidate ${index + 1}`;

                information.appendChild(name);
                information.appendChild(number);
                card.appendChild(avatar);
                card.appendChild(information);


                // Candidate selection button
                if (canVote) {

                    const selectButton = document.createElement('button');
                    selectButton.type = 'button';
                    selectButton.className = 'select-candidate-button';
                    selectButton.textContent = 'Select Candidate';

                    selectButton.addEventListener('click', () => {

                        selectedCandidate = candidate;

                    // Remove previous selections
                    document.querySelectorAll('.candidate-card').forEach(
                        candidateCard => {
                            candidateCard.classList.remove('selected');
                            const button = candidateCard.querySelector(
                                '.select-candidate-button'
                            );
                            if (button) {
                                button.textContent = 'Select Candidate';
                            }
                        }
                );

                    // Highlight selected candidate
                    card.classList.add('selected');
                    selectButton.textContent = 'Selected ✓';

                    // Display review button
                    proceedToVote.hidden = false;
            });
                card.appendChild(selectButton);
            }
                candidatesContainer.appendChild(card);
        });
}


        // ========================================
        // DISPLAY VOTING INFORMATION
        // ========================================
        proceedToVote.hidden = true;

        if (hasVoted) {

            votingMessage.textContent =
                'You have already participated in this election. Thank you for voting.';

        } else if (
            status.toLowerCase() === 'ongoing' ||
            status.toLowerCase() === 'active'
        ) {

            votingMessage.textContent =
                'This election is currently open. The voting interface will be connected in the next development stage.';

        } else if (status.toLowerCase() === 'upcoming') {

            votingMessage.textContent =
                'This election has not started yet. You will be able to vote when the election opens.';

        } else {

            votingMessage.textContent =
                'This election is currently closed. Voting is no longer available.';

        }


        // Display the completed page
        loadingMessage.hidden = true;
        errorMessage.hidden = true;
        electionDetails.hidden = false;


    } catch (error) {

        console.error('Election Details Error:', error);

        showError(
            error.message || 'Something went wrong while loading this election.'
        );

    }

}

// ========================================
// REVIEW SELECTED CANDIDATE
// ========================================
proceedToVote.addEventListener('click', () => {

    if (!selectedCandidate) {
        return;
    }

    selectedCandidateName.textContent =
        selectedCandidate.candidate_name;

    voteConfirmation.hidden = false;

    voteConfirmation.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

});


// ========================================
// CANCEL VOTE SELECTION
// ========================================
cancelVote.addEventListener('click', () => {

    selectedCandidate = null;
    voteConfirmation.hidden = true;
    proceedToVote.hidden = true;
    voteSubmissionMessage.textContent = '';

    document.querySelectorAll('.candidate-card').forEach(card => {

        card.classList.remove('selected');
        const button = card.querySelector(
            '.select-candidate-button'
        );

        if (button) {
            button.textContent = 'Select Candidate';
        }

    });

});


// ========================================
// CONFIRM AND CAST VOTE
// ========================================
confirmVote.addEventListener('click', async () => {

    if (!selectedCandidate || confirmVote.disabled) {
        return;
    }

    let voteSuccessful = false;

    try {

        // Prevent multiple submissions
        confirmVote.disabled = true;
        cancelVote.disabled = true;

        confirmVote.textContent = 'Submitting Vote...';

        voteSubmissionMessage.textContent =
            'Please wait while your vote is being submitted.';

        // Prepare vote information
        const voteData = {
            election_id: Number(electionId),
            candidate_id: Number(selectedCandidate.candidate_id)
        };

        // Send vote to backend
        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify(voteData)
        });

        const data = await response.json();

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {

            sessionStorage.removeItem('studentToken');
            sessionStorage.removeItem('studentMatricNumber');

            window.location.href = 'login.html';
            return;
        }

        // Handle unsuccessful submissions
        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to submit your vote.'
            );
        }

        // Vote successfully submitted
        voteSuccessful = true;

        voteSubmissionMessage.textContent =
            data.message || 'Your vote has been successfully recorded!';

        voteSubmissionMessage.style.color = '#198754';

        // Hide confirmation interface
        voteConfirmation.hidden = true;
        proceedToVote.hidden = true;

        // Update voting information
        votingMessage.textContent =
            'Your vote has been successfully submitted. Thank you for participating!';

        // Prevent further candidate selection
        document.querySelectorAll('.select-candidate-button').forEach(button => {
            button.disabled = true;
        });

        selectedCandidate = null;

    } catch (error) {

        console.error('Vote Submission Error:', error);

        voteSubmissionMessage.textContent = error.message;
        voteSubmissionMessage.style.color = '#dc3545';

    } finally {

        if (!voteSuccessful) {

            confirmVote.disabled = false;
            cancelVote.disabled = false;

            confirmVote.textContent = 'Confirm and Cast Vote';

        }

    }

});


// ========================================
// INITIALIZE PAGE
// ========================================

if (studentToken) {
    loadElectionDetails();
}