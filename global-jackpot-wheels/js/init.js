/**
 * Global Jackpot 2026 - Initialization Logic
 * Handles Rive runtime, ViewModel data injection, and Modal state.
 */

let r;
const canvas = document.getElementById('mainCanvas');
const generateBtn = document.getElementById('generateBtn');
const modal = document.getElementById('animationModal');
const closeModal = document.getElementById('closeModal');
const radioGroups = ['theme-group', 'win-group', 'ex-group'];

/**
 * UI Validation: Ensures all three parameters are selected before allowing generation.
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

function getSelection(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
}

function getThemeText() {
    // Finds the radio button that is currently checked
    const selected = document.querySelector('input[name="theme-group"]:checked');
    
    // Returns the .value attribute (e.g., "LeoVegas") instead of the label text
    return selected ? selected.value : null;
}

/**
 * Maps Win Level to specific Display Strings
 */
function getWinText(level) {
    const winMap = { 1: "MINI WIN", 2: "MINOR WIN", 3: "MAJOR WIN", 4: "MEGA WIN" };
    return winMap[level] || "";
}

/**
 * Maps Win Level to specific Currency Strings
 */
function getWinAmount(level) {
    const amountMap = {
        1: "783,38 kr",
        2: "1 894,29 kr",
        3: "R$250,023.12",
        4: "€12,989,128.92"
    };
    return amountMap[level] || "0,00 kr";
}

/**
 * Initializes Rive, binds the Jackpot Instance, and injects FE data.
 */
function initRive() {
    const themeName = getThemeText();
    const winLevel = parseInt(getSelection('win-group'));
    const exLevel = parseInt(getSelection('ex-group'));
    const winText = getWinText(winLevel);
    const winAmount = getWinAmount(winLevel);
    console.log("Theme=", themeName);

    // Clean up previous instance to manage memory and prevent event overlap
    if (r) { r.cleanup(); }

    r = new rive.Rive({
        src: 'assets/global_jackpot_wheels_2026.riv?v=16',
        canvas: canvas,
        artboard: 'Jackpot animation',
        stateMachines: 'State Machine 1',
        autoplay: true,
        layout: new rive.Layout({
            fit: rive.Fit.Cover,
            alignment: rive.Alignment.BottomCenter, // Keeps the wheel pinned to the safe bottom
        }),
        onLoad: () => {
            // Ensure the drawing surface matches the 100dvh CSS container
            r.resizeDrawingSurfaceToCanvas();
            
            // Show the modal
            modal.classList.add('active');

            try {
                // Access the specific ViewModel Instance bound to the artboard
                const jackpotVM = r.viewModelByName('Jackpot');
                const vmi = jackpotVM.instanceByName('Jackpot Instance');

                if (vmi) {
                    // Explicitly bind this instance so the State Machine consumes this data
                    r.bindViewModelInstance(vmi);
                    
                    // 1. Inject Numeric values for State Machine conditions
                    vmi.number('winLevel').value = winLevel;
                    vmi.number('excitementLevel').value = exLevel;
                    
                    // 2. Inject Main String values
                    if (vmi.string('brand')) vmi.string('brand').value = themeName;
                    if (vmi.string('introText')) vmi.string('introText').value = "JACKPOT TRIGGERED!";
                    if (vmi.string('winText')) vmi.string('winText').value = winText;
                    if (vmi.string('winAmount')) vmi.string('winAmount').value = winAmount;

                    // 3. Update all nested Brand components (Wheels, Logo, Diamonds)
                    const brandComponents = {
                        'spin1': vmi.viewModel('spin1'),
                        'spin2': vmi.viewModel('spin2correct'),
                        'spin3': vmi.viewModel('spin3correct'),
                        'spin4': vmi.viewModel('spin4correct'),
                        'indicator': vmi.viewModel('indicator'),
                        'logo': vmi.viewModel('logo'),
                        'winDiamond': vmi.viewModel('winDiamond') 
                    };

                    for (const key in brandComponents) {
                        const vm = brandComponents[key];
                        if (vm) {
                            const componentBrand = vm.string('brand');
                            if (componentBrand) componentBrand.value = themeName;
                        }
                    }
                    
                    // Trigger the animation sequence
                    r.play('State Machine 1');
                    console.log(`[Rive] Data Bound: ${themeName} | ${winText} | ${winAmount}`);
                }
            } catch (e) {
                console.error('[Rive] Initialization Error:', e.message);
            }
        }
    });
}

// Event Listeners
generateBtn.addEventListener('click', initRive);

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
    if (r) { r.cleanup(); }
});

// Watch for screen orientation changes to maintain BottomCenter alignment
const ro = new ResizeObserver(() => {
    if (r && canvas) r.resizeDrawingSurfaceToCanvas();
});
if (canvas.parentElement) ro.observe(canvas.parentElement);