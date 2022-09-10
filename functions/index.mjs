import Firestore from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import functions from 'firebase-functions';
import fetch from 'node-fetch';

// The userAgent does NOT need to be changed. Any valid userAgent will do.
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";

// Initialize Firebase products.
const db = new Firestore();
const storage = new Storage();
const usersPath = db.collection("users"); // Firestore path.
const bucketPath = "avatars"; // Firebase storage path.
// TODO#1: Set bucketId below to value from firebase storage section of project.
const bucketId = "gs://insta-profile-pic.appspot.com";
const bucket = storage.bucket(bucketId);

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

// Get profile_pic_url_hd value from Instagram.
async function getProfilePicUrl(user) {
  // Check Firestore user data first.
  let userRef = await usersPath.doc(user).get();
  let data = userRef.data();
  if (data?.profile_pic_url_hd) {
    return data.profile_pic_url_hd;
  }

  // profile_pic_url_hd can be parsed from user html page itself or from Public api.
  // Try with Public api first, fallback to page parsing after.
  let profile_pic_url_hd = null;
  try {
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${user}`
    const response = await fetch(url, {
        headers:{
            'User-Agent': userAgent,
            "x-ig-app-id": "936619743392459",
            "x-asbd-id": "198387",
            'Accept-Encoding': 'gzip, deflate',
            'Accept': '*/*',
            'Connection': 'keep-alive',
        }
    })
    let page = await response.json();
    profile_pic_url_hd = page.data?.user?.profile_pic_url_hd;
    await usersPath.doc(user).set({ profile_pic_url_hd });
  } catch (err) {
    console.log(
      "Public api request failed. Now attempting to parse page:",
      err
    );
    const url = `https://www.instagram.com/${user}/?&__a=1&__d=dis`
    const response = await fetch(url, {
        headers: {
            'User-Agent': userAgent,
            'Accept-Encoding': 'gzip, deflate',
            'Accept': '*/*',
            'Connection': 'keep-alive',
        }
    })
    let page = await response.text();
    let match = page.match(/profile_pic_url_hd":"(.+?)"/);

    profile_pic_url_hd = match !== null ? JSON.parse(`["${match[1]}"]`)[0] : null;
    if (profile_pic_url_hd) await usersPath.doc(user).set({ profile_pic_url_hd });
  }
  return profile_pic_url_hd;
}

// Obtain image if needed and redirect to bucket public url
let instapic = functions.https.onRequest(async (req, res) => {
  let user = req.query.username
  let url = null
  if (user) {
    url = await storeProfilePic(user)
  }
  if (url) {
    res.send({ url });
  } else {
    console.log('not found')
    res.status(404);
    res.end("not found")
  }
})


export { instapic }
