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
    // FIX: Convert the selection (e.g., "BetMGM") to lowercase (e.g., "betmgm")
    const selection = getSelection('theme-group');
    const brand = selection ? selection.toLowerCase() : '';
    
    const speedMs = parseInt(getSelection('speed-group'));
    const welcomeTextValue = welcomeInput.value;
    
    // Path now uses the lowercase brand name: assets/betmgm_intro.riv
    const rivFile = `./assets/${brand}_intro.riv`;

    console.log('[Rive] Attempting to load:', rivFile);

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
        onStateChange: (event) => {
            const states = event.data;
            console.log('[Rive] State changed to:', states);

            if (states.includes('End')){
                console.log('[Rive] Target state reached — initiating fade-out.');
                
                modal.style.pointerEvents = 'none'; 
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

