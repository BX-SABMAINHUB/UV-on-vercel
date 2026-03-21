// ── Anti-tracking headers middleware ─────────────────────
export function antiTrack(app) {

  app.use((req, res, next) => {

    // Quita información del servidor
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Bloquea iframes y embeds externos (anti-visión)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Política de permisos — desactiva cámara, mic, geolocalización, etc.
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
      'magnetometer=(), gyroscope=(), accelerometer=(), ' +
      'interest-cohort=(), browsing-topics=()'
    );

    // No enviar referrer a sitios externos
    res.setHeader('Referrer-Policy', 'no-referrer');

    // No cachear datos sensibles
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Bloquea detección de tipo de contenido
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Política de seguridad de contenido estricta
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "connect-src 'self' wss: ws:; " +
      "img-src 'self' data: blob:; " +
      "frame-ancestors 'none';"
    );

    // Anti fingerprinting básico
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
  });
}
