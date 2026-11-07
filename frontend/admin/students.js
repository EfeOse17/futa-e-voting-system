// ==========================================
// STUDENTS MANAGEMENT
// ==========================================

// Admin authentication
const adminToken = sessionStorage.getItem('adminToken');

const API_URL = 'http://localhost:3000/api';


// ==========================================
// DOM ELEMENTS
// ==========================================

// Statistics
const totalStudents = document.getElementById('totalStudents');
const totalDepartments = document.getElementById('totalDepartments');

// Table
const studentsTableBody = document.getElementById('studentsTableBody');

// Search
const studentSearch = document.getElementById('studentSearch');

// Add Student
const addStudentBtn = document.getElementById('addStudentBtn');
const addStudentModal = document.getElementById('addStudentModal');
const addStudentForm = document.getElementById('addStudentForm');

const studentMatricNumber = document.getElementById('studentMatricNumber');
const studentFullName = document.getElementById('studentFullName');
const studentEmail = document.getElementById('studentEmail');
const studentDepartment = document.getElementById('studentDepartment');

const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');
const saveStudentBtn = document.getElementById('saveStudentBtn');

// View Student
const viewStudentModal = document.getElementById('viewStudentModal');

const viewStudentMatric = document.getElementById('viewStudentMatric');
const viewStudentName = document.getElementById('viewStudentName');
const viewStudentEmail = document.getElementById('viewStudentEmail');
const viewStudentDepartment = document.getElementById('viewStudentDepartment');

const closeViewModalBtn = document.getElementById('closeViewModalBtn');
const closeStudentDetailsBtn = document.getElementById('closeStudentDetailsBtn');

// Sidebar
const menuToggle = document.getElementById('menuToggle');
const sidebarNav = document.querySelector('.sidebar-nav');
const logoutButton = document.getElementById('logoutButton');


// Store students
let students = [];


// ==========================================
// CHECK ADMIN AUTHENTICATION
// ==========================================

const checkAdminAuthentication = async () => {

    if (!adminToken) {
        window.location.href = 'login.html';
        return false;
    }

    try {

        const response = await fetch(`${API_URL}/admins/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            sessionStorage.removeItem('adminToken');
            window.location.href = 'login.html';
            return false;
        }

        return true;

    } catch (error) {

        console.error('Authentication error:', error);

        alert('Unable to connect to the server.');

        return false;
    }
};


// ==========================================
// API REQUEST HELPER
// ==========================================

const apiRequest = async (endpoint, options = {}) => {

    const response = await fetch(`${API_URL}${endpoint}`, {

        ...options,

        headers: {
            'Authorization': `Bearer ${adminToken}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }

    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {

        sessionStorage.removeItem('adminToken');

        window.location.href = 'login.html';

        throw new Error('Your session has expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.');
    }

    return data;
};


// ==========================================
// LOAD STUDENTS
// ==========================================

const loadStudents = async () => {

    try {

        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="5">Loading students...</td>
            </tr>
        `;

        const data = await apiRequest('/students');

        students = data;

        displayStudents(students);

        updateStatistics();

    } catch (error) {

        console.error('Failed to load students:', error);

        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="5">Failed to load students.</td>
            </tr>
        `;

        alert(error.message);
    }
};


// ==========================================
// DISPLAY STUDENTS
// ==========================================

const displayStudents = (studentList) => {

    studentsTableBody.innerHTML = '';

    if (studentList.length === 0) {

        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="5">No students found.</td>
            </tr>
        `;

        return;
    }

    studentList.forEach(student => {

        const row = document.createElement('tr');

        // Matric Number
        const matricCell = document.createElement('td');
        matricCell.textContent = student.matric_number;

        // Full Name
        const nameCell = document.createElement('td');
        nameCell.textContent = student.full_name;

        // Email
        const emailCell = document.createElement('td');
        emailCell.textContent = student.email;

        // Department
        const departmentCell = document.createElement('td');
        departmentCell.textContent = student.department;

        // Actions
        const actionCell = document.createElement('td');

        const viewButton = document.createElement('button');

        viewButton.textContent = 'View';
        viewButton.classList.add('edit-btn');

        viewButton.addEventListener('click', () => {
            viewStudent(student.matric_number);
        });

        actionCell.appendChild(viewButton);

        row.append(
            matricCell,
            nameCell,
            emailCell,
            departmentCell,
            actionCell
        );

        studentsTableBody.appendChild(row);
    });
};


// ==========================================
// UPDATE STATISTICS
// ==========================================

const updateStatistics = () => {

    // Total registered students
    totalStudents.textContent = students.length;

    // Count unique departments
    const departments = new Set(
        students.map(student => student.department.trim().toLowerCase())
    );

    totalDepartments.textContent = departments.size;
};


// ==========================================
// SEARCH STUDENTS
// ==========================================

studentSearch.addEventListener('input', () => {

    const searchValue = studentSearch.value.toLowerCase().trim();

    const filteredStudents = students.filter(student => {

        return (
            student.matric_number.toLowerCase().includes(searchValue) ||
            student.full_name.toLowerCase().includes(searchValue) ||
            student.department.toLowerCase().includes(searchValue) ||
            student.email.toLowerCase().includes(searchValue)
        );

    });

    displayStudents(filteredStudents);
});


// ==========================================
// OPEN ADD STUDENT MODAL
// ==========================================

addStudentBtn.addEventListener('click', () => {

    addStudentForm.reset();

    addStudentModal.classList.add('show');
});


// ==========================================
// CLOSE ADD STUDENT MODAL
// ==========================================

const closeAddStudentModal = () => {

    addStudentModal.classList.remove('show');

    addStudentForm.reset();
};

closeAddModalBtn.addEventListener('click', closeAddStudentModal);

cancelAddModalBtn.addEventListener('click', closeAddStudentModal);


// ==========================================
// REGISTER NEW STUDENT
// ==========================================

addStudentForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const studentData = {

        matric_number: studentMatricNumber.value.trim(),

        full_name: studentFullName.value.trim(),

        email: studentEmail.value.trim(),

        department: studentDepartment.value.trim()

    };

    try {

        saveStudentBtn.disabled = true;
        saveStudentBtn.textContent = 'Registering...';

        const data = await apiRequest('/students', {

            method: 'POST',

            body: JSON.stringify(studentData)

        });

        alert(data.message || 'Student registered successfully.');

        closeAddStudentModal();

        await loadStudents();

    } catch (error) {

        console.error('Student registration error:', error);

        alert(error.message);

    } finally {

        saveStudentBtn.disabled = false;
        saveStudentBtn.textContent = 'Register Student';
    }
});


// ==========================================
// VIEW STUDENT DETAILS
// ==========================================

const viewStudent = async (matricNumber) => {

    try {

        const student = await apiRequest(
            `/students/${encodeURIComponent(matricNumber)}`
        );

        viewStudentMatric.textContent = student.matric_number;

        viewStudentName.textContent = student.full_name;

        viewStudentEmail.textContent = student.email;

        viewStudentDepartment.textContent = student.department;

        viewStudentModal.classList.add('show');

    } catch (error) {

        console.error('Failed to retrieve student:', error);

        alert(error.message);
    }
};


// ==========================================
// CLOSE VIEW STUDENT MODAL
// ==========================================

const closeViewStudentModal = () => {

    viewStudentModal.classList.remove('show');
};

closeViewModalBtn.addEventListener('click', closeViewStudentModal);

closeStudentDetailsBtn.addEventListener('click', closeViewStudentModal);


// ==========================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ==========================================

addStudentModal.addEventListener('click', (event) => {

    if (event.target === addStudentModal) {
        closeAddStudentModal();
    }
});

viewStudentModal.addEventListener('click', (event) => {

    if (event.target === viewStudentModal) {
        closeViewStudentModal();
    }
});


// ==========================================
// ESCAPE KEY
// ==========================================

document.addEventListener('keydown', (event) => {

    if (event.key === 'Escape') {

        closeAddStudentModal();

        closeViewStudentModal();
    }
});


// ==========================================
// MOBILE SIDEBAR
// ==========================================

menuToggle.addEventListener('click', () => {

    sidebarNav.classList.toggle('show');

    logoutButton.classList.toggle('show');

    menuToggle.classList.toggle('active');

    const isExpanded = sidebarNav.classList.contains('show');

    menuToggle.setAttribute('aria-expanded', isExpanded);
});


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener('click', () => {

    sessionStorage.removeItem('adminToken');

    window.location.href = 'login.html';
});

// ==========================================
// INITIALIZE PAGE
// ==========================================

const initializePage = async () => {

    const isAuthenticated = await checkAdminAuthentication();

    if (!isAuthenticated) {
        return;
    }

    await loadStudents();
};

initializePage();