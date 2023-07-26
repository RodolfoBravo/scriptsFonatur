const { google } = require("googleapis");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Configura las credenciales de autenticación de Google Drive API

// Función para comprimir una carpeta en un archivo zip
function compressFolder(folderPath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`Carpeta comprimida en ${zipPath}`);
      resolve();
    });

    archive.on("error", (error) => {
      console.error("Error al comprimir la carpeta:", error);
      reject(error);
    });

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

// Función para subir un archivo a Google Drive
async function uploadToDrive(filePath, fileName) {
  const drive = google.drive({ version: "v3", auth: oAuth2Client });

  const fileMetadata = {
    name: fileName,
    mimeType: "application/zip",
  };

  const media = {
    mimeType: "application/zip",
    body: fs.createReadStream(filePath),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
    supportsAllDrives: true,
    driveId: "0ABWQ-szGFxY1Uk9PVA",
  });

  const fileId = res.data.id;
  console.log(`Archivo zip subido a Google Drive con ID: ${fileId}`);
  return fileId;
}

const credentials = require("./credentialsV2.json");
const token = require("./token.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);
oAuth2Client.setCredentials(token);

// Ruta de la carpeta a comprimir y subir
const folderPath =
  "/home/rodolfobravo/Documents/Backend/scripts/FilesDownloadDrive/"; //"/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2";
// Nombre de la carpeta
const folderName = path.basename(folderPath);

// Ruta del archivo zip
const zipPath = path.join(__dirname, `${folderName}.zip`);

// Comprime la carpeta en un archivo zip
compressFolder(folderPath, zipPath)
  .then(() => {
    console.log("Zip " + folderPath);
  })
  /*.then(() => {
    // Sube el archivo zip a Google Drive
    return uploadToDrive(zipPath, folderName);
  })
  .then((fileId) => {
    console.log(`Archivo zip subido a Google Drive con ID: ${fileId}`);
  })*/
  .catch((error) => {
    console.error("Error:", error);
  });
