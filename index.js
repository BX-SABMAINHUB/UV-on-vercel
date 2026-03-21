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

// ── Anti-tracking & Seguridad ─────────────────────────────
app.use((req, res, next) => {
  // Quita info del servidor
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Bloquea iframes externos
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Desactiva cámara, mic, GPS, sensores, tracking
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
    'magnetometer=(), gyroscope=(), accelerometer=(), ' +
    'interest-cohort=(), browsing-topics=()'
  );

  // No enviar referrer a sitios externos
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Bloquea detección de tipo de contenido
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Política de seguridad de contenido
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' wss: ws:; " +
    "img-src 'self' data: blob:; " +
    "frame-ancestors 'none';"
  );

  // Anti fingerprinting
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Service Worker scope completo
  res.setHeader('Service-Worker-Allowed', '/');

  next();
});

// ── Middlewares ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache agresivo para archivos UV
app.use('/uv', express.static(path.join(__dirname, 'public/uv'), {
  maxAge: '7d',
  immutable: true,
}));

// Cache moderado para estáticos
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
}));

// ── Rutas ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 404
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

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
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
    console.log('✅ Servidor cerrado.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Anti-crash
process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesa rechazada:', reason);
});
