let r;
const canvas = document.getElementById('mainCanvas');
const generateBtn = document.getElementById('generateBtn');
const modal = document.getElementById('animationModal');
const welcomeInput = document.getElementById('welcomeInput');
const radioGroups = ['theme-group', 'speed-group'];

function closeAnimation() {
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
    
    // Use ./ to ensure it looks relative to the current project folder
    const rivFile = `assets/${brand}_intro.riv`;

    if (r) { r.cleanup(); }

    r = new rive.Rive({
        src: rivFile,
        canvas: canvas,
        stateMachines: 'State Machine 1',
        autoplay: true,
        onLoad: () => {
            // ONLY trigger UI block if load is successful
            r.resizeDrawingSurfaceToCanvas();
            modal.style.transition = 'none';
            modal.style.opacity = '1';
            modal.classList.add('active');

            try {
                const vm = r.defaultViewModel();
                if (vm) {
                    const vmi = vm.instance();
                    r.bindViewModelInstance(vmi);
                    if (vmi.string('welcomeText')) vmi.string('welcomeText').value = welcomeTextValue;

                    setTimeout(() => {
                        const loadingComplete = vmi.boolean('LoadingComplete');
                        if (loadingComplete) loadingComplete.value = true;
                    }, speedMs);
                }
            } catch (e) {
                console.error('[Rive] Init Error:', e.message);
            }
        },
        onLoadError: () => {
            console.error(`[Rive] 404 - Could not find: ${rivFile}`);
            alert(`File not found: ${rivFile}\n\nCheck case-sensitivity and folder structure.`);
        },
        onStop: () => {
            modal.style.pointerEvents = 'none';
            modal.style.transition = 'opacity 0.5s ease';
            modal.style.opacity = '0';
            const fallback = setTimeout(closeAnimation, 600);
            modal.addEventListener('transitionend', () => {
                clearTimeout(fallback);
                closeAnimation();
            }, { once: true });
        }
    });
}

// Helper functions
function getSelection(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
}

function validateSelection() {
    const allSelected = radioGroups.every(name => document.querySelector(`input[name="${name}"]:checked`));
    generateBtn.disabled = !allSelected;
}

document.querySelectorAll('input[type="radio"]').forEach(radio => radio.addEventListener('change', validateSelection));
generateBtn.addEventListener('click', initRive);