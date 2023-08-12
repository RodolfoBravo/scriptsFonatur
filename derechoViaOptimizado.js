const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const admin = require("./firebaseConfig");
const filePath = "./newListPaths2.csv"; // Ruta del archivo CSV
const util = require("util");

async function listReadPaths() {
  console.log("Comenzando el script");
  try {
    const stream = fs.createReadStream(filePath).pipe(csvParser());

    let i = 0;
    let j = 0;

    for await (const data of stream) {
      i++;
      const { drivePath, separationPath } = data;
      const newDrivePath =
        "/home/rodolfobravogarcia/fonatur-backend/" + drivePath + ".pdf";

      if (await fileExists(newDrivePath)) {
        console.log("El archivo existe en el servidor");
        j++;

        if (newDrivePath !== undefined && separationPath !== undefined) {
          const drivePathseparation = drivePath.split("/");
          const nameFileIn =
            drivePathseparation[drivePathseparation.length - 1];
          const ultimaBarraDiagonal = separationPath.lastIndexOf("/");
          const pathOutNew = separationPath.substring(0, ultimaBarraDiagonal);
          const pathOutNew1 = pathOutNew.replace(/\s/g, "");
          const pathOutFinal = pathOutNew1.replace(/TRAMO/gi, "tramo");
          const tramoNew1 = pathOutFinal.split("/");
          const tramoNew = tramoNew1[0];
          const partseparation = separationPath.split("/");
          const nameFile = partseparation[partseparation.length - 1];

          var dataSingleDoc = [
            {
              doc_name_in: nameFileIn + ".pdf",
              doc_name_out: nameFile,
              path_file: drivePath,
              path_out: pathOutFinal,
            },
          ];

          if (await checkIfDocumentExists(dataSingleDoc[0].doc_name_in)) {
            const fileName = path.basename(dataSingleDoc[0].doc_name_out);
            const newFilePath = path.join(dataSingleDoc[0].path_out, fileName);
            const newFilePath2 = path.join(dataSingleDoc[0].path_out);
            const pathDesting =
              "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
              newFilePath2;

            try {
              /*if (!(await dirExists(pathDesting))) {
                await mkdirAsync(pathDesting, { recursive: true });
              }

              await copyFileAsync(
                newDrivePath,
                "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
                  newFilePath
              );
              console.log("Archivo copiado");*/
              console.log(dataSingleDoc);
              //await saveData(dataSingleDoc, tramoNew);
              console.log(i);
            } catch (e) {
              console.log("Error: " + e.message);
            }
          }
        }
      }
    }

    console.log(i, j);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

async function dirExists(dirPath) {
  try {
    await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (err) {
    return false;
  }
}

const mkdirAsync = util.promisify(fs.mkdir);
const copyFileAsync = util.promisify(fs.copyFile);

// Función para verificar si un documento existe en Firestore
async function checkIfDocumentExists(documentId) {
  const collectionRef = admin.firestore().collection("db-split-files");
  const querySnapshot = await collectionRef
    .where("fileNameIn", "==", documentId)
    .limit(1)
    .get();
  return querySnapshot.empty;
}

// Función para guardar datos en Firestore
const saveData = async (dataDoc, tramoNew) => {
  console.log(dataDoc);
  try {
    const collectionRef = await admin.firestore().collection("db-split-files");
    const querySnapshot = await collectionRef.get();
    const documentCount = querySnapshot.size;
    const serial = documentCount.toString().padStart(5, "0");
    const now = new Date();
    const idNew = `${serial}${now.getFullYear()}${
      now.getMonth() + 1
    }${now.getDate()}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;
    console.log(idNew);

    await admin
      .firestore()
      .collection("db-split-files")
      .add({
        id: idNew,
        fileNameIn: dataDoc[0].doc_name_in,
        fileNameOut: dataDoc[0].doc_name_out,
        filePathIn: dataDoc[0].path_file,
        filePathOut: dataDoc[0].path_out,
        paginas: "",
        timestamp: admin.firestore.Timestamp.fromDate(new Date()),
        tramo: tramoNew,
        commentary: "",
        estatus: "Nuevo",
        checklist: false,
      });

    const collectionRefUpdate = await admin
      .firestore()
      .collection("db-structure-files-split");
    const q = collectionRefUpdate
      .where("subCategoria", "==", "1.2.2Entrega_del_derecho_de_via_(Actas)")
      .where("tramo", "==", tramoNew);
    const querySnapshot2 = await q.get();
    querySnapshot2.forEach(async (doc) => {
      console.log(doc.data());
      const docRef = doc.ref;
      const countFiles = doc.data().files;
      const updatedData = {
        files: countFiles + 1,
      };

      await docRef.update(updatedData);
    });
    console.log(
      "----------------------- Documento Guardado ok -------------------"
    );
  } catch (error) {
    console.error("Error:", error);
  }
};

listReadPaths();
