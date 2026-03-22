import express from 'express';
import http from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import path from 'path';
import { hostname } from 'node:os';
import { existsSync } from 'node:fs';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const __dirname = process.cwd();
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer();
const bareServer = createBareServer('/b/');

// ── Sesión SIN persistencia ───────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'waevo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: null,      // Sin expiración fija
    expires: false,    // Solo dura mientras el navegador está abierto
    httpOnly: true,
  }
}));

// ── Passport Google OAuth ─────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/callback',
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// ── Middlewares ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Headers seguridad
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), ' +
    'interest-cohort=(), browsing-topics=()'
  );
  // MUY IMPORTANTE — evita que el navegador cachee páginas protegidas
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Cache UV (esto sí puede cachearse)
app.use('/uv', express.static(path.join(__dirname, 'public/uv'), {
  maxAge: '7d', immutable: true,
}));

// ── Middleware auth ───────────────────────────────────────
function requireAuth(req, res, next) {
  const publicPaths = ['/login', '/auth'];
  const isPublic = publicPaths.some(p => req.path.startsWith(p));
  if (isPublic) return next();

  // Solo deja pasar si está autenticado en ESTA sesión
  const authed = req.isAuthenticated() || req.session?.bypass === true;
  if (authed) return next();

  res.redirect('/login');
}

app.use(requireAuth);

// Estáticos protegidos
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
}));

// ── Rutas Auth Google ─────────────────────────────────────
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

app.get('/auth/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Logout — destruye sesión completamente
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  });
});

// ── Bypass ────────────────────────────────────────────────
app.post('/auth/bypass', (req, res) => {
  const { password } = req.body;
  if (password === process.env.BYPASS_PASS) {
    // Bypass solo para esta sesión de navegador
    req.session.bypass = true;
    req.session.cookie.expires = false; // muere al cerrar el navegador
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, msg: 'Contraseña incorrecta' });
  }
});

// ── Rutas principales ─────────────────────────────────────
app.get('/login', (req, res) => {
  // Destruye cualquier sesión previa al entrar al login
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.sendFile(path.join(__dirname, 'public/login.html'));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(
    existsSync(path.join(__dirname, 'public/404.html'))
      ? path.join(__dirname, 'public/404.html')
      : path.join(__dirname, 'public/index.html')
  );
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

server.on('error', (err) => console.error('❌ Server error:', err));

// ── Inicio ────────────────────────────────────────────────
server.listen(PORT, () => {
  const address = server.address();
  console.log('\n🌐 Waevo Proxy corriendo en:');
  console.log(`   http://localhost:${address.port}`);
  console.log(`   http://${hostname()}:${address.port}\n`);
});

function shutdown(signal) {
  console.log(`\n${signal} — cerrando...`);
  server.close(() => { bareServer.close(); process.exit(0); });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => console.error('❌', err));
process.on('unhandledRejection', (r) => console.error('❌', r));
