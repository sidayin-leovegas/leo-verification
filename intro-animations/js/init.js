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
    // Get the selection (e.g., "BetMGM")
    const rawBrand = getSelection('theme-group');
    
    // Convert to lowercase to match your filenames (e.g., "betmgm")
    const brand = rawBrand ? rawBrand.toLowerCase() : '';
    
    const speedMs = parseInt(getSelection('speed-group'));
    const welcomeTextValue = welcomeInput.value;
    
    // Build the path with the lowercase brand
    const rivFile = `./assets/${brand}_intro.riv`;

    console.log('[Rive] Loading file:', rivFile);

    if (r) { r.cleanup(); }

    r = new rive.Rive({
        src: rivFile,
        canvas: canvas,
        // ... rest of your config

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