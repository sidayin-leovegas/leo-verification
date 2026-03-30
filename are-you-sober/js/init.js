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

const FLAT_LIMIT = 5;
const SURFACE_STILLNESS = 0.05;
const HAND_TREMOR = 0.15;

const getHex = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const toRive = (v) => parseInt(`0xFF${getHex(v).replace('#', '')}`, 16);

function updateUI(state) {
    currentState = state;
    loaderContainer.style.display = "none";
    
    switch(state) {
        case "verification":
            uiTitle.innerText = "How are we feeling this evening?";
            uiBody.innerText = "We want to sure you have a sober and safe experience fore continuing with your deposit.";
            mainBtn.innerText = "CONTINUE";
            mainBtn.style.display = "block";
            break;
            
        case "balance":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Please hold your mobile device flat in your hand for 20 seconds.</b>";
            mainBtn.style.display = "none";
            break;
            
        case "keeping_still":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Please keep still ...</b>";
            loaderContainer.style.display = "block";
            break;
            
        case "error":
            uiTitle.style.display = "none";
            uiBody.innerHTML = "<b>Do not put your device down on a table or surface. Pick up your device to continue.</b>";
            mainBtn.style.display = "none";
            break;
            
        case "success":
            uiTitle.style.display = "block";
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
    
    // Mapping internal states to Rive document_type values
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

                // cocktail_color set to primary-500
                const cocktail = vmi.color("cocktail_color");
                if (cocktail) cocktail.value = toRive('--primary-500');

                // State specific colors
                const tCol = (rivType === "error") ? toRive('--error-dark') : (rivType === "success") ? toRive('--success-dark') : toRive('--primary-400');
                const bCol = (rivType === "error") ? toRive('--error-mid') : (rivType === "success") ? toRive('--success-mid') : toRive('--primary-300');

                vmi.color("gradient_top").value = tCol;
                vmi.color("gradient_bottom").value = bCol;
                
                // State specifics
                const eT = vmi.color("gradient_top_error"); if(eT) eT.value = toRive('--error-dark');
                const sT = vmi.color("gradient_top_success"); if(sT) sT.value = toRive('--success-dark');
            }
        }
    });
}

function handleSensors(event) {
    if (currentState === "verification" || currentState === "success") return;

    const acc = event.acceleration;
    const movement = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        if (isFlat) {
            if (movement < SURFACE_STILLNESS) {
                stillnessBuffer++;
                if (stillnessBuffer > 15 && currentState !== "error") {
                    stopTimer();
                    updateUI("error");
                }
            } else if (movement > HAND_TREMOR) {
                stillnessBuffer = 0;
                if (currentState === "error" || currentState === "balance") updateUI("keeping_still");
                startTimer();
            }
        } else {
            stillnessBuffer = 0;
            stopTimer();
            if (currentState === "error") updateUI("balance");
        }
    };
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        progress += 0.5; // Adjusted for 20 seconds (100 / (20 * 10))
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            updateUI("success");
        }
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    if (currentState === "keeping_still") updateUI("balance");
    progress = 0;
    progressBar.style.width = '0%';
}

mainBtn.addEventListener('click', () => {
    if (currentState === "initial" || currentState === "verification") {
        // Request Permissions & Start
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
    } else if (currentState === "success") {
        alert("Redirecting to Deposit...");
    }
});

// Initial Load
updateUI("verification");