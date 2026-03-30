let r;
const canvas = document.getElementById('mainCanvas');
let isOnTable = false;
let flatTimer = null;

// Sensitivity settings
const FLAT_ANGLE = 5; 
const STILLNESS_THRESHOLD = 0.08; // Higher = more jitter allowed before "Table" triggers

/**
 * Converts CSS variables to Rive hex numbers
 * Logic restored from original init.js
 */
const cssToRiveColor = (cssVar) => {
    const cssColor = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    const cleanHex = cssColor.replace('#', '').trim();
    return parseInt(`0xFF${cleanHex}`, 16);
};

function initRive(status = "verification") {
    if (r) r.cleanup();

    // Determine which colors to send based on status
    let topColor, bottomColor;
    if (status === "error") {
        topColor = cssToRiveColor('--error-dark');
        bottomColor = cssToRiveColor('--error-mid');
    } else if (status === "success") {
        topColor = cssToRiveColor('--success-dark');
        bottomColor = cssToRiveColor('--success-mid');
    } else {
        topColor = cssToRiveColor('--primary-400');
        bottomColor = cssToRiveColor('--primary-300');
    }

    r = new rive.Rive({
        src: 'assets/document_requst_animation.riv',
        canvas: canvas,
        stateMachines: 'State Machine 1',
        renderer: 'webgl2',
        useOffscreenRenderer: true,
        autoplay: true,
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            try {
                const vm = r.viewModelByName('ViewModel1');
                const vmi = vm.defaultInstance();

                if (vmi) {
                    r.bindViewModelInstance(vmi);
                    
                    // Set the document type string
                    vmi.string('document_type').value = status;

                    // Set the dynamic colors
                    vmi.color("gradient_top").value = topColor;
                    vmi.color("gradient_bottom").value = bottomColor;

                    // Update secondary state colors as per original logic
                    ["success", "pending", "error", "cs"].forEach(s => {
                        const tProp = vmi.color(`gradient_top_${s}`);
                        const bProp = vmi.color(`gradient_bottom_${s}`);
                        if (tProp) tProp.value = topColor;
                        if (bProp) bProp.value = bottomColor;
                    });

                    r.play('State Machine 1');
                }
            } catch (e) {
                console.error('[Rive] Error:', e.message);
            }
        }
    });
}

function handleSensors(event) {
    // We use acceleration (excluding gravity) to detect "Hand Jitters"
    const acc = event.acceleration;
    const movement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    // Orientation to check if flat
    window.ondeviceorientation = (e) => {
        const isFlat = Math.abs(e.beta) < FLAT_ANGLE && Math.abs(e.gamma) < FLAT_ANGLE;

        // TABLE DETECTION: Flat + Near-zero movement
        if (isFlat && movement < STILLNESS_THRESHOLD) {
            if (!isOnTable) {
                isOnTable = true;
                initRive("error");
                alert("error");
            }
        } 
        // PICKED UP: Significant movement or not flat
        else if (isOnTable && (!isFlat || movement > STILLNESS_THRESHOLD)) {
            isOnTable = false;
            initRive("verification");
        }

        // SUCCESS DETECTION: Flat + Handheld (Stillness > Threshold)
        if (isFlat && movement >= STILLNESS_THRESHOLD) {
            if (!flatTimer) {
                flatTimer = setTimeout(() => {
                    initRive("success");
                    alert("success");
                }, 5000);
            }
        } else {
            clearTimeout(flatTimer);
            flatTimer = null;
        }
    };
}

// Initialization via User Gesture (Required for iOS)
document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        Promise.all([
            DeviceOrientationEvent.requestPermission(),
            DeviceMotionEvent.requestPermission()
        ]).then(results => {
            if (results.every(res => res === 'granted')) {
                window.addEventListener('devicemotion', handleSensors);
                document.getElementById('sensor-overlay').style.display = 'none';
                initRive("verification");
            }
        });
    } else {
        window.addEventListener('devicemotion', handleSensors);
        document.getElementById('sensor-overlay').style.display = 'none';
        initRive("verification");
    }
});