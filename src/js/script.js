
let storages = [];
let editingStorageId = null;
let confirmOkCallback = null;
let activeOptionsMenu = null;
let editingItemId = null;

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
    
    const openNotificationsButton = document.getElementById('open-notifications-panel-button');
    if (openNotificationsButton) {
        openNotificationsButton.addEventListener('click', toggleNotificationsPanel);
    }
    const closeNotificationsButton = document.getElementById('close-notifications-panel-button');
    if (closeNotificationsButton) {
        closeNotificationsButton.addEventListener('click', toggleNotificationsPanel);
    }

    const addNewNotificationButton = document.getElementById('add-new-notification-button');
    if (addNewNotificationButton) {
        addNewNotificationButton.addEventListener('click', openNewNotificationModal);
    }

    const notificationTypeSelect = document.getElementById('notification-type-select');
    if (notificationTypeSelect) {
        notificationTypeSelect.addEventListener('change', handleNotificationTypeChange);
    }
});

function initializeMainPageFunctionality() {
    console.log("Initializare functionalitati pagina principala (utilizator autentificat).");

    loadStorages();
    renderColorPicker();
    loadGradientPresetsFromStorage();
    populatePresetsSelect();
    applyCurrentGradient();

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

    if (openGradientSettingsButton) openGradientSettingsButton.addEventListener('click', (e) => { e.stopPropagation(); gradientSettingsPanel.style.display = 'block'; });
    if (closeGradientSettingsButton) closeGradientSettingsButton.addEventListener('click', () => gradientSettingsPanel.style.display = 'none');
    if (saveGradientPresetButton) saveGradientPresetButton.addEventListener('click', handleSaveGradientPreset);
    if (loadGradientPresetButton) loadGradientPresetButton.addEventListener('click', handleLoadGradientPreset);
    if (deleteGradientPresetButton) deleteGradientPresetButton.addEventListener('click', handleDeleteGradientPreset);
    if (gradientColorTopInput) gradientColorTopInput.addEventListener('input', previewCurrentGradient);
    if (gradientColorBottomInput) gradientColorBottomInput.addEventListener('input', previewCurrentGradient);
    if (gradientSpeedInput) gradientSpeedInput.addEventListener('input', previewCurrentGradient);

    const infoModal = document.getElementById('custom-info-modal');
    if (infoModal) {
        infoModal.querySelector('#custom-info-ok').addEventListener('click', () => infoModal.style.display = 'none');
        infoModal.querySelector('#custom-info-close-button').addEventListener('click', () => infoModal.style.display = 'none');
    }

    const openNotificationsButton = document.getElementById('open-notifications-panel-button');
    if (openNotificationsButton) openNotificationsButton.addEventListener('click', toggleNotificationsPanel);
    const closeNotificationsButton = document.getElementById('close-notifications-panel-button');
    if (closeNotificationsButton) closeNotificationsButton.addEventListener('click', toggleNotificationsPanel);
    const addNewNotificationButton = document.getElementById('add-new-notification-button');
    if (addNewNotificationButton) addNewNotificationButton.addEventListener('click', openNewNotificationModal);
    const notificationTypeSelect = document.getElementById('notification-type-select');
    if (notificationTypeSelect) notificationTypeSelect.addEventListener('change', handleNotificationTypeChange);

    const openStatsButton = document.getElementById('open-stats-button');
    if (openStatsButton) openStatsButton.addEventListener('click', openStatisticsModal);
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

function openItemModal(itemId) {
    const modal = document.getElementById('item-modal');
    if (!modal) return;
    
    editingItemId = itemId;
    let itemToEdit = null;
    
    for (const storage of storages) {
        if (Array.isArray(storage.products)) {
            const foundProduct = storage.products.find(p => p.itemId === itemId);
            if (foundProduct) {
                itemToEdit = foundProduct;
                break;
            }
        }
    }

    if (!itemToEdit) {
        showInfoModal("Eroare: Produsul nu a fost gasit in datele locale.", "Eroare", "fa-exclamation-triangle");
        return;
    }

    document.getElementById('item-modal-title').textContent = `Editare: ${itemToEdit.name}`;
    document.getElementById('item-name-modal').value = itemToEdit.name;
    document.getElementById('item-quantity-modal').value = itemToEdit.quantity;
    document.getElementById('item-unit-modal').value = itemToEdit.unitOfMeasure;
    
    modal.querySelector('#item-modal-error').style.display = 'none';
    modal.style.display = 'flex';
}

function closeItemModal() {
    const modal = document.getElementById('item-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    editingItemId = null;
}

async function handleUpdateItem() {
    if (!editingItemId) return;
    const errorContainer = document.getElementById('item-modal-error');
    errorContainer.style.display = 'none';

    const name = document.getElementById('item-name-modal').value.trim();
    const quantity = parseFloat(document.getElementById('item-quantity-modal').value);
    const unit_of_measure = document.getElementById('item-unit-modal').value;

    if (!name || isNaN(quantity)) {
        errorContainer.textContent = "Numele si cantitatea sunt obligatorii.";
        errorContainer.style.display = 'block';
        return;
    }
    if (unit_of_measure === 'buc' && !Number.isInteger(quantity)) {
        errorContainer.textContent = 'Pentru "buc", cantitatea trebuie sa fie un numar intreg.';
        errorContainer.style.display = 'block';
        return;
    }

    let itemToUpdate = null;
    let storageOfItem = null;
    for (const storage of storages) {
        if (Array.isArray(storage.products)) {
            const foundProduct = storage.products.find(p => p.itemId === editingItemId);
            if (foundProduct) {
                itemToUpdate = foundProduct;
                storageOfItem = storage;
                break;
            }
        }
    }

    if (!itemToUpdate) {
        errorContainer.textContent = "Eroare interna: nu s-au gasit datele originale ale produsului.";
        errorContainer.style.display = 'block';
        return;
    }
    
    const updatedData = { ...itemToUpdate, name, quantity, unit_of_measure, storage_id: itemToUpdate.storageId, category_id: itemToUpdate.categoryId };

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`API_BASE_URL/api/items/${editingItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        if (!response.ok) { throw new Error(result.message); }

        showInfoModal(result.message, "Succes");
        closeItemModal();
        
        if (result.notificationMessage) {
            setTimeout(() => {
                showInfoModal(result.notificationMessage, "Alertă Stoc", "fa-exclamation-triangle", "#FFC000");
            }, 700);
        }
        
        itemToUpdate.name = name;
        itemToUpdate.quantity = quantity;
        itemToUpdate.unitOfMeasure = unit_of_measure;
        
        const storageElement = document.querySelector(`.storage-item[data-storage-id="${storageOfItem.id}"]`);
        if (storageElement) {
            const tableBody = storageElement.querySelector('.product-list-in-card tbody');
            await renderProductsInCard(storageOfItem.id, tableBody);
        }

    } catch (error) {
        errorContainer.textContent = error.message;
        errorContainer.style.display = 'block';
    }
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
        const response = await fetch('API_BASE_URL/api/storages', {
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

    let url = 'API_BASE_URL/api/storages';
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
        expandButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    const currentStorageId = parseInt(storageItem.dataset.storageId, 10);
    const isExpanded = expandableContent.classList.toggle('expanded');
    
    expandButton.setAttribute('aria-expanded', isExpanded.toString());
    expandButton.innerHTML = isExpanded ? '<i class="fas fa-minus"></i>' : '<i class="fas fa-plus"></i>';

    if (isExpanded) {
        await renderProductsInCard(currentStorageId, productTableInCard.querySelector('tbody'));
        
        requestAnimationFrame(() => {
            if(expandableContent.classList.contains('expanded')) {
                expandableContent.style.maxHeight = expandableContent.scrollHeight + "px";
            }
        });
    } else {
        expandableContent.style.maxHeight = '0px';
        productFormInCard.style.display = 'none';
        addProductButtonInCard.style.display = 'block';
    }
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
            const response = await fetch(`API_BASE_URL/api/storages/${numericStorageId}`, {
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
        console.error("Elementul tinta pentru produse nu a fost gasit pentru storageId:", storageId);
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        targetTableBodyElement.innerHTML = '<tr><td colspan="4" class="xp-empty-message">Eroare de autentificare. Reincarcati pagina.</td></tr>';
        return;
    }

    targetTableBodyElement.innerHTML = '<tr><td colspan="4" class="xp-empty-message">Se incarca produsele...</td></tr>';

    try {
        const response = await fetch(`API_BASE_URL/api/items?storageId=${storageId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { handleLogout(); return; }
            const errorData = await response.json();
            throw new Error(errorData.message || `Eroare HTTP: ${response.status}`);
        }

        const items = await response.json();

        const currentStorage = storages.find(s => s.id === storageId);
        if (currentStorage) {
            currentStorage.products = items; 
        }

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
                        <button class="xp-button xp-button-table-action" onclick="openItemModal(${product.itemId})">Editeaza</button>
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
     if (unit_of_measure === 'buc' && !Number.isInteger(quantity)) {
        if(errorDisplayContainer) showFormError(errorDisplayContainer, 'Pentru unitatea "buc", cantitatea trebuie sa fie un numar intreg (fara zecimale).');
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
        const response = await fetch('API_BASE_URL/api/items', {
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
            const response = await fetch(`API_BASE_URL/api/items/${itemId}`, {
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
function toggleNotificationsPanel() {
    const panel = document.getElementById('notifications-panel');
    if (panel) {
        const isOpen = panel.classList.toggle('open');
        if (isOpen) {
            loadUserNotifications();
            loadUserAlerts();     
        }
    }
}

async function loadUserNotifications() {
    const listContainer = document.getElementById('notifications-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<p class="xp-empty-message">Se incarca regulile...</p>';
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch('API_BASE_URL/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) { throw new Error('Nu s-au putut incarca regulile.'); }
        
        const rules = await response.json();
        renderNotificationRules(rules);

    } catch (error) {
        listContainer.innerHTML = `<p class="xp-empty-message">${error.message}</p>`;
    }
}

function renderNotificationRules(rules) {
    const listContainer = document.getElementById('notifications-list');
    if (!listContainer) return;
    listContainer.innerHTML = ''; 

    if (!rules || rules.length === 0) {
        listContainer.innerHTML = '<p class="xp-empty-message">Nu ai nicio regula de notificare setata.</p>';
        return;
    }

    rules.forEach(rule => {
        const ruleElement = document.createElement('div');
        ruleElement.className = 'notification-item';
        
        let description = '';
        if (rule.notificationType === 'LOW_STOCK') {
            description = `Primesti alerta cand stocul scade sub <strong>${rule.threshold}</strong>.`;
        } else if (rule.notificationType === 'SCHEDULED_UPDATE') {
            description = `Primesti update zilnic la ora <strong>${rule.triggerTime}</strong>.`;
        }

        ruleElement.innerHTML = `
            <div class="notification-item-header">
                <span class="notification-item-title">${rule.itemName}</span>
                <button class="xp-button xp-button-table-action" onclick="deleteNotification(${rule.notificationId})">Sterge</button>
            </div>
            <div class="notification-item-body">
                <p>${description}</p>
            </div>`;
        listContainer.appendChild(ruleElement);
    });
}

async function openNewNotificationModal() {
    const modal = document.getElementById('new-notification-modal');
    const itemSelect = document.getElementById('notification-item-select');
    const token = localStorage.getItem('authToken');
    if (!modal || !itemSelect) {
        console.error("Modalul de notificare sau select-ul pentru iteme nu a fost gasit in HTML!");
        return;
    }

    modal.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else if (el.id !== 'notification-type-select') el.value = '';
    });
    document.getElementById('notify-on-site-checkbox').checked = true;
    document.getElementById('notification-type-select').value = 'LOW_STOCK';
    handleNotificationTypeChange();
    modal.querySelector('#new-notification-modal-error').style.display = 'none';
    
    modal.style.display = 'flex';

    itemSelect.innerHTML = '<option value="">Se incarca...</option>';
    try {
        const response = await fetch('API_BASE_URL/api/items', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Eroare la incarcarea produselor.');
        
        const items = await response.json();
        itemSelect.innerHTML = '<option value="">-- Selecteaza un produs --</option>';
        if (items.length === 0) {
            itemSelect.innerHTML = '<option value="">Nu ai niciun produs</option>';
            return;
        }
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.itemId;
            option.textContent = item.name;
            option.dataset.unit = item.unitOfMeasure;
            itemSelect.appendChild(option);
        });
    } catch (error) {
        itemSelect.innerHTML = `<option value="">${error.message}</option>`;
    }
}

function closeNewNotificationModal() {
    const modal = document.getElementById('new-notification-modal');
    if (modal) modal.style.display = 'none';
}

function handleNotificationTypeChange() {
    const type = document.getElementById('notification-type-select').value;
    const lowStockFields = document.getElementById('low-stock-fields');
    const scheduledFields = document.getElementById('scheduled-fields');

    if (type === 'LOW_STOCK') {
        lowStockFields.style.display = 'block';
        scheduledFields.style.display = 'none';
    } else {
        lowStockFields.style.display = 'none';
        scheduledFields.style.display = 'block';
    }
}
async function deleteNotification(notificationId) {
    if (confirm(`Esti sigur ca vrei sa stergi aceasta regula de notificare?`)) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showInfoModal("Sesiune expirata. Te rugam sa te re-autentifici.", "Eroare");
            return;
        }

        try {
            const response = await fetch(`API_BASE_URL/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (!response.ok) { 
                throw new Error(result.message || 'Eroare de la server.'); 
            }
            
            showInfoModal(result.message || "Regula de notificare a fost stearsa.", "Succes");
            loadUserNotifications(); 

        } catch(error) {
            showInfoModal(error.message, "Eroare", "fa-exclamation-triangle");
        }
    }
}

async function handleSaveNotification() {
    const errorContainer = document.getElementById('new-notification-modal-error');
    errorContainer.style.display = 'none';

    const itemSelect = document.getElementById('notification-item-select');
    const thresholdInput = document.getElementById('notification-threshold-input');

    const notificationData = {
        itemId: itemSelect.value,
        notificationType: document.getElementById('notification-type-select').value,
        threshold: thresholdInput.value,
        triggerTime: document.getElementById('notification-time-input').value,
        notifyOnSite: document.getElementById('notify-on-site-checkbox').checked,
        notifyByEmail: document.getElementById('notify-by-email-checkbox').checked
    };
    
    if (!notificationData.itemId) {
        errorContainer.textContent = 'Trebuie să selectezi un produs.';
        errorContainer.style.display = 'block';
        return;
    }
    if (notificationData.notificationType === 'LOW_STOCK') {
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        const unit = selectedOption.dataset.unit;
        const threshold = parseFloat(notificationData.threshold);

        if (isNaN(threshold) || notificationData.threshold.trim() === '') {
            errorContainer.textContent = 'Pragul de stoc trebuie să fie un număr.';
            errorContainer.style.display = 'block';
            return;
        }
        if (unit === 'buc' && !Number.isInteger(threshold)) {
            errorContainer.textContent = 'Pentru "buc", pragul de stoc trebuie să fie un număr întreg.';
            errorContainer.style.display = 'block';
            return;
        }
    }


    if (!notificationData.notifyOnSite && !notificationData.notifyByEmail) {
        errorContainer.textContent = 'Trebuie să selectezi cel puțin o metodă de livrare.';
        errorContainer.style.display = 'block';
        return;
    }

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch('API_BASE_URL/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(notificationData)
        });
        const result = await response.json();
        if (!response.ok) { throw new Error(result.message); }

        showInfoModal(result.message, "Succes");
        closeNewNotificationModal();
        loadUserNotifications();

    } catch (error) {
        errorContainer.textContent = error.message;
        errorContainer.style.display = 'block';
    }
}
async function openStatisticsModal() {
    const modal = document.getElementById('statistics-modal');
    const contentArea = document.getElementById('statistics-modal-content');
    if (!modal || !contentArea) return;

    modal.style.display = 'flex';
    contentArea.innerHTML = '<p>Se incarca statisticile...</p>';
    
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch('API_BASE_URL/api/statistics', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Eroare de la server (non-JSON):", errorText);
            throw new Error(errorText || `Eroare HTTP: ${response.status}`);
        }
        
        const stats = await response.json();
        renderStatistics(stats);

    } catch (error) {
        contentArea.innerHTML = `<div class="form-error-message xp-error-message" style="display:block;">Eroare la preluarea statisticilor: ${error.message}</div>`;
    }
}

function closeStatisticsModal() {
    const modal = document.getElementById('statistics-modal');
    if (modal) modal.style.display = 'none';
}

function renderStatistics(stats) {
    const contentArea = document.getElementById('statistics-modal-content');
    
    let html = `<h4>Statistici Generale</h4>
                <p><strong>Total Depozite:</strong> ${stats.general.totalStorages}</p>
                <p><strong>Total Produse:</strong> ${stats.general.totalItems}</p>
                <hr>`;

    html += `<h4>Produse cu Stoc Redus</h4>`;
    if (stats.lowStockItems && stats.lowStockItems.length > 0) {
        html += `<table class="xp-table">
                    <thead><tr><th>Produs</th><th>Depozit</th><th>Cantitate Curenta</th><th>Prag Stoc Minim</th></tr></thead>
                    <tbody>`;
        stats.lowStockItems.forEach(item => {
            html += `<tr>
                        <td>${item.name}</td>
                        <td>${item.storageName}</td>
                        <td>${item.quantity} ${item.unitOfMeasure}</td>
                        <td>${item.threshold} ${item.unitOfMeasure}</td>
                     </tr>`;
        });
        html += `</tbody></table>`;
    } else {
        html += '<p>Niciun produs nu are stocul sub pragul minim setat.</p>';
    }
    html += '<hr>';

    html += `<h4>Distributie pe Categorii</h4>`;
    if (stats.categoryDistribution && stats.categoryDistribution.length > 0) {
         html += `<table class="xp-table">
                    <thead><tr><th>Categorie</th><th>Numar de Produse</th></tr></thead>
                    <tbody>`;
        stats.categoryDistribution.forEach(cat => {
            html += `<tr>
                        <td>${cat.categoryName}</td>
                        <td>${cat.itemCount}</td>
                     </tr>`;
        });
        html += `</tbody></table>`;
    } else {
        html += '<p>Nu exista produse asociate unor categorii.</p>';
    }

    contentArea.innerHTML = html;
}