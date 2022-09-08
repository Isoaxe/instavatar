# Instavatar

A program that harvests profile pictures from Instagram. The avatar is then stored in a Firebase storage bucket for future use. This is to reduce the amount of requests to the Instagram API as too many will result in the account being blocked.

# `IMPORTANT NOTICE`

### Due to some remaining issues, it is currently only possible to use a locally-hosted version of `instavatar` paired with a local instance of the CORS server.


## Getting started

In order to get started, create a Firebase account.

### New project setup

After logging into Firebase with your Google account credentials, create a new project. Then set the project billing to the Blaze (paid) plan. This is a formality and a requirement to use storage, there shouldn't be any actual charges to the account.

Both Firestore and storage will need to be set up from within the [Firebase console](https://console.firebase.google.com).

### Set up Firebase locally

Run `npm install -g firebase-tools` to install the Firebase CLI. Then run `firebase login` from the root directory. No need to initialise the various Firebase services (hosting, Firestore database, functions and emulators) as the initialisation files are already included within the app.

### Set up CORS reverse-proxy server

CORS headers need to be added to the Instagram API request in order for it to succeed. This is done by [setting up a server](https://github.com/Isoaxe/cors-server). As noted in its `readme`, you will be able to _test_ a proxied app such as `instavatar` if it's run in development mode (using `localhost` ports `3000` or `5000`). That is, you can test `instavatar` locally using the remotely-hosted server provided there. To do so, simply leave the value of [`remoteProxyUrl`](https://github.com/Isoaxe/instavatar/blob/master/public/app.js#L12) unaltered. If you want to deploy `instavatar` so that it's also hosted remotely, you will need to set up your own instance of the CORS proxy server.

### Configure variables

Run through the items labelled as `TODO` in the project. It is advised to do a global search in your code editor to find them all. They are listed below in any case.
  1. Set the [`bucketId`](https://github.com/Isoaxe/instavatar/blob/master/functions/index.mjs#L15) in `index.mjs` to the Firebase storage URL for the project. This can be accessed from the Firebase console in the browser.
  2. When testing with a local proxy, the [`IS_LOCAL_PROXY`](https://github.com/Isoaxe/instavatar/blob/master/public/app.js#L5) flag can be left as `true`. However, when moving to a remotely hosted CORS proxy, change the flag to `false`.
  3. There are four [URLs](https://github.com/Isoaxe/instavatar/blob/master/public/app.js#L8) that need to be changed. The first two are associated with the local and remote Firebase functions for this project that retrieve the Instagram avatar. The second pair are the local and remote URLs for the CORS proxy server which is the companion project as described previously.
  4. Replace the value of the `default` field in [`.firebaserc`](https://github.com/Isoaxe/instavatar/blob/master/.firebaserc.js#L3) with your Firebase `project-id`.

### Development mode

Run `npm run dev` from the root directory. This starts all emulators as available from the `localhost:4000` Firebase UI to enable local testing. Includes Firestore, Functions and Hosting emulators.
As stated above, if just testing this app in development mode, the `IS_LOCAL_PROXY` flag can be set to `false` and the existing value of `remoteProxyUrl` can be used.
