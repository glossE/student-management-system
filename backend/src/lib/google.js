import { OAuth2Client } from "google-auth-library";

let client = null;
function getClient() {
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
}

// Verifies a Google ID token server-side and returns its trusted payload.
// `audience` is OUR client id, so a token minted for any other app is rejected.
// Throws if the token is invalid, expired, or for the wrong audience.
export async function verifyGoogleToken(idToken) {
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}
