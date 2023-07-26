// Import the functions you need from the SDKs you need
const admin = require("firebase-admin");

const serviceAccount = require("./servicesAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fonatur-1d8ed.firebaseapp.com",
});

module.exports = admin;
