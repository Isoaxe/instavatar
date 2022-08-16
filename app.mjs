import fetch from 'node-fetch'
import express from 'express'
import admin from 'firebase-admin'
import fs from 'fs'

const bucketId = 'gs://avatars-663d5.appspot.com'
const firebaseCreds = 'firebase_auth.json'
const bucketPath = 'avatars'

//Firebase init part
let rawdata = fs.readFileSync(firebaseCreds);
let serviceAccount = JSON.parse(rawdata);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const storage = admin.storage().bucket(bucketId);

// App

const app = express()
const port = 3000

app.use(express.static('public'))

app.get('/api/avatar', async (req, res) => {
  let username = req.query.username
  let url = null
  let from_cache = false

  if (username) {
    let cache = await getAvatarFromCache(username)
    if (cache.exists) {
      url = cache.url
      from_cache = true
    } else {
      let picUrl = await getAvatarURL(username) //get url from ?__a=1 api
      let imgBuffer = await getAvatarImage(picUrl) //get img it self as buffer
      url = await uploadAvatar(imgBuffer, username) //upload to storage and get publicURL
    }
  }
  res.send({ url: url, from_cache: from_cache })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


// Obtain and save pic part

async function getAvatarFromCache(username) {
  let file = storage.file(`${bucketPath}/${username}.png`)
  let exists = await file.exists()
  if (exists[0]) {
    return { exists: true, url: file.publicUrl() }
  } else {
    return { exists: false, url: null }
  }
}

async function uploadAvatar(imageBuffer, username) {
  let file = storage.file(`${bucketPath}/${username}.png`)
  await file.save(imageBuffer, {
    metadata: {
      contentType: "image/png",
      origin: ["*"],
    }
  })
  await file.makePublic()
  return file.publicUrl()
}

async function getAvatarImage(url) {
  let response = await fetch(url)
  let data = await response.arrayBuffer()
  const buffer = Buffer.from(data);
  return buffer
}

async function getAvatarURL(username) {
  let options = {
    'method': 'GET',
    'headers': {
      'Host': 'www.instagram.com'
    }
  };
  let response = await fetch(`https://www.instagram.com/${username}/?__a=1`, options)
  let j = await response.json()
  let url = j.graphql?.user?.profile_pic_url_hd
  return url
}