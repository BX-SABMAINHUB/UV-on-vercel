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
import { Resend } from 'resend';

const __dirname = process.cwd();
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer();
const bareServer = createBareServer('/b/');
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Notificación de login ─────────────────────────────────
async function notifyLogin(profile, ip) {
  const name     = profile.displayName || 'Desconocido';
  const email    = profile.emails?.[0]?.value || 'Sin correo';
  const photo    = profile.photos?.[0]?.value || '';
  const googleId = profile.id || 'N/A';
  const time     = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  try {
    await resend.emails.send({
      from: 'Waevo Proxy <onboarding@resend.dev>',
      to: 'alexsanchezfollia@gmail.com',
      subject: `👤 Nuevo login — ${name}`,
      html: `
        <div style="background:#020810;color:#c0d8e8;font-family:monospace;padding:40px;border-radius:8px;max-width:500px;">
          <h1 style="font-size:1.8rem;letter-spacing:0.2em;background:linear-gradient(135deg,#00f5ff,#7b2dff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.2rem;">WAEVO</h1>
          <p style="color:rgba(0,245,255,0.4);font-size:0.7rem;letter-spacing:0.3em;margin-bottom:2rem;">NUEVO USUARIO CONECTADO</p>

          ${photo ? `<img src="${photo}" style="width:60px;height:60px;border-radius:50%;border:2px solid #00f5ff;margin-bottom:1.5rem;display:block;"/>` : ''}

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:rgba(0,245,255,0.4);font-size:0.75rem;letter-spacing:0.2em;width:40%;">NOMBRE</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:#00f5ff;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:rgba(0,245,255,0.4);font-size:0.75rem;letter-spacing:0.2em;">CORREO</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:#00f5ff;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:rgba(0,245,255,0.4);font-size:0.75rem;letter-spacing:0.2em;">IP</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:#00f5ff;">${ip}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:rgba(0,245,255,0.4);font-size:0.75rem;letter-spacing:0.2em;">HORA</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(0,245,255,0.08);color:#00f5ff;">${time}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:rgba(0,245,255,0.4);font-size:0.75rem;letter-spacing:0.2em;">GOOGLE ID</td>
              <td style="padding:10px 0;color:rgba(0,245,255,0.5);font-size:0.8rem;">${googleId}</td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log(`📧 Notificación enviada — ${name} (${email})`);
  } catch (err) {
    console.error('❌ Error enviando notificación:', err);
  }
}

// ── Sesión ────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'waevo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    expires: false,
  }
}));

// ── Passport Google OAuth ─────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://waevo-proxy.vercel.app/auth/callback',
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

app.use('/uv', express.static(path.join(__dirname, 'public/uv'), {
  maxAge: '7d', immutable: true,
}));

// ── Middleware auth ───────────────────────────────────────
function requireAuth(req, res, next) {
  const publicPaths = ['/login', '/auth'];
  const isPublic = publicPaths.some(p => req.path.startsWith(p));
  if (isPublic) return next();

  const authed = req.isAuthenticated() || req.session?.bypass === true;
  if (authed) return next();

  res.redirect('/login');
}

app.use(requireAuth);

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
  async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Desconocida';
    await notifyLogin(req.user, ip);
    res.redirect('/');
  }
);

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
    req.session.bypass = true;
    req.session.cookie.expires = false;
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, msg: 'Contraseña incorrecta' });
  }
});

// ── Rutas principales ─────────────────────────────────────
app.get('/login', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.sendFile(path.join(__dirname, 'public/login.html'));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

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
