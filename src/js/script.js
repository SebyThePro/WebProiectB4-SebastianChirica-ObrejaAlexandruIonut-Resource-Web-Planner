
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
    checkAuthentication(); 

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    if (localStorage.getItem('authToken')) {
        initializeMainPageFunctionality();
    }
});

function initializeMainPageFunctionality() {
    console.log("Initializare functionalitati pagina principala (utilizator autentificat).");

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
}


function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    const loggedInUsername = localStorage.getItem('loggedInUser');
    const userGreetingDiv = document.getElementById('user-greeting');
    const logoutButton = document.getElementById('logout-button');

    if (token && loggedInUsername) {
        console.log('Utilizator autentificat:', loggedInUsername);
        if (userGreetingDiv) {
            userGreetingDiv.textContent = `Bine ai venit, ${loggedInUsername}!`;
            userGreetingDiv.style.display = 'block';
        }
        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
        }
    } else {
        console.log('Utilizator neautentificat. Redirectionare la login.html');
        window.location.href = 'login.html';
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('loggedInUser');
    console.log('Utilizator deconectat.');
    window.location.href = 'login.html';
}



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
    if (!c1 || !c2) return '#808080';
    const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
    const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
    const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function convertHexToRgba(hexColor, alpha = 1) {
    const rgbObj = convertHexToRgbObject(hexColor);
    if (!rgbObj) return `rgba(0,0,0,${alpha})`;
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
    menu.innerHTML = `<div class="xp-menu-item" data-action="edit">Editeaza</div><div class="xp-menu-item" data-action="delete">Sterge</div>`;
    document.body.appendChild(menu);
    activeOptionsMenu = menu;
    const rect = buttonElement.getBoundingClientRect();
    let topPosition = rect.bottom + window.scrollY + 2;
    let leftPosition = rect.left + window.scrollX;
    requestAnimationFrame(() => {
        if (!activeOptionsMenu) return;
        const menuWidth = activeOptionsMenu.offsetWidth;
        const menuHeight = activeOptionsMenu.offsetHeight;
        if (leftPosition + menuWidth > window.innerWidth - 10) leftPosition = rect.right + window.scrollX - menuWidth;
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
            else if (action === 'delete') deleteStorage(numericStorageId, `Stergeti depozitul "${storageName}"?`);
            closeActiveOptionsMenu();
        });
    });
}

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

function showInfoModal(message, title = "Informatie", iconClass = "fa-info-circle", iconColor = "#0078D7") {
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
        modalIcon.className = `fas ${iconClass} xp-info-icon`;
        modalIcon.style.color = iconColor;
    }
    const closeInfoModalFn = () => infoModal.style.display = 'none';
    if (okButton) okButton.onclick = closeInfoModalFn;
    if (closeButton) closeButton.onclick = closeInfoModalFn;
    infoModal.style.display = 'flex';
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
    if (errorDisplayContainer) hideFormError(errorDisplayContainer);
    let name = gradientNameInput.value.trim();
    const rawColorTop = gradientColorTopInput.value;
    const rawColorBottom = gradientColorBottomInput.value;
    const speed = Math.max(2, parseInt(gradientSpeedInput.value, 10) || 40);
    if (!name) {
        if (errorDisplayContainer) showFormError(errorDisplayContainer, "Numele presetului este obligatoriu.");
        return;
    }
    const newPreset = { name, colorTop: convertHexToRgba(rawColorTop), colorBottom: convertHexToRgba(rawColorBottom), speed };
    const existingPresetIndex = gradientPresets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingPresetIndex > -1) {
        if (name.toLowerCase() === defaultGradientPreset.name.toLowerCase() && existingPresetIndex === 0) {
            gradientPresets[existingPresetIndex] = { ...newPreset, name: defaultGradientPreset.name };
             showInfoModal(`Presetul implicit "${defaultGradientPreset.name}" a fost actualizat!`, "Actualizare Preset");
        } else if (confirm(`Un preset cu numele "${name}" exista deja. Doriti sa-l suprascrieti?`)) {
            gradientPresets[existingPresetIndex] = newPreset;
            showInfoModal(`Presetul "${name}" a fost suprascris!`, "Preset Suprascris");
        } else { return; }
    } else {
        gradientPresets.push(newPreset);
        showInfoModal(`Presetul "${name}" a fost salvat!`, "Preset Salveat");
    }
    currentlyAppliedPresetName = name;
    saveGradientPresetsToStorage(); populatePresetsSelect(); applyCurrentGradient(); gradientNameInput.value = name;
}

function handleLoadGradientPreset() {
    if (!savedGradientsSelect) return;
    const selectedName = savedGradientsSelect.value;
    const presetToLoad = gradientPresets.find(p => p.name === selectedName);
    if (presetToLoad) {
        currentlyAppliedPresetName = presetToLoad.name;
        applyCurrentGradient(); populatePanelInputs(presetToLoad); saveGradientPresetsToStorage();
        showInfoModal(`Presetul "${selectedName}" a fost incarcat.`, "Preset Incarcat");
    }
}

function handleDeleteGradientPreset() {
    if (!savedGradientsSelect) return;
    const selectedName = savedGradientsSelect.value;
    if (selectedName === defaultGradientPreset.name) {
        showInfoModal("Presetul implicit nu poate fi sters.", "Actiune Interzisa", "fa-exclamation-triangle", "#FF8C00");
        return;
    }
    showCustomConfirm(`Sunteti sigur ca doriti sa stergeti presetul "${selectedName}"?`, "Confirmare Stergere Preset", () => {
        gradientPresets = gradientPresets.filter(p => p.name !== selectedName);
        if (currentlyAppliedPresetName === selectedName) currentlyAppliedPresetName = defaultGradientPreset.name;
        saveGradientPresetsToStorage(); populatePresetsSelect(); applyCurrentGradient();
        const activePresetForPanel = gradientPresets.find(p => p.name === currentlyAppliedPresetName) || {...defaultGradientPreset, name: defaultGradientPreset.name};
        populatePanelInputs(activePresetForPanel);
    });
}

function saveStorages() {
    localStorage.setItem('storages', JSON.stringify(storages));
}

async function loadStorages() {
      const token = localStorage.getItem('authToken');
    if (!token) {
        console.log("Nu se pot incarca depozitele, utilizatorul nu este autentificat.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/storages', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('Token invalid sau expirat. Se redirectioneaza la login.');
                handleLogout();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || `Eroare HTTP: ${response.status}`);
        }

        const data = await response.json();
        storages = data.map(s => ({ 
            id: s.storageId, 
            name: s.name,
            titleBarColor: s.titleBarColor,
            titleBarTextColor: s.titleBarTextColor, 
            products: s.products || [] 
        }));
        console.log("Depozite incarcate de la API:", storages);
        renderStorages();
    } catch (error) {
        console.error("Eroare la incarcarea depozitelor de la API:", error);
        showInfoModal(`Eroare la incarcarea depozitelor: ${error.message}`, "Eroare Retea", "fa-ethernet", "#D81E05");
        storages = [];
        renderStorages();
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
        } else {
             console.warn("Div-ul de eroare pentru formular nu a fost gasit in containerul specificat:", formContainer);
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

function openStorageModal(storageIdToEdit = null) {
    const modalOverlay = document.getElementById('storage-modal');
    if (!modalOverlay) return;
    const modalTitleTextElement = modalOverlay.querySelector('#modal-title.xp-title-text');
    const storageNameInput = modalOverlay.querySelector('#storage-name-modal');
    const storageIdInput = modalOverlay.querySelector('#storage-id');
    const saveButton = modalOverlay.querySelector('#save-storage-button');
    const errorDivForm = modalOverlay.querySelector('.xp-window-content');
    if (errorDivForm) hideFormError(errorDivForm);
    if (storageIdToEdit !== null && storageIdToEdit !== undefined) {
        editingStorageId = storageIdToEdit;
        const storage = storages.find(s => s.id === editingStorageId);
        if (storage && modalTitleTextElement && storageNameInput && storageIdInput && saveButton) {
            modalTitleTextElement.textContent = `Editare: ${storage.name}`;
            storageNameInput.value = storage.name;
            renderColorPicker(storage.titleBarColor);
            storageIdInput.value = storage.id;
            saveButton.textContent = 'Salveaza';
        } else {
             editingStorageId = null;
             if (modalTitleTextElement) modalTitleTextElement.textContent = 'Adauga Depozit Nou';
             if (storageNameInput) storageNameInput.value = '';
             renderColorPicker(userImageColors[0]);
             if (storageIdInput) storageIdInput.value = '';
             if (saveButton) saveButton.textContent = 'Adauga';
        }
    } else {
        editingStorageId = null;
        if (modalTitleTextElement) modalTitleTextElement.textContent = 'Adauga Depozit Nou';
        if (storageNameInput) storageNameInput.value = '';
        renderColorPicker(userImageColors[0]);
        if (storageIdInput) storageIdInput.value = '';
        if (saveButton) saveButton.textContent = 'Adauga';
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

async function saveStorage() {
    const modalOverlay = document.getElementById('storage-modal');
    if (!modalOverlay) return;
    const errorContainer = modalOverlay.querySelector('.xp-window-content');
    if (!errorContainer) return;
    hideFormError(errorContainer);

    const nameInput = document.getElementById('storage-name-modal');
    const selectedColorInput = document.getElementById('selected-storage-color-modal');
    const storageIdInput = document.getElementById('storage-id'); 

    if (!nameInput || !selectedColorInput || !storageIdInput) {
        if (errorContainer) showFormError(errorContainer, 'Eroare interna in formular.'); return;
    }

    const name = nameInput.value.trim();
    const selectedTitleBarColor = selectedColorInput.value;
    const titleBarTextColor = getContrastingTextColor(selectedTitleBarColor);

    if (!name) { if (errorContainer) showFormError(errorContainer, 'Numele depozitului nu poate fi gol!'); return; }
    if (!selectedTitleBarColor) { if (errorContainer) showFormError(errorContainer, 'Trebuie sa selectezi o culoare pentru bara de titlu!'); return; }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showInfoModal("Sesiunea a expirat sau nu sunteti autentificat. Va rugam sa va reautentificati.", "Eroare Autentificare", "fa-user-slash");
        handleLogout(); 
        return;
    }

    const storageData = {
        name: name,
        titleBarColor: selectedTitleBarColor,
        titleBarTextColor: titleBarTextColor 
    };

    let url = 'http://localhost:3000/api/storages';
    let method = 'POST';

    if (editingStorageId) { 
        url += `/${editingStorageId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(storageData)
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                handleLogout(); return;
            }
            if (errorContainer) showFormError(errorContainer, data.message || `Eroare HTTP: ${response.status}`);
            throw new Error(data.message || `Eroare HTTP: ${response.status}`);
        }

        if (method === 'POST' && data.storageId) { 
            const newStorage = {
                id: data.storageId,
                name: data.name,
                titleBarColor: data.titleBarColor,
                titleBarTextColor: data.titleBarTextColor, 
                products: []
            };
            storages.push(newStorage);
        } else if (method === 'PUT' && editingStorageId) { 
            const storageIndex = storages.findIndex(s => s.id === editingStorageId);
            if (storageIndex > -1) {
                storages[storageIndex].name = data.name || name; 
                storages[storageIndex].titleBarColor = data.titleBarColor || selectedTitleBarColor;
                storages[storageIndex].titleBarTextColor = data.titleBarTextColor || titleBarTextColor;
            }
        }
        
        renderStorages();
        closeStorageModal();
        showInfoModal(data.message || (method === 'POST' ? "Depozit adaugat cu succes!" : "Depozit actualizat cu succes!"), "Succes");

    } catch (error) {
        console.error(`Eroare la ${method === 'POST' ? 'adaugarea' : 'actualizarea'} depozitului:`, error);
        if (errorContainer && !errorContainer.querySelector('.form-error-message.xp-error-message').textContent) {
             showFormError(errorContainer, `Eroare de retea sau server: ${error.message}`);
        }
    }
}

function renderStorages() {
    const storagesListDiv = document.getElementById('storages-list');
    if (!storagesListDiv) return;
    storagesListDiv.innerHTML = '';
    if (storages.length === 0) {
        storagesListDiv.innerHTML = '<p class="xp-empty-message">Nu exista depozite. Adaugati unul!</p>';
        return;
    }
    const rootStyles = getComputedStyle(document.documentElement);
    const topShineStart = rootStyles.getPropertyValue('--xp-title-grad-top-shine').trim() || 'rgba(235, 242, 253, 0.6)';
    const topShineEnd = rootStyles.getPropertyValue('--xp-title-grad-top-shine-end').trim() || 'rgba(180, 200, 240, 0.25)';
    storages.forEach(storage => {
        const storageItem = document.createElement('div');
        storageItem.className = 'storage-item xp-storage-item';
        storageItem.dataset.storageId = storage.id.toString();
        const titleBar = document.createElement('div');
        titleBar.className = 'storage-title-bar';
        const baseColor = storage.titleBarColor || '#0058DD';
        const midHighlight = lightenHexColor(baseColor, 40);
        const farHighlight = lightenHexColor(baseColor, 75);
        titleBar.style.backgroundImage = `linear-gradient(to bottom, ${topShineStart} 0%, ${topShineEnd} 8%, transparent 40%), linear-gradient(to right, ${baseColor} 0%, ${midHighlight} 70%, ${farHighlight} 100%)`;
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
        optionsButton.dataset.storageIdForMenu = storage.id.toString();
        optionsButton.dataset.storageNameForMenu = storage.name;
        titleBar.appendChild(optionsButton);
        const expandableContent = document.createElement('div');
        expandableContent.className = 'storage-content-expandable';
        expandableContent.id = `storage-content-${storage.id}`;
        const addProductButtonInCard = document.createElement('button');
        addProductButtonInCard.className = 'xp-button add-product-in-card-button';
        addProductButtonInCard.textContent = 'Adauga Produs Nou';
        addProductButtonInCard.dataset.storageId = storage.id.toString();
        const productFormInCard = document.createElement('div');
        productFormInCard.className = 'inline-form-container xp-group-box product-form-in-card';
        productFormInCard.style.display = 'none';
        productFormInCard.innerHTML = `<h4 class="xp-group-box-title">Adauga un produs nou</h4> <div class="form-error-message xp-error-message" style="display:none;"></div> <label for="product-name-in-card-${storage.id}">Nume produs:</label> <input type="text" id="product-name-in-card-${storage.id}" class="xp-input product-name-in-card" placeholder="Nume produs"> <label for="product-quantity-in-card-${storage.id}">Cantitate:</label> <input type="number" id="product-quantity-in-card-${storage.id}" class="xp-input product-quantity-in-card" placeholder="Cantitate"> <label for="product-unit-in-card-${storage.id}">Unitate:</label> <select id="product-unit-in-card-${storage.id}" class="xp-select product-unit-in-card"> <option value="kg">kg</option> <option value="litri">litri</option> <option value="buc">buc</option> <option value="metri">metri</option> </select> <div class="xp-button-group"> <button class="xp-button publish-product-in-card-button" data-storage-id="${storage.id.toString()}">Publica</button> <button class="xp-button cancel-product-in-card-button">Anuleaza</button> </div>`;
        const productTableInCard = document.createElement('table');
        productTableInCard.className = 'xp-table product-list-in-card';
        productTableInCard.innerHTML = `<thead><tr><th>Denumire produs</th><th>Cantitate</th><th>Unitate</th><th>Actiuni</th></tr></thead><tbody></tbody>`;
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
            event.stopPropagation(); const currentStorageId = parseInt(storageItem.dataset.storageId, 10);
            const isExpanded = expandableContent.classList.toggle('expanded');
            expandButton.setAttribute('aria-expanded', isExpanded.toString());
            expandButton.innerHTML = isExpanded ? '<i class="fas fa-minus"></i>' : '<i class="fas fa-plus"></i>';
            if (isExpanded) { renderProductsInCard(currentStorageId, productTableInCard.querySelector('tbody')); requestAnimationFrame(() => { if(expandableContent.classList.contains('expanded')) expandableContent.style.maxHeight = expandableContent.scrollHeight + "px"; });
            } else { expandableContent.style.maxHeight = '0px'; productFormInCard.style.display = 'none'; addProductButtonInCard.style.display = 'block';}
        });
        addProductButtonInCard.addEventListener('click', (event) => {
            const formForThisStorage = expandableContent.querySelector('.product-form-in-card');
            const addButtonForThisStorage = expandableContent.querySelector('.add-product-in-card-button');
            if (formForThisStorage) formForThisStorage.style.display = 'block';
            if (addButtonForThisStorage) addButtonForThisStorage.style.display = 'none';
            const errorContainer = formForThisStorage; if (errorContainer) hideFormError(errorContainer);
            if (expandableContent.classList.contains('expanded')) requestAnimationFrame(() => { expandableContent.style.maxHeight = expandableContent.scrollHeight + "px"; });
        });
        const publishButton = productFormInCard.querySelector('.publish-product-in-card-button');
        if(publishButton) {
            publishButton.addEventListener('click', (event) => {
                const currentStorageId = parseInt(event.currentTarget.dataset.storageId, 10);
                const formForThisStorage = expandableContent.querySelector('.product-form-in-card');
                const tableBodyForThisStorage = expandableContent.querySelector('.product-list-in-card tbody');
                const addButtonForThisStorage = expandableContent.querySelector('.add-product-in-card-button');
                addProductInCard(currentStorageId, formForThisStorage, tableBodyForThisStorage, addButtonForThisStorage, expandableContent);
            });
        }
        const cancelButton = productFormInCard.querySelector('.cancel-product-in-card-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                const formForThisStorage = expandableContent.querySelector('.product-form-in-card');
                const addButtonForThisStorage = expandableContent.querySelector('.add-product-in-card-button');
                if(formForThisStorage) {
                    formForThisStorage.style.display = 'none';
                    const nameIn = formForThisStorage.querySelector('.product-name-in-card');
                    const qtyIn = formForThisStorage.querySelector('.product-quantity-in-card');
                    if(nameIn) nameIn.value = ''; if(qtyIn) qtyIn.value = '';
                    const errorContainer = formForThisStorage; if (errorContainer) hideFormError(errorContainer);
                }
                if(addButtonForThisStorage) addButtonForThisStorage.style.display = 'block';
                if (expandableContent.classList.contains('expanded')) requestAnimationFrame(() => { expandableContent.style.maxHeight = expandableContent.scrollHeight + "px"; });
            });
        }
        optionsButton.addEventListener('click', (event) => {
            event.stopPropagation(); const currentTargetButton = event.currentTarget;
            const currentStorageId = currentTargetButton.dataset.storageIdForMenu;
            const currentStorageName = currentTargetButton.dataset.storageNameForMenu;
            toggleOptionsMenu(currentTargetButton, currentStorageId, currentStorageName);
        });
        storageItem.appendChild(titleBar); storageItem.appendChild(expandableContent); storagesListDiv.appendChild(storageItem);
    });
}

async function deleteStorage(storageId, confirmTitle = "Confirmare Stergere") {
    const numericStorageId = typeof storageId === 'string' ? parseInt(storageId, 10) : storageId;
    const storage = storages.find(s => s.id === numericStorageId);
    const message = storage
        ? `Sunteti sigur ca doriti sa stergeti depozitul "${storage.name}" si toate produsele continute?`
        : 'Sunteti sigur ca doriti sa stergeti acest depozit?';

    showCustomConfirm(message, confirmTitle, async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showInfoModal("Sesiunea a expirat sau nu sunteti autentificat. Va rugam sa va reautentificati.", "Eroare Autentificare", "fa-user-slash");
            handleLogout();
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/storages/${numericStorageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    handleLogout(); return;
                }
                throw new Error(data.message || `Eroare HTTP: ${response.status}`);
            }

            storages = storages.filter(s => s.id !== numericStorageId);
            renderStorages();
            if (editingStorageId === numericStorageId) closeStorageModal(); 
            showInfoModal(data.message || `Depozitul "${storage ? storage.name : ''}" a fost sters.`, "Stergere Reusita", "fa-trash-alt");

        } catch (error) {
            console.error("Eroare la stergerea depozitului:", error);
            showInfoModal(`Eroare la stergerea depozitului: ${error.message}`, "Eroare Retea", "fa-ethernet", "#D81E05");
        }
    });
}

async function renderProductsInCard(storageId, targetTableBodyElement) {
    if (!targetTableBodyElement) {
        console.error("Elementul tbody tinta pentru produse nu a fost gasit pentru storageId:", storageId);
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        targetTableBodyElement.innerHTML = '<tr><td colspan="4" class="xp-empty-message">Eroare de autentificare. Reincarcati pagina.</td></tr>';
        return;
    }

    targetTableBodyElement.innerHTML = '<tr><td colspan="4" class="xp-empty-message">Se incarca produsele...</td></tr>';

    try {
        const response = await fetch(`http://localhost:3000/api/items?storageId=${storageId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { handleLogout(); return; }
            const errorData = await response.json();
            throw new Error(errorData.message || `Eroare HTTP: ${response.status}`);
        }

        const items = await response.json();
        targetTableBodyElement.innerHTML = ""; 

        if (items && items.length > 0) {
            items.forEach(product => {
                const row = targetTableBodyElement.insertRow();
                row.className = 'xp-table-row';
                row.innerHTML = `
                    <td data-label="Denumire">${product.name}</td>
                    <td data-label="Cantitate">${product.quantity}</td>
                    <td data-label="Unitate">${product.unitOfMeasure}</td> 
                    <td data-label="Actiuni">
                        <button class="xp-button xp-button-table-action" onclick="deleteProductFromCard(${storageId}, ${product.itemId}, '${product.name.replace(/'/g, "\\'")}')">Sterge</button>
                    </td>
                `;
            });
        } else {
            const row = targetTableBodyElement.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4; 
            cell.className = 'xp-empty-message';
            cell.textContent = 'Nu exista produse in acest depozit.';
        }
    } catch (error) {
        console.error(`Eroare la incarcarea produselor pentru storageId ${storageId}:`, error);
        targetTableBodyElement.innerHTML = `<tr><td colspan="4" class="xp-empty-message">Eroare la incarcarea produselor: ${error.message}</td></tr>`;
    }
}

async function addProductInCard(storageId, formElement, targetTableBodyElement, addButtonElement, expandableContentElement) {
    const errorDisplayContainer = formElement; 
    if (errorDisplayContainer) hideFormError(errorDisplayContainer);
    
    const numericStorageId = typeof storageId === 'string' ? parseInt(storageId, 10) : storageId;

    if (!formElement || !targetTableBodyElement || !addButtonElement || !expandableContentElement) {
        console.error("Elemente DOM lipsa pentru addProductInCard");
        return;
    }

    const nameInput = formElement.querySelector('.product-name-in-card');
    const quantityInput = formElement.querySelector('.product-quantity-in-card');
    const unitInput = formElement.querySelector('.product-unit-in-card');

    if(!nameInput || !quantityInput || !unitInput) { 
        if(errorDisplayContainer) showFormError(errorDisplayContainer, 'Eroare interna in formularul de produs.'); 
        return; 
    }

    const name = nameInput.value.trim();
    const quantityStr = quantityInput.value.trim();
    const unit_of_measure = unitInput.value;

    if (!name || !quantityStr || !unit_of_measure) { 
        if(errorDisplayContainer) showFormError(errorDisplayContainer, 'Nume, cantitate si unitate sunt obligatorii!'); 
        return; 
    }
    
    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity) || quantity < 0) { 
        if(errorDisplayContainer) showFormError(errorDisplayContainer, 'Cantitatea trebuie sa fie un numar valid si pozitiv.'); 
        return; 
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        showInfoModal("Sesiunea a expirat. Va rugam sa va reautentificati.", "Eroare Autentificare");
        handleLogout();
        return;
    }

    const productData = {
        storage_id: numericStorageId,
        category_id: null, 
        name,
        quantity,
        unit_of_measure,
        description: null, 
        low_stock_threshold: null,
        expiry_date: null,
        check_date: null
    };

    try {
        const response = await fetch('http://localhost:3000/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { handleLogout(); return; }
            if (errorDisplayContainer) showFormError(errorDisplayContainer, data.message || `Eroare HTTP: ${response.status}`);
            throw new Error(data.message || `Eroare HTTP: ${response.status}`);
        }

        showInfoModal(data.message || "Produs adaugat cu succes!", "Succes");
        
        nameInput.value = '';
        quantityInput.value = '';
        unitInput.value = 'buc'; 
        formElement.style.display = 'none';
        addButtonElement.style.display = 'block';

        await renderProductsInCard(numericStorageId, targetTableBodyElement);
        
        if (expandableContentElement.classList.contains('expanded')) {
            requestAnimationFrame(() => {
                 if(expandableContentElement.classList.contains('expanded')) expandableContentElement.style.maxHeight = expandableContentElement.scrollHeight + "px";
            });
        }

    } catch (error) {
        console.error("Eroare la adaugarea produsului:", error);
        if (errorDisplayContainer && !errorDisplayContainer.querySelector('.form-error-message.xp-error-message').textContent) {
            showFormError(errorDisplayContainer, `Eroare de retea sau server: ${error.message}`);
        }
    }
}

async function deleteProductFromCard(storageId, itemId, productName = "acest produs") {
    const safeProductName = typeof productName === 'string' ? productName.replace(/'/g, "\\'").replace(/"/g, '\\"') : "acest produs";

    showCustomConfirm(`Sunteti sigur ca doriti sa stergeti produsul "${safeProductName}"?`, "Confirmare Stergere Produs", async () => {
        const token = localStorage.getItem('authToken');
        if (!token) { 
            showInfoModal("Sesiunea a expirat. Va rugam sa va reautentificati.", "Eroare Autentificare");
            handleLogout(); 
            return; 
        }

        try {
            const response = await fetch(`http://localhost:3000/api/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) { handleLogout(); return; }
                throw new Error(data.message || `Eroare HTTP: ${response.status}`);
            }
            
            showInfoModal(data.message || `Produsul "${safeProductName}" a fost sters.`, "Stergere Reusita", "fa-trash-alt");
            
            const numericStorageId = typeof storageId === 'string' ? parseInt(storageId, 10) : storageId;
            const storageItemElement = document.querySelector(`.storage-item[data-storage-id="${numericStorageId}"]`);
            if (storageItemElement) {
                const tableBody = storageItemElement.querySelector('.product-list-in-card tbody');
                const expandableContentElement = storageItemElement.querySelector('.storage-content-expandable');
                 if (tableBody && expandableContentElement && expandableContentElement.classList.contains('expanded')) {
                    await renderProductsInCard(numericStorageId, tableBody); 
                     requestAnimationFrame(() => { 
                        if(expandableContentElement.classList.contains('expanded')) expandableContentElement.style.maxHeight = expandableContentElement.scrollHeight + "px";
                    });
                }
            }

        } catch (error) {
            console.error("Eroare la stergerea produsului:", error);
            showInfoModal(`Eroare la stergerea produsului: ${error.message}`, "Eroare Retea", "fa-ethernet", "#D81E05");
        }
    });
}