const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>OrbitBlack360</h1><p>Servidor Node funcionando.</p>');
});

server.listen(PORT, () => console.log(`Escuchando en puerto ${PORT}`));
