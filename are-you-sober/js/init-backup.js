// --- VERSION CONTROL ---
const JS_VERSION_TIME = "March 30, 2026 - 17:42"; 

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
        versionTag.style.color = "#999999"; 
    }
}

function generateQR() {
    if (qrContainer && qrImage) {
        const currentUrl = window.location.href;
        // Using a higher resolution for the QR to keep it crisp
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
        qrContainer.style.display = "inline-flex";
    }
}

function updateUI(state) {
    if (!isTrueMobile()) state = "desktop";
    
    if (successTriggered && state !== "success") return;
    if (currentState === state && state !== "balance") return;
    
    currentState = state;
    loaderContainer.style.display = "none";
    uiTitle.style.display = "block";
    mainBtn.style.display = "none";
    if (qrContainer) qrContainer.style.display = "none";

    switch(state) {
        case "desktop":
            uiTitle.style.display = "none";
            uiBody.innerText = "Please open this page on a mobile device to test this feature.";
            generateQR();
            break;

        case "verification":
            uiTitle.innerText = "How are we feeling this evening?";
            uiBody.innerText = "We want to be sure you have a sober and safe experience before continuing with your deposit.";
            mainBtn.innerText = "CONTINUE";
            mainBtn.style.display = "block";
            break;
            
        case "balance":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Level your device and hold it flat in your palm.</b>";
            break;
            
        case "keeping_still":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Hold steady... keep your device level for 20 seconds.</b>";
            loaderContainer.style.display = "block";
            break;
            
        case "error":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Surface detected. Please pick up your device and hold it in your hand to continue.</b>";
            break;
            
        case "success":
            uiTitle.innerText = "Success!";
            uiBody.innerText = "Check completed. Please continue with your deposit and have a wonderful evening!";
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
                if (vmi.color("cocktail_color")) vmi.color("cocktail_color").value = toRive('--primary-500');

                const tCol = (rivType === "error") ? toRive('--error-dark') : (rivType === "success") ? toRive('--success-dark') : toRive('--primary-400');
                const bCol = (rivType === "error") ? toRive('--error-mid') : (rivType === "success") ? toRive('--success-mid') : toRive('--primary-300');

                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;
                
                if(vmi.color("gradient_top_error")) vmi.color("gradient_top_error").value = toRive('--error-dark');
                if(vmi.color("gradient_bottom_error")) vmi.color("gradient_bottom_error").value = toRive('--error-mid');
                if(vmi.color("gradient_top_success")) vmi.color("gradient_top_success").value = toRive('--success-dark');
                if(vmi.color("gradient_bottom_success")) vmi.color("gradient_bottom_success").value = toRive('--success-mid');

                r.play('State Machine 1');
            }
        }
    });
}

function handleSensors(event) {
    if (successTriggered || !isTrueMobile()) return;
    if (currentState === "verification") return;

    const acc = event.acceleration;
    const rawMovement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    smoothedMovement = (smoothedMovement * (1 - SMOOTHING_FACTOR)) + (rawMovement * SMOOTHING_FACTOR);

    window.ondeviceorientation = (orient) => {
        if (successTriggered) return;

        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (currentState === "error") {
            if (!isFlat || rawMovement > 0.18) {
                stillnessBuffer = 0;
                updateUI("balance"); 
            }
            return; 
        }

        if (isFlat) {
            if (rawMovement < TABLE_THRESHOLD) {
                stillnessBuffer++;
                if (stillnessBuffer > STILLNESS_REQUIRED_FRAMES) {
                    pauseTimer();
                    updateUI("error");
                }
            } 
            else if (rawMovement >= TABLE_THRESHOLD && smoothedMovement <= HAND_STILLNESS_MAX) {
                stillnessBuffer = 0; 
                if (currentState === "balance") updateUI("keeping_still");
                if (!successTriggered) startTimer();
            }
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

function startTimer() {
    if (timerInterval || successTriggered) return;
    timerInterval = setInterval(() => {
        progress += 0.5; 
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            timerInterval = null;
            successTriggered = true;
            updateUI("success");
        }
    }, 100);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

mainBtn.addEventListener('click', () => {
    if (currentState === "verification") {
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