import Firestore from '@google-cloud/firestore';
import fetch from 'node-fetch';

// Instagram credentials should be from an account created specifically for programmatic login.
const username = process.env.INSTAGRAM_HANDLE;
const password = process.env.INSTAGRAM_PASSWORD;
const loginUrl = "https://www.instagram.com/accounts/login";
// The userAgent does NOT need to be changed. Any valid userAgent will do.
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";

// Check if session exists or not, returns session cookie.
// Cookie is then added to Instagram API request header.
async function getSessionCookie() {
  let sessionCookie = await getSessionCache();
  if (!sessionCookie) {
    sessionCookie = await login(username, password);
    await setSessionCache(sessionCookie);
  }
  return sessionCookie;
}
