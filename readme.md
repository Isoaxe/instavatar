# Instavatar

A program that harvests profile pictures from Instagram. The avatar is then stored in a Firebase storage bucket for future use. This is to reduce the amount of requests to the Instagram API as too many will result in the account being blocked.


## Getting started

In order to get started, create a Firebase account.

### New project setup

After logging into Firebase with your Google account credentials, create a new project. Then set the project billing to the Blaze (paid) plan. This is a formality and a requirement to use storage, there shouldn't be any actual charges to the account.

Both Firestore and storage will need to be set up from within the [Firebase console](https://console.firebase.google.com).
