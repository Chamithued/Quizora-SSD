import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import OAuthTransaction from '../models/OAuthTransaction.js'; // import the OAuthTransaction model for temparily storing Google sign-in transactions
import { generateToken } from './authController.js'; // import the generateToken function from authController.js to issue JWTs after successful Google sign-in

const COOKIE = 'quizora_google'; // define the name of the cookie used to store temporary state and nonce values during the Google sign-in process
const COOKIE_PATH = '/api/auth/google'; // define the path for the Google sign-in cookie, which is used to store temporary state and nonce values during the authentication process
const random = () => randomBytes(32).toString('base64url'); // generate a random string of 32 bytes and encode it in base64url format, used for creating unique state and nonce values for Google sign-in transactions
const hash = value => createHash('sha256').update(value).digest('hex'); // create a SHA-256 hash of the input value, used for securely storing sensitive data like state and nonce values in the database
const isSecret = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value); // check if the input value is a valid secret string, which is a 43-character long string containing only alphanumeric characters, underscores, and hyphens
const browserSecret = req => req.headers.cookie?.split(';')
  .map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1); // extract the value of the Google sign-in cookie from the request headers, which is used to verify the authenticity of the request during the callback phase of the Google sign-in process

export function getGoogleConfig(env = process.env) {
  const frontend = new URL(env.GOOGLE_FRONTEND_URL || 'http://localhost:3000');
  const redirect = new URL(env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback');
  for (const url of [frontend, redirect]) {
    if (url.username || url.password || url.search || url.hash ||
        (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' &&
          url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
      throw new Error('OAuth URLs must use HTTPS (HTTP localhost is allowed in development).');
    }
  }
  if (frontend.pathname !== '/' || redirect.pathname !== `${COOKIE_PATH}/callback`) {
    throw new Error('Invalid Google frontend origin or callback path.');
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: redirect.href,
    frontendOrigin: frontend.origin,
    secure: redirect.protocol === 'https:',
    enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.JWT_SECRET)
  };
}

// Dependencies can be substituted in tests without contacting Google or a real database.
export function createGoogleAuthHandlers({
  users = User, transactions = OAuthTransaction, config = getGoogleConfig,
  clientFactory = cfg => new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri),
  issueToken = generateToken
} = {}) {
  const cookieOptions = cfg => ({ httpOnly: true, secure: cfg.secure, sameSite: 'lax', path: COOKIE_PATH });
  const noStore = res => res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  const ready = (req, res) => {
    noStore(res);
    let cfg;
    try { cfg = config(); } catch {
      res.status(503).json({ message: 'Google sign-in configuration is invalid.' });
      return null;
    }
    if (!cfg.enabled) {
      res.status(503).json({ message: 'Google sign-in is not configured yet.' });
      return null;
    }
    // CORS alone does not prevent a forged request from reaching the server.
    if (req.headers.origin !== cfg.frontendOrigin) {
      res.status(403).json({ message: 'Untrusted sign-in origin.' });
      return null;
    }
    return cfg;
  };

  const status = (req, res) => {
    noStore(res);
    try { res.json({ enabled: config().enabled }); }
    catch { res.json({ enabled: false }); }
  };

  const begin = mode => async (req, res) => {
    const cfg = ready(req, res);
    if (!cfg) return;
    try {
      let user;
      let signup;
      if (mode === 'signup') {
        const { firstName, lastName, requestedRole } = req.body || {};
        if (![firstName, lastName].every(name => typeof name === 'string' && name.trim() && name.length <= 100) ||
            !['student', 'lecturer', 'admin'].includes(requestedRole)) {
          return res.status(400).json({ message: 'Enter your first name, last name and requested role.' });
        }
        signup = { firstName: firstName.trim(), lastName: lastName.trim(), requestedRole };
      }
      if (mode === 'link') {
        const { email, password } = req.body || {};
        if (typeof email !== 'string' || typeof password !== 'string' ||
            !email.trim() || !password || email.length > 254 || password.length > 1024) {
          return res.status(400).json({ message: 'Enter your Quizora email and password to connect Google.' });
        }
        user = await users.findOne({ email: email.trim().toLowerCase() }).select('+password +googleId');
        if (!user?.isActive || !(await user.comparePassword(password))) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.googleId) {
          return res.status(409).json({ message: 'Google is already connected. Use Continue with Google.' });
        }
      }
      const client = clientFactory(cfg);
      const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
      const state = random();
      const browser = random();
      const nonce = random();
      await transactions.create({
        _id: hash(state), kind: 'authorization', browserHash: hash(browser),
        nonce, codeVerifier, userId: user?._id, signup,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      const url = client.generateAuthUrl({
        response_type: 'code', scope: ['openid', 'email'], state, nonce,
        code_challenge: codeChallenge, code_challenge_method: 'S256',
        prompt: 'select_account', access_type: 'online'
      });
      res.cookie(COOKIE, browser, { ...cookieOptions(cfg), maxAge: 10 * 60 * 1000 });
      res.json({ url });
    } catch {
      res.status(500).json({ message: 'Unable to start Google sign-in. Please try again.' });
    }
  };

  const callback = async (req, res) => {
    noStore(res);
    let cfg;
    try { cfg = config(); } catch {
      return res.status(503).send('Google sign-in configuration is invalid.');
    }
    const fail = reason => {
      res.clearCookie(COOKIE, cookieOptions(cfg));
      return res.redirect(`${cfg.frontendOrigin}/login?google_error=${reason}`);
    };
    try {
      if (!cfg.enabled) return fail('unavailable');
      const browser = browserSecret(req);
      if (!isSecret(req.query.state) || !isSecret(browser)) return fail('invalid_state');
      // Atomic consumption rejects replays and concurrent callback requests.
      // Expiry is checked here because MongoDB TTL cleanup is asynchronous.
      const transaction = await transactions.findOneAndDelete({
        _id: hash(req.query.state), kind: 'authorization', browserHash: hash(browser),
        expiresAt: { $gt: new Date() }
      });
      if (!transaction) return fail('invalid_state');
      if (req.query.error) return fail('cancelled');
      if (typeof req.query.code !== 'string' || !req.query.code || req.query.code.length > 4096) {
        return fail('failed');
      }
      const client = clientFactory(cfg);
      const { tokens } = await client.getToken({
        code: req.query.code, codeVerifier: transaction.codeVerifier, redirect_uri: cfg.redirectUri
      });
      if (!tokens.id_token) return fail('failed');
      // Google library validates signature, issuer, audience and token lifetime.
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: cfg.clientId });
      const claims = ticket.getPayload();
      if (!claims || claims.nonce !== transaction.nonce || claims.email_verified !== true ||
          typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 ||
          (claims.azp && claims.azp !== cfg.clientId)) return fail('failed');

      let user;
      if (transaction.signup?.requestedRole) {
        user = await users.findOne({ googleId: claims.sub });
        if (!user) {
          if (typeof claims.email !== 'string' || !claims.email.includes('@') || claims.email.length > 254) return fail('failed');
          // Never take over an existing password account with a matching email.
          if (await users.findOne({ email: claims.email.trim().toLowerCase() })) return fail('existing_account');
          user = await users.create({
            firstName: transaction.signup.firstName, lastName: transaction.signup.lastName,
            email: claims.email.trim().toLowerCase(), googleId: claims.sub, authProvider: 'google',
            role: 'student', requestedRole: transaction.signup.requestedRole,
            approvalStatus: 'pending', isActive: true
          });
        }
        if (!user.isActive) return fail('failed');
      } else if (transaction.userId) {
        // Password proof was obtained at start; the Google identity is now also proven.
        // The conditional update and unique index prevent replacement or duplicate linking.
        user = await users.findOneAndUpdate({
          _id: transaction.userId, isActive: true, googleId: { $exists: false }
        }, { $set: { googleId: claims.sub } }, { new: true });
        if (!user) return fail('link_failed');
      } else {
        user = await users.findOne({ googleId: claims.sub, isActive: true });
        if (!user) return fail('not_linked');
      }
      const completion = random();
      await transactions.create({
        _id: hash(completion), kind: 'completion', userId: user._id,
        expiresAt: new Date(Date.now() + 60 * 1000)
      });
      res.cookie(COOKIE, completion, { ...cookieOptions(cfg), maxAge: 60 * 1000 });
      // No Google tokens, application JWTs or redeemable codes in the frontend URL.
      return res.redirect(`${cfg.frontendOrigin}/login?google=complete`);
    } catch (error) {
      return fail(error.code === 11000 ? 'link_failed' : 'failed');
    }
  };

  const complete = async (req, res) => {
    const cfg = ready(req, res);
    if (!cfg) return;
    const secret = browserSecret(req);
    res.clearCookie(COOKIE, cookieOptions(cfg));
    try {
      const transaction = isSecret(secret) && await transactions.findOneAndDelete({
        _id: hash(secret), kind: 'completion', expiresAt: { $gt: new Date() }
      });
      if (!transaction) return res.status(401).json({ message: 'Google sign-in expired. Please try again.' });
      const user = await users.findOneAndUpdate({ _id: transaction.userId, isActive: true },
        { $set: { lastLogin: new Date() } }, { new: true });
      if (!user) return res.status(401).json({ message: 'Account is unavailable.' });
      const token = await issueToken(user._id);
      res.json({ success: true, token, user: user.toJSON() });
    } catch {
      res.status(500).json({ message: 'Unable to finish Google sign-in. Please try again.' });
    }
  };

  return { status, start: begin('login'), link: begin('link'), signup: begin('signup'), callback, complete };
}

export const googleAuth = createGoogleAuthHandlers();
