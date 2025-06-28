const Brevo = require('@getbrevo/brevo');
const { XMLParser } = require("fast-xml-parser");
const { parse } = require('csv-parse/sync');
const { Parser } = require('json2csv');
const js2xmlparser = require("js2xmlparser");
const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./db_config/db_config.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

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


async function sendResetEmailWithApi(recipientEmail, resetCode) {
    let apiInstance = new Brevo.TransactionalEmailsApi();

    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = '14TcD82CIXJ7qZWa';

    let sendSmtpEmail = new Brevo.SendSmtpEmail(); 
    
    sendSmtpEmail.subject = "Codul tau de Resetare Parola";
    sendSmtpEmail.htmlContent = `<p>Buna ziua,</p><p>Codul tau pentru resetarea parolei este: <strong>${resetCode}</strong></p><p>Acest cod este valabil pentru 15 minute.</p>`;
    sendSmtpEmail.sender = {"name": "Admin Proiect Consumabile", "email": "sebychirica100@gmail.com"}; 
    sendSmtpEmail.to = [{"email": recipientEmail}];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email trimis cu succes prin API Brevo. Message ID: ' + data.body.messageId);
    } catch (error) {
        console.error("Eroare la trimiterea email-ului prin API Brevo:", error);
        throw new Error("Serviciul de email nu a putut trimite mesajul."); 
    }
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
function serveStaticFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

const server = http.createServer(async (req, res) => {
     console.log(`[SPION] Serverul a primit o cerere: Metoda=${req.method}, URL=${req.url}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
if (!req.url.startsWith('/api/')) {
        let filePath = req.url === '/' ? 'login.html' : req.url;
        let extname = path.extname(filePath);
        let contentType = 'text/html';

        switch (extname) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpg'; break;
            case '.woff': contentType = 'font/woff'; break;
            case '.woff2': contentType = 'font/woff2'; break;
        }
        
        const fullFilePath = path.join(__dirname, '..', 'src', filePath);
        serveStaticFile(res, fullFilePath, contentType);
    }
    else if (req.url === '/api/register' && req.method === 'POST') {
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

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            await connection.execute(
                `BEGIN store_reset_code(:p_email, :p_reset_code, :o_error_message); END;`,
                { p_email: email, p_reset_code: resetCode, o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 } }
            );

            await sendResetEmailWithApi(email, resetCode);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Daca un cont cu acest email exista, un cod de resetare a fost trimis.' }));

        } catch (err) { 
            console.error("Eroare la /api/forgot-password:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la procesarea cererii.' }));
        } finally {
            if (connection) { 
                try { await connection.close(); } catch(e) { console.error(e); }
            }
        }
    } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Format JSON invalid.' }));
    }
}
     else if (req.url === '/api/reset-with-code' && req.method === 'POST') {
    try {
        const { email, code, newPassword } = await parseRequestBody(req);

        console.log(`[DEBUG] Cerere de resetare primita: Email='${email}', Cod Introdus='${code}'`);

        if (!email || !code || !newPassword) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Email, cod si parola noua sunt obligatorii.' }));
            return;
        }
        if (newPassword.length < 6) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Noua parola trebuie sa aiba minim 6 caractere.' }));
            return;
        }
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            
            const result = await connection.execute(
                `BEGIN verify_and_update_password(:p_email, :p_reset_code, :p_new_password_hash, :o_success, :o_error_message); END;`,
                { 
                    p_email: email, 
                    p_reset_code: code, 
                    p_new_password_hash: newHashedPassword, 
                    o_success: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }, 
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 } 
                }
            );
            
            const success = result.outBinds.o_success;
            const errorMessage = result.outBinds.o_error_message;

            if (success === 1) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Parola a fost resetata cu succes!' }));
            } else {
                console.log(`[DEBUG] Validare esuata in DB. Mesaj: ${errorMessage}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: errorMessage || 'Cod invalid, expirat sau emailul este incorect.' }));
            }
        } catch (dbErr) {
            console.error("Eroare DB la /api/reset-with-code:", dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la resetarea parolei.' }));
        } finally {
            if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
        }
    } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Format JSON invalid.' }));
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
                res.end(JSON.stringify({ message: 'Depozitul a fost sters cu succes.' }));
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

        if (!storage_id || !name || quantity === undefined) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'ID-ul depozitului, numele si cantitatea sunt obligatorii.' }));
            return;
        }

        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);

            const updateResult = await connection.execute(
                `BEGIN update_item(:p_item_id, :p_user_id, :p_storage_id, :p_category_id, :p_new_name, :p_new_description, :p_new_quantity, :p_new_unit_of_measure, :p_new_low_stock_threshold, :p_new_expiry_date, :p_new_check_date, :o_rows_updated, :o_error_message); END;`,
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
            
            const updateSuccess = updateResult.outBinds.o_rows_updated;
            const updateErrorMessage = updateResult.outBinds.o_error_message;

            if (!updateSuccess || updateErrorMessage) {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: updateErrorMessage || 'Actualizarea a esuat.' }));
            }

            await connection.execute(
                `BEGIN check_low_stock_trigger(:p_item_id); END;`,
                {
                    p_item_id: itemId
                }
            );
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Articolul a fost actualizat cu succes.' }));

        } catch (dbErr) {
            console.error(`Eroare Baza de Date la PUT /api/items/${itemId}:`, dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la actualizarea articolului.' }));
        } finally {
            if (connection) { 
                try { await connection.close(); } catch (e) { console.error("Eroare la inchiderea conexiunii:", e); }
            }
        }
    } catch (parseErr) {
        console.error("Eroare la parsarea corpului cererii (PUT items):", parseErr);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Format JSON invalid.' }));
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
    else if (req.url === '/api/notifications' && req.method === 'GET') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `BEGIN get_user_notifications(:p_user_id, :o_notifications_cursor, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                o_notifications_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
            }
        );

        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) {
            throw new Error(errorMessage);
        }

        const cursor = result.outBinds.o_notifications_cursor;
        const notifications = [];
        let row;
        while ((row = await cursor.getRow())) {
            notifications.push({
                notificationId: row[0],
                itemId: row[1],
                itemName: row[2],
                notificationType: row[3],
                threshold: row[4],
                triggerTime: row[5],
                notifyOnSite: row[6],
                notifyByEmail: row[7],
                isActive: row[8]
            });
        }
        await cursor.close();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(notifications));

    } catch (err) {
        console.error("Eroare Baza de Date la GET /api/notifications:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Eroare interna la citirea notificarilor.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (closeErr) { console.error(closeErr); } }
    }
}
else if (req.url === '/api/notifications' && req.method === 'POST') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    try {
        const { itemId, notificationType, threshold, triggerTime, notifyOnSite, notifyByEmail } = await parseRequestBody(req);

        if (!itemId || !notificationType) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'ID-ul produsului si tipul notificarii sunt obligatorii.' }));
            return;
        }

        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN create_notification(
                    :p_user_id, :p_item_id, :p_notification_type, :p_threshold, 
                    :p_trigger_time, :p_notify_on_site, :p_notify_by_email,
                    :o_notification_id, :o_error_message
                ); END;`,
                {
                    p_user_id: userDataFromToken.userId,
                    p_item_id: itemId,
                    p_notification_type: notificationType,
                    p_threshold: threshold || null,
                    p_trigger_time: triggerTime || null,
                    p_notify_on_site: notifyOnSite ? 1 : 0,
                    p_notify_by_email: notifyByEmail ? 1 : 0,
                    o_notification_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
                }
            );

            const notificationId = result.outBinds.o_notification_id;
            const errorMessage = result.outBinds.o_error_message;

            if (errorMessage) {
                return res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: errorMessage }));
            }
            
            if (notificationType === 'LOW_STOCK') {
                console.log(`[Notificare] Se verifica stocul pentru produsul ID: ${itemId} la crearea regulii...`);
                
                await connection.execute(
                    `BEGIN check_low_stock_trigger(:p_item_id); END;`,
                    {
                        p_item_id: itemId
                    }
                );
            }

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Notificare setata cu succes.', notificationId: notificationId }));

        } catch (dbErr) {
            console.error("Eroare DB la POST /api/notifications:", dbErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la crearea notificarii.' }));
        } finally {
            if (connection) { 
                try { await connection.close(); } catch (e) { console.error("Eroare la inchiderea conexiunii:", e); }
            }
        }
    } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Format JSON invalid.' }));
    }
}
else if (req.url.match(/^\/api\/notifications\/([0-9]+)$/) && req.method === 'DELETE') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    const notificationId = parseInt(req.url.split('/')[3], 10);
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `BEGIN delete_notification(:p_notification_id, :p_user_id, :o_rows_deleted, :o_error_message); END;`,
            {
                p_notification_id: notificationId,
                p_user_id: userDataFromToken.userId,
                o_rows_deleted: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
            }
        );

        const rowsDeleted = result.outBinds.o_rows_deleted;
        const errorMessage = result.outBinds.o_error_message;

        if (errorMessage || rowsDeleted === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: errorMessage || 'Notificarea nu a fost gasita.' }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Notificarea a fost stearsa cu succes.' }));
        }
    } catch (dbErr) {
        console.error(`Eroare DB la DELETE /api/notifications/${notificationId}:`, dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Eroare interna la stergerea notificarii.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
}
else if (req.url === '/api/alerts' && req.method === 'GET') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT alert_id, message, created_at FROM user_alerts 
             WHERE user_id = :user_id AND is_read = 0 
             ORDER BY created_at DESC`,
            [userDataFromToken.userId]
        );
        
        const alerts = result.rows.map(row => ({
            alertId: row[0],
            message: row[1],
            createdAt: row[2]
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(alerts));

    } catch (err) {
        console.error("Eroare la preluarea alertelor:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Eroare interna la preluarea alertelor.' }));
    } finally {
        if (connection) { 
            try { await connection.close(); } catch (e) { console.error("Eroare la inchiderea conexiunii:", e); }
        }
    }
}

else if (req.url === '/api/export/json' && req.method === 'GET') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `BEGIN get_all_user_data(:p_user_id, :o_storages_cursor, :o_items_cursor, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                o_storages_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_items_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
            }
        );
        
        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) { throw new Error(errorMessage); }

        const storagesCursor = result.outBinds.o_storages_cursor;
        const itemsCursor = result.outBinds.o_items_cursor;

        const storages = [];
        const items = [];
        let row;

        while ((row = await storagesCursor.getRow())) {
            storages.push({
                storageId: row[0], name: row[1], titleBarColor: row[2], titleBarTextColor: row[3],
                createdAt: row[4], lastUpdated: row[5]
            });
        }
        await storagesCursor.close();

        while ((row = await itemsCursor.getRow())) {
            items.push({
                itemId: row[0], userId: row[1], storageId: row[2], categoryId: row[3], name: row[4],
                description: row[5], quantity: row[6], unitOfMeasure: row[7], lowStockThreshold: row[8],
                expiryDate: row[9], checkDate: row[10], createdAt: row[11], lastUpdated: row[12]
            });
        }
        await itemsCursor.close();
        
        const exportData = {
            exportDate: new Date().toISOString(),
            user: {
                id: userDataFromToken.userId,
                username: userDataFromToken.username
            },
            data: {
                storages: storages,
                items: items
            }
        };

        const jsonString = JSON.stringify(exportData, null, 2);

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="date_export.json"'
        });
        res.end(jsonString);

    } catch (err) {
        console.error("Eroare la export JSON:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Eroare interna la generarea exportului.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
}
else if (req.url === '/api/export/csv' && req.method === 'GET') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `BEGIN get_all_user_data(:p_user_id, :o_storages_cursor, :o_items_cursor, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                o_storages_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_items_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
            }
        );

        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) { throw new Error(errorMessage); }

        const storagesCursor = result.outBinds.o_storages_cursor;
        const itemsCursor = result.outBinds.o_items_cursor;

        const storages = [];
        const items = [];
        let row;

        while ((row = await storagesCursor.getRow())) {
            storages.push({
                storageId: row[0],
                name: row[1]
            });
        }
        await storagesCursor.close();

        while ((row = await itemsCursor.getRow())) {
            items.push({
                itemId: row[0], userId: row[1], storageId: row[2], categoryId: row[3], name: row[4],
                description: row[5], quantity: row[6], unitOfMeasure: row[7], lowStockThreshold: row[8],
                expiryDate: row[9], checkDate: row[10]
            });
        }
        await itemsCursor.close();

        const flatData = items.map(item => {
            const storage = storages.find(s => s.storageId === item.storageId);
            return {
                id_produs: item.itemId,
                nume_produs: item.name,
                cantitate: item.quantity,
                unitate_masura: item.unitOfMeasure,
                descriere: item.description,
                prag_stoc_minim: item.lowStockThreshold,
                data_expirare: item.expiryDate,
                data_verificare: item.checkDate,
                id_depozit: storage ? storage.storageId : '',
                nume_depozit: storage ? storage.name : 'N/A'
            };
        });

        const fields = ['id_produs', 'nume_produs', 'cantitate', 'unitate_masura', 'nume_depozit', 'descriere', 'prag_stoc_minim', 'data_expirare', 'data_verificare', 'id_depozit'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(flatData);

        res.writeHead(200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="export_date.csv"'
        });
        res.end(csv);

    } catch (err) {
        console.error("Eroare la export CSV:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Eroare interna la generarea exportului CSV.' }));
    } finally {
        if (connection) { 
            try { await connection.close(); } catch (e) { console.error("Eroare la inchiderea conexiunii:", e); }
        }
    }
}
else if (req.url === '/api/export/xml' && req.method === 'GET') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `BEGIN get_all_user_data(:p_user_id, :o_storages_cursor, :o_items_cursor, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                o_storages_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_items_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 250 }
            }
        );

        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) { throw new Error(errorMessage); }

        const storagesCursor = result.outBinds.o_storages_cursor;
        const itemsCursor = result.outBinds.o_items_cursor;

        const storages = [];
        const items = [];
        let row;

        while ((row = await storagesCursor.getRow())) {
            storages.push({
                storageId: row[0], name: row[1], titleBarColor: row[2], titleBarTextColor: row[3],
                createdAt: row[4], lastUpdated: row[5]
            });
        }
        await storagesCursor.close();

        while ((row = await itemsCursor.getRow())) {
            items.push({
                itemId: row[0], userId: row[1], storageId: row[2], categoryId: row[3], name: row[4],
                description: row[5], quantity: row[6], unitOfMeasure: row[7], lowStockThreshold: row[8],
                expiryDate: row[9], checkDate: row[10], createdAt: row[11], lastUpdated: row[12]
            });
        }
        await itemsCursor.close();

        const exportData = {
            exportDate: new Date().toISOString(),
            user: {
                id: userDataFromToken.userId,
                username: userDataFromToken.username
            },
            data: {
                storages: { storage: storages },
                items: { item: items }
            }
        };

        const xml = js2xmlparser.parse("export", exportData);

        res.writeHead(200, {
            'Content-Type': 'application/xml',
            'Content-Disposition': 'attachment; filename="export_date.xml"'
        });
        res.end(xml);

    } catch (err) {
        console.error("Eroare la export XML:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Eroare interna la generarea exportului XML.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
}
else if (req.url === '/api/import/json' && req.method === 'POST') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        const importData = await parseRequestBody(req);

        if (!importData || !importData.data || !Array.isArray(importData.data.storages) || !Array.isArray(importData.data.items)) {
            throw new Error("Formatul datelor JSON este invalid sau incomplet.");
        }

        connection = await oracledb.getConnection(dbConfig);
        
        const storagesForDB = importData.data.storages.map(s => {
            return {
                NAME: s.name,
                TITLE_BAR_COLOR: s.titleBarColor,
                TITLE_BAR_TEXT_COLOR: s.titleBarTextColor
            };
        });

        const itemsForDB = importData.data.items.map(i => {
            const storageForThisItem = importData.data.storages.find(s => s.storageId === i.storageId);
            return {
                STORAGE_NAME: storageForThisItem ? storageForThisItem.name : null,
                CATEGORY_NAME: null, 
                NAME: i.name,
                DESCRIPTION: i.description,
                QUANTITY: i.quantity,
                UNIT_OF_MEASURE: i.unitOfMeasure,
                LOW_STOCK_THRESHOLD: i.lowStockThreshold,
                EXPIRY_DATE: i.expiryDate ? new Date(i.expiryDate) : null,
                CHECK_DATE: i.checkDate ? new Date(i.checkDate) : null
            };
        });

        const StorageImportType = await connection.getDbObjectClass("STORAGE_IMPORT_TABLE");
        const ItemImportType = await connection.getDbObjectClass("ITEM_IMPORT_TABLE");

        const storagesToImport = new StorageImportType(storagesForDB);
        const itemsToImport = new ItemImportType(itemsForDB);

        const result = await connection.execute(
            `BEGIN import_user_data(:p_user_id, :p_storages, :p_items, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                p_storages: storagesToImport,
                p_items: itemsToImport,
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
            }
        );

        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) {
            throw new Error(errorMessage);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Datele au fost importate cu succes!' }));

    } catch (err) {
        console.error("Eroare la import JSON:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Eroare interna la procesarea importului.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
}
else if (req.url === '/api/import/csv' && req.method === 'POST') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        const csvData = await new Promise(resolve => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => resolve(body));
        });

        if (!csvData.trim()) {
            throw new Error("Datele CSV trimise sunt goale.");
        }

        const records = parse(csvData, {
            columns: true, 
            skip_empty_lines: true
        });

        const storagesFromCsv = [];
        const itemsFromCsv = [];

        records.forEach(rec => {
            if (rec.nume_depozit && !storagesFromCsv.some(s => s.NAME === rec.nume_depozit)) {
                storagesFromCsv.push({
                    NAME: rec.nume_depozit,
                    TITLE_BAR_COLOR: '#0058DD', 
                    TITLE_BAR_TEXT_COLOR: '#FFFFFF'
                });
            }
        });

        records.forEach(rec => {
            itemsFromCsv.push({
                STORAGE_NAME: rec.nume_depozit,
                CATEGORY_NAME: null, 
                NAME: rec.nume_produs,
                DESCRIPTION: rec.descriere,
                QUANTITY: parseFloat(rec.cantitate),
                UNIT_OF_MEASURE: rec.unitate_masura,
                LOW_STOCK_THRESHOLD: rec.prag_stoc_minim ? parseFloat(rec.prag_stoc_minim) : null,
                EXPIRY_DATE: rec.data_expirare ? new Date(rec.data_expirare) : null,
                CHECK_DATE: rec.data_verificare ? new Date(rec.data_verificare) : null
            });
        });

        connection = await oracledb.getConnection(dbConfig);

        const StorageImportType = await connection.getDbObjectClass("STORAGE_IMPORT_TABLE");
        const ItemImportType = await connection.getDbObjectClass("ITEM_IMPORT_TABLE");

        const storagesToImport = new StorageImportType(storagesFromCsv);
        const itemsToImport = new ItemImportType(itemsFromCsv);

        const result = await connection.execute(
            `BEGIN import_user_data(:p_user_id, :p_storages, :p_items, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                p_storages: storagesToImport,
                p_items: itemsToImport,
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
            }
        );

        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) {
            throw new Error(errorMessage);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Datele din CSV au fost importate cu succes!' }));

    } catch (err) {
        console.error("Eroare la import CSV:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Eroare interna la procesarea importului CSV.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
}
else if (req.url === '/api/import/xml' && req.method === 'POST') {
    const userDataFromToken = authenticateToken(req, res);
    if (!userDataFromToken) return;

    let connection;
    try {
        const xmlData = await new Promise(resolve => {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => resolve(body));
        });

        if (!xmlData.trim()) {
            throw new Error("Datele XML trimise sunt goale.");
        }

        const parser = new XMLParser();
        let parsedData = parser.parse(xmlData);
        
        const importData = parsedData.export;
        if (!importData || !importData.data || !importData.data.storages || !importData.data.items) {
             throw new Error("Formatul fisierului XML este invalid sau incomplet.");
        }

        const storagesArray = Array.isArray(importData.data.storages.storage) ? importData.data.storages.storage : [importData.data.storages.storage];
        const itemsArray = Array.isArray(importData.data.items.item) ? importData.data.items.item : [importData.data.items.item];
        
        const storagesForDB = storagesArray.map(s => {
            if (!s || s.name === undefined || s.name === null) return null;
            return {
                NAME: String(s.name),
                TITLE_BAR_COLOR: s.titleBarColor ? String(s.titleBarColor) : '#0058DD',
                TITLE_BAR_TEXT_COLOR: s.titleBarTextColor ? String(s.titleBarTextColor) : '#FFFFFF'
            };
        }).filter(Boolean);

        const itemsForDB = itemsArray.map(i => {
            if (!i || i.name === undefined || i.name === null) return null;
            const storageForThisItem = storagesArray.find(s => s.storageId === i.storageId);
            const quantity = parseFloat(i.quantity);
            const lowStock = i.lowStockThreshold !== undefined && i.lowStockThreshold !== null ? parseFloat(i.lowStockThreshold) : null;
            
            return {
                STORAGE_NAME: storageForThisItem ? String(storageForThisItem.name) : null,
                CATEGORY_NAME: null,
                NAME: String(i.name),
                DESCRIPTION: i.description ? String(i.description) : null,
                QUANTITY: isNaN(quantity) ? 0 : quantity,
                UNIT_OF_MEASURE: i.unitOfMeasure ? String(i.unitOfMeasure) : 'buc',
                LOW_STOCK_THRESHOLD: isNaN(lowStock) ? null : lowStock,
                EXPIRY_DATE: i.expiryDate ? new Date(i.expiryDate) : null,
                CHECK_DATE: i.checkDate ? new Date(i.checkDate) : null
            };
        }).filter(Boolean);

        connection = await oracledb.getConnection(dbConfig);
        
        const StorageImportType = await connection.getDbObjectClass("STORAGE_IMPORT_TABLE");
        const ItemImportType = await connection.getDbObjectClass("ITEM_IMPORT_TABLE");

        const storagesToImport = new StorageImportType(storagesForDB);
        const itemsToImport = new ItemImportType(itemsForDB);

        const result = await connection.execute(
            `BEGIN import_user_data(:p_user_id, :p_storages, :p_items, :o_error_message); END;`,
            {
                p_user_id: userDataFromToken.userId,
                p_storages: storagesToImport,
                p_items: itemsToImport,
                o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
            }
        );

        const errorMessage = result.outBinds.o_error_message;
        if (errorMessage) {
            throw new Error(errorMessage);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Datele din XML au fost importate cu succes!' }));

    } catch (err) {
        console.error("Eroare la import XML:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: err.message || 'Eroare interna la procesarea importului XML.' }));
    } finally {
        if (connection) { try { await connection.close(); } catch (e) { console.error(e); } }
    }
}
  else if (req.url === '/api/statistics' && req.method === 'GET') {
        const userDataFromToken = authenticateToken(req, res);
        if (!userDataFromToken) return;
    
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);
            const result = await connection.execute(
                `BEGIN get_user_statistics(:p_user_id, :o_general_stats_cursor, :o_low_stock_cursor, :o_category_dist_cursor, :o_error_message); END;`,
                {
                    p_user_id: userDataFromToken.userId,
                    o_general_stats_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                    o_low_stock_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                    o_category_dist_cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
                    o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
                }
            );
    
            const errorMessage = result.outBinds.o_error_message;
            if (errorMessage) {
                throw new Error(errorMessage);
            }
    
            const generalStatsCursor = result.outBinds.o_general_stats_cursor;
            const lowStockCursor = result.outBinds.o_low_stock_cursor;
            const categoryDistCursor = result.outBinds.o_category_dist_cursor;
            
            let generalStats = {};
            let lowStockItems = [];
            let categoryDistribution = [];
            let row;
    
            while ((row = await generalStatsCursor.getRow())) {
                generalStats = { totalStorages: row[0], totalItems: row[1] };
            }
            await generalStatsCursor.close();
    
            while ((row = await lowStockCursor.getRow())) {
                lowStockItems.push({ name: row[0], quantity: row[1], unitOfMeasure: row[2], threshold: row[3], storageName: row[4] });
            }
            await lowStockCursor.close();
            
            while ((row = await categoryDistCursor.getRow())) {
                categoryDistribution.push({ categoryName: row[0], itemCount: row[1] });
            }
            await categoryDistCursor.close();
    
            const finalStats = {
                general: generalStats,
                lowStockItems: lowStockItems,
                categoryDistribution: categoryDistribution
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(finalStats));
    
        } catch (err) {
            console.error("Eroare la generarea statisticilor:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Eroare interna la generarea statisticilor.' }));
        } finally {
            if (connection) { 
                try { await connection.close(); } catch (e) { console.error("Eroare la inchiderea conexiunii:", e); }
            }
        }
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint negasit.' }));
    }
});
async function connectToDatabaseWithRetry(retries = 30, delay = 10000) {
    for (let i = 1; i <= retries; i++) {
        try {
            console.log(`[DB] Incercarea #${i} de a stabili conexiunea cu baza de date...`);
            const connection = await oracledb.getConnection(dbConfig);
            console.log("[DB] Conexiune la baza de date stabilita cu succes!");
            await connection.close();
            return true;
        } catch (err) {
            console.error(`[DB] Conexiunea a esuat: ${err.message}`);
            if (i < retries) {
                console.log(`[DB] Se reincearca in ${delay / 1000} secunde...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("[DB] Nu s-a putut stabili conexiunea cu baza de date dupa mai multe incercari.");
                return false;
            }
        }
    }
}

async function startServer() {
    console.log("Se asteapta ca baza de date sa fie gata...");
    const dbReady = await connectToDatabaseWithRetry();

    if (dbReady) {
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`=================================================`);
            console.log(`Serverul Node.js ruleaza pe portul ${PORT}`);
            console.log(`Folosind configuratia de DB: ${dbConfig.user} @ ${dbConfig.connectString}`);
            console.log(`=================================================`);
        });
    } else {
        console.error("SERVERUL NU A PORNIT: Conexiunea la baza de date nu a putut fi stabilita.");
        process.exit(1);
    }
}

startServer();