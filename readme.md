# Money Lens

## About Us

Money Lens is a web application designed to simplify the process of managing personal finances. For more information about our project or plans, see our [Project Proposal](documentation/ProjectProposal.md).

### Group Members:

- Jashanjot Gill
- Ginelle Temull
- Una Mayberry
- Sahil Sharma
- Filip Karamanov
- Aakash Chouhan

## Coding Conventions

### Commit log description message:

"Feature and description of task"
eg. "implemented login form fields and buttons for UI"
for feature (Authentication System), user story (Login), subtask(Login UI)

### Branches:

main - final submission

develop - working branch

feature - a branch for each feature

### Project Structure

```bash
Money-Lens-App/
├── action-runner/
├── backend/
│   ├── logic/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│
├── /documentation
│   ├── architecture/
│   │   ├── sequence-diagrams/
│   ├── meeting-minutes/
│   ├── resources/
│
├── frontend/
│   ├── public/
│   ├── src/app/
│   │   ├── assets/
│   │   │   ├── styles/
│   │   │   ├── utilities
│   │   ├── components/
│   │   ├── config/
│   │   ├── pages/
│   │   │   ├── analytics/
│   │   │   ├── dashboard/
│   │   │   ├── forgot-password/
│   │   │   ├── goals/
│   │   │   ├── plaid-setup/
│   │   │   ├── signup/
│   │   │   ├── transactions/
│   │   ├── types/
│
└── tests/
    ├── unit_tests/
    ├── integration_tests/
    ├── coverage/
```

### Running the App

#### 1: Using Docker Containers

- First build the containers with the command `docker-compose up --build -d`
- When finished using the containers, close them with the command `docker-compose down`
- The frontend runs on "localhost:3000"
- The backend runs on "localhost:5001"

#### 2: Running Manually

##### Installation & Running Frontend

- cd frontend
- `npm install --legacy-peer-dep`
- Once in frontend directory, run `npm run dev`
- Note (Important): please use "--legacy-peer-dep" flag with npm install as shown above.

##### Running Backend

- cd backend
- `npm install`
- Once in backend directory, run `node server.js`. Note: Won't reload by itself.
- Once in backend directory, run `npm start` for auto-reload.
- Make sure there is a .env file in the backend repository as provided by a team member. 
- Node: you must .env file that has MONGO_URI=mongodb+srv://<username>:<password>@cluster0.p23io.mongodb.net/Money-Lens-MongoDB?retryWrites=true&w=majority
- Note: Replace `username` & `password` with actual credentials.

### Two-Factor Authentication (2FA)

The app includes Two-Factor Authentication using Google Authenticator. All necessary dependencies are included in the package.json files and will be installed with `npm install`. To use 2FA:

1. Download Google Authenticator on your mobile device
2. During signup, you'll be prompted to scan a QR code with Google Authenticator
3. After scanning, enter the 6-digit code from Google Authenticator to complete setup
4. For future logins, you'll need to enter the current code from Google Authenticator

##### Running Tests

See our ![test plan](/documentation/architecture/Money-Lens_Test-Plan.pdf) for more details.

Unit and Integration:

- cd tests
- `npm install --save-dev jest supertest @jest/globals`
- `npx jest --coverage` to show coverage or `npx jest` for just test suite summary
- npm test

Run a specific test file

- cd tests/integration_tests
- npm test [filename]

Run test coverage

- npm run test:coverage

### Test Account for Sign ins

For Plaid account connection - ** When using production environment **:

user: user_good

password: pass_good
