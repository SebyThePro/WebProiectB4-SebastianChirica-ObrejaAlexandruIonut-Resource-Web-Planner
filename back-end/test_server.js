const http = require('http');

const server = http.createServer(async (req, res) => {
    console.log(`--- [TEST] Serverul a primit o cerere ---`);
    console.log(`URL Primit: ${req.url}`);
    console.log(`Metoda Primita: ${req.method}`);
    console.log(`------------------------------------`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    if (req.url === '/api/statistics' && req.method === 'GET') {
        console.log('>>> SUCCES! Blocul /api/statistics a fost gasit si executat!');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint-ul de statistici functioneaza!' }));
    } else {
        console.log('>>> EROARE! URL-ul nu s-a potrivit. Se intra in blocul "else".');
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint negasit de serverul de test.' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`--- Server de DEBUG pornit pe portul ${PORT} ---`);
    console.log("Acest server raspunde doar la /api/statistics. Astept cererea...");
});