import express from 'express';
import http from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import path from 'path';
import { hostname } from 'node:os';
import { existsSync } from 'node:fs';

const __dirname = process.cwd();
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer();
const bareServer = createBareServer('/b/');

// ── Middlewares ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache agresivo para archivos estáticos de UV (bundle, sw, etc.)
app.use('/uv', express.static(path.join(__dirname, 'public/uv'), {
  maxAge: '7d',
  immutable: true,
}));

// Cache moderado para el resto de estáticos
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
}));

// ── Headers de seguridad y rendimiento ───────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Permite el service worker en todo el scope
  res.setHeader('Service-Worker-Allowed', '/');
  next();
});

// ── Rutas ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Ruta 404 personalizada
app.use((req, res) => {
  const notFound = path.join(__dirname, 'public/404.html');
  if (existsSync(notFound)) {
    res.status(404).sendFile(notFound);
  } else {
    res.status(404).send('404 Not Found');
  }
});

// ── Servidor HTTP ─────────────────────────────────────────
server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// WebSocket upgrade para bare server
server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

// Manejo de errores de socket para evitar crashes
server.on('error', (err) => {
  console.error('Server error:', err);
});

// ── Inicio ────────────────────────────────────────────────
server.listen(PORT, () => {
  const address = server.address();
  console.log('\n🌐 Waevo Proxy corriendo en:');
  console.log(`   http://localhost:${address.port}`);
  console.log(`   http://${hostname()}:${address.port}`);
  console.log(`   http://${
    address.family === 'IPv6'
      ? `[${address.address}]`
      : address.address
  }:${address.port}\n`);
});

// ── Shutdown limpio ───────────────────────────────────────
function shutdown(signal) {
  console.log(`\n${signal} recibido — cerrando servidor...`);
  server.close(() => {
    bareServer.close();
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Evita crashes por errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada:', reason);
});
