// back-end/server.js
const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./db_config/db_config.js'); 
const bcrypt = require('bcryptjs');
async function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', (err) => {
            reject(err);
        });
    });
}

try {
    oracledb.initOracleClient({ libDir: 'C:\\Oracle\\instantclient_23_8' });
    console.log("Oracle Client initializat cu succes.");
} catch (err) {
    console.error("Eroare la initializarea Oracle Client:", err);
    console.error("Verifica daca Oracle Instant Client este instalat corect si calea specificata in initOracleClient este valida.");
    console.error("Pentru node-oracledb si Oracle 11g, asigura-te ca ai o versiune compatibila de Instant Client.");
    process.exit(1);
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
                    try {
                        await connection.close();
                    } catch (closeErr) {
                        console.error("Eroare la inchiderea conexiunii:", closeErr);
                    }
                }
            }

        } catch (parseErr) {
            console.error("Eroare la parsarea corpului cererii:", parseErr);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Format JSON invalid in corpul cererii.' }));
        }

    } else if (req.url === '/api/login' && req.method === 'POST') {
        res.writeHead(501, { 'Content-Type': 'application/json' }); 
        res.end(JSON.stringify({ message: 'Endpoint-ul de login nu este inca implementat.' }));

    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint negasit.' }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serverul Node.js ruleaza pe portul ${PORT}`);
    console.log('Folosind configuratia de DB:', dbConfig.user, dbConfig.connectString);
});