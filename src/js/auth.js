

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);

        const openForgotPasswordLink = document.getElementById('open-forgot-password-link');
        if (openForgotPasswordLink) {
            openForgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault(); 
                openForgotPasswordModal();
            });
        }

        const closeForgotPasswordModalButton = document.getElementById('close-forgot-password-modal-button');
        if (closeForgotPasswordModalButton) {
            closeForgotPasswordModalButton.addEventListener('click', closeForgotPasswordModal);
        }

        const cancelForgotPasswordModalButton = document.getElementById('cancel-forgot-password-modal-button');
        if (cancelForgotPasswordModalButton) {
            cancelForgotPasswordModalButton.addEventListener('click', closeForgotPasswordModal);
        }

        const forgotPasswordButton = document.getElementById('forgot-password-button');
        if (forgotPasswordButton) {
             forgotPasswordButton.addEventListener('click', handleForgotPassword);
        }

        const loginIdentifierInput = document.getElementById('login-identifier');
        const loginPasswordInput = document.getElementById('login-password');
        if (loginIdentifierInput) {
            loginIdentifierInput.addEventListener('keypress', function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleLogin();
                }
            });
        }
        if (loginPasswordInput) {
            loginPasswordInput.addEventListener('keypress', function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleLogin();
                }
            });
        }
    }

    const registerButton = document.getElementById('register-button');
    if (registerButton) {
        registerButton.addEventListener('click', handleRegister);

        const registerUsernameInput = document.getElementById('register-username');
        const registerEmailInput = document.getElementById('register-email');
        const registerPasswordInput = document.getElementById('register-password');
        const registerConfirmPasswordInput = document.getElementById('register-confirm-password');

        const registerFields = [registerUsernameInput, registerEmailInput, registerPasswordInput, registerConfirmPasswordInput];
        registerFields.forEach(field => {
            if (field) {
                field.addEventListener('keypress', function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        handleRegister();
                    }
                });
            }
        });
    }
    const resetPasswordButton = document.getElementById('reset-password-button');
    if (resetPasswordButton) {
        extractTokenAndStore(); 
        resetPasswordButton.addEventListener('click', handleResetPassword);

        const newPasswordInput = document.getElementById('new-password');
        const confirmNewPasswordInput = document.getElementById('confirm-new-password');

        if (newPasswordInput) {
            newPasswordInput.addEventListener('keypress', function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleResetPassword();
                }
            });
        }
        if (confirmNewPasswordInput) {
            confirmNewPasswordInput.addEventListener('keypress', function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handleResetPassword();
                }
            });
        }
    }
});

// --- FUNCTII PENTRU AFISAREA ERORILOR/SUCCESULUI IN FORMULARE ---
function displayAuthMessage(formType, message, isError = true) {
    const errorDivId = formType === 'login' ? 'login-modal-error' :
                       formType === 'register' ? 'register-modal-error' :
                       formType === 'forgot-password' ? 'forgot-password-modal-error' :
                       'reset-password-error'; 
    const successDivId = formType === 'forgot-password' ? 'forgot-password-modal-success' :
                         formType === 'reset-password' ? 'reset-password-success' : 
                         null;

    const errorDiv = document.getElementById(errorDivId);
    const successDiv = successDivId ? document.getElementById(successDivId) : null;

    if (isError) {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        if (successDiv) {
            successDiv.style.display = 'none';
            successDiv.textContent = '';
        }
    } else {
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }
}

function clearAuthMessages(formType) {
    const errorDivId = formType === 'login' ? 'login-modal-error' :
                       formType === 'register' ? 'register-modal-error' :
                       formType === 'forgot-password' ? 'forgot-password-modal-error' :
                       'reset-password-error'; 
    const successDivId = formType === 'forgot-password' ? 'forgot-password-modal-success' :
                         formType === 'reset-password' ? 'reset-password-success' : 
                         null;

    const errorDiv = document.getElementById(errorDivId);
    const successDiv = successDivId ? document.getElementById(successDivId) : null;

    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    if (successDiv) {
        successDiv.textContent = '';
        successDiv.style.display = 'none';
    }
}
async function handleLogin() {
    clearAuthMessages('login');
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');

    if (!identifierInput || !passwordInput) {
        console.error("Elementele formularului de login nu au fost gasite!");
        return;
    }

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value.trim();

    if (!identifier || !password) {
        displayAuthMessage('login', 'Email/Username si parola sunt obligatorii.');
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
                displayAuthMessage('login', data.message || 'Token de autentificare lipsa in raspuns.');
            }
        } else {
            displayAuthMessage('login', data.message || 'A aparut o eroare la autentificare.');
        }
    } catch (error) {
        console.error('Eroare la requestul de login:', error);
        displayAuthMessage('login', 'Nu s-a putut conecta la server. Incercati mai tarziu.');
    }
}

async function handleRegister() {
    clearAuthMessages('register');
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
        displayAuthMessage('register', 'Toate campurile sunt obligatorii.');
        return;
    }

    if (password !== confirmPassword) {
        displayAuthMessage('register', 'Parolele nu se potrivesc.');
        return;
    }

    if (password.length < 6) {
        displayAuthMessage('register', 'Parola trebuie sa aiba minim 6 caractere.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        displayAuthMessage('register', 'Formatul adresei de email este invalid.');
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
            displayAuthMessage('register', data.message || 'A aparut o eroare la inregistrare.');
        }
    } catch (error) {
        console.error('Eroare la requestul de inregistrare:', error);
        displayAuthMessage('register', 'Nu s-a putut conecta la server. Incercati mai tarziu.');
    }
}


function openForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        clearAuthMessages('forgot-password');
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
    clearAuthMessages('forgot-password');
    const emailInput = document.getElementById('forgot-password-email');
    const forgotPasswordButton = document.getElementById('forgot-password-button');

    if (!emailInput) {
        console.error("Elementul de email pentru uitare parola nu a fost gasit!");
        return;
    }
    const email = emailInput.value.trim();

    if (!email) {
        displayAuthMessage('forgot-password', 'Adresa de email este obligatorie.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        displayAuthMessage('forgot-password', 'Formatul adresei de email este invalid.');
        return;
    }

    if (forgotPasswordButton) forgotPasswordButton.disabled = true; 

    try {
        const response = await fetch('http://localhost:3000/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (data.message) {
            displayAuthMessage('forgot-password', data.message, false); 
            emailInput.value = ''; 
        } else {
  
            displayAuthMessage('forgot-password', 'Cererea a fost procesata. Verificati email-ul.', false);
        }

    } catch (error) {
        console.error('Eroare la cererea de resetare parola:', error);
        displayAuthMessage('forgot-password', 'Eroare de comunicare cu serverul. Incercati mai tarziu.');
    } finally {
        if (forgotPasswordButton) forgotPasswordButton.disabled = false; 
    }
}
function extractTokenAndStore() {
    console.log("Functia extractTokenAndStore a fost apelata."); 

    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLSearchParams extras:", window.location.search); 

    const token = urlParams.get('token');
    console.log("Token extras din URL (urlParams.get('token')):", token); 

    const hiddenTokenInput = document.getElementById('reset-token');
    if (hiddenTokenInput) {
        console.log("Elementul #reset-token (hidden input) a fost gasit in DOM.");
    } else {
        console.error("EROARE CRITICA: Elementul #reset-token (hidden input) NU a fost gasit in DOM!"); 
    }


    if (token && hiddenTokenInput) {
        hiddenTokenInput.value = token;
        console.log("Token-ul a fost gasit si stocat in campul hidden. Valoare:", hiddenTokenInput.value); 
        clearAuthMessages('reset-password'); 
        const resetButton = document.getElementById('reset-password-button');
        if (resetButton) resetButton.disabled = false;
        const newPassInput = document.getElementById('new-password');
        if (newPassInput) newPassInput.disabled = false;
        const confirmNewPassInput = document.getElementById('confirm-new-password');
        if (confirmNewPassInput) confirmNewPassInput.disabled = false;

    } else { 
        if (!token) {
            console.error("Motiv eroare: Token-ul NU a fost gasit in URL (este null sau undefined).");
        }
        if (!hiddenTokenInput) {
            console.error("Motiv eroare: Elementul #reset-token (hidden input) NU a fost gasit.");
        }
        displayAuthMessage('reset-password', 'Token de resetare invalid sau negasit. Va rugam solicitati un nou link.');
        const resetButton = document.getElementById('reset-password-button');
        if (resetButton) resetButton.disabled = true;
        const newPassInput = document.getElementById('new-password');
        if (newPassInput) newPassInput.disabled = true;
        const confirmNewPassInput = document.getElementById('confirm-new-password');
        if (confirmNewPassInput) confirmNewPassInput.disabled = true;
    }
}
async function handleResetPassword() {
    clearAuthMessages('reset-password'); 
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const tokenInput = document.getElementById('reset-token'); 

    if (!newPasswordInput || !confirmNewPasswordInput || !tokenInput) {
        console.error("Elemente ale formularului de resetare parola lipsesc!");
        displayAuthMessage('reset-password', 'Eroare interna a formularului.');
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;
    const token = tokenInput.value;

    if (!token) {
        displayAuthMessage('reset-password', 'Token de resetare invalid sau lipsa. Incercati sa solicitati un nou link.');
        return;
    }
    if (!newPassword || !confirmPassword) {
        displayAuthMessage('reset-password', 'Ambele campuri pentru parola sunt obligatorii.');
        return;
    }
    if (newPassword !== confirmPassword) {
        displayAuthMessage('reset-password', 'Parolele introduse nu se potrivesc.');
        return;
    }
    if (newPassword.length < 6) {
        displayAuthMessage('reset-password', 'Noua parola trebuie sa aiba minim 6 caractere.');
        return;
    }

    const resetButton = document.getElementById('reset-password-button');
    if (resetButton) resetButton.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, newPassword, confirmPassword }) 
        });

        const data = await response.json();

        if (response.ok) { 
            displayAuthMessage('reset-password', data.message || 'Parola a fost resetata cu succes! Va puteti autentifica acum.', false);
            if (newPasswordInput) newPasswordInput.disabled = true;
            if (confirmNewPasswordInput) confirmNewPasswordInput.disabled = true;
            if (resetButton) resetButton.textContent = "Parola Resetata";
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000); 
        } else {
            displayAuthMessage('reset-password', data.message || 'A aparut o eroare la resetarea parolei.');
            if (resetButton) resetButton.disabled = false; 
        }
    } catch (error) {
        console.error('Eroare la requestul de resetare parola:', error);
        displayAuthMessage('reset-password', 'Nu s-a putut conecta la server. Incercati mai tarziu.');
        if (resetButton) resetButton.disabled = false;
    }
}