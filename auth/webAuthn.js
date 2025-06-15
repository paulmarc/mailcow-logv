const { generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');

// In-memory credential storage
const userCredentials = new Map();

async function generateRegistrationOptionsHandler(req, res) {
const options = generateRegistrationOptions({
rpName: 'Mail Dashboard',
rpID: process.env.WEBAUTHN_RP_ID,
userID: req.user.id.toString(),
userName: req.user.username,
attestationType: 'none'
});
req.session.challenge = options.challenge;
res.json(options);
}

async function verifyRegistrationResponseHandler(req, res) {
const { body } = req;
const expectedChallenge = req.session.challenge;
const verification = await verifyRegistrationResponse({ response: body, expectedChallenge, rpID: process.env.WEBAUTHN_RP_ID, origin: process.env.WEBAUTHN_ORIGIN });
if (verification.verified) {
userCredentials.set(req.user.id, verification.registrationInfo);
res.json({ status: 'ok' });
} else {
res.status(400).json({ error: 'Registration failed' });
}
}

async function generateAuthenticationOptionsHandler(req, res) {
const options = generateAuthenticationOptions({
rpID: process.env.WEBAUTHN_RP_ID,
allowCredentials: userCredentials.has(req.body.userID) ? [{ id: userCredentials.get(req.body.userID).credentialID, type: 'public-key' }] : []
});
req.session.challenge = options.challenge;
res.json(options);
}

async function verifyAuthenticationResponseHandler(req, res) {
const { body } = req;
const expectedChallenge = req.session.challenge;
const dbRecord = userCredentials.get(body.userID);
const verification = await verifyAuthenticationResponse({ response: body, expectedChallenge, rpID: process.env.WEBAUTHN_RP_ID, origin: process.env.WEBAUTHN_ORIGIN, authenticator: dbRecord });
if (verification.verified) {
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
