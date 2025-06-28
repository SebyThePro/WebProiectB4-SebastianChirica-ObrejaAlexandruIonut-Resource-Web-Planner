
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

document.addEventListener('DOMContentLoaded', () => {
    const exportJsonBtn = document.getElementById('export-json-btn');
    if(exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => handleExport('json'));
    }

    const exportCsvBtn = document.getElementById('export-csv-btn');
    if(exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => handleExport('csv'));
    }

    const exportXmlBtn = document.getElementById('export-xml-btn');
    if(exportXmlBtn) {
        exportXmlBtn.addEventListener('click', () => handleExport('xml'));
    }

    const importBtn = document.getElementById('import-btn');
    if(importBtn) {
        importBtn.addEventListener('click', handleImport);
    }
});

async function handleExport(format) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Eroare de autentificare. Te rugam sa te re-autentifici.");
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/export/${format}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'A aparut o eroare la generarea fisierului.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `export_date.${format}`;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        a.remove();

    } catch (error) {
        console.error(`Eroare la exportul in format ${format}:`, error);
        alert(`Eroare la export: ${error.message}`);
    }
}

async function handleImport() {
    const format = document.getElementById('import-format-select').value;
    const dataText = document.getElementById('import-data-textarea').value;
    const errorContainer = document.getElementById('import-error-message');
    const successContainer = document.getElementById('import-success-message');
    
    errorContainer.style.display = 'none';
    successContainer.style.display = 'none';

    if (!dataText.trim()) {
        errorContainer.textContent = 'Caseta de text este goala.';
        errorContainer.style.display = 'block';
        return;
    }

    let body;
    let contentType;

    if (format === 'json') {
        try {
            JSON.parse(dataText); 
            contentType = 'application/json';
            body = dataText;
        } catch (e) {
            errorContainer.textContent = 'Eroare de format: Textul introdus nu este un JSON valid.';
            errorContainer.style.display = 'block';
            return;
        }
    } else if (format === 'csv') {
        contentType = 'text/csv';
        body = dataText;
    } else if (format === 'xml') {
        contentType = 'application/xml';
        body = dataText;
    } else {
        errorContainer.textContent = 'Format de import necunoscut.';
        errorContainer.style.display = 'block';
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Eroare de autentificare.");
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/import/${format}`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Authorization': `Bearer ${token}`
            },
            body: body
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'A aparut o eroare necunoscuta la server.');
        }

        successContainer.textContent = result.message;
        successContainer.style.display = 'block';

    } catch (error) {
        errorContainer.textContent = error.message;
        errorContainer.style.display = 'block';
    }
}