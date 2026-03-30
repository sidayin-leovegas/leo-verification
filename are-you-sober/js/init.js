let r;
const canvas = document.getElementById('mainCanvas');
const progressBar = document.getElementById('progress-bar');
const loaderContainer = document.getElementById('loader-container');

let currentState = null; 
let progress = 0;
let successTriggered = false;
let timerInterval = null;

// Sensitivity & Stability
const FLAT_LIMIT = 5; 
const JITTER_FLOOR = 0.08; // Lowered slightly to require more "stillness" for table detection
let errorDebounceTimer = null; // New: prevents instant error firing

const getRiveColor = (variable) => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const cleanHex = color.replace('#', '').trim();
    return parseInt(`0xFF${cleanHex}`, 16);
};

function updateAnimation(type) {
    if (currentState === type) return; 
    currentState = type;

    // Default BetMGM/Verification Colors
    let tCol = getRiveColor('--primary-400');
    let bCol = getRiveColor('--primary-300');

    // Override colors based on state
    if (type === "error") {
        tCol = getRiveColor('--error-dark');
        bCol = getRiveColor('--error-mid');
    } else if (type === "success") {
        tCol = getRiveColor('--success-dark');
        bCol = getRiveColor('--success-mid');
    }

    if (r) r.cleanup();

    r = new rive.Rive({
        src: 'assets/document_requst_animation.riv',
        canvas: canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            try {
                const vm = r.viewModelByName('ViewModel1');
                const vmi = vm.defaultInstance();

                if (vmi) {
                    r.bindViewModelInstance(vmi);
                    vmi.string('document_type').value = type;

                    // 1. Set global gradient inputs
                    vmi.color("gradient_top").value = tCol;
                    vmi.color("gradient_bottom").value = bCol;

                    // 2. Explicitly set state-specific colors as requested
                    const errorTop = vmi.color(`gradient_top_error`);
                    const errorBottom = vmi.color(`gradient_bottom_error`);
                    const successTop = vmi.color(`gradient_top_success`);
                    const successBottom = vmi.color(`gradient_bottom_success`);

                    // Map the current active colors to the specific Rive slots
                    if (type === "error") {
                        if (errorTop) errorTop.value = tCol;
                        if (errorBottom) errorBottom.value = bCol;
                    }
                    if (type === "success") {
                        if (successTop) successTop.value = tCol;
                        if (successBottom) successBottom.value = bCol;
                    }

                    r.play('State Machine 1');
                }
            } catch (e) {
                console.error('[Rive] VMI Error:', e.message);
            }
        }
    });
}

function handleSensors(event) {
    const acc = event.acceleration;
    const movement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    window.ondeviceorientation = (orient) => {
        const isFlat = Math.abs(orient.beta) < FLAT_LIMIT && Math.abs(orient.gamma) < FLAT_LIMIT;

        // TABLE DETECTION (Error) with 500ms stabilization
        if (isFlat && movement < JITTER_FLOOR) {
            if (!errorDebounceTimer && currentState !== "error") {
                errorDebounceTimer = setTimeout(() => {
                    stopSuccessTimer();
                    updateAnimation("error");
                }, 500); // Must be still for half a second
            }
        } 
        // HANDHELD DETECTION (Success)
        else if (isFlat && movement >= JITTER_FLOOR && !successTriggered) {
            clearErrorDebounce();
            if (currentState === "error") updateAnimation("verification");
            startSuccessTimer();
        } 
        // RESET
        else {
            clearErrorDebounce();
            stopSuccessTimer();
            if (currentState === "error") updateAnimation("verification");
        }
    };
}

function clearErrorDebounce() {
    if (errorDebounceTimer) {
        clearTimeout(errorDebounceTimer);
        errorDebounceTimer = null;
    }
}

function startSuccessTimer() {
    if (timerInterval) return;
    loaderContainer.style.display = 'block';
    timerInterval = setInterval(() => {
        progress += 2; 
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(timerInterval);
            successTriggered = true;
            updateAnimation("success");
            alert("success");
        }
    }, 100);
}

function stopSuccessTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    progress = 0;
    progressBar.style.width = '0%';
    loaderContainer.style.display = 'none';
}

document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(state => {
            if (state === 'granted') {
                window.addEventListener('devicemotion', handleSensors);
                document.getElementById('sensor-overlay').style.display = 'none';
                updateAnimation("verification");
            }
        });
    } else {
        window.addEventListener('devicemotion', handleSensors);
        document.getElementById('sensor-overlay').style.display = 'none';
        updateAnimation("verification");
    }
});