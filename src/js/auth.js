
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('login-button')) {
        document.getElementById('login-button').addEventListener('click', handleLogin);
        if (document.getElementById('open-forgot-password-link')) {
            document.getElementById('open-forgot-password-link').addEventListener('click', (e) => {
                e.preventDefault();
                openForgotPasswordModal();
            });
        }
        if (document.getElementById('close-forgot-password-modal-button')) {
            document.getElementById('close-forgot-password-modal-button').addEventListener('click', closeForgotPasswordModal);
        }
        if (document.getElementById('cancel-forgot-password-modal-button')) {
            document.getElementById('cancel-forgot-password-modal-button').addEventListener('click', closeForgotPasswordModal);
        }
        if (document.getElementById('forgot-password-button')) {
             document.getElementById('forgot-password-button').addEventListener('click', handleForgotPassword);
        }
    }

    if (document.getElementById('register-button')) {
        document.getElementById('register-button').addEventListener('click', handleRegister);
    }
});

// --- FUNCTII PENTRU AFISAREA ERORILOR IN FORMULARE ---
function displayAuthError(formType, message) {
    const errorDivId = formType === 'login' ? 'login-modal-error' : (formType === 'register' ? 'register-modal-error' : 'forgot-password-modal-error');
    const errorDiv = document.getElementById(errorDivId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearAuthError(formType) {
    const errorDivId = formType === 'login' ? 'login-modal-error' : (formType === 'register' ? 'register-modal-error' : 'forgot-password-modal-error');
    const errorDiv = document.getElementById(errorDivId);
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

function displayAuthSuccess(formType, message) {
    if (formType === 'forgot-password') {
        const successDiv = document.getElementById('forgot-password-modal-success');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
    }
}


// ---LOGIN ---
async function handleLogin() {
    clearAuthError('login');
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');

    if (!identifierInput || !passwordInput) {
        console.error("Elementele formularului de login nu au fost gasite!");
        return;
    }

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value.trim();

    if (!identifier || !password) {
        displayAuthError('login', 'Email/Username si parola sunt obligatorii.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier, password })
        });

        const data = await response.json();

        if (response.ok) { 
            console.log('Login reusit:', data);
            if (data.token) {
                localStorage.setItem('authToken', data.token); 
                if (data.user && data.user.username) {
                    localStorage.setItem('loggedInUser', data.user.username);
                }
                window.location.href = 'index.html';
            } else {
                displayAuthError('login', 'Token de autentificare lipsa in raspuns.');
            }
        } else {
            displayAuthError('login', data.message || 'A aparut o eroare la autentificare.');
        }
    } catch (error) {
        console.error('Eroare la requestul de login:', error);
        displayAuthError('login', 'Nu s-a putut conecta la server. Incercati mai tarziu.');
    }
}

// ---INREGISTRARE ---
async function handleRegister() {
    clearAuthError('register');
    const usernameInput = document.getElementById('register-username');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');

    if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
        console.error("Elementele formularului de inregistrare nu au fost gasite!");
        return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!username || !email || !password || !confirmPassword) {
        displayAuthError('register', 'Toate campurile sunt obligatorii.');
        return;
    }

    if (password !== confirmPassword) {
        displayAuthError('register', 'Parolele nu se potrivesc.');
        return;
    }

    if (password.length < 6) {
        displayAuthError('register', 'Parola trebuie sa aiba minim 6 caractere.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        displayAuthError('register', 'Formatul adresei de email este invalid.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/register', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.status === 201) { 
            console.log('Inregistrare reusita:', data);
            alert('Inregistrare reusita! Va puteti autentifica acum.'); 
            window.location.href = 'login.html'; 
        } else {
            displayAuthError('register', data.message || 'A aparut o eroare la inregistrare.');
        }
    } catch (error) {
        console.error('Eroare la requestul de inregistrare:', error);
        displayAuthError('register', 'Nu s-a putut conecta la server. Incercati mai tarziu.');
    }
}


// ---"AM UITAT PAROLA" ---
function openForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        clearAuthError('forgot-password'); 
        const successDiv = document.getElementById('forgot-password-modal-success');
        if(successDiv) successDiv.style.display = 'none'; 
        const emailInput = document.getElementById('forgot-password-email');
        if(emailInput) emailInput.value = ''; 

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
    clearAuthError('forgot-password');
    const successDiv = document.getElementById('forgot-password-modal-success');
    if(successDiv) successDiv.style.display = 'none';

    const emailInput = document.getElementById('forgot-password-email');
    if (!emailInput) {
        console.error("Elementul de email pentru uitare parola nu a fost gasit!");
        return;
    }
    const email = emailInput.value.trim();

    if (!email) {
        displayAuthError('forgot-password', 'Adresa de email este obligatorie.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        displayAuthError('forgot-password', 'Formatul adresei de email este invalid.');
        return;
    }

    // TODO: Implementeaza apelul catre backend pentru /api/forgot-password
    console.log('Se trimit instructiuni de resetare pentru:', email);
    setTimeout(() => {
        if (email === "exista@exemplu.com") {
            displayAuthSuccess('forgot-password', 'Daca un cont cu acest email exista, instructiunile de resetare au fost trimise.');
            emailInput.value = '';
        } else {
            displayAuthError('forgot-password', 'Nu s-a gasit niciun cont cu aceasta adresa de email.');
        }
    }, 1000);
}