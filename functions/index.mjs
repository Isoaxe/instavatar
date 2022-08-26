import Firestore from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import functions from 'firebase-functions';
import fetch from 'node-fetch';

// TODO: Set username and password via Firebase secrets or else hardcode values below.
// Instagram credentials should be from an account created specifically for programmatic login.
const username = process.env.INSTAGRAM_HANDLE;
const password = process.env.INSTAGRAM_PASSWORD;
const loginUrl = "https://www.instagram.com/accounts/login";
// The userAgent does NOT need to be changed. Any valid userAgent will do.
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36";

// Initialize Firebase products.
const db = new Firestore();
const storage = new Storage();
const usersPath = db.collection("users");
const loginPath = db.collection("login");
const bucketPath = "avatars";
// TODO: Set bucketId below to value from firebase storage section of project.
const bucket = storage.bucket("gs://insta-profile-pic.appspot.com");

// Returns avatar url from Firebase Storage. Gets and stores it if not present.
async function storeProfilePic(user) {
  // Return avatar if it already exists.
  const file = bucket.file(`${bucketPath}/${user}.png`);
  let exists = await file.exists();
  if (exists[0]) {
    return file.publicUrl();
  }

  // Get url.
  let url = await getProfilePicUrl(user);
  if (url) {
    // Load image.
    try {
      let response = await fetch(url, {
        method: "GET",
        headers: {
          referer: "https://www.instagram.com/",
        },
      });
      let data = await response.arrayBuffer();
      const buffer = Buffer.from(data);

      // store img file in bucket.
      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          origin: ["*"],
          instagram_pic_url: url,
        },
      });
      await file.makePublic();
      return file.publicUrl();
    } catch (err) {
      console.log("Saving of profile photo file failed:", err);
      return null;
    }
  } else {
    return null;
  }
}

/*
 *   Helper functions below are for the above function.
 */

// Get profile_pic_url_hd value from Instagram.
async function getProfilePicUrl(user) {
  // Check Firestore user data first.
  let userRef = await usersPath.doc(user).get();
  let data = userRef.data();
  if (data?.avatarUrl?.includes(user)) {
    return data.avatarUrl;
  }
  // Check if session exists or not.
  let sessionCookie = await getSessionCache();
  if (!sessionCookie) {
    sessionCookie = await login(username, password);
    await setSessionCache(sessionCookie);
  }
  // profile_pic_url_hd can be parsed from user html page itself or from Public api.
  // Public api needs more testing.
  // Try with Public api first, fallback to page parsing after.
  let profile_pic_hd = null;
  try {
    let response = await fetch(`https://instagram.com/${user}/?__a=1`, {
      headers: {
        cookie: sessionCookie,
      },
    });
    // TODO: Next line causes error. Resolve issue.
    let page = await response.json();
    await usersPath.doc(user).set({
      id: userInfo.id,
      username: userInfo.username,
      profile_pic_url_hd: userInfo.profile_pic_url_hd,
      profile_pic_url: userInfo.profile_pic_url,
      full_name: userInfo.full_name,
      fbid: userInfo.fbid,
      external_url: userInfo.external_url,
      biography: userInfo.biography
    });

    profile_pic_hd = page.graphql?.user?.profile_pic_url_hd;
  } catch (err) {
    console.log(
      "Public api request failed. Now attempting to parse page:",
      err
    );
    let response = await fetch(`https://instagram.com/${user}`, {
      headers: {
        cookie: sessionCookie,
      },
    });
    let page = await response.text();
    // TODO: No match is found and profile_pic_url_hd remains null.
    let match = page.match(/profile_pic_url_hd":"(.+?)"/);

    profile_pic_hd = match !== null ? JSON.parse(`["${match[1]}"]`)[0] : null;
    if (profile_pic_hd) await usersPath.doc(user).set({ profile_pic_hd });
  }
  return profile_pic_hd;
}

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
    created: Date.now(),
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
  let cookies = "";

  for (let i = 0; i < setCookie.length; i++) {
    let match = setCookie[i].match(/^[^;]+;/);
    if (match) {
      cookies = `${cookies} ${match[0]}`;
    }
  }
  return cookies;
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

// Define secrets available in the app.
const secrets = {
  secrets: [
    "INSTAGRAM_HANDLE",
    "INSTAGRAM_PASSWORD",
  ],
};

// Redirect version example.
// Obtain image if needed and redirect to bucket public url
let instapic = functions.runWith(secrets).https.onRequest(async (req, res) => {
  let user = req.query.username
  let url = null
  if (user) {
    url = await storeProfilePic(user)
  }
  if (url) {
    res.redirect(url)
  } else {
    console.log('not found')
    res.status(404);
    res.end("not found")
  }
})

// Return image itself on requested url
let instapicData = functions.runWith(secrets).https.onRequest(async (req, res) => {
  let user = req.query.username
  let url = null
  if (user) {
    url = await storeProfilePic(user)
  }

  if (url) {
    const file = bucket.file(`${bucketPath}/${user}.png`).createReadStream({
      validation: false
    })
    file.pipe(res)
  } else {
    res.status(404);
    res.end("not found")
  }

})


export { instapic, instapicData }
