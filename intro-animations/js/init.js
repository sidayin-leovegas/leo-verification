/**
 * Brand Intro Screens 2026 - Initialization Logic
 * Features: Case-insensitive asset loading, ViewModel data injection, 
 * automatic cleanup via onStop, and full-screen cover layout.
 */

let r;
const canvas = document.getElementById('mainCanvas');
const generateBtn = document.getElementById('generateBtn');
const modal = document.getElementById('animationModal');
const welcomeInput = document.getElementById('welcomeInput');

// UI Groups for selection validation
const radioGroups = ['theme-group', 'speed-group'];

/**
 * Resets the modal state and cleans up the Rive instance.
 * Removing the 'active' class allows pointer-events: none to take over.
 */
function closeAnimation() {
    console.log("[Rive] Cleanup: Removing active class and clearing memory.");
    
    // Remove active class to hide modal and disable click-blocking
    modal.classList.remove('active');
    
    // Reset inline styles used for the fade-out transition
    modal.style.opacity = '';
    modal.style.transition = '';
    modal.style.pointerEvents = ''; 
    
    // Destroy the Rive instance to free up memory/resources
    if (r) {
        r.cleanup();
        r = null;
    }
}

/**
 * Ensures all required parameters are selected before enabling the Generate button.
 */
function validateSelection() {
    const allSelected = radioGroups.every(name => 
        document.querySelector(`input[name="${name}"]:checked`)
    );
    generateBtn.disabled = !allSelected;
}

// Attach listeners to all radio buttons for real-time button state updates
document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', validateSelection);
});

/**
 * Helper to get the value of a checked radio button group
 */
function getSelection(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
}

/**
 * Main Rive Initialization
 */
function initRive() {
    // Get the selection (e.g., "BetMGM")
    const rawBrand = getSelection('theme-group');
    
    // Convert to lowercase to match GitHub file naming (e.g., "betmgm")
    const brand = rawBrand ? rawBrand.toLowerCase() : '';
    
    const speedMs = parseInt(getSelection('speed-group'));
    const welcomeTextValue = welcomeInput.value;
    
    // Build path: relative for GitHub Pages compatibility
    const rivFile = `./assets/${brand}_intro.riv`;

    console.log('[Rive] Attempting to load:', rivFile);

    // Clean up any lingering instance before starting a new one
    if (r) { r.cleanup(); }

    r = new rive.Rive({
        src: rivFile,
        canvas: canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        // Set layout to Cover to fill the screen
        layout: new rive.Layout({
            fit: rive.Fit.Cover, 
            alignment: rive.Alignment.Center,
        }),
        /**
         * onStop fires when the Outro animation finishes and the State Machine stops.
         */
        onStop: () => {
            console.log('[Rive] Outro complete — initiating fade-out.');
            
            // Immediate safety: disable pointer events so user can click through
            modal.style.pointerEvents = 'none'; 
            
            // Apply fade transition to the entire modal
            modal.style.transition = 'opacity 0.5s ease';
            modal.style.opacity = '0';
            
            // Safety fallback: force close if transitionend doesn't fire
            const fallback = setTimeout(closeAnimation, 600);

            modal.addEventListener('transitionend', () => {
                clearTimeout(fallback);
                closeAnimation();
            }, { once: true });
        },
        onLoad: () => {
            // Force drawing surface to match CSS-defined 100vw/100dvh
            r.resizeDrawingSurfaceToCanvas();
            
            // Reset modal visibility state for fresh animation
            modal.style.transition = 'none';
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'auto';
            modal.classList.add('active');

            try {
                // Access ViewModel1 and create a local instance to write to
                const vm = r.defaultViewModel();
                if (vm) {
                    const vmi = vm.instance();
                    r.bindViewModelInstance(vmi);
                    
                    // Inject Welcome Text string
                    const welcomeProp = vmi.string('welcomeText');
                    if (welcomeProp) {
                        welcomeProp.value = welcomeTextValue;
                    }

                    // Trigger the 'LoadingComplete' boolean after selected delay
                    setTimeout(() => {
                        const loadingComplete = vmi.boolean('LoadingComplete');
                        if (loadingComplete) {
                            loadingComplete.value = true;
                            console.log(`[Rive] LoadingComplete set to true after ${speedMs}ms`);
                        }
                    }, speedMs);
                } else {
                    console.warn('[Rive] No ViewModel found on this artboard.');
                }
            } catch (e) {
                console.error('[Rive] Init Logic Error:', e.message);
            }
        },
        onLoadError: () => {
            console.error(`[Rive] 404 - Could not find: ${rivFile}`);
            alert(`File not found: ${rivFile}\nEnsure filenames in /assets/ are all lowercase.`);
        }
    });
}

// Event Listeners
generateBtn.addEventListener('click', initRive);

// Watch for screen orientation/resize to keep canvas crisp
const ro = new ResizeObserver(() => {
    if (r && canvas) r.resizeDrawingSurfaceToCanvas();
});
if (canvas.parentElement) ro.observe(canvas.parentElement);

/**
 * Global Debugger: Use this to check if the modal is blocking the UI.
 */
document.addEventListener('click', (e) => {
    const el = e.target;
    if (el.closest('#animationModal')) {
        console.warn('⚠️ UI Blocked: Click detected inside #animationModal.');
    } else {
        console.log('✅ Click outside modal on:', el.tagName, el.id || el.className);
    }
}, true);