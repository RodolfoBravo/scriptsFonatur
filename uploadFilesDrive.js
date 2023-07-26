const fs = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const admin = require("./firebaseConfig");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentialsV2.json");

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
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
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

async function createFolder(drive, parentFolderId, folderName) {
  setTimeout(async () => {
    console.log("creating folder");
    try {
      const response = await drive.files.list({
        q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id)",
        driveId: "0ABWQ-szGFxY1Uk9PVA",
        corpora: "drive",
        pageSize: 1000,
        includeItemsFromAllDrives: true,
        includeTeamDriveItems: true,
        supportsAllDrives: true,
        supportsTeamDrives: true,
      });

      if (response.data.files.length > 0) {
        // La carpeta ya existe en Google Drive, retornamos su ID
        console.log("La carpeta ya existe en Google Drive ", response.data);
        return response.data.files[0].id;
      } else {
        console.log("Se crea carpeta");
        const folderMetadata = {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        };

        const createResponse = await drive.files.create({
          resource: folderMetadata,
          fields: "id",
          supportsAllDrives: true,
          driveId: "0ABWQ-szGFxY1Uk9PVA",
        });

        return createResponse.data.id;
      }
    } catch (error) {
      console.error(
        "Error al crear/actualizar la carpeta en Google Drive:",
        error.message
      );
      throw error;
    }
  }, 1000);
}

async function uploadFileWithFolderStructure(
  authClient,
  filePath,
  parentFolderId,
  fileName
) {
  const drive = google.drive({ version: "v3", auth: authClient });

  const fileComponents = filePath.split("/");
  let currentFolderId = parentFolderId; // ID de la carpeta actual
  console.log(fileComponents);
  for (const folderName of fileComponents) {
    console.log(folderName);
    try {
      const existingFolders = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${currentFolderId}' in parents`,
        fields: "files(id)",
        driveId: "0ABWQ-szGFxY1Uk9PVA",
        corpora: "drive",
        pageSize: 1000,
        includeItemsFromAllDrives: true,
        includeTeamDriveItems: true,
        supportsAllDrives: true,
        supportsTeamDrives: true,
      });

      if (existingFolders.data.files.length > 0) {
        // La carpeta ya existe en Google Drive
        currentFolderId = existingFolders.data.files[0].id;
        console.log("folder Id existe");
        console.log(currentFolderId);
      } else {
        // La carpeta no existe, la creamos y actualizamos currentFolderId
        currentFolderId = await createFolder(
          drive,
          currentFolderId,
          folderName
        );
      }
    } catch (error) {
      console.error(
        "Error al crear/actualizar la estructura de carpetas en Google Drive:",
        error.message
      );
      return;
    }
  }

  const fileMetadata = {
    name: fileName,
    parents: [currentFolderId],
  };

  try {
    const pathFileLocal = path.join(
      "../fonatur-backend/uploads/etapa2/" + filePath,
      fileName
    );
    if (fs.existsSync(pathFileLocal)) {
      const media = {
        mimeType: "application/pdf",
        body: fs.createReadStream(pathFileLocal),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id",
        supportsAllDrives: true,
        driveId: "0ABWQ-szGFxY1Uk9PVA",
      });

      console.log(`Archivo subido a Google Drive. ID: ${response.data.id}`);
    }
  } catch (error) {
    console.error("Error al subir el archivo a Google Drive:", error.message);
  }
}

async function getDocumentsSplit() {
  const collectionRef = admin.firestore().collection("db-split-files");
  const querySnapshot = await collectionRef.limit(2).get();
  return querySnapshot;
}

const parentFolderId = "1AGaKlnpJfTD54-_PC3tff062g1oW4Qqc";

async function runScript() {
  try {
    const authClient = await authorize();
    const getData = await getDocumentsSplit();
    const promises = getData.docs.map(async (doc) => {
      const data = doc.data();
      const filePath = doc.data().filePathOut;
      const fileName = doc.data().fileNameIn;
      console.log(data);
      await uploadFileWithFolderStructure(
        authClient,
        filePath,
        parentFolderId,
        fileName
      );
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error al ejecutar el script:", error.message);
  }
}

runScript();
// Programa la tarea para que se ejecute a las 12:00 am todos los días
//cron.schedule("0 0 * * *", runScript);
