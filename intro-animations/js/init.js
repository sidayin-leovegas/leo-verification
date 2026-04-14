let r;
const canvas = document.getElementById('mainCanvas');
const generateBtn = document.getElementById('generateBtn');
const modal = document.getElementById('animationModal');
const welcomeInput = document.getElementById('welcomeInput');
const radioGroups = ['theme-group', 'speed-group'];

function closeAnimation() {
    console.log("[Rive] Closing animation and restoring interface pointer-events.");
    modal.classList.remove('active');
    modal.style.opacity = '';
    modal.style.transition = '';
    modal.style.pointerEvents = ''; 
    
    if (r) {
        r.cleanup();
        r = null;
    }
}

function initRive() {
    const brand = getSelection('theme-group');
    const speedMs = parseInt(getSelection('speed-group'));
    const welcomeTextValue = welcomeInput.value;
    const rivFile = `assets/${brand}_intro.riv`;

    if (r) { r.cleanup(); }

    r = new rive.Rive({
        src: rivFile,
        canvas: canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        layout: new rive.Layout({
            fit: rive.Fit.Cover,
            alignment: rive.Alignment.Center,
        }),
        /**
         * 🎯 THE DEBUGGER:
         * This will log every state change. 
         * Run the animation once, look at the console, 
         * and see what the LAST name is before the animation "ends".
         */
        onStateChange: (event) => {
            const states = event.data;
            console.log('[Rive] State changed to:', states);

            // Replace 'Outro' with whatever name appears last in your console
            if (states.includes('End')){
                console.log('[Rive] Target state reached — initiating fade-out.');
                
                modal.style.pointerEvents = 'none'; // Click through immediately
                // modal.style.transition = 'opacity 0.5s ease';
                modal.style.opacity = '0';
                
                const fallback = setTimeout(closeAnimation, 600);
                modal.addEventListener('transitionend', () => {
                    clearTimeout(fallback);
                    closeAnimation();
                }, { once: true });
            }
        },
        onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            modal.style.transition = 'none';
            modal.style.opacity = '1';
            modal.classList.add('active');

            try {
                const vm = r.defaultViewModel();
                if (vm) {
                    const vmi = vm.instance();
                    r.bindViewModelInstance(vmi);
                    
                    const welcomeProp = vmi.string('welcomeText');
                    if (welcomeProp) {
                        welcomeProp.value = welcomeTextValue;
                    }

                    setTimeout(() => {
                        const loadingComplete = vmi.boolean('LoadingComplete');
                        if (loadingComplete) {
                            loadingComplete.value = true;
                        }
                    }, speedMs);
                }
            } catch (e) {
                console.error('[Rive] Initialization Error:', e.message);
            }
        }
    });
}

function getSelection(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
}

function validateSelection() {
    const allSelected = radioGroups.every(name => 
        document.querySelector(`input[name="${name}"]:checked`)
    );
    generateBtn.disabled = !allSelected;
}

document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', validateSelection);
});

generateBtn.addEventListener('click', initRive);

const ro = new ResizeObserver(() => {
    if (r && canvas) r.resizeDrawingSurfaceToCanvas();
});
if (canvas.parentElement) ro.observe(canvas.parentElement);

// Global Click Debugger
document.addEventListener('click', (e) => {
    const el = e.target;
    if (el.closest('#animationModal')) {
        console.warn('⚠️ UI Blocked: Clicked inside #animationModal. Classes:', modal.className);
    } else {
        console.log('✅ Clicked outside modal on:', el.tagName, el.id || el.className);
    }
}, true);