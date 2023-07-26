const { google } = require("googleapis");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

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
async function uploadToDrive(filePath, fileName, authClient) {
  const drive = google.drive({ version: "v3", auth: authClient });
  console.log("start upload drive");
  const fileMetadata = {
    name: fileName,
    mimeType: "application/zip",
    parents: ["1AGaKlnpJfTD54-_PC3tff062g1oW4Qqc"],
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

// Configura las credenciales de autenticación de Google Drive API
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const SERVICE_ACCOUNT_PATH = path.join(
  process.cwd(),
  "servicesAccountKey.json"
);
const SCOPES = ["https://www.googleapis.com/auth/drive"];

async function authorize() {
  const serviceAccountContent = await fs.promises.readFile(
    SERVICE_ACCOUNT_PATH
  );
  const serviceAccountCredentials = JSON.parse(serviceAccountContent);
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountCredentials,
    scopes: SCOPES,
  });
  return auth.getClient();
}

// Ruta de la carpeta a comprimir y subir
const folderPath =
  "/home/rodolfobravo/Documents/Backend/scripts/FilesDownloadDrive/"; //"/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2";

// Nombre de la carpeta
const folderName = path.basename(folderPath);

// Ruta del archivo zip
const zipPath = path.join(folderPath, "newFile.zip");

console.log(zipPath);
console.log(folderName);

// Comprime la carpeta en un archivo zip
compressFolder(folderPath, zipPath) // Llamada a la función compressFolder con los argumentos correctos
  .then(() => {
    // Sube el archivo zip a Google Drive
    return authorize().then((authClient) => {
      return uploadToDrive(zipPath, folderName, authClient); // Llamada a la función uploadToDrive con los argumentos correctos
    });
  })
  .then((fileId) => {
    console.log(`Archivo zip subido a Google Drive con ID: ${fileId}`);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
