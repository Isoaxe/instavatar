import Firestore from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage';
import functions from 'firebase-functions'
import fetch from 'node-fetch'

// Using some account as 'viewer' because without login Instagram sometimes not response data
const username = '' // viewer account login
const password = '' // viewer account pass
const bucketId = '' // firebase bucket id
const bucketPath = 'avatars' // firebase bucket folder
const collectionName = 'instagram' // firestore collection for instagram api metainfo and session

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36'


/* Init firebase part */
const db = new Firestore();
const instagramDb = db.collection(collectionName);
// Save or not full user info in DB (response from ?__a=1 api)
const saveUserInfo = true
// Default url if all ways of get pic failed (placeholder image url)
const defaultPicUrl = null

const storage = new Storage()
const bucket = storage.bucket(bucketId)


// Store instagram cookies in firestore (instargram->__session) after login, reuse it latter
async function getSessionCache() {
  let doc = await instagramDb.doc('__session').get()
  let data = doc.data()
  let cookie = data ? data.cookie : null
  return cookie
}

async function setSessionCache(cookie) {
  await instagramDb.doc('__session').set({
    cookie: cookie,
    created: Date.now()
  });
}

// Need to get csrf token before login
async function csrfToken() {
  let url = 'https://www.instagram.com/accounts/login/'
  let options = {
    'method': 'GET',
    'headers': {
      'Host': 'www.instagram.com',
      'user-agent': userAgent
    }
  };
  let response = await fetch(url, options)
  let page = await response.text()
  let csrf = page.match(/csrf_token\":\"(.*?)\"/)
  return csrf !== null ? csrf[1] : null
}

// Do login and return resulting cookie string
async function login(username, password) {
  let url = 'https://www.instagram.com/accounts/login/ajax/'
  let csrf = await csrfToken()
  let options = {
    method: 'POST',
    headers: {
      'user-agent': userAgent,
      'x-csrftoken': csrf,
      "x-requested-with": "XMLHttpRequest",
      "referer": "https://www.instagram.com/accounts/login/"
    },
    body: new URLSearchParams({
      enc_password: `#PWD_INSTAGRAM_BROWSER:0:${Date.now()}:${password}`,
      username: username,
      queryParams: '{}',
      optIntoOneTap: 'false'
    })
  }
  let response = await fetch(url, options)
  let setCookie = response.headers.raw()['set-cookie']
  let cookies = ''

  for (let i = 0; i < setCookie.length; i++) {
    let match = setCookie[i].match(/^[^;]+;/)
    if (match) {
      cookies = `${cookies} ${match[0]}`
    }
  }
  return cookies
}

// Get profile_pic_hd URL
async function getProfilePicUrl(user) {
  //Check in CACHE first
  let doc = await instagramDb.doc(user).get()
  let data = doc.data()
  if (data && data.profile_pic_url_hd) {
    return data.profile_pic_url_hd
  }

  //check session exists or not
  let sessionCookie = await getSessionCache()
  if (!sessionCookie) {
    sessionCookie = await login(username, password)
    await setSessionCache(sessionCookie)
  }
  // profile_pic_url_hd can be parsed from user html page itself or from public api
  // public_api need more testing
  // Try with public api first, fallback to page parsing next
  let profile_pic_hd = defaultPicUrl
  try {
    let response = await fetch(`https://instagram.com/${user}/?__a=1`, {
      headers: {
        cookie: sessionCookie
      }
    })
    let page = await response.json()
    if (saveUserInfo) {
      try {
        let userInfo = page.graphql?.user
        await instagramDb.doc(user).set({
          id: userInfo.id,
          username: userInfo.username,
          profile_pic_url_hd: userInfo.profile_pic_url_hd,
          profile_pic_url: userInfo.profile_pic_url,
          full_name: userInfo.full_name,
          fbid: userInfo.fbid,
          external_url: userInfo.external_url,
          biography: userInfo.biography
        })
      } catch (e) {
        console.log("Can't collect user_info from api", e)
      }
    }

    profile_pic_hd = page.graphql?.user?.profile_pic_url_hd
  } catch (e) {
    console.log(e)
    let response = await fetch(`https://instagram.com/${user}`, {
      headers: {
        cookie: sessionCookie
      }
    })
    let page = await response.text()
    let match = page.match(/profile_pic_url_hd":"(.+?)"/)

    profile_pic_hd = match !== null ? JSON.parse(`["${match[1]}"]`)[0] : null
    if (saveUserInfo) {
      try {
        await instagramDb.doc(user).set({
          username: user,
          profile_pic_hd: profile_pic_hd
        })
      } catch (e) {
        console.log("Can't collect user_info from parsing", e)
      }
    }
  }
  return profile_pic_hd
}

async function storeProfilePic(user) {
  // return avatar if already exists
  const file = bucket.file(`${bucketPath}/${user}.png`)
  let exists = await file.exists()
  if (exists[0]) {
    return file.publicUrl()
  }

  // get url
  let url = await getProfilePicUrl(user)
  if (url) {
    // load image
    try {
      let response = await fetch(url, {
        method: 'GET',
        headers: {
          referer: 'https://www.instagram.com/'
        }
      })
      let data = await response.arrayBuffer()
      const buffer = Buffer.from(data)

      // store img file in bucket
      await file.save(buffer, {
        metadata: {
          contentType: "image/png",
          origin: ["*"],
          instagram_pic_url: url
        }
      })
      await file.makePublic()
      return file.publicUrl()
    } catch (e) {
      console.log(e)
      return null
    }
  } else {
    return null
  }
}

// Redirect version example.
// Obtain image if needed and redirect to bucket public url
let instapic = functions.https.onRequest(async (req, res) => {
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
let instapicData = functions.https.onRequest(async (req, res) => {
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