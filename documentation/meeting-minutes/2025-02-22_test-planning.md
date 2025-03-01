# Test Planning 

## Scope:

Sign-In: 
-	New user created
-	Signout
-	Username, password
-	Existing user credentials
-	Change password

Plaid API Connection: 
-	With new user
-	Existing user

Dashboard: 
-	User info
-	Transactions
-	Balance ??
-	Monthly Charts

## Roles

Jashan Gill - Test Manager


## Tools

Jest for unit and integration 
Cypress for regression testing 
Selenium/Cucumber for acceptance testing 

## Questions: 

Change Log - how often should we be updating the log? Every set of tests added? For every change in tests? 
Roles - How are the roles supposed to be set up and enforced? What do the example roles all entail? 

# Project Updates

## Plaid Account Setup 

Need to include a flag in the npm install command in the Dockerfile. Flag in readme.md on plaid-transactions 
branch

sandbox environment offer more than the production environment. Keep set to sandbox. 

Test login info is: 
user: user_good
password: pass_good

Everything should be set by tomorrow for dashboard usage. 

## Page Routes

For now direct to dashboard after signin. Once further established, direct new users to connect to account 
page before dashboard. 
