// CRA loads this server-side hook before serving frontend files and SPA routes.
// Framing protection must be an HTTP header; a CSP meta tag cannot enforce it.
module.exports = function setupFrontendHeaders(app) {
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
};
