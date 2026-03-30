let r;
const canvas = document.getElementById('mainCanvas');
const uiTitle = document.getElementById('ui-title');
const uiBody = document.getElementById('ui-body');
const mainBtn = document.getElementById('main-btn');
const loaderContainer = document.getElementById('loader-container');
const progressBar = document.getElementById('progress-bar');

let currentState = "initial";
let progress = 0;
let timerInterval = null;
let stillnessBuffer = 0;
let successTriggered = false;

// Detection Thresholds
const FLAT_LIMIT = 5;
const SURFACE_STILLNESS = 0.05;
const HAND_TREMOR = 0.15;

/** * Desktop Detection 
 */
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const getHex = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const toRive = (v) => parseInt(`0xFF${getHex(v).replace('#', '')}`, 16);

function updateUI(state) {
    // If desktop, override state to desktop
    if (!isMobile()) state = "desktop";
    
    if (currentState === state && state !== "balance") return;
    currentState = state;
    
    // Default visibility resets
    loaderContainer.style.display = "none";
    uiTitle.style.display = "block";
    mainBtn.style.display = "none";

    switch(state) {
        case "desktop":
            uiTitle.style.display = "none";
            uiBody.innerText = "Please use a mobile device for test this feature";
            mainBtn.style.display = "none";
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
    
    let rivType = docType;
    if (docType === "initial") rivType = "verification";

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

                const cocktail = vmi.color("cocktail_color");
                if (cocktail) cocktail.value = toRive('--primary-500');

                const tCol = (rivType === "error") ? toRive('--error-dark') : (rivType === "success") ? toRive('--success-dark') : toRive('--primary-400');
                const bCol = (rivType === "error") ? toRive('--error-mid') : (rivType === "success") ? toRive('--success-mid') : toRive('--primary-300');

                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;
                
                // Set explicit state colors
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
    // Stop all sensor logic if on desktop
    if (!isMobile()) return;
    if (currentState === "verification" || currentState === "success") return;

    const acc = event.acceleration;
    const movement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (isFlat) {
            if (movement < SURFACE_STILLNESS) {
                stillnessBuffer++;
                if (stillnessBuffer > 15 && currentState !== "error") {
                    pauseTimer();
                    updateUI("error");
                }
            } else if (movement > HAND_TREMOR) {
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
            });
        } else {
            window.addEventListener('devicemotion', handleSensors);
            updateUI("balance");
        }
    }
});

// Initial Load
updateUI("verification");