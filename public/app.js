let username = document.querySelector('#username')
let btn = document.querySelector('#get_avatar')
let img = document.querySelector('#result')
let cache_info = document.querySelector('#cache_info')

btn.addEventListener('click', async e => {
  let user = username.value
  let result = await fetch(`/api/avatar?username=${user}`)
  let j = await result.json()
  console.log(j)
  username.value = null
  img.src = j.url
  cache_info.innerText = j.from_cache
})