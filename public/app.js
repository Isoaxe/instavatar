let username = document.querySelector('#username')
let btn = document.querySelector('#get_avatar')
let img = document.querySelector('#result')
let cache_info = document.querySelector('#cache_info')

// Set API_URL based on whether locally hosted emulator is running or not.
const localApiUrl = "http://localhost:5001/insta-profile-pic/us-central1/instapic";
const remoteApiUrl = "https://us-central1-insta-profile-pic.cloudfunctions.net/instapic";
const local = window.location.hostname === "localhost"; // true if local

const API_URL = local ? localApiUrl : remoteApiUrl;

btn.addEventListener('click', async e => {
  let user = username.value
  let result = await fetch(`${API_URL}?username=${user}`)
  let j = await result.json()
  console.log(j)
  username.value = null
  img.src = j.url
  cache_info.innerText = j.from_cache
})
