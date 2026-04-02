// --- VERSION CONTROL ---
const JS_VERSION_TIME = "April 02, 2026 - 13:45"; 

let r;
const canvas = document.getElementById('mainCanvas');
const uiTitle = document.getElementById('ui-title');
const uiBody = document.getElementById('ui-body');
const mainBtn = document.getElementById('main-btn');
const loaderContainer = document.getElementById('loader-container');
const progressBar = document.getElementById('progress-bar');
const versionTag = document.getElementById('version-tag');

// --- Gamification Settings ---
let currentLevel = 1;
let isLevelActive = false; 
let errorTimeout = null; // Timer for the 2-second wobble delay

const levels = {
    1: { time: 10, top: '--primary-400', mid: '--primary-300', failTitle: "Uh-oh!", failBody: "Feeling a bit tipsy, are we?" },
    2: { time: 15, top: '--warning-dark', mid: '--warning-mid', failTitle: "Uh-oh! Still wobbly?", failBody: "Feeling a bit tipsy, are we? Let's try to focus a bit harder." },
    3: { time: 20, top: '--info-dark', mid: '--info-mid', failTitle: "Uh-oh! Nearly there!", failBody: "Feeling a bit tipsy, are we? Focus! This is the final stretch." }
};

// --- Detection Settings ---
let currentState = "initial";
let progress = 0;
let timerInterval = null;
let stillnessBuffer = 0;
let successTriggered = false;

const FLAT_LIMIT = 10;           
const SMOOTHING_FACTOR = 0.15;   
let smoothedMovement = 0;
const TABLE_THRESHOLD = 0.07;    
const HAND_STILLNESS_MAX = 0.35; 
const STILLNESS_REQUIRED_FRAMES = 25; 

const isTrueMobile = () => {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const hasSensors = typeof DeviceOrientationEvent !== 'undefined';
    const isUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isUA && hasTouch && hasSensors;
};

const getHex = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const toRive = (v) => parseInt(`0xFF${getHex(v).replace('#', '')}`, 16);

function updateUI(state) {
    if (!isTrueMobile()) state = "desktop";
    currentState = state;
    loaderContainer.style.display = "none";
    uiTitle.style.display = "block";
    mainBtn.style.display = "none";

    const lvl = levels[currentLevel];

    switch(state) {
        case "verification":
            uiTitle.innerText = "How are we feeling this evening?";
            uiBody.innerText = "We want to be sure you have a sober and safe experience before continuing with your deposit.";
            mainBtn.innerText = "START";
            mainBtn.style.display = "block";
            break;
        case "balance":
            uiTitle.innerText = `Level ${currentLevel}`;
            uiBody.innerHTML = "<b>Level your device and hold it flat in your palm.</b>";
            break;
        case "keeping_still":
            uiTitle.innerText = `Level ${currentLevel} in Progress`;
            uiBody.innerHTML = "<b>Hold steady... do not move.</b>";
            loaderContainer.style.display = "block";
            break;
        case "surface_error":
            isLevelActive = false;
            uiTitle.innerText = "Surface Detected";
            uiBody.innerText = "Please pick up your device. You must hold it in your hand to complete the check.";
            mainBtn.innerText = `RESTART LEVEL ${currentLevel}`;
            mainBtn.style.display = "block";
            break;
        case "wobble_error":
            isLevelActive = false;
            uiTitle.innerText = lvl.failTitle;
            uiBody.innerText = lvl.failBody;
            mainBtn.innerText = `TRY AGAIN`;
            mainBtn.style.display = "block";
            break;
        case "level_success":
            isLevelActive = false;
            uiTitle.innerText = "Level Complete!";
            uiBody.innerText = `Great balance. Ready for the next challenge?`;
            mainBtn.innerText = `START LEVEL ${currentLevel + 1}`;
            mainBtn.style.display = "block";
            break;
        case "success":
            isLevelActive = false;
            uiTitle.innerText = "PERFECT BALANCE!";
            uiBody.innerText = "You are officially steady as a rock. Your deposit is ready to go.";
            mainBtn.innerText = "I AM AWESOME";
            mainBtn.style.display = "block";
            break;
    }
    
    let rivType = state;
    if (state === "keeping_still") rivType = "keep";
    if (state === "surface_error" || state === "wobble_error") rivType = "error";
    if (state === "level_success") rivType = "success";
    loadRive(rivType);
}

function loadRive(docType) {
    if (r) r.cleanup();
    let rivType = (docType === "initial") ? "verification" : docType;
    const lvl = levels[currentLevel];

    r = new rive.Rive({
        src: 'assets/document_requst_animation_41.riv',
        canvas: canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            const vmi = r.viewModelByName('ViewModel1')?.defaultInstance();
            if (vmi) {
                r.bindViewModelInstance(vmi);
                vmi.string('document_type').value = rivType;
                
                vmi.color("gradient_top").value = toRive(lvl.top);
                vmi.color("gradient_bottom").value = toRive(lvl.mid);

                vmi.color("gradient_top_error").value = toRive('--error-dark');
                vmi.color("gradient_bottom_error").value = toRive('--error-mid');
                vmi.color("gradient_top_success").value = toRive('--success-dark');
                vmi.color("gradient_bottom_success").value = toRive('--success-mid');
                
                r.play('State Machine 1');
            }
        }
    });
}

function handleSensors(event) {
    if (successTriggered || !isTrueMobile() || !isLevelActive) return;

    const acc = event.acceleration;
    const rawMovement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    smoothedMovement = (smoothedMovement * (1 - SMOOTHING_FACTOR)) + (rawMovement * SMOOTHING_FACTOR);

    window.ondeviceorientation = (orient) => {
        if (!isLevelActive) return;
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (isFlat) {
            // Surface check remains immediate as it's a "cheat" detection
            if (rawMovement < TABLE_THRESHOLD) {
                stillnessBuffer++;
                if (stillnessBuffer > STILLNESS_REQUIRED_FRAMES) failTest("surface_error");
            } 
            // Steady state: Clear any pending wobble errors
            else if (rawMovement >= TABLE_THRESHOLD && smoothedMovement <= HAND_STILLNESS_MAX) {
                clearWobbleTimer();
                stillnessBuffer = 0; 
                if (currentState === "balance") updateUI("keeping_still");
                startTimer();
            }
            // Wobble detected: Start 2-second grace period
            else if (smoothedMovement > HAND_STILLNESS_MAX) {
                stillnessBuffer = 0;
                pauseTimer(); 
                if (!errorTimeout) {
                    errorTimeout = setTimeout(() => {
                        failTest("wobble_error");
                    }, 2000); // 2 Second Delay
                }
            }
        } else {
            // Tilted: Pause timer and wait for return to flat
            stillnessBuffer = 0;
            pauseTimer();
            clearWobbleTimer();
            if (currentState === "keeping_still") updateUI("balance");
        }
    };
}

function clearWobbleTimer() {
    if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
    }
}

function failTest(type) {
    clearWobbleTimer();
    pauseTimer();
    progress = 0;
    progressBar.style.width = '0%';
    updateUI(type);
}

function startTimer() {
    if (timerInterval || !isLevelActive) return;
    const targetTime = levels[currentLevel].time;
    const increment = 10 / targetTime; 

    timerInterval = setInterval(() => {
        progress += increment; 
        progressBar.style.width = Math.min(progress, 100) + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            timerInterval = null;
            levelComplete();
        }
    }, 100);
}

function levelComplete() {
    pauseTimer();
    clearWobbleTimer();
    if (currentLevel < 3) updateUI("level_success");
    else {
        successTriggered = true;
        updateUI("success");
    }
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

mainBtn.addEventListener('click', () => {
    if (currentState === "verification" || currentState === "wobble_error" || currentState === "surface_error" || currentState === "level_success") {
        if (currentState === "level_success") currentLevel++;
        progress = 0;
        progressBar.style.width = '0%';
        isLevelActive = true; 
        
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().then(permission => {
                if (permission === 'granted') {
                    window.addEventListener('devicemotion', handleSensors);
                    updateUI("balance");
                }
            });
        } else {
            window.addEventListener('devicemotion', handleSensors);
            updateUI("balance");
        }
    }
});

function displayVersion() { if (versionTag) versionTag.innerText = `JS Last Updated: ${JS_VERSION_TIME}`; }
displayVersion();
updateUI("verification");