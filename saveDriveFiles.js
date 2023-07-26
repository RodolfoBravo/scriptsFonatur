const fs = require("fs");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
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
    q: "'1QIDkgdegG0zz35zwWm7H2BMCzjT1JNvL' in parents and mimeType = 'application/pdf'",
    driveId: "0ABWQ-szGFxY1Uk9PVA",
    corpora: "drive",
    includeItemsFromAllDrives: true,
    includeTeamDriveItems: true,
    supportsAllDrives: true,
    supportsTeamDrives: true,
  });

  const files = res.data.files;
  if (files.length === 0) {
    console.log("No files found in the folder.");
    return;
  }

  console.log("Files found:");
  for (const file of files) {
    console.log(`${file.name} (${file.id})`);

    const destinationPath = path.join(destinationFolder, `${file.id}.pdf`);

    await downloadFile(file.id, destinationPath, authClient);
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
      fileId: "1hvcDSKYCQ8uaodBxvIjj3GJh5RxjZbfs",
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

authorize()
  .then((authClient) =>
    listAndDownloadFiles(
      "1QIDkgdegG0zz35zwWm7H2BMCzjT1JNvL", // Replace with the actual folder ID
      "./FilesDownloadDrive", // Replace with the desired destination folder path
      authClient
    )
  )
  .catch(console.error);
