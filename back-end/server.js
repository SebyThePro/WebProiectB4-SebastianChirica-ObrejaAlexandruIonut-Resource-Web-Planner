
const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./db_config/db_config.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = 'cheiaTaSecretaSuperComplexa123!';

async function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (!body) {
                return resolve({});
            }
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                console.error("Eroare la parsarea JSON:", error.message, "Body primit (primele 100 caractere):", body.substring(0, 100));
                reject(new Error('Format JSON invalid in corpul cererii. Asigurati-va ca trimiteti un JSON valid.'));
            }
        });
        req.on('error', (err) => {
            console.error("Eroare la citirea stream-ului cererii:", err);
            reject(new Error('Eroare la citirea datelor cererii.'));
        });
    });
}


async function setupEmailTransport() {
    const useEthereal = false;

    if (useEthereal) {
        let nodemailerTestAccount = await nodemailer.createTestAccount();
        console.log("Ethereal test account CREAT (sau refolosit):");
        console.log("User:", nodemailerTestAccount.user);
        console.log("Pass:", nodemailerTestAccount.pass);
        console.log("Previzualizeaza emailurile trimise la: " + nodemailer.getTestMessageUrl({messageId: 'test-id'}));

        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: nodemailerTestAccount.user,
                pass: nodemailerTestAccount.pass,
            },
        });
    } else {
        console.log("Se incearca configurarea transportului Gmail...");
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'sebychirica100@gmail.com',
                pass: 'gradqzdkjzrwdjtd'
            }
        });
    }
}

try {
    oracledb.initOracleClient({ libDir: 'C:\\Oracle\\instantclient_23_8' });
    console.log("Oracle Client initializat cu succes din initOracleClient.");
} catch (err) {
    console.error("Eroare FATALA la initializarea Oracle Client:", err);
    console.error("Verifica daca Oracle Instant Client este instalat corect si calea specificata in initOracleClient este valida.");
    console.error("Verifica si daca ai Microsoft Visual C++ Redistributable corespunzator instalat si ai repornit sistemul.");
    console.error("Aceasta eroare opreste pornirea serverului.");
    process.exit(1);
}

function authenticateToken(req, res) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Token de autentificare lipsa.' }));
        return null;
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        return decodedToken;
    } catch (err) {
        console.error("Eroare la verificarea token-ului:", err.message);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Token invalid sau expirat.' }));
        return null;
    }
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/api/register' && req.method === 'POST') {
        try {
            const { username, email, password } = await parseRequestBody(req);
            if (!username || !email || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Nume utilizator, email si parola sunt obligatorii.' }));
                return;
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN create_new_user(:username, :email, :password_hash, :user_id, :error_message); END;`,
                    { username, email, password_hash: hashedPassword, user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                );
                const errorMessage = result.outBinds.error_message;
                const userId = result.outBinds.user_id;
                if (errorMessage) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: errorMessage }));
                } else {
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Utilizator inregistrat cu succes!', userId: userId }));
                }
            } catch (dbErr) {
                console.error("Eroare Baza de Date la inregistrare:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la inregistrare.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (register):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (register):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid in corpul cererii.' }));
        }
    }
    else if (req.url === '/api/login' && req.method === 'POST') {
        try {
            const { identifier, password } = await parseRequestBody(req);
            if (!identifier || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Identificator (username/email) si parola sunt obligatorii.' }));
                return;
            }
            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN get_user_by_identifier(:identifier, :o_user_id, :o_username, :o_email, :o_password_hash, :o_role, :o_error_message); END;`,
                    { identifier, o_user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_username: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 }, o_email: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }, o_password_hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 255 }, o_role: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20 }, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                );
                const dbErrorMessage = result.outBinds.o_error_message;
                const userId = result.outBinds.o_user_id;
                const storedPasswordHash = result.outBinds.o_password_hash;
                const dbUsername = result.outBinds.o_username;
                const dbEmail = result.outBinds.o_email;
                const dbRole = result.outBinds.o_role;

                if (dbErrorMessage || !userId) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: dbErrorMessage || 'Credentiale invalide.' }));
                    return;
                }
                const passwordMatch = await bcrypt.compare(password, storedPasswordHash);
                if (passwordMatch) {
                    const tokenPayload = { userId, username: dbUsername, role: dbRole };
                    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Autentificare reusita!', token, user: { id: userId, username: dbUsername, email: dbEmail, role: dbRole } }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Credentiale invalide.' }));
                }
            } catch (dbErr) {
                console.error("Eroare Baza de Date la login:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la login.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (login):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (login):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid in corpul cererii.' }));
        }
    }
    else if (req.url === '/api/forgot-password' && req.method === 'POST') {
        try {
            const { email } = await parseRequestBody(req);
            if (!email) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Adresa de email este obligatorie.' }));
                return;
            }
            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const userLookupResult = await connection.execute(
                    `BEGIN get_user_by_identifier(:identifier, :o_user_id, :o_username, :o_email, :o_password_hash, :o_role, :o_error_message); END;`,
                    { identifier: email, o_user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_username: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 }, o_email: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }, o_password_hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 255 }, o_role: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20 }, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                );
                const userId = userLookupResult.outBinds.o_user_id;
                const userEmail = userLookupResult.outBinds.o_email;
                const dbErrorUserLookup = userLookupResult.outBinds.o_error_message;

                if (!userId || dbErrorUserLookup) {
                    console.log(`Cerere resetare parola pentru email negasit sau eroare DB: ${email}, Eroare: ${dbErrorUserLookup}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Daca un cont cu acest email exista, instructiunile de resetare au fost trimise.' }));
                    return;
                }

                const resetTokenPlain = crypto.randomBytes(32).toString('hex');
                const resetTokenHash = await bcrypt.hash(resetTokenPlain, 10);
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

                const storeTokenResult = await connection.execute(
                    `BEGIN store_password_reset_token(:user_id, :token_hash, :token_plain, :expires_at, :o_success, :o_error_message); END;`,
                    { user_id: userId, token_hash: resetTokenHash, token_plain: resetTokenPlain, expires_at: expiresAt, o_success: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                );
                const storeSuccess = storeTokenResult.outBinds.o_success;
                const storeErrorMessage = storeTokenResult.outBinds.o_error_message;

                if (!storeSuccess || storeErrorMessage) {
                    console.error("Eroare la stocarea token-ului de resetare in DB:", storeErrorMessage);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'A aparut o eroare la procesarea cererii. Incercati mai tarziu.' }));
                    return;
                }

                const resetLink = `http://127.0.0.1:5500/src/reset-password.html?token=${resetTokenPlain}`;

                const mailTransport = await setupEmailTransport();
                try {
                    const info = await mailTransport.sendMail({
                        from: '"Admin Proiect Consumabile" <sebychirica100@gmail.com>',
                        to: userEmail,
                        subject: 'Cerere Resetare Parola - Proiect Gestionare Consumabile',
                        html: `<p>Buna ziua,</p><p>Pentru a reseta parola contului tau (${userEmail}), te rugam sa accesezi urmatorul link (valabil 15 minute):</p><p><a href="${resetLink}">${resetLink}</a></p><p>Daca nu ai solicitat aceasta modificare, te rugam sa ignori acest email.</p>`
                    });
                    console.log(`Email de resetare trimis catre ${userEmail}. Message ID: ${info.messageId}`);
                } catch (emailError) {
                    console.error(`Eroare la trimiterea email-ului de resetare catre ${userEmail}:`, emailError);
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Daca un cont cu acest email exista, instructiunile de resetare au fost trimise.' }));
            } catch (dbErr) {
                console.error("Eroare Baza de Date la /api/forgot-password:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la procesarea cererii.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (forgot-password):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (forgot-password):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url === '/api/reset-password' && req.method === 'POST') {
        try {
            const { token, newPassword, confirmPassword } = await parseRequestBody(req);

            if (!token || !newPassword || !confirmPassword) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Token-ul, noua parola si confirmarea parolei sunt obligatorii.' }));
                return;
            }
            if (newPassword !== confirmPassword) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Parolele nu se potrivesc.' }));
                return;
            }
            if (newPassword.length < 6) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Noua parola trebuie sa aiba minim 6 caractere.' }));
                return;
            }

            const tokenHash = await bcrypt.hash(token, 10);
            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);

                const validationResult = await connection.execute(
                    `BEGIN validate_reset_token(:p_token_hash, :o_user_id, :o_is_valid, :o_error_message); END;`,
                    { p_token_hash: tokenHash, o_user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_is_valid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                );
                const userId = validationResult.outBinds.o_user_id;
                const isValidToken = validationResult.outBinds.o_is_valid;
                const validationErrorMessage = validationResult.outBinds.o_error_message;

                if (!isValidToken || !userId || validationErrorMessage) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: validationErrorMessage || 'Token de resetare invalid, expirat sau deja utilizat.' }));
                    return;
                }

                const newHashedPassword = await bcrypt.hash(newPassword, 10);

                const updatePasswordResult = await connection.execute(
                    `BEGIN update_user_password(:p_user_id, :p_new_password_hash, :o_success, :o_error_message); END;`,
                    { p_user_id: userId, p_new_password_hash: newHashedPassword, o_success: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                );
                const updateSuccess = updatePasswordResult.outBinds.o_success;
                const updateErrorMessage = updatePasswordResult.outBinds.o_error_message;

                if (!updateSuccess || updateErrorMessage) {
                    console.error("Eroare la actualizarea parolei in DB:", updateErrorMessage);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Nu s-a putut actualiza parola. Incercati mai tarziu.' }));
                    return;
                }

                try {
                    await connection.execute(
                        `BEGIN mark_reset_token_as_used(:p_token_hash, :o_success, :o_error_message); END;`,
                        { p_token_hash: tokenHash, o_success: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 } }
                    );
                } catch (markTokenErr) {
                    console.error("Eroare la marcarea token-ului ca folosit (non-critica):", markTokenErr);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Parola a fost resetata cu succes!' }));

            } catch (dbErr) {
                console.error("Eroare Baza de Date la /api/reset-password:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la procesarea cererii de resetare.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (reset-password):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (reset-password):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url === '/api/categories' && req.method === 'POST') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        try {
            const { name, description } = await parseRequestBody(req);

            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Numele categoriei este obligatoriu.' }));
                return;
            }

            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN create_category(:p_user_id, :p_name, :p_description, :o_category_id, :o_error_message); END;`,
                    {
                        p_user_id: userDataFromToken.userId,
                        p_name: name,
                        p_description: description || null,
                        o_category_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                    }
                );

                const categoryId = result.outBinds.o_category_id;
                const errorMessage = result.outBinds.o_error_message;

                if (errorMessage && !categoryId) {
                    if (errorMessage.toLowerCase().includes('exista deja')) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                    }
                    res.end(JSON.stringify({ message: errorMessage }));
                } else if (categoryId) {
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Categorie creata cu succes.', categoryId: categoryId, name: name, description: description }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Eroare neasteptata la crearea categoriei.' }));
                }
            } catch (dbErr) {
                console.error("Eroare Baza de Date la POST /api/categories:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la crearea categoriei.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (POST categories):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (POST categories):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url === '/api/categories' && req.method === 'GET') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN get_user_categories(:p_user_id, :o_categories_cursor, :o_error_message); END;`,
                {
                    p_user_id: userDataFromToken.userId,
                    o_categories_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                }
            );

            const errorMessage = result.outBinds.o_error_message;
            if (errorMessage) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: errorMessage }));
                return;
            }

            const cursor = result.outBinds.o_categories_cursor;
            const categories = [];
            let row;
            while ((row = await cursor.getRow())) {
                categories.push({
                    categoryId: row[0],
                    name: row[1],
                    description: row[2],
                    createdAt: row[3]
                });
            }
            await cursor.close();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(categories));

        } catch (dbErr) {
            console.error("Eroare Baza de Date la GET /api/categories:", dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la citirea categoriilor.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (GET categories):", closeErr); } }
        }
    }
    else if (req.url.match(/^\/api\/categories\/([0-9]+)$/) && req.method === 'PUT') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        try {
            const categoryId = parseInt(req.url.split('/')[3], 10);
            const { name, description } = await parseRequestBody(req);

            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Noul nume al categoriei este obligatoriu.' }));
                return;
            }

            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN update_category(:p_category_id, :p_user_id, :p_new_name, :p_new_description, :o_rows_updated, :o_error_message); END;`,
                    {
                        p_category_id: categoryId,
                        p_user_id: userDataFromToken.userId,
                        p_new_name: name,
                        p_new_description: description || null,
                        o_rows_updated: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                    }
                );
                const rowsUpdated = result.outBinds.o_rows_updated;
                const errorMessage = result.outBinds.o_error_message;

                if (errorMessage && rowsUpdated === 0) {
                    if (errorMessage.toLowerCase().includes('exista deja')) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                    } else if (errorMessage.toLowerCase().includes('nu exista') || errorMessage.toLowerCase().includes('negasita')) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                    }
                    res.end(JSON.stringify({ message: errorMessage }));
                } else if (rowsUpdated === 1) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Categoria a fost actualizata cu succes.', categoryId: categoryId, name: name, description: description }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Categoria nu a fost gasita sau nu aveti permisiunea sa o modificati.' }));
                }
            } catch (dbErr) {
                console.error(`Eroare Baza de Date la PUT /api/categories/${categoryId}:`, dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la actualizarea categoriei.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (PUT categories):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (PUT categories):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url.match(/^\/api\/categories\/([0-9]+)$/) && req.method === 'DELETE') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        const categoryId = parseInt(req.url.split('/')[3], 10);
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN delete_category(:p_category_id, :p_user_id, :o_rows_deleted, :o_error_message); END;`,
                {
                    p_category_id: categoryId,
                    p_user_id: userDataFromToken.userId,
                    o_rows_deleted: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                }
            );

            const rowsDeleted = result.outBinds.o_rows_deleted;
            const errorMessage = result.outBinds.o_error_message;

            if (errorMessage && rowsDeleted === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: errorMessage }));
            } else if (rowsDeleted === 1) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Categoria a fost stearsa cu succes.' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Categoria nu a fost gasita sau nu aveti permisiunea sa o stergeti.' }));
            }
        } catch (dbErr) {
            console.error(`Eroare Baza de Date la DELETE /api/categories/${categoryId}:`, dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la stergerea categoriei.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (DELETE categories):", closeErr); } }
        }
    }
    else if (req.url === '/api/storages' && req.method === 'POST') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        try {
            const { name, titleBarColor, titleBarTextColor } = await parseRequestBody(req);

            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Numele depozitului este obligatoriu.' }));
                return;
            }

            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN create_storage(:p_user_id, :p_name, :p_title_bar_color, :p_title_bar_text_color, :o_storage_id, :o_error_message); END;`,
                    {
                        p_user_id: userDataFromToken.userId,
                        p_name: name,
                        p_title_bar_color: titleBarColor || null,
                        p_title_bar_text_color: titleBarTextColor || null,
                        o_storage_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                    }
                );

                const storageId = result.outBinds.o_storage_id;
                const errorMessage = result.outBinds.o_error_message;

                if (errorMessage && !storageId) {
                    if (errorMessage.toLowerCase().includes('exista deja')) {
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                    }
                    res.end(JSON.stringify({ message: errorMessage }));
                } else if (storageId) {
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        message: 'Depozit creat cu succes.',
                        storageId: storageId,
                        name: name,
                        titleBarColor: titleBarColor,
                        titleBarTextColor: titleBarTextColor
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Eroare neasteptata la crearea depozitului.' }));
                }
            } catch (dbErr) {
                console.error("Eroare Baza de Date la POST /api/storages:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la crearea depozitului.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (POST storages):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (POST storages):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url === '/api/storages' && req.method === 'GET') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return; 

        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN get_user_storages(:p_user_id, :o_storages_cursor, :o_error_message); END;`,
                {
                    p_user_id: userDataFromToken.userId,
                    o_storages_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                }
            );

            const errorMessage = result.outBinds.o_error_message;
            if (errorMessage) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: errorMessage }));
                return;
            }

            const cursor = result.outBinds.o_storages_cursor;
            const storages = [];
            let row;
            while ((row = await cursor.getRow())) {
                storages.push({
                    storageId: row[0],
                    name: row[1],
                    titleBarColor: row[2],
                    titleBarTextColor: row[3],
                    createdAt: row[4],
                    lastUpdated: row[5]
                });
            }
            await cursor.close();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(storages));

        } catch (dbErr) {
            console.error("Eroare Baza de Date la GET /api/storages:", dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la citirea depozitelor.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (GET storages):", closeErr); } }
        }
    }
     else if (req.url.match(/^\/api\/storages\/([0-9]+)$/) && req.method === 'PUT') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        try {
            const storageId = parseInt(req.url.split('/')[3], 10);
            const { name, titleBarColor, titleBarTextColor } = await parseRequestBody(req);

            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Noul nume al depozitului este obligatoriu.' }));
                return;
            }

            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN update_storage(:p_storage_id, :p_user_id, :p_new_name, :p_new_title_bar_color, :p_new_title_bar_text_color, :o_rows_updated, :o_error_message); END;`,
                    {
                        p_storage_id: storageId,
                        p_user_id: userDataFromToken.userId,
                        p_new_name: name,
                        p_new_title_bar_color: titleBarColor || null,
                        p_new_title_bar_text_color: titleBarTextColor || null,
                        o_rows_updated: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                    }
                );

                const rowsUpdated = result.outBinds.o_rows_updated;
                const errorMessage = result.outBinds.o_error_message;

                if (errorMessage && (rowsUpdated === 0 || rowsUpdated === undefined)) {
                     if (errorMessage.toLowerCase().includes('exista deja')) {
                         res.writeHead(409, { 'Content-Type': 'application/json' }); 
                     } else if (errorMessage.toLowerCase().includes('nu exista') || errorMessage.toLowerCase().includes('negasit') || errorMessage.toLowerCase().includes('nu apartine')) {
                         res.writeHead(404, { 'Content-Type': 'application/json' }); 
                     } else {
                         res.writeHead(400, { 'Content-Type': 'application/json' });
                     }
                    res.end(JSON.stringify({ message: errorMessage }));
                } else if (rowsUpdated === 1) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        message: 'Depozitul a fost actualizat cu succes.', 
                        storageId: storageId,
                        name: name,
                        titleBarColor: titleBarColor,
                        titleBarTextColor: titleBarTextColor
                    }));
                } else { 
                     res.writeHead(404, { 'Content-Type': 'application/json' });
                     res.end(JSON.stringify({ message: 'Depozitul nu a fost gasit sau nu aveti permisiunea sa il modificati.' }));
                }
            } catch (dbErr) {
                console.error(`Eroare Baza de Date la PUT /api/storages/${storageId}:`, dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la actualizarea depozitului.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (PUT storages):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (PUT storages):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url === '/api/data-protejata' && req.method === 'GET') {
        const userDataFromToken = authenticateToken(req, res);
        if (userDataFromToken) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                message: `Salut, ${userDataFromToken.username}! Ai accesat datele protejate.`,
                data: "Acestea sunt informatii secrete.",
                utilizatorAutentificat: userDataFromToken
            }));
        }
    }
     else if (req.url.match(/^\/api\/storages\/([0-9]+)$/) && req.method === 'DELETE') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        const storageId = parseInt(req.url.split('/')[3], 10);
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN delete_storage(:p_storage_id, :p_user_id, :o_rows_deleted, :o_error_message); END;`,
                {
                    p_storage_id: storageId,
                    p_user_id: userDataFromToken.userId,
                    o_rows_deleted: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 } 
                }
            );

            const rowsDeleted = result.outBinds.o_rows_deleted;
            const errorMessage = result.outBinds.o_error_message;

            if (errorMessage && (rowsDeleted === 0 || rowsDeleted === undefined )) {
                if (errorMessage.toLowerCase().includes('nu se poate sterge depozitul deoarece contine articole')) {
                    res.writeHead(409, { 'Content-Type': 'application/json' }); 
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' }); 
                }
                res.end(JSON.stringify({ message: errorMessage }));
            } else if (rowsDeleted === 1) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Depozitul si articolele asociate (daca exista constrangere CASCADE) au fost sterse cu succes.' }));
            } else {
                 res.writeHead(404, { 'Content-Type': 'application/json' });
                 res.end(JSON.stringify({ message: 'Depozitul nu a fost gasit sau nu aveti permisiunea sa il stergeti.' }));
            }
        } catch (dbErr) {
            console.error(`Eroare Baza de Date la DELETE /api/storages/${storageId}:`, dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la stergerea depozitului.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (DELETE storages):", closeErr); } }
        }
    }
    else if (req.url === '/api/items' && req.method === 'POST') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        try {
            const { storage_id, category_id, name, description, quantity, unit_of_measure, low_stock_threshold, expiry_date, check_date } = await parseRequestBody(req);

            
            if (!storage_id || !name || !unit_of_measure || quantity === undefined || quantity === null) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'ID-ul depozitului, numele, cantitatea si unitatea de masura sunt obligatorii.' }));
                return;
            }

            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN create_item(
                        :p_user_id, :p_storage_id, :p_category_id, :p_name, :p_description,
                        :p_quantity, :p_unit_of_measure, :p_low_stock_threshold,
                        :p_expiry_date, :p_check_date,
                        :o_item_id, :o_error_message
                    ); END;`,
                    {
                        p_user_id: userDataFromToken.userId,
                        p_storage_id: storage_id,
                        p_category_id: category_id || null,
                        p_name: name,
                        p_description: description || null,
                        p_quantity: quantity,
                        p_unit_of_measure: unit_of_measure,
                        p_low_stock_threshold: low_stock_threshold || null,
                        p_expiry_date: expiry_date ? new Date(expiry_date) : null,
                        p_check_date: check_date ? new Date(check_date) : null,   
                        o_item_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
                    }
                );

                const itemId = result.outBinds.o_item_id;
                const errorMessage = result.outBinds.o_error_message;

                if (errorMessage && !itemId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: errorMessage }));
                } else if (itemId) {
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        message: 'Articol creat cu succes.', 
                        itemId: itemId,
                        name: name, 
                        storage_id: storage_id,
                        category_id: category_id
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Eroare neasteptata la crearea articolului.' }));
                }
            } catch (dbErr) {
                console.error("Eroare Baza de Date la POST /api/items:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la crearea articolului.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (POST items):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (POST items):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url.startsWith('/api/items') && req.method === 'GET') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const storageIdFilter = requestUrl.searchParams.get('storageId') ? parseInt(requestUrl.searchParams.get('storageId'), 10) : null;
        const categoryIdFilter = requestUrl.searchParams.get('categoryId') ? parseInt(requestUrl.searchParams.get('categoryId'), 10) : null;

        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN get_user_items(:p_user_id, :p_storage_id, :p_category_id, :o_items_cursor, :o_error_message); END;`,
                {
                    p_user_id: userDataFromToken.userId,
                    p_storage_id: storageIdFilter,
                    p_category_id: categoryIdFilter,
                    o_items_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                }
            );

            const errorMessage = result.outBinds.o_error_message;
            if (errorMessage) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: errorMessage }));
                return;
            }

            const cursor = result.outBinds.o_items_cursor;
            const items = [];
            let row;
            while ((row = await cursor.getRow())) {
                items.push({
                    itemId: row[0],
                    userId: row[1], 
                    storageId: row[2],
                    categoryId: row[3],
                    name: row[4],
                    description: row[5],
                    quantity: row[6],
                    unitOfMeasure: row[7],
                    lowStockThreshold: row[8],
                    expiryDate: row[9],
                    checkDate: row[10],
                    createdAt: row[11],
                    lastUpdated: row[12]
                });
            }
            await cursor.close();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(items));

        } catch (dbErr) {
            console.error("Eroare Baza de Date la GET /api/items:", dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la citirea articolelor.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (GET items):", closeErr); } }
        }
    }
    else if (req.url.match(/^\/api\/items\/([0-9]+)$/) && req.method === 'PUT') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        try {
            const itemId = parseInt(req.url.split('/')[3], 10);
            const { storage_id, category_id, name, description, quantity, unit_of_measure, low_stock_threshold, expiry_date, check_date } = await parseRequestBody(req);

            if (!storage_id || !name || !unit_of_measure || quantity === undefined || quantity === null) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'ID-ul depozitului, numele, cantitatea si unitatea de masura sunt obligatorii pentru actualizare.' }));
                return;
            }

            let connection;
            try {
                connection = await oracledb.getConnection(dbConfig);
                const result = await connection.execute(
                    `BEGIN update_item(
                        :p_item_id, :p_user_id, :p_storage_id, :p_category_id, :p_new_name, :p_new_description,
                        :p_new_quantity, :p_new_unit_of_measure, :p_new_low_stock_threshold,
                        :p_new_expiry_date, :p_new_check_date,
                        :o_rows_updated, :o_error_message
                    ); END;`,
                    {
                        p_item_id: itemId,
                        p_user_id: userDataFromToken.userId,
                        p_storage_id: storage_id,
                        p_category_id: category_id || null,
                        p_new_name: name,
                        p_new_description: description || null,
                        p_new_quantity: quantity,
                        p_new_unit_of_measure: unit_of_measure,
                        p_new_low_stock_threshold: low_stock_threshold || null,
                        p_new_expiry_date: expiry_date ? new Date(expiry_date) : null,
                        p_new_check_date: check_date ? new Date(check_date) : null,
                        o_rows_updated: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
                    }
                );

                const rowsUpdated = result.outBinds.o_rows_updated;
                const errorMessage = result.outBinds.o_error_message;

                if (errorMessage && (rowsUpdated === 0 || rowsUpdated === undefined)) {
                    if (errorMessage.toLowerCase().includes('nu exista') || errorMessage.toLowerCase().includes('negasit') || errorMessage.toLowerCase().includes('nu apartine')) {
                         res.writeHead(404, { 'Content-Type': 'application/json' });
                     } else {
                         res.writeHead(400, { 'Content-Type': 'application/json' });
                     }
                    res.end(JSON.stringify({ message: errorMessage }));
                } else if (rowsUpdated === 1) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Articolul a fost actualizat cu succes.', itemId: itemId }));
                } else {
                     res.writeHead(404, { 'Content-Type': 'application/json' });
                     res.end(JSON.stringify({ message: 'Articolul nu a fost gasit sau nu aveti permisiunea sa il modificati.' }));
                }
            } catch (dbErr) {
                console.error(`Eroare Baza de Date la PUT /api/items/${itemId}:`, dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la actualizarea articolului.' }));
            } finally {
                if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (PUT items):", closeErr); } }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (PUT items):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid.' }));
        }
    }
    else if (req.url.match(/^\/api\/items\/([0-9]+)$/) && req.method === 'DELETE') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;

        const itemId = parseInt(req.url.split('/')[3], 10);
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN delete_item(:p_item_id, :p_user_id, :o_rows_deleted, :o_error_message); END;`,
                {
                    p_item_id: itemId,
                    p_user_id: userDataFromToken.userId,
                    o_rows_deleted: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                }
            );

            const rowsDeleted = result.outBinds.o_rows_deleted;
            const errorMessage = result.outBinds.o_error_message;

            if (errorMessage && (rowsDeleted === 0 || rowsDeleted === undefined)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: errorMessage }));
            } else if (rowsDeleted === 1) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Articolul a fost sters cu succes.' }));
            } else {
                 res.writeHead(404, { 'Content-Type': 'application/json' });
                 res.end(JSON.stringify({ message: 'Articolul nu a fost gasit sau nu aveti permisiunea sa il stergeti.' }));
            }
        } catch (dbErr) {
            console.error(`Eroare Baza de Date la DELETE /api/items/${itemId}:`, dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la stergerea articolului.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (DELETE items):", closeErr); } }
        }
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint negasit.' }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serverul Node.js ruleaza pe portul ${PORT}`);
    console.log('Folosind configuratia de DB:', dbConfig.user, dbConfig.connectString);
});