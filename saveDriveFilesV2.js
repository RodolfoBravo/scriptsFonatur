const fs = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const admin = require("./firebaseConfig");
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");

const botToken = "6333959125:AAGXO-T_TCLlA0Czhatdg7bEPavLfFA9RQE"; // Reemplaza con tu token de acceso
const bot = new TelegramBot(botToken, { polling: true });
// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentialsV2.json");
const chatId = "@DRIVEASYNCNOTIFICATION"; // Reemplaza con el nombre de tu canal, incluyendo el @

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}
/**
 * Lists the files in a folder and downloads them.
 *
 * @param {string} folderId ID of the folder to list files from.
 * @param {string} destinationFolder Path to the destination folder to save the downloaded files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @returns {Promise<void>}
 */
async function listAndDownloadFiles(folderId, destinationFolder, authClient) {
  const drive = google.drive({ version: "v3", auth: authClient });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/pdf'`,
    driveId: "0ABWQ-szGFxY1Uk9PVA",
    corpora: "drive",
    pageSize: 1000,
    includeItemsFromAllDrives: true,
    includeTeamDriveItems: true,
    supportsAllDrives: true,
    supportsTeamDrives: true,
  });

  const files = res.data.files;
  if (files.length === 0) {
    console.log("No files found in the folder.");
    //return;
  }

  console.log("Files found:");
  for (const file of files) {
    console.log(`${file.name} (${file.id})`);
    const documentExists = await checkIfDocumentExists(file.id);

    if (documentExists) {
      console.log(
        `El documento ${file.id} ya existe en la base de datos. Saltando descarga y guardado.`
      );
      continue; // Saltar a la siguiente iteración del bucle
    }
    const destinationPath = path.join(destinationFolder, `${file.id}.pdf`);
    await downloadFile(file.id, destinationPath, authClient);
    await saveDB(file.id, file.name, 0);
  }

  const subfolders = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
    driveId: "0ABWQ-szGFxY1Uk9PVA",
    corpora: "drive",
    pageSize: 1000,
    includeItemsFromAllDrives: true,
    includeTeamDriveItems: true,
    supportsAllDrives: true,
    supportsTeamDrives: true,
  });

  const subfoldersData = subfolders.data.files;
  for (const subfolder of subfoldersData) {
    console.log(`Iterating through subfolder: ${subfolder.name}`);
    await listAndDownloadFiles(subfolder.id, destinationFolder, authClient);
  }
  console.log("All files downloaded successfully.");
}

/**
 * Download a file from Google Drive.
 *
 * @param {string} fileId ID of the file to download.
 * @param {string} destinationPath Path to save the downloaded file.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @returns {Promise<void>}
 */
async function downloadFile(fileId, destinationPath, authClient) {
  const drive = google.drive({ version: "v3", auth: authClient });
  const res = await drive.files.get(
    {
      fileId: fileId,
      alt: "media",
      acknowledgeAbuse: true,
      supportsAllDrives: true,
      supportsTeamDrives: true,
    },
    { responseType: "stream" }
  );

  const writer = fs.createWriteStream(destinationPath);
  return new Promise((resolve, reject) => {
    res.data
      .on("end", () => {
        console.log(`Downloaded file saved at: ${destinationPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("Error downloading file:", err);
        reject(err);
      })
      .pipe(writer);
  });
}

async function checkIfDocumentExists(documentId) {
  const collectionRef = admin.firestore().collection("db-register-files");
  const querySnapshot = await collectionRef
    .where("id", "==", documentId)
    .limit(1)
    .get();
  return !querySnapshot.empty;
}

const saveDB = async (idGen, fileName, size) => {
  var objInfo = {
    destination: "uploads/Drive/Documents/FilesDownloadDrive",
    encoding: "7bit",
    fieldname: "pdf",
    filename: idGen,
    mimetype: "application/pdf",
    originalname: fileName,
    path: "uploads/Drive/Documents/FilesDownloadDrive/" + idGen,
    size: size,
  };
  var addObj = {
    id: idGen,
    fileInformation: objInfo,
    timestamp: new Date(),
    tramo: "drive",
    commentary: "",
    checklist: false,
    estatus: "Nuevo",
    visible: true,
  };
  const collectionRef = admin.firestore().collection("db-register-files");
  collectionRef
    .add(addObj)
    .then((docRef) => {
      console.log("Datos guardados correctamente:", docRef.id);
    })
    .catch((error) => {
      console.error("Error al guardar los datos:", error);
    });
};

const sendNotification = (folderID, flag) => {
  const tramoEncontrado = tramos.find((tramo) => {
    return Object.keys(tramo)[0] === folderID;
  });
  console.log(tramoEncontrado[folderID]);
  bot
    .sendMessage(
      chatId,
      flag == 0
        ? "Inicia la sincronizacion del tramo: " + tramoEncontrado[folderID]
        : "Finalizar sincronizo el tramo: " + tramoEncontrado[folderID]
    )
    .then(() => {})
    .catch((error) => {
      console.error("Error al enviar el mensaje:", error);
    });
};

const foldersIds = [
  "1HPVS-T1JQfTGtGxfbTHUcCj2InOV2jFM",
  "1fi8KzcmfcE2rLLLlSzSZ2ScOluhZjDlg",
  "1OLRC5f80ezvE5VBXMOvAVcoBlfX2tDue",
  "1kqgORc0B8TQ-WSLCilMrVz6gIfDH4FgY",
  "11wbdMSdlIslhe9aUxufO26MTJFscKZBR",
  "1Mq3cJWt3aT3ib9TPC0SKSKUhyB7WEORp",
  "1DNrG6p9MnLbQMVYDamWuhjUhgENsXnF5",
];

const tramos = [
  { "1HPVS-T1JQfTGtGxfbTHUcCj2InOV2jFM": "tramo1" },
  // { "1fi8KzcmfcE2rLLLlSzSZ2ScOluhZjDlg": "tramo2" },
  // { "1OLRC5f80ezvE5VBXMOvAVcoBlfX2tDue": "tramo3" },
  // { "1kqgORc0B8TQ-WSLCilMrVz6gIfDH4FgY": "tramo4" },
  // { "11wbdMSdlIslhe9aUxufO26MTJFscKZBR": "tramo5" },
  // { "1Mq3cJWt3aT3ib9TPC0SKSKUhyB7WEORp": "tramo6" },
  // { "1DNrG6p9MnLbQMVYDamWuhjUhgENsXnF5": "tramo7" },
];

const runScript = () => {
  foldersIds.forEach((folderID) => {
    // sendNotification(folderID, 0);
    authorize()
      .then((authClient) =>
        listAndDownloadFiles(
          folderID, // Replace with the actual folder ID
          "../fonatur-backend/uploads/Drive/Documents/FilesDownloadDrive", // Replace with the desired destination folder path
          authClient
        )
      )
      //.then(() => sendNotification(folderID, 1))
      .catch(console.error);
  });
};

// Programa la tarea para que se ejecute a las 12:00 am todos los días
//ron.schedule("34 23 * * *", runScript);
runScript();
