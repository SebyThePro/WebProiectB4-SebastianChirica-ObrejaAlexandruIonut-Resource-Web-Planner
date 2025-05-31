
const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./db_config/db_config.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
                    {
                        username: username,
                        email: email,
                        password_hash: hashedPassword,
                        user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                    }
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
                if (connection) {
                    try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (register):", closeErr); }
                }
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
                    {
                        identifier: identifier,
                        o_user_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        o_username: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
                        o_email: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
                        o_password_hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 255 },
                        o_role: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20 },
                        o_error_message: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 }
                    }
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
                    const tokenPayload = {
                        userId: userId,
                        username: dbUsername,
                        role: dbRole
                    };
                    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); 

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        message: 'Autentificare reusita!',
                        token: token,
                        user: {
                            id: userId,
                            username: dbUsername,
                            email: dbEmail,
                            role: dbRole
                        }
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Credentiale invalide.' }));
                }

            } catch (dbErr) {
                console.error("Eroare Baza de Date la login:", dbErr);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Eroare interna la login.' }));
            } finally {
                if (connection) {
                    try { await connection.close(); } catch (closeErr) { console.error("Eroare la inchiderea conexiunii (login):", closeErr); }
                }
            }
        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii (login):", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: parseErr.message || 'Format JSON invalid in corpul cererii.' }));
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