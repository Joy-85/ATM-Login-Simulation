/*
ATM SIMULATION - LOGIN MODULE
Description:
This module implements the login workflow for an ATM simulation using a state-driven architecture.
Concepts practiced:
        - State Management
        - Finite State Machine (FSM)
        - State Transitions
        - Business Rules
        - Form Validation
        - UI Rendering
        - Local Storage
        - Session Persistence
        - Event-Driven Programming

Author: Joy Amarachi Ugwuoke

*/
const cardNumber = document.getElementById('cardNumber');
const pinNumber = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const resetButton = document.getElementById('resetButton');
const messages = document.getElementById('message');

// ATM Login State, appState is the single source of truth for the login page. Every user interaction updates this object,  and renderUI() reflects its current state on screen.
const appState = {
    currentStage: 'loggedOut',
    card : '',
    pin : '',
    selectedAccount: {},
    message: '',
    hasEnteredValidCard: false,
    hasEnteredValidPin: false,
    failedAttempt : 0,
    cardError : false,
    pinError : false,
    invalidCardData :false,
    invalidPinData : false,
    noMatchedUser : false,
    remainLoggedOut : false,
}

// Tracks the previous application state to avoid processing the same state twice.
let previousStage = 'loggedOut';

// Application constants.
const completeCardDigits = 16;
const completePinDigits = 4;

// Records the sequence of state transitions.
const stageHistory = [];

// Sample account records used for login validation.
const userJohn = {
    name: 'John Doe',
    card: '1234567890123456',
    pin : '1234',
}
const userJane = {
    name: 'Jane Smith',
    card: '9876543210987654',
    pin: '5678',
}
const userBob = {
    name: 'Bob Johnson',
    card: '1111222233334444',
    pin: '9999',
}

// Defines the valid paths the application can move between states. Prevents invalid state transitions.
const allowedStateTransition = {
    loggedOut: ['loggedIn', 'locked', 'error' ],
    locked: ['loggedOut'],
    loggedIn : ['loggedOut'],
    error : ['loggedOut'],
}

// Configuration for each application state. Stores the UI messages associated with each stage of the login flow.
const stageConfig = {
    loggedOut: {
        messages: {
            invalidCard : 'Card number must be 16 digits',
            invalidPin : 'Pin number must be 4 digits',
            invalidData: 'Input must contain only numbers',
            matchedAccount : 'Card number and pin number must match an account user',
            reset: '',
        },
    },
    locked: {
        messages: {
            locked: 'You have exceeded the maximum number of login attempts. Please, click the reset button to try again',
        },
    },
    loggedIn: {
        messages: {
            success: 'You have successfully logged in',
        },
    },
    
}

// Event Listeners
// Respond to user interactions on the login page.

loadAppState();

cardNumber.addEventListener('input', (e) =>{
    // e.target.value = e.target.value.replace(/\D/g, '');
    appState.card = e.target.value;
    handleUserInput(appState.card, completeCardDigits, completePinDigits, appState.pin);
})

pinNumber.addEventListener('input', (e) => {
    // e.target.value = e.target.value.replace(/\D/g, '');
    appState.pin = e.target.value;
    handleUserInput(appState.card, completeCardDigits, completePinDigits, appState.pin);
})

loginButton.addEventListener('click', () => {
    canLogin(appState.card, completeCardDigits,appState.pin, completePinDigits  );
})

resetButton.addEventListener('click' , () => {
    reset('loggedOut');
})

//Resets the application from the locked state back to the logged-out state.
function reset(nextStage){
    if (!canTransition(nextStage))
    {
        return;
    }
    transitionTo(nextStage);
    
}

// Coordinates the login process. Determines which state the application should move to after evaluating the business rules.
function canLogin(cardInput, cardDigits, pinInput, pinDigits){
    
    if(!loginBusinessRule(cardInput, cardDigits, pinInput, pinDigits))
    {
        if(appState.remainLoggedOut)
        {
            transitionTo('loggedOut');
        }
        else
        {
            transitionTo('locked');
        }
    }
    else
    {
        transitionTo('loggedIn');
    }
}

// Saves the current application state so the user's session can survive a page refresh.
function saveAppState(){
    sessionStorage.setItem("appState", JSON.stringify(appState));
}

// Restores the last saved application state when the page loads.
function loadAppState(){
    const storedState = sessionStorage.getItem('appState');

    if(storedState)
    {
        Object.assign(appState, JSON.parse(storedState));
    }
    handleLoginFlow();
}

// Checks whether the current state is allowed to transition into the requested next state.
function canTransition(nextStage){
    return allowedStateTransition[appState.currentStage]
    .includes(nextStage);
}

// Changes the application's current state. Every state change passes through here.
function transitionTo(nextStage){
    if (!canTransition(nextStage))
    {
        return;
    }
    appState.currentStage = nextStage;
    handleLoginFlow();
}

// Performs actions whenever the application enters a new state. Updates state data, stores session, redirects when necessary, and refreshes the UI.
function handleLoginFlow(){
    const currentConfig = stageConfig[appState.currentStage];
    if(appState.currentStage === previousStage)
    {
        return;
    }
    
    if(appState.currentStage === 'locked')
    {
        appState.message = currentConfig.messages.locked;
    }
    else if(appState.currentStage === 'loggedIn')
    {
        appState.message = currentConfig.messages.success;
        appState.failedAttempt = 0;
        saveAppState();
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
    else if(appState.currentStage === 'loggedOut')
    {
        appState.failedAttempt = 0;
        appState.noMatchedUser = false;
        appState.message = currentConfig.messages.reset;
    }
    
    previousStage = appState.currentStage;
    stageHistory.push(appState.currentStage);
    renderUI();
}

// Contains the business rules that determine whether a login attempt succeeds, fails, or results in a locked account.
function loginBusinessRule(cardInput, cardDigits, pinInput, pinDigits){
    let verifiedUser;
    if(!validateUserInput(cardInput, cardDigits, pinInput, pinDigits))
    {
        appState.remainLoggedOut = true;
        verifiedUser = false;
        return;
    }

    if(!getMatchedUser(cardInput, pinInput))
    {
        if(appState.failedAttempt < 3)
        {
            appState.failedAttempt++;
            appState.remainLoggedOut = true;
            verifiedUser = false;
            return ;
        }
        else 
        {
            appState.remainLoggedOut = false;
            verifiedUser = false;
            appState.hasEnteredValidCard = false;
            appState.hasEnteredValidPin = false;
        }
    }
    else 
    {
        appState.remainLoggedOut = false;
        verifiedUser = true;
    }
    return verifiedUser;
}

// Searches for an account whose card number and PIN match the user's input. Stores the matched account information.
function getMatchedUser(card, pin){
    let isMatched = false;
    if(compareInputAndAccount(card, userJohn.card) && compareInputAndAccount(pin, userJohn.pin))
    {
        appState.selectedAccount.name = 'John Doe';
        appState.selectedAccount.card = '1234567890123456';
        appState.selectedAccount.pin = '1234';
        isMatched = true;
        appState.noMatchedUser = false;
    }
    else if(compareInputAndAccount(card, userJane.card) && compareInputAndAccount(pin, userJane.pin))
    {
        appState.selectedAccount.name = 'Jane Smith';
        appState.selectedAccount.card = '9876543210987654';
        appState.selectedAccount.pin =  '5678';
        isMatched = true;
        appState.noMatchedUser = false;
    }
    else if(compareInputAndAccount(card, userBob.card) && compareInputAndAccount(pin, userBob.pin))
    {
        appState.selectedAccount.name = 'Bob Johnson';
        appState.selectedAccount.card =  '1111222233334444';
        appState.selectedAccount.pin =  '9999';
        isMatched = true;
        appState.noMatchedUser = false;
    }
    else 
    {
        appState.noMatchedUser = true;
    }
    renderUI();
    return isMatched;
}

// Compares a user input value with the stored account value.
function compareInputAndAccount(userInput, matchedAccount){
    if(userInput === matchedAccount)
    {
        return true;
    }
    else
    {
        return false;
    }
}

// Validates the user's card number and PIN. Checks both length and data format before login is attempted.
function validateUserInput(cardInput, cardDigits, pinInput, pinDigits) {
    let validCardEntry ;
    let validPinEntry ;
    if(cardInput.length !== cardDigits)
    {
        appState.cardError = true;
        validCardEntry = false;
        renderUI();
        return validCardEntry;
    }
    else if(!checkDataFormat(cardInput))
    {
        appState.invalidCardData = true;
        validCardEntry = false;
        renderUI();
        return validCardEntry;
    }
    else
    {
        appState.cardError = false;
        validCardEntry = true;
    }
    
    if(pinInput.length !== pinDigits)
    {
        appState.pinError = true;
        validPinEntry = false;
        renderUI();
        return validPinEntry;
    }
    else if(!checkDataFormat(pinInput))
    {
        appState.invalidPinData = true;
        validPinEntry = false;
        renderUI();
        return validPinEntry;
    }
    else
    {
        appState.pinError = false;
        validPinEntry = true;
        // renderUI();
    }
    let entry = validCardEntry && validPinEntry;
    return entry;
}

// Checks whether an input contains only numeric characters.
function checkDataFormat(userInput){
    const regex = /^\d+$/;
    let result = regex.test(userInput);
    return result;
}

// Responds to user typing. Updates state variables used for enabling controls and clearing validation errors.
function handleUserInput(cardData, cardDigits, pinDigits, pinData) {
    if(cardData.length === cardDigits)
    {
        appState.hasEnteredValidCard = true;
        appState.cardError = false;
    }
    
    if(pinData.length === pinDigits)
    {
        appState.hasEnteredValidPin = true;
        appState.pinError = false;
    }
    
    if(checkDataFormat(cardData))
    {
        appState.invalidCardData = false;
    }
    if(checkDataFormat(pinData))
    {
        appState.invalidPinData = false;
    }
    renderUI();
}

function displayErrorMessage(){
    messages.classList.add('displayErrorMessages');
}
function hideErrorMessage(){
    messages.classList.remove('displayErrorMessages');
}
function displaySuccessMessage(){
    messages.classList.add('displaySuccessMessages');
}
function hideSuccessMessage(){
    messages.classList.remove('displaySuccessMessages');
}


// Synchronizes the user interface with the current application state. Displays messages, validation errors, enables/disables controls, and updates the form.
function renderUI(){
    const currentConfig = stageConfig[appState.currentStage];
    if(appState.cardError)
    {
        cardNumber.style.border = '1px solid red';
        displayErrorMessage();
        messages.textContent = currentConfig.messages.invalidCard;
        return;
    }
    else if(appState.invalidCardData)
    {
        cardNumber.style.border = '1px solid red';
        displayErrorMessage();
        messages.textContent = currentConfig.messages.invalidData;
        return;
    }
    else
    {
        cardNumber.style.border = '';
        hideErrorMessage();
        messages.textContent = '';
    }
    
    if(appState.pinError)
    {
        pinNumber.style.border = '1px solid red';
        displayErrorMessage();
        messages.textContent = currentConfig.messages.invalidPin;
        return;
    }
    else if (appState.invalidPinData)
    {
        pinNumber.style.border = '1px solid red';
        displayErrorMessage();
        messages.textContent = currentConfig.messages.invalidData;
        return;
    }
    else
    {
        pinNumber.style.border = '';
        hideErrorMessage();
        messages.textContent = '';
    }

    if(appState.currentStage === 'locked' )
    {
        displayErrorMessage();
        messages.textContent = appState.message;
    }
    else if(appState.currentStage === 'loggedIn')
    {
        displaySuccessMessage();
        messages.textContent = appState.message;
    }
    else if(appState.noMatchedUser)
    {
        displayErrorMessage();
        messages.textContent = currentConfig.messages.matchedAccount;
    }
    else 
    {
        hideErrorMessage();
        hideSuccessMessage();
        messages.textContent = '';
    }
    
    if(appState.currentStage === 'loggedIn' || appState.currentStage === 'locked')
    {
        cardNumber.value = '';
        pinNumber.value = '' ;
    }
    
    cardNumber.disabled = appState.currentStage === 'locked';
    pinNumber.disabled = !appState.hasEnteredValidCard ;
    loginButton.disabled = !appState.hasEnteredValidPin ;
    resetButton.disabled = appState.currentStage !== 'locked';
}

// Render the initial UI when the page first loads.
renderUI();