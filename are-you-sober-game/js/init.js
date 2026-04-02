// --- VERSION CONTROL ---
const JS_VERSION_TIME = "April 02, 2026 - 08:35"; 

let r;
const canvas = document.getElementById('mainCanvas');
const uiTitle = document.getElementById('ui-title');
const uiBody = document.getElementById('ui-body');
const mainBtn = document.getElementById('main-btn');
const loaderContainer = document.getElementById('loader-container');
const progressBar = document.getElementById('progress-bar');
const versionTag = document.getElementById('version-tag');
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');

// --- Gamification Settings ---
let currentLevel = 1;
const levels = {
    1: { time: 10, top: '--primary-400', mid: '--primary-300', failTitle: "Uh-oh!", failBody: "Feeling a bit tipsy, are we?" },
    2: { time: 15, top: '--warning-dark', mid: '--warning-mid', failTitle: "Uh-oh! Still wobbly?", failBody: "Feeling a bit tipsy, are we? Let's try to focus a bit harder." },
    3: { time: 20, top: '--info-dark', mid: '--info-mid', failTitle: "Uh-oh! Nearly there!", failBody: "Feeling a bit tipsy, are we? Focus! This is the final stretch before your deposit." }
};

// --- Detection & Sensitivity Settings ---
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

function displayVersion() {
    if (versionTag) {
        versionTag.innerText = `JS Last Updated: ${JS_VERSION_TIME}`;
    }
}

function generateQR() {
    if (qrContainer && qrImage) {
        const currentUrl = window.location.href;
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
        qrContainer.style.display = "inline-flex";
    }
}

function updateUI(state) {
    if (!isTrueMobile()) state = "desktop";
    if (successTriggered && state !== "success") return;
    
    currentState = state;
    loaderContainer.style.display = "none";
    uiTitle.style.display = "block";
    mainBtn.style.display = "none";
    if (qrContainer) qrContainer.style.display = "none";

    const lvl = levels[currentLevel];

    switch(state) {
        case "desktop":
            uiTitle.style.display = "none";
            uiBody.innerText = "Please open this page on a mobile device to test this feature.";
            generateQR();
            break;

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
            uiTitle.innerText = `Starting Level ${currentLevel}`;
            uiBody.innerHTML = `<b>Hold steady... Level ${currentLevel} in progress.</b>`;
            loaderContainer.style.display = "block";
            break;
            
        case "error":
            uiTitle.innerText = lvl.failTitle;
            uiBody.innerText = lvl.failBody;
            mainBtn.innerText = `RESTART LEVEL ${currentLevel}`;
            mainBtn.style.display = "block";
            break;
            
        case "success":
            uiTitle.innerText = "Success!";
            uiBody.innerText = "Verification complete. You've passed all levels!";
            mainBtn.innerText = "DEPOSIT";
            mainBtn.style.display = "block";
            break;
    }
    
    let rivType = state;
    if (state === "keeping_still") rivType = "keep";
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
                
                // Set level-specific colors
                const tCol = (rivType === "error") ? toRive('--error-dark') : (rivType === "success") ? toRive('--success-dark') : toRive(lvl.top);
                const bCol = (rivType === "error") ? toRive('--error-mid') : (rivType === "success") ? toRive('--success-mid') : toRive(lvl.mid);

                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;
                
                r.play('State Machine 1');
            }
        }
    });
}

function handleSensors(event) {
    if (successTriggered || !isTrueMobile()) return;
    if (currentState === "verification" || currentState === "error") return;

    const acc = event.acceleration;
    const rawMovement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    smoothedMovement = (smoothedMovement * (1 - SMOOTHING_FACTOR)) + (rawMovement * SMOOTHING_FACTOR);

    window.ondeviceorientation = (orient) => {
        if (successTriggered || currentState === "error") return;

        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (isFlat) {
            // Table/Surface check
            if (rawMovement < TABLE_THRESHOLD) {
                stillnessBuffer++;
                if (stillnessBuffer > STILLNESS_REQUIRED_FRAMES) {
                    failLevel();
                }
            } 
            // Sway/Steady check
            else if (rawMovement >= TABLE_THRESHOLD && smoothedMovement <= HAND_STILLNESS_MAX) {
                stillnessBuffer = 0; 
                if (currentState === "balance") updateUI("keeping_still");
                if (!successTriggered) startTimer();
            }
            // Too much movement (User is wobbling)
            else if (smoothedMovement > HAND_STILLNESS_MAX) {
                stillnessBuffer = 0;
                pauseTimer();
                if (currentState === "keeping_still") updateUI("balance");
            }
        } else {
            stillnessBuffer = 0;
            pauseTimer();
            if (currentState === "keeping_still") updateUI("balance");
        }
    };
}

function failLevel() {
    pauseTimer();
    progress = 0; // Reset progress for the level
    progressBar.style.width = '0%';
    updateUI("error");
}

function startTimer() {
    if (timerInterval || successTriggered) return;
    const targetTime = levels[currentLevel].time;
    // progress increment based on target time (0.5% every 100ms = 20s total, adjusted here)
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
    if (currentLevel < 3) {
        currentLevel++;
        progress = 0;
        progressBar.style.width = '0%';
        updateUI("balance");
    } else {
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
    if (currentState === "verification" || currentState === "error") {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().then(permission => {
                if (permission === 'granted') {
                    window.addEventListener('devicemotion', handleSensors);
                    updateUI("balance");
                }
            }).catch(console.error);
        } else {
            window.addEventListener('devicemotion', handleSensors);
            updateUI("balance");
        }
    }
});

displayVersion();
updateUI("verification");