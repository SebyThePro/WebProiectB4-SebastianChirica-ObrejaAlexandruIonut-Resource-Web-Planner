const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
        document.getElementById('open-forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            openForgotPasswordModal();
        });
        document.getElementById('close-forgot-password-modal-button').addEventListener('click', closeForgotPasswordModal);
        document.getElementById('cancel-forgot-password-modal-button').addEventListener('click', closeForgotPasswordModal);
        document.getElementById('forgot-password-button').addEventListener('click', handleForgotPassword);
        
        document.getElementById('login-identifier').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
        document.getElementById('login-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    }

    const registerButton = document.getElementById('register-button');
    if (registerButton) {
        registerButton.addEventListener('click', handleRegister);
    }
    
    const resetWithCodeButton = document.getElementById('reset-with-code-button');
    if (resetWithCodeButton) {
        resetWithCodeButton.addEventListener('click', handleResetWithCode);
    }
});

function displayAuthMessage(containerId, message, isError = true) {
    const messageDiv = document.getElementById(containerId);
    if (!messageDiv) return;

    if (containerId.includes('error')) {
        const successId = containerId.replace('error', 'success');
        const successDiv = document.getElementById(successId);
        if (successDiv) successDiv.style.display = 'none';
    } else if (containerId.includes('success')) {
        const errorId = containerId.replace('success', 'error');
        const errorDiv = document.getElementById(errorId);
        if(errorDiv) errorDiv.style.display = 'none';
    }
    
    messageDiv.textContent = message;
    if (isError) {
        messageDiv.className = 'form-error-message xp-error-message';
    } else {
        messageDiv.className = 'form-success-message';
        messageDiv.style.backgroundColor = '#D4EDDA';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #C3E6CB';
        messageDiv.style.padding = '8px 10px';
        messageDiv.style.marginBottom = '12px';
    }
    messageDiv.style.display = 'block';
}

async function handleLogin() {
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-modal-error');
    
    errorDiv.style.display = 'none';
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value.trim();

    if (!identifier || !password) {
        displayAuthMessage('login-modal-error', 'Email/Username si parola sunt obligatorii.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('loggedInUser', data.user.username);
            window.location.href = 'index.html';
        } else {
            displayAuthMessage('login-modal-error', data.message || 'A aparut o eroare.');
        }
    } catch (error) {
        console.error('Eroare la requestul de login:', error);
        displayAuthMessage('login-modal-error', 'Nu s-a putut conecta la server.');
    }
}

async function handleRegister() {
    const usernameInput = document.getElementById('register-username');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const errorDiv = document.getElementById('register-modal-error');

    errorDiv.style.display = 'none';

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!username || !email || !password || !confirmPassword) {
        displayAuthMessage('register-modal-error', 'Toate campurile sunt obligatorii.');
        return;
    }
    if (password !== confirmPassword) {
        displayAuthMessage('register-modal-error', 'Parolele nu se potrivesc.');
        return;
    }
    if (password.length < 6) {
        displayAuthMessage('register-modal-error', 'Parola trebuie sa aiba minim 6 caractere.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        displayAuthMessage('register-modal-error', 'Formatul adresei de email este invalid.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.status === 201) {
            alert('Inregistrare reusita! Va puteti autentifica acum.');
            window.location.href = 'login.html';
        } else {
            displayAuthMessage('register-modal-error', data.message || 'A aparut o eroare la inregistrare.');
        }
    } catch (error) {
        console.error('Eroare la requestul de inregistrare:', error);
        displayAuthMessage('register-modal-error', 'Nu s-a putut conecta la server.');
    }
}

function openForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        modal.querySelector('#forgot-password-modal-error').style.display = 'none';
        modal.querySelector('#forgot-password-modal-success').style.display = 'none';
        modal.querySelector('#forgot-password-email').value = '';
        modal.style.display = 'flex';
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function handleForgotPassword() {
    const emailInput = document.getElementById('forgot-password-email');
    const email = emailInput.value.trim();
    if (!email) {
        displayAuthMessage('forgot-password-modal-error', 'Adresa de email este obligatorie.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message || 'A aparut o eroare.'); }

        localStorage.setItem('resetEmail', email);
        window.location.href = 'cod-resetare.html';

    } catch (error) {
        displayAuthMessage('forgot-password-modal-error', error.message);
    }
}

async function handleResetWithCode() {
    const email = localStorage.getItem('resetEmail');
    const codeInput = document.getElementById('reset-code-input');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');
    
    if (!email) {
        displayAuthMessage('reset-error', 'Eroare: Emailul pentru resetare nu a fost găsit. Vă rugăm reluați procesul.');
        return;
    }

    const code = codeInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!code || !newPassword || !confirmPassword) {
        displayAuthMessage('reset-error', 'Toate câmpurile sunt obligatorii.');
        return;
    }
    if (newPassword !== confirmPassword) {
        displayAuthMessage('reset-error', 'Parolele nu se potrivesc.');
        return;
    }
    if (newPassword.length < 6) {
        displayAuthMessage('reset-error', 'Parola nouă trebuie să aibă minim 6 caractere.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/reset-with-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.removeItem('resetEmail');
            displayAuthMessage('reset-success', data.message + ' Vei fi redirecționat...', false);
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
        } else {
            displayAuthMessage('reset-error', data.message);
        }
    } catch (error) {
        console.error('Eroare la resetarea cu cod:', error);
        displayAuthMessage('reset-error', 'Eroare de conexiune cu serverul.');
    }
}