// auth/webAuthn.js (MariaDB-backed)

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const pool = require('../config/db');

/**
 * Generate registration options and store the challenge in session
 */
async function generateRegistrationOptionsHandler(req, res) {
  const { id, username } = req.user;
  const options = generateRegistrationOptions({
    rpName: 'Mail Dashboard',
    rpID: process.env.WEBAUTHN_RP_ID,
    userID: id.toString(),
    userName: username,
    attestationType: 'none'
  });
  req.session.challenge = options.challenge;
  res.json(options);
}

/**
 * Verify registration response and store credential in DB
 */
async function verifyRegistrationResponseHandler(req, res) {
  const response = req.body;
  const expectedChallenge = req.session.challenge;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      rpID: process.env.WEBAUTHN_RP_ID,
      origin: process.env.WEBAUTHN_ORIGIN
    });
  } catch (error) {
    return res.status(400).json({ error: 'Registration verification failed' });
  }

  if (verification.verified) {
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    await pool.execute(
      `INSERT INTO credentials (user_id, credential_id, public_key, counter)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), counter = VALUES(counter)`,
      [req.user.id, credentialID, credentialPublicKey, counter]
    );
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ error: 'Registration failed' });
  }
}

/**
 * Generate authentication options with allowed credentials
 */
async function generateAuthenticationOptionsHandler(req, res) {
  const userID = req.body.userID;
  const [rows] = await pool.execute(
    'SELECT credential_id FROM credentials WHERE user_id = ?',
    [userID]
  );
  const allowCredentials = rows.map(r => ({
    id: r.credential_id,
    type: 'public-key'
  }));
  const options = generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID,
    allowCredentials,
    userVerification: 'preferred'
  });
  req.session.challenge = options.challenge;
  res.json(options);
}

/**
 * Verify authentication response and update counter
 */
async function verifyAuthenticationResponseHandler(req, res) {
  const response = req.body;
  const expectedChallenge = req.session.challenge;
  const userID = response.response.userHandle || response.id; // adjust if needed

  const [rows] = await pool.execute(
    'SELECT public_key, counter FROM credentials WHERE user_id = ?',
    [userID]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'No credentials found' });
  }

  const { public_key, counter } = rows[0];
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      rpID: process.env.WEBAUTHN_RP_ID,
      origin: process.env.WEBAUTHN_ORIGIN,
      authenticator: {
        credentialPublicKey: public_key,
        credentialID: response.id,
        counter
      }
    });
  } catch (error) {
    return res.status(400).json({ error: 'Authentication verification failed' });
  }

  if (verification.verified) {
    // Update counter to prevent replay attacks
    await pool.execute(
      'UPDATE credentials SET counter = ? WHERE user_id = ?',
      [verification.authenticationInfo.newCounter, userID]
    );
    res.json({ status: 'ok' });
  } else {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = {
  generateRegistrationOptions: generateRegistrationOptionsHandler,
  verifyRegistrationResponse: verifyRegistrationResponseHandler,
  generateAuthenticationOptions: generateAuthenticationOptionsHandler,
  verifyAuthenticationResponse: verifyAuthenticationResponseHandler
};
