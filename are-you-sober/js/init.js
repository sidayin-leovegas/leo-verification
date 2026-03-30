let r;
const canvas = document.getElementById('mainCanvas');
const uiTitle = document.getElementById('ui-title');
const uiBody = document.getElementById('ui-body');
const mainBtn = document.getElementById('main-btn');
const loaderContainer = document.getElementById('loader-container');
const progressBar = document.getElementById('progress-bar');

// --- Detection Settings ---
let currentState = "initial";
let progress = 0;
let timerInterval = null;
let stillnessBuffer = 0;
let successTriggered = false;

const FLAT_LIMIT = 8;           // Forgiving angle for "flat"
const SMOOTHING_FACTOR = 0.1;    // Low-pass filter (0.1 = smooth, ignores jitters)
let smoothedMovement = 0;

const SURFACE_STILLNESS = 0.04;  // Table threshold
const SWAY_THRESHOLD = 0.25;     // Hand-held threshold

/** * Mobile/Sensor Detection 
 */
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
    if (currentState === state && state !== "balance") return;
    
    currentState = state;
    loaderContainer.style.display = "none";
    uiTitle.style.display = "block";
    mainBtn.style.display = "none";

    switch(state) {
        case "desktop":
            uiTitle.style.display = "none";
            uiBody.innerText = "Please use a mobile device for test this feature";
            break;
        case "verification":
            uiTitle.innerText = "How are we feeling this evening?";
            uiBody.innerText = "We want to sure you have a sober and safe experience fore continuing with your deposit.";
            mainBtn.innerText = "CONTINUE";
            mainBtn.style.display = "block";
            break;
        case "balance":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Please hold your mobile device flat in your hand for 20 seconds.</b>";
            break;
        case "keeping_still":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Please keep still ...</b>";
            loaderContainer.style.display = "block";
            break;
        case "error":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Do not put your device down on a table or surface. Pick up your device to continue.</b>";
            break;
        case "success":
            uiTitle.innerText = "Success!";
            uiBody.innerText = "Check completed. Please continue with your deposit and have a wonderful evening!";
            mainBtn.innerText = "DEPOSIT";
            mainBtn.style.display = "block";
            break;
    }
    loadRive(state === "keeping_still" ? "balance" : state);
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

                // cocktail_color
                const cocktail = vmi.color("cocktail_color");
                if (cocktail) cocktail.value = toRive('--primary-500');

                // Dynamic Gradients
                const tCol = (rivType === "error") ? toRive('--error-dark') : (rivType === "success") ? toRive('--success-dark') : toRive('--primary-400');
                const bCol = (rivType === "error") ? toRive('--error-mid') : (rivType === "success") ? toRive('--success-mid') : toRive('--primary-300');

                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;
                
                // Specific layer color sets
                const eT = vmi.color("gradient_top_error"); if(eT) eT.value = toRive('--error-dark');
                const eB = vmi.color("gradient_bottom_error"); if(eB) eB.value = toRive('--error-mid');
                const sT = vmi.color("gradient_top_success"); if(sT) sT.value = toRive('--success-dark');
                const sB = vmi.color("gradient_bottom_success"); if(sB) sB.value = toRive('--success-mid');

                r.play('State Machine 1');
            }
        }
    });
}

function handleSensors(event) {
    if (!isTrueMobile() || currentState === "verification" || currentState === "success") return;

    const acc = event.acceleration;
    const rawMovement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    
    // Apply Low-Pass Filter
    smoothedMovement = (smoothedMovement * (1 - SMOOTHING_FACTOR)) + (rawMovement * SMOOTHING_FACTOR);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (isFlat) {
            if (smoothedMovement < SURFACE_STILLNESS) {
                stillnessBuffer++;
                if (stillnessBuffer > 20) {
                    pauseTimer();
                    updateUI("error");
                }
            } else if (smoothedMovement > SWAY_THRESHOLD) {
                stillnessBuffer = 0;
                if (currentState === "error" || currentState === "balance") updateUI("keeping_still");
                if (!successTriggered) startTimer();
            }
        } else {
            stillnessBuffer = 0;
            pauseTimer();
            if (currentState === "error" || currentState === "keeping_still") updateUI("balance");
        }
    };
}

function startTimer() {
    if (timerInterval || successTriggered) return;
    timerInterval = setInterval(() => {
        progress += 0.5; // 20 seconds
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
            });
        } else {
            window.addEventListener('devicemotion', handleSensors);
            updateUI("balance");
        }
    }
});

updateUI("verification");