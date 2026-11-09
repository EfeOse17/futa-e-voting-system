// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

// Retrieve administrator token
const adminToken = sessionStorage.getItem('adminToken');

// Redirect if no token exists
if (!adminToken) {
    window.location.href = 'login.html';
}


// Verify administrator access
async function verifyAdminAccess() {
    try {
        const response = await fetch(
            'https://futa-e-voting-system.vercel.app/api/admins/dashboard',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );

        if (!response.ok) {
            sessionStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminDetails');

            window.location.href = 'login.html';
            return;
        }

        await loadElections();

    } catch (error) {
        console.error('Authentication error:', error);
    }
}


// ==========================================
// DOM ELEMENTS
// ==========================================

// Sidebar
const menuToggle = document.getElementById('menuToggle');
const sidebarNav = document.querySelector('.sidebar-nav');
const logoutButton = document.getElementById('logoutButton');

// Create Election Modal
const createElectionBtn = document.getElementById('createElectionBtn');
const createElectionModal = document.getElementById('createElectionModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const createElectionForm = document.getElementById('createElectionForm');
const saveElectionBtn = document.getElementById('saveElectionBtn');

// Edit Election Modal
const editElectionModal = document.getElementById('editElectionModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
const editElectionForm = document.getElementById('editElectionForm');
const updateElectionBtn = document.getElementById('updateElectionBtn');


// ==========================================
// DATE FORMATTING
// ==========================================

// Format election dates for table display
function formatElectionDate(date) {
    if (!date) {
        return 'Not scheduled';
    }

    return new Date(date).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


// Format dates for datetime-local inputs
function formatDateTimeForInput(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(dateValue);
    const timezoneOffset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - timezoneOffset)
        .toISOString()
        .slice(0, 16);
}


// ==========================================
// LOAD ALL ELECTIONS
// ==========================================

async function loadElections() {

    const tableBody = document.getElementById('electionsTableBody');

    try {

        const response = await fetch(
            'https://futa-e-voting-system.vercel.app/api/elections',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to retrieve elections.');
        }

        const data = await response.json();

        tableBody.replaceChildren();

        const elections = data.elections;


        // Update election statistics
        document.getElementById('totalElections').textContent =
            elections.length;

        document.getElementById('upcomingElections').textContent =
            elections.filter(e => e.election_status === 'upcoming').length;

        document.getElementById('ongoingElections').textContent =
            elections.filter(e => e.election_status === 'ongoing').length;

        document.getElementById('completedElections').textContent =
            elections.filter(e => e.election_status === 'completed').length;


        // Handle empty election list
        if (elections.length === 0) {

            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 5;
            cell.textContent = 'No elections have been created yet.';

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }


        // Display elections
        elections.forEach(election => {

            const row = document.createElement('tr');


            // Election title
            const titleCell = document.createElement('td');
            titleCell.textContent = election.election_title;


            // Start date
            const startDateCell = document.createElement('td');

            startDateCell.textContent =
                formatElectionDate(election.start_date);


            // End date
            const endDateCell = document.createElement('td');

            endDateCell.textContent =
                formatElectionDate(election.end_date);


            // Election status
            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');

            statusBadge.className =
                `status-badge status-${election.election_status}`;

            statusBadge.textContent = election.election_status;

            statusCell.appendChild(statusBadge);


            // Actions
            const actionsCell = document.createElement('td');

            if (election.election_status !== 'completed') {

                const actionContainer = document.createElement('div');

                actionContainer.className = 'action-buttons';


                // ==================================
                // UPCOMING ELECTION ACTIONS
                // ==================================

                if (election.election_status === 'upcoming') {


                    // Edit Button
                    const editButton = document.createElement('button');

                    editButton.className = 'edit-btn';
                    editButton.textContent = 'Edit';
                    editButton.type = 'button';


                    editButton.addEventListener('click', () => {

                        document.getElementById('editElectionId').value =
                            election.election_id;

                        document.getElementById('editElectionTitle').value =
                            election.election_title;

                        document.getElementById('editStartDate').value =
                            formatDateTimeForInput(election.start_date);

                        document.getElementById('editEndDate').value =
                            formatDateTimeForInput(election.end_date);

                        editElectionModal.classList.add('show');

                    });


                    // Delete Button
                    const deleteButton = document.createElement('button');

                    deleteButton.className = 'delete-btn';
                    deleteButton.textContent = 'Delete';
                    deleteButton.type = 'button';


                    deleteButton.addEventListener('click', async () => {

                        const confirmDelete = confirm(
                            `Are you sure you want to delete "${election.election_title}"?`
                        );

                        if (!confirmDelete) {
                            return;
                        }

                        try {

                            deleteButton.disabled = true;
                            deleteButton.textContent = 'Deleting...';

                            const response = await fetch(
                                `https://futa-e-voting-system.vercel.app/api/elections/${election.election_id}`,
                                {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${adminToken}`
                                    }
                                }
                            );

                            const data = await response.json();

                            if (!response.ok) {
                                throw new Error(
                                    data.message || 'Failed to delete election.'
                                );
                            }

                            alert(
                                data.message || 'Election deleted successfully!'
                            );

                            await loadElections();

                        } catch (error) {

                            console.error('Election deletion error:', error);

                            alert(error.message);

                            deleteButton.disabled = false;
                            deleteButton.textContent = 'Delete';

                        }

                    });


                    actionContainer.append(editButton, deleteButton);


                    // Start Button
                    const startButton = document.createElement('button');

                    startButton.className = 'start-btn';
                    startButton.textContent = 'Start';
                    startButton.type = 'button';


                    startButton.addEventListener('click', () => {

                        updateElectionStatus(
                            election.election_id,
                            'ongoing',
                            election.election_title
                        );

                    });

                    actionContainer.appendChild(startButton);

                }


                // ==================================
                // COMPLETE ELECTION ACTION
                // ==================================

                const completeButton = document.createElement('button');

                completeButton.className = 'complete-btn';
                completeButton.textContent = 'Complete';
                completeButton.type = 'button';


                completeButton.addEventListener('click', () => {

                    updateElectionStatus(
                        election.election_id,
                        'completed',
                        election.election_title
                    );

                });

                actionContainer.appendChild(completeButton);

                actionsCell.appendChild(actionContainer);

            } else {

                actionsCell.textContent = '—';

            }


            row.append(
                titleCell,
                startDateCell,
                endDateCell,
                statusCell,
                actionsCell
            );

            tableBody.appendChild(row);

        });

    } catch (error) {

        console.error('Election loading error:', error);

        tableBody.replaceChildren();

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 5;

        cell.textContent =
            'Unable to load elections. Please try again.';

        row.appendChild(cell);
        tableBody.appendChild(row);

    }
}


// ==========================================
// UPDATE ELECTION STATUS
// ==========================================

async function updateElectionStatus(electionId, newStatus, electionTitle) {

    const action = newStatus === 'ongoing'
        ? 'start'
        : 'complete';

    const confirmation = confirm(
        `Are you sure you want to ${action} "${electionTitle}"?`
    );

    if (!confirmation) {
        return;
    }

    try {

        const response = await fetch(
            `https://futa-e-voting-system.vercel.app/api/elections/${electionId}/status`,
            {
                method: 'PATCH',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },

                body: JSON.stringify({
                    election_status: newStatus
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || `Failed to ${action} election.`
            );

        }


        alert(
            data.message || `Election ${action}ed successfully!`
        );


        // Refresh elections and statistics
        await loadElections();


    } catch (error) {

        console.error('Election status update error:', error);

        alert(error.message);

    }

}


// ==========================================
// MOBILE SIDEBAR DROPDOWN
// ==========================================

menuToggle.addEventListener('click', () => {

    const isOpen = sidebarNav.classList.toggle('show');

    logoutButton.classList.toggle('show');

    menuToggle.textContent = isOpen ? '×' : '☰';

    menuToggle.setAttribute('aria-expanded', isOpen);

});


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener('click', () => {

    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminDetails');

    window.location.href = 'login.html';

});


// ==========================================
// CREATE ELECTION MODAL
// ==========================================

// Open modal
createElectionBtn.addEventListener('click', () => {

    createElectionModal.classList.add('show');

});


// Close modal
closeModalBtn.addEventListener('click', () => {

    createElectionModal.classList.remove('show');

});


cancelModalBtn.addEventListener('click', () => {

    createElectionModal.classList.remove('show');

});


// Close when clicking outside
createElectionModal.addEventListener('click', (event) => {

    if (event.target === createElectionModal) {
        createElectionModal.classList.remove('show');
    }

});


// ==========================================
// CREATE A NEW ELECTION
// ==========================================

createElectionForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const electionTitle =
        document.getElementById('electionTitle').value.trim();

    const startDate =
        document.getElementById('startDate').value;

    const endDate =
        document.getElementById('endDate').value;


    // Validate date fields
    if ((startDate && !endDate) || (!startDate && endDate)) {

        alert('Please provide both the start date and end date.');

        return;
    }


    // Validate date sequence
    if (
        startDate &&
        endDate &&
        new Date(endDate) <= new Date(startDate)
    ) {

        alert('The end date must be later than the start date.');

        return;
    }


    // Prepare election data
    const electionData = {

        election_title: electionTitle,

        start_date: startDate
            ? new Date(startDate).toISOString()
            : null,

        end_date: endDate
            ? new Date(endDate).toISOString()
            : null

    };


    try {

        saveElectionBtn.disabled = true;
        saveElectionBtn.textContent = 'Creating...';


        const response = await fetch(
            'https://futa-e-voting-system.vercel.app/api/elections',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },

                body: JSON.stringify(electionData)
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || 'Failed to create election.'
            );

        }


        alert(data.message || 'Election created successfully!');


        createElectionForm.reset();

        createElectionModal.classList.remove('show');


        await loadElections();


    } catch (error) {

        console.error('Election creation error:', error);

        alert(error.message);

    } finally {

        saveElectionBtn.disabled = false;

        saveElectionBtn.textContent = 'Create Election';

    }

});


// ==========================================
// EDIT ELECTION MODAL
// ==========================================

// Close modal
closeEditModalBtn.addEventListener('click', () => {

    editElectionModal.classList.remove('show');

});


cancelEditModalBtn.addEventListener('click', () => {

    editElectionModal.classList.remove('show');

});


// Close when clicking outside
editElectionModal.addEventListener('click', (event) => {

    if (event.target === editElectionModal) {
        editElectionModal.classList.remove('show');
    }

});


// ==========================================
// UPDATE EXISTING ELECTION
// ==========================================

editElectionForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const electionId =
        document.getElementById('editElectionId').value;

    const electionTitle =
        document.getElementById('editElectionTitle').value.trim();

    const startDate =
        document.getElementById('editStartDate').value;

    const endDate =
        document.getElementById('editEndDate').value;


    // Validate date fields
    if ((startDate && !endDate) || (!startDate && endDate)) {

        alert('Please provide both the start date and end date.');

        return;
    }


    // Validate date sequence
    if (
        startDate &&
        endDate &&
        new Date(endDate) <= new Date(startDate)
    ) {

        alert('The end date must be later than the start date.');

        return;
    }


    // Prepare updated election data
    const electionData = {

        election_title: electionTitle,

        start_date: startDate
            ? new Date(startDate).toISOString()
            : null,

        end_date: endDate
            ? new Date(endDate).toISOString()
            : null

    };


    try {

        updateElectionBtn.disabled = true;
        updateElectionBtn.textContent = 'Saving...';


        const response = await fetch(
            `https://futa-e-voting-system.vercel.app/api/elections/${electionId}`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },

                body: JSON.stringify(electionData)
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || 'Failed to update election.'
            );

        }


        alert(data.message || 'Election updated successfully!');


        editElectionModal.classList.remove('show');


        await loadElections();


    } catch (error) {

        console.error('Election update error:', error);

        alert(error.message);

    } finally {

        updateElectionBtn.disabled = false;

        updateElectionBtn.textContent = 'Save Changes';

    }

});

// ==========================================
// CLOSE MODALS WITH ESCAPE KEY
// ==========================================

document.addEventListener('keydown', (event) => {

    if (event.key === 'Escape') {

        createElectionModal.classList.remove('show');

        editElectionModal.classList.remove('show');

    }

});

// ==========================================
// START ADMIN AUTHENTICATION
// ==========================================

if (adminToken) {
    verifyAdminAccess();
}