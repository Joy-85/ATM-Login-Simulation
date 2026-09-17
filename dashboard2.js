// DOM ELEMENTS & APPLICATION STATE

const withdrawInput = document.getElementById('withdraw-input');
const withdrawButton = document.getElementById('withdraw-button');
const displayMessages = document.getElementById('display-messages');
const appState = JSON.parse(sessionStorage.getItem('appState'));
const accountName = document.getElementById('account-name');
const cardNumber = document.getElementById('card-number');
const balanceButton = document.getElementById('balance-button');
const depositButton = document.getElementById('deposit-button');
const depositInput = document.getElementById('deposit-input');
const newPin = document.getElementById('new-pin');
const confirmPin = document.getElementById('confirm-pin');
const changePinButton = document.getElementById('changePin-button');
const tableContainer = document.getElementById('table-container');
const LogOutButton = document.getElementById('logout-button');

// DASHBOARD STATE
// Stores the current condition of the ATM dashboard


const dashboardState = {
    currentTransaction : 'idle',
    accountBalance : 5000,
    dashboardMessage : '',
    transactionHistory : [],
    withdraw: {
        type: 'Withdrawal',
        amount : 0 ,
        hasWithdrawn: false,
        dateAndTime : '',
    },
    deposit: {
        type: 'Deposit',
        amount: 0,
        hasDeposited : false,
        dateAndTime : '',
    },
    changePin: {
        type: 'Pin Change',
        amount : '-',
        newPin : '',
        confirmPin : '',
        hasChangedPin : false,
        dateAndTime : '',
    },
    insufficientFund : false,
    exceededWithdrawalLimit : false, 
    firstDigitIsZero : false,
    exceededDepositPerTransaction : false,
    exceededDailyDepositLimit : false,
    fourDigitNewPinEntered : false,
    newAndOldPinsAreExactMatch : false,
    newPinAndConfirmedPinUnMatched : false,
    canDisplayTransactionHistory : false,
}

//CONSTANTS & STATE HISTORY

let previousTransaction = 'idle';
const dailyWithdrawalLimit = 500000;
const dashboardStateHistory = [];
const maximumDepositPerTransaction = 250000;
const dailyDepositLimit = 1000000;

// ALLOWED STATE TRANSITIONS
// Controls which states can follow another state

const allowedStateTransition = {
    loggedIn : ['loggedOut'],
}

const allowedTransactionTransition = {
    idle: ['checkBalance', 'attemptingWithdrawal', 'attemptingDeposit',  'attemptToChangePin'],
    attemptingWithdrawal: ['idle', 'withdraw'],
    checkBalance: ['idle'],
    attemptToChangePin : ['idle', 'changePin'],
    changePin : ['transactionSuccessful', 'transactionFailed'],
    withdraw : [ 'transactionSuccessful'],
    deposit : ['transactionSuccessful', 'transactionFailed'],
    attemptingDeposit : ['idle', 'deposit'],
    transactionSuccessful : ['idle'],
    transactionFailed : ['idle'],
}

// TRANSACTION STATE CONFIGURATION
// Stores messages associated with each transaction state

const transactionStateConfig = {
    idle : {
        messages : {
            reset : '',
        },
    },
    attemptingWithdrawal: {
        messages : {
            insufficientFund : 'You don\'t have sufficient fund to carry out this transaction',
            exceededWithdrawalLimit: 'You have exceeded your daily withdrawal limit',
        },
    },
    withdraw : {
        messages : {
            reset : '',
        },
    },
    deposit : {
        messages : {
            reset : '',
        },
    },
    attemptingDeposit: {
        messages : {
            excessDepositPerTransaction : 'You have exceeded your deposit limit per transaction.',
            exceededDailyDeposit : 'You have exceeded your daily deposit limit.'
        },
    },
    changePin: {
        messages : {
            reset : '',
            success : 'Pin changed Successfully',
        },
    },
    attemptToChangePin : {
        messages : {
            newAndOldPinAreMatched: 'You have entered the same old pin. Please, enter a different pin digit',
            newAndConfirmPinUnmatched: 'Incorrect confirmed pin entered. Please enter the correct pin.'
        }
    },
    transactionSuccessful: {
        messages : {
        depositSuccess : `You have successfully deposited ₦`,
        withdrawalSuccess : `You have successfully withdrawn ₦`,
        },
    },
    checkBalance : {
        messages: {
            balance: 'Your account balance is ₦'
        },
    },
}
loadAppState();

//Event handlers 
// Respond to user interactions
LogOutButton.addEventListener('click', () => {
    canLogOut();
})

changePinButton.addEventListener('click', () => {
    canChangePin(dashboardState.changePin.newPin, appState.pin, dashboardState.changePin.confirmPin, 'changePin' , 'transactionSuccessful')
})

// Capture and validate the new PIN as the user types
newPin.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    dashboardState.changePin.newPin = e.target.value;
    canAttemptChangingPin(dashboardState.changePin.newPin,'attemptToChangePin' )
})

// Capture the confirmation PIN as the user types
confirmPin.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    dashboardState.changePin.confirmPin = e.target.value;
    enableChangePinButton();
})

// Handle deposit button click
depositButton.addEventListener('click', () => {
        successfulDeposit(dashboardState.deposit.amount, maximumDepositPerTransaction, dailyDepositLimit, dashboardState.deposit.dateAndTime,'deposit', 'transactionSuccessful')
    })

// Capture deposit amount as the user types
depositInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    dashboardState.deposit.amount = Number(e.target.value);
    canAttemptDeposit(dashboardState.deposit.amount, 'idle', 'attemptingDeposit');
})

// Check account balance
balanceButton.addEventListener('click', () => {
    checkBalance('checkBalance');
})

// Handle withdrawal button click
withdrawButton.addEventListener('click', () => {
    successfulWithdrawal(dashboardState.accountBalance, dashboardState.withdraw.amount, dailyWithdrawalLimit, dashboardState.withdraw.dateAndTime,   'transactionSuccessful','withdraw');
})

// Capture withdrawal amount as the user types
withdrawInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    dashboardState.withdraw.amount = Number(e.target.value);
    canAttemptWithdrawal(dashboardState.withdraw.amount, 'attemptingWithdrawal', 'idle')
})

// GLOBAL HELPER FUNCTION
// Delays a state transition before continuing the transaction flow
function setTimeOut(nextTransition, timer)
{
    return setTimeout(() => {
            transitionTo(nextTransition);
            handleTransactionFlow();
        }, timer)
}

// OBSERVER / TRANSACTION FLOW
// Reacts to changes in the current transaction state
function handleTransactionFlow()
{
    const currentTransactionConfig = transactionStateConfig[dashboardState.currentTransaction];
    
    // Prevent processing the same state repeatedly
    if(dashboardState.currentTransaction === previousTransaction)
    {
        return;
    }

     // Reset temporary transaction flags when returning to idle
    if(dashboardState.currentTransaction === 'idle')
    {
        dashboardState.canDisplayTransactionHistory = false;
        dashboardState.deposit.hasDeposited = false;
        dashboardState.withdraw.hasWithdrawn = false;
        dashboardState.insufficientFund = false;
        dashboardState.exceededWithdrawalLimit = false;
        dashboardState.firstDigitIsZero = false;
        dashboardState.exceededDailyDepositLimit = false;
        dashboardState.exceededDepositPerTransaction = false;
        dashboardState.changePin.hasChangedPin = false;
        dashboardState.fourDigitNewPinEntered = false;
        dashboardState.newAndOldPinsAreExactMatch = false;
        dashboardState.newPinAndConfirmedPinUnMatched = false;
        dashboardState.dashboardMessage = currentTransactionConfig.messages.reset;
    }
    
     // Process a successful withdrawal
    if(dashboardState.currentTransaction === 'withdraw')
    {
        dashboardState.accountBalance = dashboardState.accountBalance - dashboardState.withdraw.amount;
        dashboardState.withdraw.hasWithdrawn = true;
        dashboardState.withdraw.dateAndTime = new Date();
        calculateTotalDailyWithdrawal();
        dashboardState.transactionHistory.push({...dashboardState.withdraw, balance : dashboardState.accountBalance, amount : dashboardState.withdraw.amount});
        dashboardState.dashboardMessage = currentTransactionConfig.messages.reset;
    }
    
    // Process a successful deposit
    if(dashboardState.currentTransaction === 'deposit')
    {
        dashboardState.accountBalance = dashboardState.accountBalance + dashboardState.deposit.amount;
        dashboardState.deposit.hasDeposited = true;
        dashboardState.deposit.dateAndTime = new Date();
        dashboardState.transactionHistory.push({...dashboardState.deposit, balance : dashboardState.accountBalance, amount: dashboardState.deposit.amount});
        calculateTotalDailyDeposit();
        dashboardState.dashboardMessage = currentTransactionConfig.messages.reset;
    }
    
    // Process a successful PIN change
    if(dashboardState.currentTransaction === 'changePin')
    {
        appState.pin = dashboardState.changePin.newPin;
        saveAppState();
        dashboardState.changePin.hasChangedPin = true;
        dashboardState.changePin.dateAndTime = new Date();
        dashboardState.transactionHistory.push({type: 'Pin Change', amount: '-', dateAndTime:dashboardState.changePin.dateAndTime , balance : dashboardState.accountBalance});
        dashboardState.dashboardMessage = currentTransactionConfig.messages.reset;
        dashboardState.changePin.newPin = '';
        dashboardState.changePin.confirmPin = '';
    }

    // Display the appropriate success message
    if(dashboardState.currentTransaction === 'transactionSuccessful')
    {
        if(previousTransaction === 'changePin')
        {
            dashboardState.dashboardMessage = transactionStateConfig.changePin.messages.success;
        }
        else if(previousTransaction === 'deposit') 
        {
            dashboardState.dashboardMessage = `${currentTransactionConfig.messages.depositSuccess}${dashboardState.deposit.amount}. Your account balance is ₦${dashboardState.accountBalance}`;
        }
        else if(previousTransaction === 'withdraw')
        {
            dashboardState.dashboardMessage = `${currentTransactionConfig.messages.withdrawalSuccess}${dashboardState.withdraw.amount}. Your account balance is ₦${dashboardState.accountBalance}`;
        }
        dashboardState.canDisplayTransactionHistory = true;
        setTimeOut('idle', 2000);
    }

    // Display current account balance
    if(dashboardState.currentTransaction === 'checkBalance')
    {
        dashboardState.dashboardMessage = `${currentTransactionConfig.messages.balance}${dashboardState.accountBalance}`;
        setTimeOut('idle', 2000);
    }
    
    // Remember the previous state for the next transition
    previousTransaction = dashboardState.currentTransaction;
    dashboardStateHistory.push(dashboardState.currentTransaction);
    renderUI();
}

// SESSION STORAGE
// Saves the logged-in user's application state
function saveAppState(){
    sessionStorage.setItem("appState", JSON.stringify(appState));
}

function loadAppState(){
    const storedState = sessionStorage.getItem('appState');
    if(!storedState )
    {
        window.location.href = 'index.html';
    }
}

// LOGOUT
// Clears the session and returns to the login page
function canLogOut(){
    sessionStorage.removeItem('appState');
    window.location.href = 'index.html';
}
                //Check Balance ()
function checkBalance(nextTransition)
{
    transitionTo(nextTransition);
    handleTransactionFlow();
}

                //Change Pin Functions

// Validate the new PIN before changing it
function canChangePin(newPin, oldPin, confirmPin, nextTransition, finalTransition)
{
    if(!conformToChangePinBankRule(newPin, oldPin, confirmPin))
    {
        renderUI();
        return;
    }
    transitionTo(nextTransition);
    handleTransactionFlow();
    setTimeOut(finalTransition, 1000);
}

// Apply the rules for changing a PIN
function conformToChangePinBankRule(newPin, oldPin, confirmPin)
{
    let validUserInput;
    if(!compareNewPinAndConfirmPin(newPin, confirmPin))
    {
        dashboardState.newPinAndConfirmedPinUnMatched = true;
        dashboardState.newAndOldPinsAreExactMatch = false;
        validUserInput = false;
    }
    else if(!compareOldAndNewPin(newPin, oldPin))
    {
        dashboardState.newAndOldPinsAreExactMatch = true;
        dashboardState.newPinAndConfirmedPinUnMatched = false;
        validUserInput = false;
    }
    
    else
    {
        validUserInput = true;
        dashboardState.newAndOldPinsAreExactMatch = false;
        dashboardState.newPinAndConfirmedPinUnMatched = false;
    }
    return validUserInput;
}

// Check whether four digits have been entered
function canAttemptChangingPin (input , nextTransition)
{
    if(input.length !== 4 && (dashboardState.newPinAndConfirmedPinUnMatched || dashboardState.newAndOldPinsAreExactMatch ))
    {
        return;
    }
    else if(input.length !== 4)
    {
        enableChangePinButton();
        return;
    }
    dashboardState.fourDigitNewPinEntered = true;
    transitionTo(nextTransition);
    handleTransactionFlow();
    enableChangePinButton();
}

// Enable or disable the PIN change button based on validation
function enableChangePinButton()
{
    if(dashboardState.newPinAndConfirmedPinUnMatched || dashboardState.newAndOldPinsAreExactMatch)
    {
        return;
    }
    renderUI();
}

// Compare the new PIN with the old PIN
function compareOldAndNewPin(newPin, oldPin)
{
    if(newPin === oldPin)
    {
        return false;
    }
    return true;
}

// Compare the new PIN with the confirmation PIN
function compareNewPinAndConfirmPin(newPin, confirmPin)
{
    if(newPin !== confirmPin)
    {
        return false
    }
    return true;
}

                //Deposit Transaction Functions

// Validate and process a deposit
function successfulDeposit(amount, limit, dailyLimit,previousDate, nextTransition, finalTransition)
{
    if(!conformToDepositBankRules(amount, limit, dailyLimit, previousDate))
    {
        renderUI();
        return;
    }
    transitionTo(nextTransition);
    handleTransactionFlow();
    setTimeOut(finalTransition, 1000);
}

// Calculate the total amount deposited during the current day
function calculateTotalDailyDeposit()
{ 
    let totalDailyDeposit;
    const totalDeposits = [];
    let counter = 0;
    const depositTransactionHistory = dashboardState.transactionHistory.filter(transaction => transaction.type === 'Deposit');
    while(counter < depositTransactionHistory.length)
    {
        totalDeposits.push(depositTransactionHistory[counter].amount)
        counter++;
    }
    
    totalDailyDeposit = totalDeposits.reduce((sum, num) => {
        return sum + num;
    }, 0)
    return totalDailyDeposit;
}

// Check whether a deposit exceeds the per-transaction limit
function exceededDepositPerTransaction(amount, limit)
{
    if(amount > limit)
    {
        dashboardState.exceededDepositPerTransaction = true;
        return true;
    }
    return false;
}

// Check whether a transaction happened on the same day
function isSameDay(previousDate){
    const transactionDate = previousDate;
    
    let isSameDate;
    const today = new Date();
    
    if(!transactionDate)
    {
        return true;
    }
    isSameDate = transactionDate.getFullYear() === today.getFullYear() && transactionDate.getMonth() === today.getMonth() && transactionDate.getDate() === today.getDate();
    
    return isSameDate;
}

// Check whether the daily deposit limit will be exceeded
function exceededDailyDepositLimit(amount, dailyLimit,previousDate)
{
    let totalDailyDeposit;
    
    let intendedDeposit;
    console.log(`The last time the user carried out a deposit transaction is  ${previousDate}`);
    
    if(!isSameDay(previousDate))
    {
        return false;
    }
    totalDailyDeposit = calculateTotalDailyDeposit();
    
    intendedDeposit = totalDailyDeposit + amount;
    
    if(intendedDeposit > dailyLimit)
    {
        dashboardState.exceededDailyDepositLimit = true;
        return true;
    }
    else
    {
        return false;
    }
}
    
// Apply all deposit-related banking rules
function conformToDepositBankRules(amount, limit, dailyLimit, previousDate)
{
    let validUserInput;
    if(exceededDailyDepositLimit(amount, dailyLimit, previousDate))
    {
        validUserInput = false;
    }
    else if(exceededDepositPerTransaction(amount, limit))
    {
        validUserInput = false;
    }
    else
    {
        dashboardState.exceededDepositPerTransaction = false;
        dashboardState.exceededDailyDepositLimit = false;
        validUserInput = true;
    }
    return validUserInput;
}

// Determine whether the deposit input is valid
function canAttemptDeposit(input, previousTransition,nextTransition)
{
    if(!correctUserInput(input))
    {
        transitionTo(previousTransition);
    }
    else
    {
        transitionTo(nextTransition);
    }
    handleTransactionFlow();
}

                // Withdrawal Transaction Functions

// Validate and process a withdrawal
function successfulWithdrawal(balance, amount, limit, previousDate, finalTransition, nextTransition)
{
    if(!conformToWithdrawalBankRules(balance, amount, limit, previousDate))
    {
        renderUI();
        return;
    }
    transitionTo(nextTransition);
    handleTransactionFlow();
    setTimeOut(finalTransition, 1000);
}

// Apply all withdrawal-related banking rules
function conformToWithdrawalBankRules(balance, amount, limit, previousDate ) 
{
    let validUserInput;

    if(!correctUserInput(amount))
    {
        validUserInput = false;
    }
    else if(insufficientFund(balance, amount))
    {
        validUserInput = false;
    }
    else if(exceededWithdrawalLimit(limit, amount, previousDate))
    {
        validUserInput = false;
    }
    else
    {
        dashboardState.exceededWithdrawalLimit = false;
        dashboardState.insufficientFund = false;
        validUserInput = true;
        
    }
    return validUserInput;
}

// Check whether the account has enough money
function insufficientFund(balance, amount)
{
    if(amount > balance)
    {
        dashboardState.insufficientFund = true;
        return true;
    }
    return false;
}

// Check whether the daily withdrawal limit will be exceeded
function exceededWithdrawalLimit(limit, amount, previousDate)
{
    if(!isSameDay(previousDate))
    {
        return false;
    }
    
    let totalDailyWithdrawal = calculateTotalDailyWithdrawal();
    let intendedWithdrawal = totalDailyWithdrawal + amount;
    if(intendedWithdrawal > limit)
    {
        dashboardState.exceededWithdrawalLimit = true;
        return true;
    }
    else
    {
        return false;
    }
}

// Calculate the total amount withdrawn during the current day
function calculateTotalDailyWithdrawal()
{
    let counter = 0;
    let totalDailyWithdrawal;
    const totalWithdrawal = [];
    const withdrawalTransactionHistory = dashboardState.transactionHistory.filter(transaction => transaction.type === 'Withdrawal');
    while(counter < withdrawalTransactionHistory.length)
    {
        totalWithdrawal.push(withdrawalTransactionHistory[counter].amount);
        counter++;
    }
    totalDailyWithdrawal = totalWithdrawal.reduce((sum, num) => {
        return sum + num
    }, 0)
    return totalDailyWithdrawal;
}

// Determine whether the withdrawal input is valid
function canAttemptWithdrawal(input, nextTransition, previousTransition )
{
    if(!correctUserInput(input))
    {
        transitionTo(previousTransition);
    }
    else
    {
        transitionTo(nextTransition);
    }
    handleTransactionFlow();
}
    
// STATE TRANSITION FUNCTIONS
// Controls movement between transaction states
function transitionTo(nextTransition) 
{
    if (!canTransition(nextTransition))
    {
        return;
    }
    dashboardState.currentTransaction = nextTransition;
}

// Check whether a transaction state transition is allowed
function canTransition(nextTransition) {
    return allowedTransactionTransition[dashboardState.currentTransaction].includes(nextTransition);
}

// Check whether the amount entered is valid
function correctUserInput(input)
{
    if(input < 1 || input === 0)
    {
        dashboardState.firstDigitIsZero = true ;
        return false;
    }
    else
    {
        dashboardState.firstDigitIsZero = false ;
        return true;
    }
    
}

        //User Interface functions

// Return the message that should be displayed
function displayStateMessages(currentStateMsg, appState)
{
    appState = currentStateMsg;
    return appState;
}

// Clear the displayed message after a delay
function clearDisplayMessages()
{
    setTimeout(() => {
        displayMessages.textContent = displayStateMessages('', dashboardState.dashboardMessage); 
        hideErrorMessage();
        hideSuccessMessage();
    }, 2000)
}

// TRANSACTION HISTORY TABLE
// Dynamically creates and displays the transaction table
function displayTransactionHistory()
{
    if(dashboardState.transactionHistory.length < 1)
    {
        return;
    }
    
    let tableWrapper = document.getElementById("table-wrap");
    if(!tableWrapper)
    {
        tableWrapper = document.createElement('div');
        tableWrapper.id = 'table-wrap';
        tableContainer.append(tableWrapper);
    }

    // Create the table if it does not exist
    let table = document.getElementById("myTable");
    if(!table)
    {
        table = document.createElement('table');
        table.id = 'myTable';
        tableWrapper.appendChild(table);
    }

    // Clear the previous table contents before rebuilding it
    table.innerHTML = '';

    // Create the table caption
    const heading = table.createCaption();
    heading.textContent = 'Transaction History';
    heading.classList.add('caption');
    table.appendChild(heading);

    // Create table header
    const tableHeader = table.createTHead();
    const headerRow = tableHeader.insertRow();
    const th1 = document.createElement('th');
    th1.textContent = 'Type';
    const th2 = document.createElement('th');
    th2.textContent = 'Amount';
    const th3 = document.createElement('th');
    th3.textContent = 'Balance';
    const th4 = document.createElement('th');
    th4.textContent = 'Date/Time';
    headerRow.append(th1);
    headerRow.append(th2);
    headerRow.append(th3);
    headerRow.append(th4);
    
    // Create table body and add transaction records
    const tableBody = table.createTBody();
    dashboardState.transactionHistory.map(transaction => {
        const row = tableBody.insertRow();
        const typeColumn = row.insertCell();
        typeColumn.textContent = transaction.type;
        const amountColumn = row.insertCell();
        amountColumn.textContent =  `₦${transaction.amount}`;
        const balanceColumn = row.insertCell();
        balanceColumn.textContent = `₦${transaction.balance}`;
        const dateAndTimeColumn = row.insertCell();
        dateAndTimeColumn.textContent = transaction.dateAndTime
    });
}
    
// MESSAGE STYLING FUNCTIONS

// Display an error message style
function displayErrorMessage(){
    displayMessages.classList.add('displayErrorMessages');
}

// Remove the error message style
function hideErrorMessage(){
    displayMessages.classList.remove('displayErrorMessages');
}

// Display a success message style
function displaySuccessMessage(){
    displayMessages.classList.add('displaySuccessMessages');
}

// Remove the success message style
function hideSuccessMessage(){
    displayMessages.classList.remove('displaySuccessMessages');
}

// MAIN UI RENDER FUNCTION
// Updates the page according to the current dashboard state
function renderUI(){
    
    // Display logged-in user's information
    accountName.textContent = appState.selectedAccount.name;
    cardNumber.textContent = appState.selectedAccount.card;
    const currentTransactionConfig = transactionStateConfig[dashboardState.currentTransaction];

    // Display insufficient funds error
    if(dashboardState.insufficientFund)
    {
        displayErrorMessage();
        displayMessages.textContent = displayStateMessages(currentTransactionConfig.messages.insufficientFund, dashboardState.dashboardMessage );
        clearDisplayMessages();
    }
    // Display withdrawal limit error
    else if(dashboardState.exceededWithdrawalLimit)
    {
        displayErrorMessage();
        displayMessages.textContent = displayStateMessages(currentTransactionConfig.messages.exceededWithdrawalLimit, dashboardState.dashboardMessage );
        clearDisplayMessages();
    }
    // Display daily deposit limit error
    else if(dashboardState.exceededDailyDepositLimit)
    {
        displayErrorMessage();
        displayMessages.textContent = displayStateMessages(currentTransactionConfig.messages.exceededDailyDeposit , dashboardState.dashboardMessage );
        clearDisplayMessages();
    }
    // Display deposit-per-transaction error
    else if(dashboardState.exceededDepositPerTransaction)
    {
        displayErrorMessage();
        displayMessages.textContent = displayStateMessages(currentTransactionConfig.messages.excessDepositPerTransaction, dashboardState.dashboardMessage );
        clearDisplayMessages();
    }
     // Display error when new PIN matches old PIN
    else if(dashboardState.newAndOldPinsAreExactMatch)
    {
        displayErrorMessage();
        displayMessages.textContent = displayStateMessages(currentTransactionConfig.messages.newAndOldPinAreMatched, dashboardState.dashboardMessage );
        clearDisplayMessages();
    }
    // Display error when confirmation PIN does not match
    else if(dashboardState.newPinAndConfirmedPinUnMatched)
    {
        displayErrorMessage();
        displayMessages.textContent = displayStateMessages(currentTransactionConfig.messages.newAndConfirmPinUnmatched, dashboardState.dashboardMessage );
        clearDisplayMessages();
    }
    // Reset withdrawal input after withdrawal
    else if(dashboardState.currentTransaction === 'withdraw'  )
    {
        withdrawInput.value = '';
        displayMessages.textContent = dashboardState.dashboardMessage;
    }
    // Display successful transaction or balance message
    else if(dashboardState.currentTransaction === 'transactionSuccessful'  ||  dashboardState.currentTransaction === 'checkBalance')
    {
        displaySuccessMessage();
        displayMessages.textContent = dashboardState.dashboardMessage;
        
    }
    else if(dashboardState.currentTransaction === 'deposit')
    {
        depositInput.value = '';
        displayMessages.textContent = dashboardState.dashboardMessage;
        
    }
    // Reset PIN inputs after PIN change
    else if(dashboardState.currentTransaction === 'changePin')
    {
        newPin.value = '';
        confirmPin.value = '';
        displayMessages.textContent = dashboardState.dashboardMessage;
        
    }
    // Default message display
    else 
    {
        displayMessages.textContent = displayStateMessages('', dashboardState.dashboardMessage);
        hideErrorMessage();
        hideSuccessMessage();
    }

    // Display transaction history when available
    if(dashboardState.canDisplayTransactionHistory)
    {
        
        displayTransactionHistory();
        
    }

    // Enable withdrawal button only when withdrawal input is valid
    withdrawButton.disabled = dashboardState.currentTransaction !== 'attemptingWithdrawal' || dashboardState.firstDigitIsZero;

     // Enable deposit button only when deposit input is valid
    depositButton.disabled = dashboardState.currentTransaction !== 'attemptingDeposit' || dashboardState.firstDigitIsZero;

    // Enable PIN confirmation only after four new PIN digits are entered
    confirmPin.disabled = dashboardState.fourDigitNewPinEntered === false;

    // Enable PIN change button only when both PIN fields contain four digits
    changePinButton.disabled = !(dashboardState.changePin.newPin.length === 4 && dashboardState.changePin.confirmPin.length === 4) 
}

// INITIAL UI RENDER
renderUI();