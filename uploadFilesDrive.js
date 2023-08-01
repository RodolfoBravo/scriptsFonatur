const fs = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const admin = require("./firebaseConfig");
const cron = require("node-cron");

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
  try {
    console.log("creating folder");
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

    console.log("Se crea carpeta");
    return createResponse.data.id;
  } catch (error) {
    console.error(
      "Error al crear/actualizar la carpeta en Google Drive:",
      error.message
    );
    throw error;
  }
}
/*
async function uploadFileWithFolderStructure(
  authClient,
  filePath,
  parentFolderId,
  fileName
) {
  const drive = google.drive({ version: "v3", auth: authClient });

  const fileComponents = filePath.split("/");
  let currentFolderId = parentFolderId; // ID de la carpeta actual
  //console.log(currentFolderId);
  //console.log(fileComponents);
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
      // Verificar si el archivo ya existe en Google Drive
      const existingFiles = await drive.files.list({
        q: `name='${fileName}' and '${currentFolderId}' in parents and trashed=false`,
        fields: "files(id)",
        driveId: "0ABWQ-szGFxY1Uk9PVA",
        corpora: "drive",
        pageSize: 1000,
        includeItemsFromAllDrives: true,
        includeTeamDriveItems: true,
        supportsAllDrives: true,
        supportsTeamDrives: true,
      });

      if (existingFiles.data.files.length > 0) {
        // El archivo ya existe en Google Drive, no se duplica
        console.log(
          `El archivo '${fileName}' ya existe en Google Drive. No se duplicará.`
        );
      } else {
        // El archivo no existe en Google Drive, proceder a subirlo
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
    } else {
      console.log("Archivo no existe en la ubicación local.");
    }
  } catch (error) {
    console.error("Error al subir el archivo a Google Drive:", error.message);
  }
}*/

async function uploadFilesInFolder(authClient, folderPath, parentFolderId) {
  const drive = google.drive({ version: "v3", auth: authClient });

  try {
    const filesInFolder = await fs.promises.readdir(
      "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" + folderPath
    );
    console.log(filesInFolder);

    for (const fileName of filesInFolder) {
      const filePath = path.join(folderPath, fileName); // Corrected the filePath variable
      console.log(filePath);

      let currentFolderId = parentFolderId;

      for (const folderName of filePath.split("/")) {
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
            // The folder already exists on Google Drive
            currentFolderId = existingFolders.data.files[0].id;
            console.log("folder Id exists", currentFolderId);
          } else {
            // The folder doesn't exist, so we create it and update currentFolderId
            if (!folderName.includes(".pdf")) {
              currentFolderId = await createFolder(
                drive,
                currentFolderId,
                folderName
              );
            }
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
        if (
          fs
            .lstatSync(
              "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
                filePath
            )
            .isFile()
        ) {
          // Verify if the file already exists on Google Drive
          const existingFiles = await drive.files.list({
            q: `name='${fileName}' and '${currentFolderId}' in parents and trashed=false`,
            fields: "files(id)",
            driveId: "0ABWQ-szGFxY1Uk9PVA",
            corpora: "drive",
            pageSize: 1000,
            includeItemsFromAllDrives: true,
            includeTeamDriveItems: true,
            supportsAllDrives: true,
            supportsTeamDrives: true,
          });

          if (existingFiles.data.files.length > 0) {
            // The file already exists on Google Drive, no duplication
            console.log(
              `The file '${fileName}' already exists on Google Drive. It will not be duplicated.`
            );
          } else {
            // The file doesn't exist on Google Drive, proceed to upload it
            const media = {
              mimeType: "application/pdf",
              body: fs.createReadStream(
                "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
                  filePath
              ),
            };

            const response = await drive.files.create({
              resource: fileMetadata,
              media: media,
              fields: "id",
              supportsAllDrives: true,
              driveId: "0ABWQ-szGFxY1Uk9PVA",
            });

            console.log(
              `File uploaded to Google Drive. ID: ${response.data.id}`
            );
          }
        }
      } catch (error) {
        console.error(
          "Error uploading the file to Google Drive:",
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Error reading the local folder:", error.message);
  }
}

async function getDistinctDocumentsSplit() {
  const collectionRef = admin.firestore().collection("db-split-files");
  const q = collectionRef.where("tramo", "==", "tramo1");
  const querySnapshot = await q.get();

  const filePathOutMap = {};
  const distinctDocs = [];

  querySnapshot.forEach((doc) => {
    const filePathOut = doc.data().filePathOut;

    if (!filePathOutMap[filePathOut]) {
      filePathOutMap[filePathOut] = true;
      distinctDocs.push(doc);
    }
  });

  return distinctDocs;
}

const parentFolderId = "1AGaKlnpJfTD54-_PC3tff062g1oW4Qqc";

async function runScript() {
  try {
    const authClient = await authorize();
    const getData = await getDistinctDocumentsSplit();

    for (const doc of getData) {
      // Accede a los datos del documento y al campo filePathOut
      const data = doc.data();
      const filePathOut = data.filePathOut;
      const folderPath =
        "tramo1/contratos/1.2.2Entrega_del_derecho_de_via_(Actas)/T1-CAMP-CAN-SOC-PARC-229/PROPIEDADSOCIAL"; // doc.data().folderPathOut; // Use folderPathOut instead of filePathOut
      //console.log(data);
      //await uploadFilesInFolder(authClient, folderPath, parentFolderId); // Use uploadFilesInFolder instead of uploadFileWithFolderStructure
    }
  } catch (error) {
    console.error("Error al ejecutar el script:", error.message);
  }
}

// Programa la tarea para que se ejecute a las 12:00 am todos los días
runScript();

