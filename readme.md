# Instavatar

A program that harvests profile pictures from Instagram. The avatar is then stored in a Firebase storage bucket for future use. This is to reduce the amount of requests to the Instagram API as too many will result in the account being blocked.


## Getting started

In order to get started, create a Firebase account.

### New project setup

After logging into Firebase with your Google account credentials, create a new project. Then set the project billing to the Blaze (paid) plan. This is a formality and a requirement to use storage, there shouldn't be any actual charges to the account.

Both Firestore and storage will need to be set up from within the [Firebase console](https://console.firebase.google.com).

### Set up Firebase locally

Run `npm install -g firebase-tools` to install the Firebase CLI. Then run `firebase login` from the root directory. No need to initialise the various Firebase services (hosting, Firestore database, functions and emulators) as the initialisation files are already included within the app.

### Development mode

Run `npm run dev` from the root directory. This starts all emulators as available from the `localhost:4000` Firebase UI to enable local testing. Includes Firestore, Functions and Hosting emulators.

### Configure variables

Run through the items labelled as `TODO` in the project. The Instagram [`username` and `password`](https://github.com/Isoaxe/instavatar/blob/master/functions/index.mjs#L7) are set as environment variables via the [firebase secrets manager](https://firebase.google.com/docs/functions/config-env#secret-manager). It is advised to `set` the `INSTAGRAM_HANDLE` and `INSTAGRAM_PASSWORD` secrets so that they are accessible by `username` and `password` respectively. Alternatively, hardcode the values to these variables. This is not advised if the code is shared, for example on GitHub.
