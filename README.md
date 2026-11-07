# FUTA E-Voting System

A secure, web-based electronic voting platform developed as an academic project prototype. The system demonstrates student voter verification, administrator election management, OTP-based email verification, secure vote casting, duplicate-vote prevention, and election result reporting.

> **Disclaimer:** This project is an academic prototype developed for demonstration and educational purposes using fictional/test data. It is not intended or approved for conducting actual FUTA elections or legally binding elections.

## Features

### Student / Voter Features
- Student eligibility verification using matriculation number and email.
- Email OTP verification during voter registration.
- OTP resend and verification protections.
- Student authentication and dashboard.
- View available elections.
- View election candidates.
- Cast votes securely.
- Duplicate-vote prevention.
- View election results.
- Change account password.

### Administrator Features
- Secure administrator login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Role-based access control.
- Super Admin and Regular Admin roles.
- Election management.
- Candidate management.
- Student management.
- Election results management.
- Restricted administrative operations based on administrator roles.

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Frontend styling |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Backend framework |
| PostgreSQL | Relational database |
| pg | PostgreSQL database connection |
| bcrypt | Password hashing |
| JSON Web Token | Authentication |
| Nodemailer | OTP email delivery |
| dotenv | Environment configuration |
| Helmet | HTTP security headers |
| CORS | Cross-origin resource sharing |
| express-rate-limit | API rate limiting |
| Nodemon | Development server |

## Project Structure

```text
FUTA e-voting system/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── email.js
│   │
│   ├── middleware/
│   │
│   ├── routes/
│   │
│   ├── server.js
│   ├── createAdmin.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── admin/
│   ├── student/
│   ├── assets/
│   └── index.html
│
├── .gitignore
├── package.json
└── package-lock.json
```

## System Workflow

### Voter Registration and Voting

1. A student provides their matriculation number and email address.
2. The system checks the student's eligibility.
3. An OTP is sent to the registered email address.
4. The student verifies the OTP.
5. The student accesses the voter dashboard.
6. Available elections and candidates are displayed.
7. The student selects a candidate and confirms their vote.
8. The backend validates the request and records the vote.
9. The system prevents the same voter from voting more than once in an election.

### Administrator Workflow

1. An administrator logs in using their credentials.
2. The system verifies their identity and role.
3. The administrator accesses the appropriate dashboard.
4. Authorized administrators manage elections and candidates.
5. Super Admin privileges control access to restricted operations.
6. Election results can be viewed through the results management section.

## Security Features

The system implements several security measures:

- Password hashing using bcrypt.
- JWT-based administrator authentication.
- Role-based authorization.
- OTP-based email verification.
- Rate limiting on sensitive authentication endpoints.
- Helmet security middleware.
- Request body size restrictions.
- Database transactions during vote casting.
- Database locking to help prevent concurrent duplicate voting.
- Validation that candidates belong to the selected election.
- Separation of voter participation records from ballot records.

### Ballot Privacy

Voter participation records are maintained separately from actual vote records.

The participation table tracks whether an eligible voter has voted, while the votes table stores the election and selected candidate without directly storing the voter's identity.

This design helps protect ballot anonymity.

## Requirements

Before running the application, ensure you have installed:

- Node.js
- npm
- PostgreSQL
- pgAdmin or another PostgreSQL management tool
- Visual Studio Code
- A modern web browser
- Live Server extension for Visual Studio Code

A Gmail account configured with a Google App Password is also required for OTP email delivery.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate into the project directory:

```bash
cd FUTA-e-voting-system
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure PostgreSQL

Create a PostgreSQL database named:

```text
futa_evoting
```

Ensure the required database tables, relationships, constraints, and indexes have been created before starting the backend.

The application does not automatically create the database schema.

### 5. Configure Environment Variables

Inside the `backend` directory, create a `.env` file.

Add the following configuration:

```env
PORT=3000

DB_USER=your_database_username
DB_HOST=localhost
DB_NAME=futa_evoting
DB_PASSWORD=your_database_password
DB_PORT=5432

JWT_SECRET=your_long_random_secret

EMAIL_USER=your_gmail_address
EMAIL_PASSWORD=your_gmail_app_password
```

Replace the placeholders with your actual local configuration.

**Important:** Never upload your `.env` file or expose your passwords, JWT secret, or email credentials publicly.

### 6. Start the Backend Server

From the backend directory, run:

```bash
npm run dev
```

Alternatively:

```bash
npm start
```

When the connection is successful, the terminal should display a PostgreSQL connection confirmation and the server address.

The backend runs at:

```text
http://https://futa-e-voting-system.onrender.com
```

### 7. Start the Frontend

Open the `frontend` folder in Visual Studio Code.

Use the Live Server extension to launch:

```text
frontend/index.html
```

The backend currently allows these local frontend origins:

- `http://127.0.0.1:5500`
- `http://127.0.0.1:56755`

If your frontend runs on another origin, update the CORS configuration in `backend/server.js` accordingly.

## Backend Commands

Run these commands from the `backend` directory.

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server using Nodemon |
| `npm start` | Starts the server using Node.js |

## Database Components

The database contains tables supporting:

- Students
- Administrators
- Voter accounts
- OTP verifications
- Elections
- Candidates
- Voter participation
- Votes

These components work together to support voter authentication, election administration, vote casting, and results management.

## Testing

The application has undergone functional and security-oriented development testing, including:

- Administrator authentication.
- Administrator role restrictions.
- Election management.
- Candidate management.
- Student management.
- Voter registration.
- OTP verification.
- OTP expiration and reuse prevention.
- Voter login.
- Election navigation.
- Successful vote casting.
- Duplicate-vote prevention.
- Election results reporting.

These checks do not constitute an independent security audit or certification.

## Future Improvements

Potential improvements include:

- Independent security auditing.
- Additional automated tests.
- Enhanced audit logging.
- Production deployment configuration.
- Improved accessibility.
- Additional monitoring and operational safeguards.

## License

This project was developed for academic purposes. No open-source license has been specified.