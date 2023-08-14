const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const admin = require("./firebaseConfig");
const filePath = "./newListPaths2.csv"; // Ruta del archivo CSV
const util = require("util");

async function listReadPaths() {
  // Llamar a esta función al inicio del script para cargar los datos de Firestore
  await loadDataFromFirestore();
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
        //console.log("El archivo existe en el servidor");

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
          const existDB = dbData.some(
            (data) => data.fileNameIn === dataSingleDoc[0].doc_name_in
          );
          //console.log(existDB);
          if (!existDB) {
            j++;
            const fileName = path.basename(dataSingleDoc[0].doc_name_out);
            const newFilePath = path.join(dataSingleDoc[0].path_out, fileName);
            const newFilePath2 = path.join(dataSingleDoc[0].path_out);
            const pathDesting =
              "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
              newFilePath2;
            const pathDestingFile =
              "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
              newFilePath;

            try {
              if (!(await dirExists(pathDesting))) {
                await mkdirAsync(pathDesting, { recursive: true });
              }
              const flag = await fileExists(pathDestingFile);
              if (!flag) {
                await copyFileAsync(newDrivePath, pathDestingFile);
                console.log("Archivo copiado");
              }
              //console.log(dataSingleDoc);
              await saveData(dataSingleDoc, tramoNew);
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

// Declarar una variable global para almacenar los datos de la consulta
let dbData = [];

// Llamar a esta función al inicio del script para cargar los datos de Firestore
async function loadDataFromFirestore() {
  try {
    const collectionRef = admin.firestore().collection("db-split-files");
    const querySnapshot = await collectionRef.get();
    dbData = querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error al cargar los datos de Firestore:", error);
  }
}

// Función para guardar datos en Firestore
const saveData = async (dataDoc, tramoNew) => {
  console.log(dataDoc);
  try {
    const now = new Date();
    const idNew = `${now.getFullYear()}${
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
    console.log(
      "----------------------- Documento Guardado ok -------------------"
    );
  } catch (error) {
    console.error("Error:", error);
  }
};

listReadPaths();
