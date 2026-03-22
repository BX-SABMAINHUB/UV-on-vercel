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
async function notifyLogin(profile, req) {
  const name      = profile.displayName || 'Desconocido';
  const email     = profile.emails?.[0]?.value || 'Sin correo';
  const photo     = profile.photos?.[0]?.value || '';
  const googleId  = profile.id || 'N/A';
  const locale    = profile._json?.locale || 'N/A';
  const verified  = profile._json?.email_verified ? '✅ Verificado' : '❌ No verificado';
  const time      = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const date      = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'Desconocida';

  const ua = req.headers['user-agent'] || 'Desconocido';

  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  const isTablet = /ipad|tablet/i.test(ua);
  const device   = isTablet ? '📱 Tablet' : isMobile ? '📱 Móvil' : '🖥️ Ordenador';

  let browser = 'Desconocido';
  if (/edg/i.test(ua))          browser = 'Microsoft Edge';
  else if (/chrome/i.test(ua))  browser = 'Google Chrome';
  else if (/safari/i.test(ua))  browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opera/i.test(ua))   browser = 'Opera';

  let os = 'Desconocido';
  if (/windows nt 10/i.test(ua))     os = 'Windows 10/11';
  else if (/windows/i.test(ua))      os = 'Windows';
  else if (/iphone os 17/i.test(ua)) os = 'iOS 17';
  else if (/iphone/i.test(ua))       os = 'iOS';
  else if (/ipad/i.test(ua))         os = 'iPadOS';
  else if (/android/i.test(ua))      os = 'Android';
  else if (/mac os/i.test(ua))       os = 'macOS';
  else if (/linux/i.test(ua))        os = 'Linux';

  const lang    = req.headers['accept-language']?.split(',')[0] || 'Desconocido';
  const referer = req.headers['referer'] || 'Acceso directo';

  try {
    await resend.emails.send({
      from: 'Waevo Proxy <onboarding@resend.dev>',
      to: 'alexsanchezfollia@gmail.com',
      subject: `👤 Login — ${name} · ${email}`,
      html: `
        <div style="background:#020810;color:#c0d8e8;font-family:monospace;padding:40px;border-radius:12px;max-width:560px;margin:0 auto;">

          <h1 style="font-size:2rem;letter-spacing:0.2em;margin:0 0 0.2rem 0;color:#00f5ff;">WAEVO</h1>
          <p style="color:rgba(0,245,255,0.35);font-size:0.65rem;letter-spacing:0.4em;margin:0 0 2rem 0;">NUEVO USUARIO CONECTADO</p>

          ${photo ? `<img src="${photo}" style="width:70px;height:70px;border-radius:50%;border:2px solid #00f5ff;display:block;margin-bottom:2rem;"/>` : ''}

          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">DATOS DE GOOGLE</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;width:45%;">NOMBRE COMPLETO</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">CORREO</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#00f5ff;">${email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">VERIFICADO</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${verified}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">GOOGLE ID</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.5);font-size:0.8rem;">${googleId}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">IDIOMA CUENTA</td>
              <td style="padding:8px 0;color:#e0f7ff;">${locale}</td>
            </tr>
          </table>

          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">DISPOSITIVO Y NAVEGADOR</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;width:45%;">DISPOSITIVO</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${device}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">SISTEMA OPERATIVO</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${os}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">NAVEGADOR</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${browser}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">USER AGENT</td>
              <td style="padding:8px 0;color:rgba(0,245,255,0.4);font-size:0.7rem;word-break:break-all;">${ua}</td>
            </tr>
          </table>

          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">RED Y CONEXIÓN</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;width:45%;">DIRECCIÓN IP</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#ff2d6b;">${ip}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">IDIOMA NAVEGADOR</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${lang}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">REFERER</td>
              <td style="padding:8px 0;color:#e0f7ff;">${referer}</td>
            </tr>
          </table>

          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">FECHA Y HORA</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;width:45%;">FECHA</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${date}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;letter-spacing:0.15em;">HORA (ESP)</td>
              <td style="padding:8px 0;color:#e0f7ff;">${time}</td>
            </tr>
          </table>

          <p style="color:rgba(0,245,255,0.15);font-size:0.55rem;letter-spacing:0.2em;margin:0;text-align:center;">WAEVO PROXY · SISTEMA DE MONITOREO</p>
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
  const publicPaths = [
    '/login',
    '/auth',
    '/uv/',
    '/b/',
  ];
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
    await notifyLogin(req.user, req);
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
