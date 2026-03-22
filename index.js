import express from 'express';
import http from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import path from 'path';
import { hostname } from 'node:os';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Resend } from 'resend';

const server = http.createServer();
const app = express();
const __dirname = process.cwd();
const bareServer = createBareServer('/b/');
const resend = new Resend(process.env.RESEND_API_KEY);

async function notifyLogin(profile, req) {
  const name     = profile.displayName || 'Desconocido';
  const email    = profile.emails?.[0]?.value || 'Sin correo';
  const photo    = profile.photos?.[0]?.value || '';
  const googleId = profile.id || 'N/A';
  const locale   = profile._json?.locale || 'N/A';
  const verified = profile._json?.email_verified ? '✅ Verificado' : '❌ No verificado';
  const time     = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const date     = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const ip       = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'Desconocida';
  const ua       = req.headers['user-agent'] || 'Desconocido';
  const isTablet = /ipad|tablet/i.test(ua);
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  const device   = isTablet ? '📱 Tablet' : isMobile ? '📱 Móvil' : '🖥️ Ordenador';
  const lang     = req.headers['accept-language']?.split(',')[0] || 'Desconocido';
  const referer  = req.headers['referer'] || 'Acceso directo';

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
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;width:45%;">NOMBRE</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${name}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">CORREO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#00f5ff;">${email}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">VERIFICADO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${verified}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">GOOGLE ID</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.5);">${googleId}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">IDIOMA</td><td style="padding:8px 0;color:#e0f7ff;">${locale}</td></tr>
          </table>
          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">DISPOSITIVO Y NAVEGADOR</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;width:45%;">DISPOSITIVO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${device}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">SISTEMA OPERATIVO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${os}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">NAVEGADOR</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${browser}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">USER AGENT</td><td style="padding:8px 0;color:rgba(0,245,255,0.4);font-size:0.7rem;word-break:break-all;">${ua}</td></tr>
          </table>
          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">RED Y CONEXIÓN</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;width:45%;">IP</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#ff2d6b;">${ip}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">IDIOMA NAVEGADOR</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${lang}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">REFERER</td><td style="padding:8px 0;color:#e0f7ff;">${referer}</td></tr>
          </table>
          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">FECHA Y HORA</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;width:45%;">FECHA</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${date}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">HORA</td><td style="padding:8px 0;color:#e0f7ff;">${time}</td></tr>
          </table>
          <p style="color:rgba(0,245,255,0.15);font-size:0.55rem;letter-spacing:0.2em;margin:0;text-align:center;">WAEVO PROXY · SISTEMA DE MONITOREO</p>
        </div>
      `,
    });
    console.log(`📧 Notificación enviada — ${name} (${email})`);
  } catch (err) {
    console.error('❌ Error notificación:', err);
  }
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'waevo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, expires: false }
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://waevo-proxy.vercel.app/auth/callback',
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Auth — solo protege rutas reales, nunca el proxy
app.use((req, res, next) => {
  if (
    req.path.startsWith('/uv/') ||
    req.path.startsWith('/b/')  ||
    req.path.startsWith('/login') ||
    req.path.startsWith('/auth')
  ) return next();

  if (req.isAuthenticated() || req.session?.bypass === true) return next();
  res.redirect('/login');
});

// Estáticos exactamente igual que el original
app.use(express.static(__dirname + '/public'));

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

app.get('/login', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.sendFile(path.join(process.cwd(), '/public/login.html'));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/public/index.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/public/index.html'));
});

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

const PORT = process.env.PORT || 3000;

server.on('listening', () => {
  const address = server.address();
  console.log('Listening on:');
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(`\thttp://${address.family === 'IPv6' ? `[${address.address}]` : address.address}:${address.port}`);
});

server.listen({ port: PORT });

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close();
  bareServer.close();
  process.exit(0);
}
