// Variabile globale
let storages = [];
let editingStorageId = null;
let confirmOkCallback = null;
let activeOptionsMenu = null;

let gradientPresets = [];
const defaultGradientPreset = {
    name: "Vibrant Implicit",
    colorTop: "rgba(35, 219, 250, 1)",
    colorBottom: "rgba(1, 255, 74, 1)",
    speed: 40
};
let currentlyAppliedPresetName = defaultGradientPreset.name;

// Elementele DOM pentru gradient settings
let openGradientSettingsButton, gradientSettingsPanel, closeGradientSettingsButton,
    gradientNameInput, gradientColorTopInput, gradientColorBottomInput,
    gradientSpeedInput, saveGradientPresetButton,
    savedGradientsSelect, loadGradientPresetButton, deleteGradientPresetButton,
    gradientPanelErrorDiv;

const userImageColors = [
    '#D81E05', '#F47920', '#00A65D', '#0072BC', '#2E3192',
    '#662D91', '#C72182', '#5A7C8D', '#7E804D', '#D1C085'
];

document.addEventListener('DOMContentLoaded', () => {
    loadStorages();
    renderColorPicker();
    renderStorages();
    document.addEventListener('click', handleGlobalClick);

    openGradientSettingsButton = document.getElementById('open-gradient-settings-button');
    gradientSettingsPanel = document.getElementById('gradient-settings-panel');
    closeGradientSettingsButton = document.getElementById('close-gradient-settings-button');
    gradientNameInput = document.getElementById('gradient-name');
    gradientColorTopInput = document.getElementById('gradient-color-top');
    gradientColorBottomInput = document.getElementById('gradient-color-bottom');
    gradientSpeedInput = document.getElementById('gradient-speed');
    saveGradientPresetButton = document.getElementById('save-gradient-preset-button');
    savedGradientsSelect = document.getElementById('saved-gradients-select');
    loadGradientPresetButton = document.getElementById('load-gradient-preset-button');
    deleteGradientPresetButton = document.getElementById('delete-gradient-preset-button');
    if (gradientSettingsPanel) {
      gradientPanelErrorDiv = gradientSettingsPanel.querySelector('.gradient-panel-error.xp-error-message');
    }

    if (openGradientSettingsButton && gradientSettingsPanel) {
        openGradientSettingsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            gradientSettingsPanel.style.display = 'block';
            const activePreset = gradientPresets.find(p => p.name === currentlyAppliedPresetName) ||
                                 {...defaultGradientPreset, name: defaultGradientPreset.name};
            populatePanelInputs(activePreset);
            if (gradientPanelErrorDiv) gradientPanelErrorDiv.style.display = 'none';
        });
    }
    if (closeGradientSettingsButton && gradientSettingsPanel) {
        closeGradientSettingsButton.addEventListener('click', () => {
            gradientSettingsPanel.style.display = 'none';
        });
    }
    // Listener pentru noul modal de info
    const infoModal = document.getElementById('custom-info-modal');
    const infoOkButton = document.getElementById('custom-info-ok');
    const infoCloseButton = document.getElementById('custom-info-close-button');

    if (infoModal && infoOkButton) {
        infoOkButton.addEventListener('click', () => infoModal.style.display = 'none');
    }
    if (infoModal && infoCloseButton) {
        infoCloseButton.addEventListener('click', () => infoModal.style.display = 'none');
    }


    loadGradientPresetsFromStorage();
    populatePresetsSelect();
    applyCurrentGradient();

    if (saveGradientPresetButton) saveGradientPresetButton.addEventListener('click', handleSaveGradientPreset);
    if (loadGradientPresetButton) loadGradientPresetButton.addEventListener('click', handleLoadGradientPreset);
    if (deleteGradientPresetButton) deleteGradientPresetButton.addEventListener('click', handleDeleteGradientPreset);

    if(gradientColorTopInput) gradientColorTopInput.addEventListener('input', previewCurrentGradient);
    if(gradientColorBottomInput) gradientColorBottomInput.addEventListener('input', previewCurrentGradient);
    if(gradientSpeedInput) gradientSpeedInput.addEventListener('input', previewCurrentGradient);
});

// Funcții pentru gestionarea culorilor
function lightenHexColor(hex, percent) {
    if (!hex || typeof hex !== 'string') return '#FFFFFF';
    let h = hex.replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(char => char + char).join('');
    if (h.length !== 6) return '#FFFFFF';
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function convertHexToRgbObject(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return null;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(char => char + char).join('');
    if (h.length !== 6) return null;
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16)
    };
}

function blendColors(hex1, hex2, ratio = 0.5) {
    const c1 = convertHexToRgbObject(hex1);
    const c2 = convertHexToRgbObject(hex2);
    if (!c1 || !c2) return '#808080'; // Gri ca fallback dac una din culori e invalidă
    const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
    const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
    const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


function convertHexToRgba(hexColor, alpha = 1) {
    const rgbObj = convertHexToRgbObject(hexColor);
    if (!rgbObj) return `rgba(0,0,0,${alpha})`; // Fallback
    return `rgba(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b}, ${alpha})`;
}

function convertRgbaToHex(rgbaColor) {
    if (!rgbaColor || !rgbaColor.toLowerCase().startsWith('rgba')) {
        if (rgbaColor && rgbaColor.startsWith('#') && (rgbaColor.length === 7 || rgbaColor.length === 4)) return rgbaColor;
        return typeof rgbaColor === 'string' ? rgbaColor : '#000000';
    }
    const parts = rgbaColor.substring(rgbaColor.indexOf('(') + 1, rgbaColor.lastIndexOf(')')).split(/,\s*/);
    if (parts.length < 3) return '#000000';
    let r = parseInt(parts[0], 10);
    let g = parseInt(parts[1], 10);
    let b = parseInt(parts[2], 10);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getLuminance(hexColor) {
    const rgbObj = convertHexToRgbObject(hexColor);
    if(!rgbObj) return 0;
    return 0.2126 * rgbObj.r + 0.7152 * rgbObj.g + 0.0722 * rgbObj.b;
}

function getContrastingTextColor(bgColor) {
    if (!bgColor) return '#FFFFFF';
    const luminance = getLuminance(bgColor);
    return luminance < 140 ? '#FFFFFF' : '#000000';
}

// --- Functii pentru Meniul de Optiuni al Depozitelor ---
function closeActiveOptionsMenu() {
    if (activeOptionsMenu) {
        activeOptionsMenu.remove();
        activeOptionsMenu = null;
    }
}

function toggleOptionsMenu(buttonElement, storageId, storageName) {
    if (activeOptionsMenu && activeOptionsMenu.dataset.triggerStorageId === storageId.toString()) {
        closeActiveOptionsMenu();
        return;
    }
    closeActiveOptionsMenu();

    const menu = document.createElement('div');
    menu.className = 'storage-options-menu xp-options-menu active';
    menu.dataset.triggerStorageId = storageId.toString();

    menu.innerHTML = `
        <div class="xp-menu-item" data-action="edit">Editează</div>
        <div class="xp-menu-item" data-action="delete">Șterge</div>
    `;
    document.body.appendChild(menu);
    activeOptionsMenu = menu;

    const rect = buttonElement.getBoundingClientRect();
    let topPosition = rect.bottom + window.scrollY + 2;
    let leftPosition = rect.left + window.scrollX;

    requestAnimationFrame(() => {
        if (!activeOptionsMenu) return;
        const menuWidth = activeOptionsMenu.offsetWidth;
        const menuHeight = activeOptionsMenu.offsetHeight;
        if (leftPosition + menuWidth > window.innerWidth - 10) {
            leftPosition = rect.right + window.scrollX - menuWidth;
        }
        if (leftPosition < 10) leftPosition = 10;
        if (topPosition + menuHeight > window.innerHeight - 10) {
            topPosition = rect.top + window.scrollY - menuHeight - 2;
            if (topPosition < 10) topPosition = 10;
        }
        activeOptionsMenu.style.top = `${topPosition}px`;
        activeOptionsMenu.style.left = `${leftPosition}px`;
    });

    menu.querySelectorAll('.xp-menu-item').forEach(item => {
        item.addEventListener('click', (event) => {
            event.stopPropagation();
            const action = item.dataset.action;
            const numericStorageId = parseInt(storageId, 10);
            if (action === 'edit') openStorageModal(numericStorageId);
            else if (action === 'delete') deleteStorage(numericStorageId, `Ștergeți depozitul "${storageName}"?`);
            closeActiveOptionsMenu();
        });
    });
}

// --- Handler Global de Click Unificat ---
function handleGlobalClick(event) {
    const clickedElement = event.target;
    if (activeOptionsMenu && !activeOptionsMenu.contains(clickedElement) && !clickedElement.closest('.xp-storage-options-button')) {
        closeActiveOptionsMenu();
    }
    const storageModalOverlay = document.getElementById('storage-modal');
    const confirmModalOverlay = document.getElementById('custom-confirm-modal');
    const infoModalOverlay = document.getElementById('custom-info-modal');

    if (storageModalOverlay && clickedElement === storageModalOverlay && storageModalOverlay.style.display === 'flex') closeStorageModal();
    if (confirmModalOverlay && clickedElement === confirmModalOverlay && confirmModalOverlay.style.display === 'flex') handleConfirmCancel();
    if (infoModalOverlay && clickedElement === infoModalOverlay && infoModalOverlay.style.display === 'flex') infoModalOverlay.style.display = 'none';

    if (gradientSettingsPanel && gradientSettingsPanel.style.display === 'block') {
        if (!gradientSettingsPanel.contains(clickedElement) && clickedElement !== openGradientSettingsButton && (!openGradientSettingsButton || !openGradientSettingsButton.contains(clickedElement))) {
            gradientSettingsPanel.style.display = 'none';
        }
    }
}

// --- Functii pentru Notificari Modale ---
function showInfoModal(message, title = "Informație", iconClass = "fa-info-circle", iconColor = "#0078D7") {
    const infoModal = document.getElementById('custom-info-modal');
    if (!infoModal) return;
    const modalTitle = infoModal.querySelector('#custom-info-title');
    const modalMessage = infoModal.querySelector('#custom-info-message');
    const modalIcon = infoModal.querySelector('#custom-info-icon');
    const okButton = infoModal.querySelector('#custom-info-ok');
    const closeButton = infoModal.querySelector('#custom-info-close-button');


    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (modalIcon) {
        modalIcon.className = `fas ${iconClass} xp-info-icon`; // Asigura si clasa generala
        modalIcon.style.color = iconColor;
    }
    
    const closeInfoModal = () => infoModal.style.display = 'none';
    if (okButton) okButton.onclick = closeInfoModal;
    if (closeButton) closeButton.onclick = closeInfoModal;

    infoModal.style.display = 'flex';
}


// --- Functii pentru Gestionarea Gradientului de Fundal ---
function updateBodyGradientCSS(rawColorTop, rawColorBottom, speed) {
    const blendedMidHex = blendColors(rawColorTop, rawColorBottom);
    const finalColorTop = convertHexToRgba(rawColorTop);
    const finalColorMid = convertHexToRgba(blendedMidHex);
    const finalColorBottom = convertHexToRgba(rawColorBottom);

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--page-bg-color-top', finalColorTop);
    rootStyle.setProperty('--page-bg-color-mid', finalColorMid);
    rootStyle.setProperty('--page-bg-color-bottom', finalColorBottom);
    rootStyle.setProperty('--page-bg-animation-speed', `${speed}s`);
}

function applyCurrentGradient() {
    const activePreset = gradientPresets.find(p => p.name === currentlyAppliedPresetName) ||
                         {...defaultGradientPreset, name: defaultGradientPreset.name};
    if (activePreset) {
        const hexTop = convertRgbaToHex(activePreset.colorTop);
        const hexBottom = convertRgbaToHex(activePreset.colorBottom);
        updateBodyGradientCSS(hexTop, hexBottom, activePreset.speed);
    }
}

function populatePanelInputs(preset) {
    if (!preset || !gradientNameInput || !gradientColorTopInput || !gradientColorBottomInput || !gradientSpeedInput) return;
    gradientNameInput.value = (preset.name === defaultGradientPreset.name && gradientPresets.length <=1 ) ? "" : preset.name;
    gradientColorTopInput.value = convertRgbaToHex(preset.colorTop);
    gradientColorBottomInput.value = convertRgbaToHex(preset.colorBottom);
    gradientSpeedInput.value = preset.speed;
}

function loadGradientPresetsFromStorage() {
    const storedPresets = localStorage.getItem('gradientPresets');
    try {
        if (storedPresets) gradientPresets = JSON.parse(storedPresets);
    } catch (e) { gradientPresets = []; }
    if (!Array.isArray(gradientPresets)) gradientPresets = [];
    const defaultExists = gradientPresets.some(p => p.name === defaultGradientPreset.name);
    if (!defaultExists) {
        gradientPresets.unshift({ ...defaultGradientPreset });
    }
    const lastActivePresetName = localStorage.getItem('activeGradientPresetName');
    if (lastActivePresetName && gradientPresets.find(p => p.name === lastActivePresetName)) {
        currentlyAppliedPresetName = lastActivePresetName;
    } else {
        currentlyAppliedPresetName = defaultGradientPreset.name;
    }
}

function saveGradientPresetsToStorage() {
    localStorage.setItem('gradientPresets', JSON.stringify(gradientPresets));
    localStorage.setItem('activeGradientPresetName', currentlyAppliedPresetName);
}

function populatePresetsSelect() {
    if (!savedGradientsSelect) return;
    savedGradientsSelect.innerHTML = '';
    gradientPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        if (preset.name === currentlyAppliedPresetName) option.selected = true;
        savedGradientsSelect.appendChild(option);
    });
}

function previewCurrentGradient() {
    if (!gradientColorTopInput || !gradientColorBottomInput || !gradientSpeedInput) return;
    const rawColorTop = gradientColorTopInput.value;
    const rawColorBottom = gradientColorBottomInput.value; 
    const speed = Math.max(2, parseInt(gradientSpeedInput.value, 10) || 40);
    updateBodyGradientCSS(rawColorTop, rawColorBottom, speed);
}

function handleSaveGradientPreset() {
    if (!gradientNameInput || !gradientPanelErrorDiv || !gradientColorTopInput || !gradientColorBottomInput || !gradientSpeedInput) return;
    const errorDisplayContainer = gradientPanelErrorDiv.parentElement;
    hideFormError(errorDisplayContainer);

    let name = gradientNameInput.value.trim();
    const rawColorTop = gradientColorTopInput.value; 
    const rawColorBottom = gradientColorBottomInput.value; 
    const speed = Math.max(2, parseInt(gradientSpeedInput.value, 10) || 40);

    if (!name) {
        showFormError(errorDisplayContainer, "Numele presetului este obligatoriu.");
        return;
    }
    const newPreset = {
        name,
        colorTop: convertHexToRgba(rawColorTop), 
        colorBottom: convertHexToRgba(rawColorBottom),
        speed
    };
    const existingPresetIndex = gradientPresets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

    if (existingPresetIndex > -1) {
        if (name.toLowerCase() === defaultGradientPreset.name.toLowerCase() && existingPresetIndex === 0) {
            gradientPresets[existingPresetIndex] = { ...newPreset, name: defaultGradientPreset.name };
             showInfoModal(`Presetul implicit "${defaultGradientPreset.name}" a fost actualizat!`, "Actualizare Preset");
        } else if (confirm(`Un preset cu numele "${name}" există deja. Doriți să-l suprascrieți?`)) { 
            gradientPresets[existingPresetIndex] = newPreset;
            showInfoModal(`Presetul "${name}" a fost suprascris!`, "Preset Suprascris");
        } else {
            return;
        }
    } else {
        gradientPresets.push(newPreset);
        showInfoModal(`Presetul "${name}" a fost salvat!`, "Preset Salveat");
    }
    currentlyAppliedPresetName = name;
    saveGradientPresetsToStorage();
    populatePresetsSelect();
    applyCurrentGradient();
    gradientNameInput.value = name;
}

function handleLoadGradientPreset() {
    if (!savedGradientsSelect) return;
    const selectedName = savedGradientsSelect.value;
    const presetToLoad = gradientPresets.find(p => p.name === selectedName);
    if (presetToLoad) {
        currentlyAppliedPresetName = presetToLoad.name;
        applyCurrentGradient();
        populatePanelInputs(presetToLoad);
        saveGradientPresetsToStorage(); 
        showInfoModal(`Presetul "${selectedName}" a fost încărcat.`, "Preset Încărcat");
    }
}

function handleDeleteGradientPreset() {
    if (!savedGradientsSelect) return;
    const selectedName = savedGradientsSelect.value;
    if (selectedName === defaultGradientPreset.name) {
        showInfoModal("Presetul implicit nu poate fi șters.", "Acțiune Interzisă", "fa-exclamation-triangle", "#FF8C00");
        return;
    }
    showCustomConfirm(`Sunteți sigur că doriți să ștergeți presetul "${selectedName}"?`, "Confirmare Ștergere Preset", () => {
        gradientPresets = gradientPresets.filter(p => p.name !== selectedName);
        if (currentlyAppliedPresetName === selectedName) {
            currentlyAppliedPresetName = defaultGradientPreset.name;
        }
        saveGradientPresetsToStorage();
        populatePresetsSelect();
        applyCurrentGradient();
        const activePresetForPanel = gradientPresets.find(p => p.name === currentlyAppliedPresetName) || 
                                     {...defaultGradientPreset, name: defaultGradientPreset.name};
        populatePanelInputs(activePresetForPanel);
    });
}

function saveStorages() {
    localStorage.setItem('storages', JSON.stringify(storages));
}
function loadStorages() {
    const storedStorages = localStorage.getItem('storages');
    if (storedStorages) {
        try {
            storages = JSON.parse(storedStorages);
            if (!Array.isArray(storages)) storages = [];
        } catch (e) {
            console.error("Eroare la parsarea datelor din localStorage pentru 'storages':", e);
            storages = [];
        }
        storages.forEach(s => {
            if (!s.titleBarColor) s.titleBarColor = s.color || userImageColors[0];
            if (!s.titleBarTextColor) s.titleBarTextColor = getContrastingTextColor(s.titleBarColor);
            if (!s.products) s.products = [];
        });
    }
}

function renderColorPicker(selectedColorValue = userImageColors[0]) {
    const colorPickerContainer = document.getElementById('custom-color-picker');
    if (!colorPickerContainer) return;
    colorPickerContainer.innerHTML = '';
    userImageColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch xp-color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        if (color === selectedColorValue) {
            swatch.classList.add('selected');
            const selectedColorInput = document.getElementById('selected-storage-color-modal');
            if (selectedColorInput) selectedColorInput.value = color;
        }
        swatch.addEventListener('click', () => {
            const currentSelected = colorPickerContainer.querySelector('.color-swatch.selected');
            if (currentSelected) currentSelected.classList.remove('selected');
            swatch.classList.add('selected');
            const selectedColorInput = document.getElementById('selected-storage-color-modal');
            if (selectedColorInput) selectedColorInput.value = color;
        });
        colorPickerContainer.appendChild(swatch);
    });
    if (!colorPickerContainer.querySelector('.color-swatch.selected') && userImageColors.length > 0) {
        const firstSwatch = colorPickerContainer.firstChild;
        if (firstSwatch && firstSwatch instanceof HTMLElement) {
            firstSwatch.classList.add('selected');
            const selectedColorInput = document.getElementById('selected-storage-color-modal');
            if (selectedColorInput && firstSwatch.dataset) selectedColorInput.value = firstSwatch.dataset.color;
        }
    }
}

function showFormError(formContainer, message) {
    if (formContainer && typeof formContainer.querySelector === 'function') {
        const errorDiv = formContainer.querySelector('.form-error-message.xp-error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
}
function hideFormError(formContainer) {
     if (formContainer && typeof formContainer.querySelector === 'function') {
        const errorDiv = formContainer.querySelector('.form-error-message.xp-error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }
}

function showCustomConfirm(message, title = "Confirmare", onOk) {
    const confirmModalOverlay = document.getElementById('custom-confirm-modal');
    if (!confirmModalOverlay) return;
    const messageP = confirmModalOverlay.querySelector('#custom-confirm-message');
    const modalTitle = confirmModalOverlay.querySelector('#custom-confirm-title');
    const okButton = confirmModalOverlay.querySelector('#custom-confirm-ok');
    const cancelButton = confirmModalOverlay.querySelector('#custom-confirm-cancel');

    if (modalTitle) modalTitle.textContent = title;
    if (messageP) messageP.textContent = message;
    confirmOkCallback = onOk;
    if (okButton) okButton.onclick = handleConfirmOk;
    if (cancelButton) cancelButton.onclick = handleConfirmCancel;
    confirmModalOverlay.style.display = 'flex';
}
function handleConfirmOk() {
    const confirmModal = document.getElementById('custom-confirm-modal');
    if (confirmModal) confirmModal.style.display = 'none';
    if (typeof confirmOkCallback === 'function') confirmOkCallback();
    confirmOkCallback = null;
}
function handleConfirmCancel() {
    const confirmModal = document.getElementById('custom-confirm-modal');
    if (confirmModal) confirmModal.style.display = 'none';
    confirmOkCallback = null;
}

function openStorageModal(storageIdToEdit = null) {
    const modalOverlay = document.getElementById('storage-modal');
    if (!modalOverlay) return;
    const modalTitleTextElement = modalOverlay.querySelector('#modal-title.xp-title-text');
    const storageNameInput = modalOverlay.querySelector('#storage-name-modal');
    const storageIdInput = modalOverlay.querySelector('#storage-id');
    const saveButton = modalOverlay.querySelector('#save-storage-button');
    const errorDivForm = modalOverlay.querySelector('.xp-window-content');

    if (errorDivForm) hideFormError(errorDivForm);

    if (storageIdToEdit) {
        editingStorageId = storageIdToEdit;
        const storage = storages.find(s => s.id === editingStorageId);
        if (storage && modalTitleTextElement && storageNameInput && storageIdInput && saveButton) {
            modalTitleTextElement.textContent = `Editare: ${storage.name}`;
            storageNameInput.value = storage.name;
            renderColorPicker(storage.titleBarColor);
            storageIdInput.value = storage.id;
            saveButton.textContent = 'Salvează';
        }
    } else {
        editingStorageId = null;
        if (modalTitleTextElement) modalTitleTextElement.textContent = 'Adaugă Depozit Nou';
        if (storageNameInput) storageNameInput.value = '';
        renderColorPicker(userImageColors[0]);
        if (storageIdInput) storageIdInput.value = '';
        if (saveButton) saveButton.textContent = 'Adaugă';
    }
    modalOverlay.style.display = 'flex';
}

function closeStorageModal() {
    const modalOverlay = document.getElementById('storage-modal');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        const errorDivForm = modalOverlay.querySelector('.xp-window-content');
        if (errorDivForm) hideFormError(errorDivForm);
    }
    editingStorageId = null;
}

function saveStorage() {
    const modalOverlay = document.getElementById('storage-modal');
    if (!modalOverlay) return;
    const errorContainer = modalOverlay.querySelector('.xp-window-content');
    if (!errorContainer) return;
    hideFormError(errorContainer);

    const nameInput = document.getElementById('storage-name-modal');
    const selectedColorInput = document.getElementById('selected-storage-color-modal');
    if (!nameInput || !selectedColorInput) return;

    const name = nameInput.value.trim();
    const selectedTitleBarColor = selectedColorInput.value;

    if (!name) {
        showFormError(errorContainer, 'Numele depozitului nu poate fi gol!'); return;
    }
    if (!selectedTitleBarColor) {
        showFormError(errorContainer, 'Trebuie să selectezi o culoare pentru bara de titlu!'); return;
    }
    const isNameTaken = storages.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== editingStorageId);
    if (isNameTaken) {
        showFormError(errorContainer, 'Există deja un depozit cu acest nume!'); return;
    }
    const titleBarTextColor = getContrastingTextColor(selectedTitleBarColor);

    if (editingStorageId) {
        const storageIndex = storages.findIndex(s => s.id === editingStorageId);
        if (storageIndex > -1) {
            storages[storageIndex].name = name;
            storages[storageIndex].titleBarColor = selectedTitleBarColor;
            storages[storageIndex].titleBarTextColor = titleBarTextColor;
        }
    } else {
        const newStorage = {
            id: Date.now(), name: name,
            titleBarColor: selectedTitleBarColor,
            titleBarTextColor: titleBarTextColor,
            products: []
        };
        storages.push(newStorage);
    }
    saveStorages(); renderStorages(); closeStorageModal();
}

function renderStorages() {
    const storagesListDiv = document.getElementById('storages-list');
    if (!storagesListDiv) return;
    storagesListDiv.innerHTML = '';

    if (storages.length === 0) {
        storagesListDiv.innerHTML = '<p class="xp-empty-message">Nu există depozite. Adăugați unul!</p>';
        return;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const topShineStart = rootStyles.getPropertyValue('--xp-title-grad-top-shine').trim() || 'rgba(235, 242, 253, 0.6)';
    const topShineEnd = rootStyles.getPropertyValue('--xp-title-grad-top-shine-end').trim() || 'rgba(180, 200, 240, 0.25)';

    storages.forEach(storage => {
        const storageItem = document.createElement('div');
        storageItem.className = 'storage-item xp-storage-item';
        storageItem.dataset.storageId = storage.id;

        const titleBar = document.createElement('div');
        titleBar.className = 'storage-title-bar';

        const baseColor = storage.titleBarColor || '#0058DD';
        const midHighlight = lightenHexColor(baseColor, 40);
        const farHighlight = lightenHexColor(baseColor, 75);

        titleBar.style.backgroundImage = `
            linear-gradient(to bottom, ${topShineStart} 0%, ${topShineEnd} 8%, transparent 40%),
            linear-gradient(to right, ${baseColor} 0%, ${midHighlight} 70%, ${farHighlight} 100%)
        `;
        titleBar.style.color = getContrastingTextColor(baseColor);

        const storageName = document.createElement('span');
        storageName.className = 'storage-title-bar-text';
        storageName.textContent = storage.name;
        titleBar.appendChild(storageName);

        const expandButton = document.createElement('button');
        expandButton.className = 'storage-expand-button';
        expandButton.innerHTML = '<i class="fas fa-plus"></i>';
        expandButton.setAttribute('aria-expanded', 'false');
        expandButton.setAttribute('aria-controls', `storage-content-${storage.id}`);
        titleBar.appendChild(expandButton);

        const optionsButton = document.createElement('button');
        optionsButton.className = 'storage-options-button xp-storage-options-button';
        optionsButton.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        optionsButton.dataset.storageIdForMenu = storage.id.toString(); // Asigură string pentru comparare
        optionsButton.dataset.storageNameForMenu = storage.name;
        titleBar.appendChild(optionsButton);

        const expandableContent = document.createElement('div');
        expandableContent.className = 'storage-content-expandable';
        expandableContent.id = `storage-content-${storage.id}`;

        const addProductButtonInCard = document.createElement('button');
        addProductButtonInCard.className = 'xp-button add-product-in-card-button';
        addProductButtonInCard.textContent = 'Adaugă Produs Nou';

        const productFormInCard = document.createElement('div');
        productFormInCard.className = 'inline-form-container xp-group-box product-form-in-card';
        productFormInCard.style.display = 'none';
        productFormInCard.innerHTML = `
            <h4 class="xp-group-box-title">Adaugă un produs nou</h4>
            <div class="form-error-message xp-error-message" style="display:none;"></div>
            <label>Nume produs:</label>
            <input type="text" class="xp-input product-name-in-card" placeholder="Nume produs">
            <label>Cantitate:</label>
            <input type="number" class="xp-input product-quantity-in-card" placeholder="Cantitate">
            <label>Unitate:</label>
            <select class="xp-select product-unit-in-card">
                <option value="kg">kg</option> <option value="litri">litri</option>
                <option value="buc">buc</option> <option value="metri">metri</option>
            </select>
            <div class="xp-button-group">
                <button class="xp-button publish-product-in-card-button">Publică</button>
                <button class="xp-button cancel-product-in-card-button">Anulează</button>
            </div>
        `;

        const productTableInCard = document.createElement('table');
        productTableInCard.className = 'xp-table product-list-in-card';
        productTableInCard.innerHTML = `
            <thead><tr>
                <th>Denumire produs</th><th>Cantitate</th><th>Unitate</th><th>Acțiuni</th>
            </tr></thead>
            <tbody></tbody>
        `;
        const tableHeader = productTableInCard.querySelector('thead');
        if(tableHeader) {
            const headerBgColor = lightenHexColor(baseColor, 88);
            tableHeader.style.backgroundColor = headerBgColor;
            const tableHeaderTextColor = getContrastingTextColor(headerBgColor);
            tableHeader.style.color = tableHeaderTextColor;
            tableHeader.querySelectorAll('th').forEach(th => th.style.color = tableHeaderTextColor);
        }

        expandableContent.appendChild(addProductButtonInCard);
        expandableContent.appendChild(productFormInCard);
        expandableContent.appendChild(productTableInCard);

        expandButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isExpanded = expandableContent.classList.toggle('expanded');
            expandButton.setAttribute('aria-expanded', isExpanded.toString());
            expandButton.innerHTML = isExpanded ? '<i class="fas fa-minus"></i>' : '<i class="fas fa-plus"></i>';
            if (isExpanded) {
                renderProductsInCard(storage.id, productTableInCard.querySelector('tbody'));
                requestAnimationFrame(() => { if(expandableContent.classList.contains('expanded')) expandableContent.style.maxHeight = expandableContent.scrollHeight + "px"; });
            } else {
                expandableContent.style.maxHeight = '0px';
            }
        });

        addProductButtonInCard.addEventListener('click', () => {
            productFormInCard.style.display = 'block';
            addProductButtonInCard.style.display = 'none';
            hideFormError(productFormInCard);
            if (expandableContent.classList.contains('expanded')) {
                requestAnimationFrame(() => { expandableContent.style.maxHeight = expandableContent.scrollHeight + "px"; });
            }
        });
        productFormInCard.querySelector('.publish-product-in-card-button').addEventListener('click', () => {
            addProductInCard(storage.id, productFormInCard, productTableInCard.querySelector('tbody'), addProductButtonInCard, expandableContent);
        });
        productFormInCard.querySelector('.cancel-product-in-card-button').addEventListener('click', () => {
            productFormInCard.style.display = 'none';
            addProductButtonInCard.style.display = 'block';
            const nameIn = productFormInCard.querySelector('.product-name-in-card');
            const qtyIn = productFormInCard.querySelector('.product-quantity-in-card');
            const unitIn = productFormInCard.querySelector('.product-unit-in-card');
            if(nameIn) nameIn.value = '';
            if(qtyIn) qtyIn.value = '';
            if(unitIn) unitIn.value = 'kg';
            hideFormError(productFormInCard);
            if (expandableContent.classList.contains('expanded')) {
                requestAnimationFrame(() => { expandableContent.style.maxHeight = expandableContent.scrollHeight + "px"; });
            }
        });

        optionsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentTargetButton = event.currentTarget;
            const currentStorageId = currentTargetButton.dataset.storageIdForMenu; // Este deja string
            const currentStorageName = currentTargetButton.dataset.storageNameForMenu;
            toggleOptionsMenu(currentTargetButton, currentStorageId, currentStorageName);
        });

        storageItem.appendChild(titleBar);
        storageItem.appendChild(expandableContent);
        storagesListDiv.appendChild(storageItem);
    });
}

function deleteStorage(storageId, confirmTitle = "Confirmare Ștergere") {
    const storage = storages.find(s => s.id === storageId);
    const message = storage
        ? `Sunteți sigur că doriți să ștergeți depozitul "${storage.name}" și toate produsele conținute?`
        : 'Sunteți sigur că doriți să ștergeți acest depozit?';
    showCustomConfirm(message, confirmTitle, () => {
        storages = storages.filter(s => s.id !== storageId);
        saveStorages(); renderStorages();
        if (editingStorageId === storageId) closeStorageModal();
    });
}

function renderProductsInCard(storageId, targetTableBodyElement) {
    if(!targetTableBodyElement) return;
    const storage = storages.find(s => s.id === storageId);
    targetTableBodyElement.innerHTML = "";
    if (storage && storage.products && storage.products.length > 0) {
        storage.products.forEach(product => {
            const row = targetTableBodyElement.insertRow();
            row.className = 'xp-table-row';
            row.innerHTML = `
                <td data-label="Denumire">${product.name}</td>
                <td data-label="Cantitate">${product.quantity}</td>
                <td data-label="Unitate">${product.unit}</td>
                <td data-label="Acțiuni"><button class="xp-button xp-button-table-action" onclick="deleteProductFromCard(${storageId}, ${product.id})">Șterge</button></td>
            `;
        });
    } else {
        const row = targetTableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.className = 'xp-empty-message';
        cell.textContent = 'Nu există produse în acest depozit.';
    }
}

function addProductInCard(storageId, formElement, targetTableBodyElement, addButtonElement, expandableContentElement) {
    const errorDisplayContainer = formElement; 
    hideFormError(errorDisplayContainer);
    const storage = storages.find(s => s.id === storageId);
    if (!storage || !formElement || !targetTableBodyElement || !addButtonElement || !expandableContentElement) return;

    const nameInput = formElement.querySelector('.product-name-in-card');
    const quantityInput = formElement.querySelector('.product-quantity-in-card');
    const unitInput = formElement.querySelector('.product-unit-in-card');

    if(!nameInput || !quantityInput || !unitInput) return;

    const name = nameInput.value.trim();
    const quantity = quantityInput.value;
    const unit = unitInput.value;

    if (!name || !quantity || !unit) {
        showFormError(errorDisplayContainer, 'Toate câmpurile sunt obligatorii!'); return;
    }

    const newProduct = { id: Date.now(), name: name, quantity: quantity, unit: unit };
    if (!storage.products) storage.products = [];
    storage.products.push(newProduct);
    saveStorages();
    renderProductsInCard(storageId, targetTableBodyElement);

    nameInput.value = '';
    quantityInput.value = '';
    unitInput.value = 'kg';
    formElement.style.display = 'none';
    addButtonElement.style.display = 'block';

    if (expandableContentElement.classList.contains('expanded')) {
        requestAnimationFrame(() => {
             if(expandableContentElement.classList.contains('expanded')) expandableContentElement.style.maxHeight = expandableContentElement.scrollHeight + "px";
        });
    }
}

function deleteProductFromCard(storageId, productId) {
    const storage = storages.find(s => s.id === storageId);
    if (storage && storage.products) {
        const product = storage.products.find(p => p.id === productId);
        const confirmTitle = product ? `Ștergeți produsul "${product.name}"?` : "Confirmare Ștergere";
        const message = `Sunteți sigur că doriți să ștergeți acest produs?`;
        showCustomConfirm(message, confirmTitle, () => {
            storage.products = storage.products.filter(p => p.id !== productId);
            saveStorages();
            const storageItemElement = document.querySelector(`.xp-storage-item[data-storage-id="${storageId}"]`);
            if (storageItemElement) {
                const tableBody = storageItemElement.querySelector('.product-list-in-card tbody');
                const expandableContentElement = storageItemElement.querySelector('.storage-content-expandable');
                if (tableBody && expandableContentElement) {
                    renderProductsInCard(storageId, tableBody);
                     if (expandableContentElement.classList.contains('expanded')) {
                        requestAnimationFrame(() => {
                            if(expandableContentElement.classList.contains('expanded')) expandableContentElement.style.maxHeight = expandableContentElement.scrollHeight + "px";
                        });
                    }
                }
            }
        });
    }
}