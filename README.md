# ATM Simulation

A JavaScript-based ATM simulation built to practice state management, business logic, form validation, DOM manipulation, and state transitions.

## Features

### Authentication
- Login using card number and PIN
- Card number and PIN validation
- Login attempt tracking
- Account lock after three failed login attempts
- Reset button
- Session persistence using Session Storage
- Automatic redirection to the dashboard after successful login

### ATM Dashboard
- Display logged-in user's account information
- Check account balance
- Deposit money
- Withdraw money
- Change PIN
- Logout functionality
- Transaction history

### Transaction Rules
- Prevent withdrawal when the account balance is insufficient
- Daily withdrawal limit
- Maximum deposit per transaction
- Daily deposit limit
- Prevent changing the PIN to the existing PIN
- Confirm new PIN before changing it
- Validate transaction amounts

### Transaction History
The dashboard records:
- Transaction type
- Transaction amount
- Account balance after the transaction
- Date and time of the transaction

## Technologies Used

- HTML
- CSS
- JavaScript

## Concepts Practiced

- State Management
- Finite State Machine (FSM)
- State Transitions
- Business Rules
- Form Validation
- Session Storage
- DOM Manipulation
- Event Handling
- Array Methods
- Dynamic DOM Creation
- Dynamic Table Generation

## Project Structure

```text
index.html
dashboard.html
login.js
dashboard.js
style.css
README.md