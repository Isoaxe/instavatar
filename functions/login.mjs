import Firestore from '@google-cloud/firestore';
import fetch from 'node-fetch';

// Instagram credentials should be from an account created specifically for programmatic login.
const username = process.env.INSTAGRAM_HANDLE;
const password = process.env.INSTAGRAM_PASSWORD;
const loginUrl = "https://www.instagram.com/accounts/login";
// The userAgent does NOT need to be changed. Any valid userAgent will do.
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";

// Define secrets available in the app.
const secrets = {
  secrets: [
    "INSTAGRAM_HANDLE",
    "INSTAGRAM_PASSWORD",
  ],
};

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

/*
 *   Helper functions below are for the above function.
 */

// Return session cache from Firestore if it exists.
async function getSessionCache() {
 let doc = await loginPath.doc("__session").get();
 let data = doc.data();
 let cookie = data ? data.cookie : null;
 return cookie;
}

// Store Instagram cookies in Firestore after login for use later.
async function setSessionCache(cookie) {
 await loginPath.doc("__session").set({
   cookie: cookie,
   created: new Date().toUTCString(Date.now()),
 });
}

// Do login and return resulting cookie string.
async function login(username, password) {
 let url = `${loginUrl}/ajax/`;
 let csrf = await csrfToken();
 let options = {
   method: "POST",
   headers: {
     "user-agent": userAgent,
     "x-csrftoken": csrf,
     "Accept": '*/*',
     "x-requested-with": "XMLHttpRequest",
     referer: loginUrl,
   },
   body: new URLSearchParams({
     enc_password: `#PWD_INSTAGRAM_BROWSER:0:${Date.now()}:${password}`,
     username,
     queryParams: "{}",
     optIntoOneTap: "false",
   }),
 };
 let response = await fetch(url, options);
 let setCookie = response.headers.raw()["set-cookie"];
 let cookie = "";

 for (let i = 0; i < setCookie.length; i++) {
   let match = setCookie[i].match(/^[^;]+;/);
   if (match) {
     cookie = `${cookie} ${match[0]}`;
   }
 }
 return cookie;
}

// Need to get CSRF token before login.
async function csrfToken() {
 let options = {
   method: "GET",
   headers: {
     host: "www.instagram.com",
     "user-agent": userAgent,
   },
 };
 let response = await fetch(loginUrl, options);
 let page = await response.text();
 /* eslint-disable no-useless-escape */
 let csrf = page.match(/csrf_token\":\"(.*?)\"/);
 return csrf !== null ? csrf[1] : null;
}
