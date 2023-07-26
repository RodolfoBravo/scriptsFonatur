// Import the functions you need from the SDKs you need
const admin = require("firebase-admin");

const serviceAccount = require("./servicesAccountKey.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://fonatur-1d8ed.firebaseio.com",
  });
} catch (error) {
  console.error("Error al inicializar Firebase Admin:", error.message);
}

module.exports = admin;
