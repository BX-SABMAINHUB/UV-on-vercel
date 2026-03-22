import express from 'express';
import http from 'node:http';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import path from 'path';
import { hostname } from 'node:os';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Resend } from 'resend';

const server = http.createServer();
const app = express();
const __dirname = process.cwd();
const bareServer = createBareServer('/b/');
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Notificación login ────────────────────────────────────
async function notifyLogin(profile, req, provider) {
  const name     = profile.displayName || profile.username || profile.name?.formatted || 'Desconocido';
  const email    = profile.emails?.[0]?.value || profile.email || profile.emails?.[0] || 'Sin correo';
  const photo    = profile.photos?.[0]?.value || (profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : '');
  const id       = profile.id || profile.user_id || 'N/A';
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

  const ghUsername  = provider === 'github' ? (profile.username || 'N/A') : null;
  const ghProfile   = provider === 'github' ? `https://github.com/${profile.username}` : null;
  const ghBio       = provider === 'github' ? (profile._json?.bio || 'Sin bio') : null;
  const ghLocation  = provider === 'github' ? (profile._json?.location || 'Desconocida') : null;
  const ghRepos     = provider === 'github' ? (profile._json?.public_repos ?? 'N/A') : null;
  const ghFollowers = provider === 'github' ? (profile._json?.followers ?? 'N/A') : null;
  const ghCreated   = provider === 'github' ? (profile._json?.created_at ? new Date(profile._json.created_at).toLocaleDateString('es-ES') : 'N/A') : null;

  const dcUsername = provider === 'discord' ? (profile.username || 'N/A') : null;
  const dcDiscrim  = provider === 'discord' ? (profile.discriminator || '0') : null;
  const dcLocale   = provider === 'discord' ? (profile.locale || 'N/A') : null;
  const dcVerified = provider === 'discord' ? (profile.verified ? '✅ Verificado' : '❌ No verificado') : null;
  const dcNitro    = provider === 'discord' ? (profile.premium_type ? '✅ Tiene Nitro' : '❌ Sin Nitro') : null;
  const dcMfa      = provider === 'discord' ? (profile.mfa_enabled ? '✅ Activado' : '❌ No activado') : null;

  const googleVerified = provider === 'google' ? (profile._json?.email_verified ? '✅ Verificado' : '❌ No verificado') : null;
  const googleLocale   = provider === 'google' ? (profile._json?.locale || 'N/A') : null;

  const ppVerified = provider === 'paypal' ? (profile.verified_account ? '✅ Verificado' : '❌ No verificado') : null;
  const ppCountry  = provider === 'paypal' ? (profile.address?.country || 'N/A') : null;
  const ppPayerId  = provider === 'paypal' ? (profile.payer_id || 'N/A') : null;

  const providerColor = provider === 'google' ? '#4285F4' : provider === 'github' ? '#ffffff' : provider === 'discord' ? '#5865F2' : '#003087';
  const providerName  = provider === 'google' ? '🔵 Google' : provider === 'github' ? '⚫ GitHub' : provider === 'discord' ? '🟣 Discord' : '🔵 PayPal';

  try {
    await resend.emails.send({
      from: 'Waevo Proxy <onboarding@resend.dev>',
      to: 'alexsanchezfollia@gmail.com',
      subject: `👤 Login ${providerName} — ${name}`,
      html: `
        <div style="background:#020810;color:#c0d8e8;font-family:monospace;padding:40px;border-radius:12px;max-width:560px;margin:0 auto;">
          <h1 style="font-size:2rem;letter-spacing:0.2em;margin:0 0 0.2rem 0;color:#00f5ff;">WAEVO</h1>
          <p style="color:rgba(0,245,255,0.35);font-size:0.65rem;letter-spacing:0.4em;margin:0 0 0.5rem 0;">NUEVO USUARIO CONECTADO</p>
          <p style="color:${providerColor};font-size:0.7rem;letter-spacing:0.3em;margin:0 0 2rem 0;">VÍA ${provider.toUpperCase()}</p>
          ${photo ? `<img src="${photo}" style="width:70px;height:70px;border-radius:50%;border:2px solid #00f5ff;display:block;margin-bottom:2rem;"/>` : ''}

          <p style="color:#00f5ff;font-size:0.65rem;letter-spacing:0.35em;margin:0 0 0.5rem 0;border-bottom:1px solid rgba(0,245,255,0.1);padding-bottom:0.5rem;">DATOS DE ${provider.toUpperCase()}</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;width:45%;">NOMBRE</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${name}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">CORREO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#00f5ff;">${email}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">ID</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.5);">${id}</td></tr>

            ${provider === 'google' ? `
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">VERIFICADO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${googleVerified}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">IDIOMA</td><td style="padding:8px 0;color:#e0f7ff;">${googleLocale}</td></tr>
            ` : ''}

            ${provider === 'github' ? `
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">USERNAME</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">@${ghUsername}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">PERFIL</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#00f5ff;"><a href="${ghProfile}" style="color:#00f5ff;">${ghProfile}</a></td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">BIO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${ghBio}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">UBICACIÓN</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${ghLocation}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">REPOS</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${ghRepos}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">SEGUIDORES</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${ghFollowers}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">CUENTA CREADA</td><td style="padding:8px 0;color:#e0f7ff;">${ghCreated}</td></tr>
            ` : ''}

            ${provider === 'discord' ? `
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">USERNAME</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${dcUsername}#${dcDiscrim}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">VERIFICADO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${dcVerified}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">NITRO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${dcNitro}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">2FA</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${dcMfa}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">IDIOMA</td><td style="padding:8px 0;color:#e0f7ff;">${dcLocale}</td></tr>
            ` : ''}

            ${provider === 'paypal' ? `
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">PAYER ID</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${ppPayerId}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:rgba(0,245,255,0.35);font-size:0.7rem;">VERIFICADO</td><td style="padding:8px 0;border-bottom:1px solid rgba(0,245,255,0.06);color:#e0f7ff;">${ppVerified}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(0,245,255,0.35);font-size:0.7rem;">PAÍS</td><td style="padding:8px 0;color:#e0f7ff;">${ppCountry}</td></tr>
            ` : ''}
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
    console.log(`📧 Notificación enviada — ${name} (${provider})`);
  } catch (err) {
    console.error('❌ Error notificación:', err);
  }
}

// ── Sesión ────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'waevo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, expires: false }
}));

// ── Passport Google ───────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://waevo-proxy.vercel.app/auth/callback',
}, (accessToken, refreshToken, profile, done) => {
  profile.provider = 'google';
  return done(null, profile);
}));

// ── Passport GitHub ───────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'https://waevo-proxy.vercel.app/auth/github/callback',
  scope: ['user:email'],
}, (accessToken, refreshToken, profile, done) => {
  profile.provider = 'github';
  return done(null, profile);
}));

// ── Passport Discord ──────────────────────────────────────
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: 'https://waevo-proxy.vercel.app/auth/discord/callback',
  scope: ['identify', 'email'],
}, (accessToken, refreshToken, profile, done) => {
  profile.provider = 'discord';
  return done(null, profile);
}));

// ── Passport PayPal ───────────────────────────────────────
passport.use('paypal', new OAuth2Strategy({
  authorizationURL: 'https://www.paypal.com/signin/authorize',
  tokenURL: 'https://api.paypal.com/v1/oauth2/token',
  clientID: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  callbackURL: 'https://waevo-proxy.vercel.app/auth/paypal/callback',
}, async (accessToken, refreshToken, params, done) => {
  try {
    const res = await fetch('https://api.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const user = await res.json();
    user.provider = 'paypal';
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// ── Middlewares ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ── Auth middleware ───────────────────────────────────────
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

// ── Estáticos ─────────────────────────────────────────────
app.use(express.static(__dirname + '/public'));

// ── Rutas Google ──────────────────────────────────────────
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

app.get('/auth/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    await notifyLogin(req.user, req, 'google');
    res.redirect('/');
  }
);

// ── Rutas GitHub ──────────────────────────────────────────
app.get('/auth/github', passport.authenticate('github', {
  scope: ['user:email'],
}));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req, res) => {
    await notifyLogin(req.user, req, 'github');
    res.redirect('/');
  }
);

// ── Rutas Discord ─────────────────────────────────────────
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  async (req, res) => {
    await notifyLogin(req.user, req, 'discord');
    res.redirect('/');
  }
);

// ── Rutas PayPal ──────────────────────────────────────────
app.get('/auth/paypal', passport.authenticate('paypal', {
  scope: ['openid', 'email', 'profile'],
}));

app.get('/auth/paypal/callback',
  passport.authenticate('paypal', { failureRedirect: '/login' }),
  async (req, res) => {
    await notifyLogin(req.user, req, 'paypal');
    res.redirect('/');
  }
);

// ── Logout ────────────────────────────────────────────────
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
    res.sendFile(path.join(process.cwd(), '/public/login.html'));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/public/index.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/public/index.html'));
});

// ── Servidor ──────────────────────────────────────────────
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
