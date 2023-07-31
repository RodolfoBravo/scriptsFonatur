const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const admin = require("./firebaseConfig");
const filePath = "./newListPaths.csv"; //path file

async function listReadPaths() {
  console.log("start script");
  var i = 0;
  const csvData = [];
  if (filePath) {
    try {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data) => {
          csvData.push(data);
        })
        .on("end", async () => {
          //console.log("CSV data read successfully.");
          var i = 0;
          var j = 0;
          for (const data of csvData) {
            // console.log(data);
            i++;
            const { drivePath, separationPath } = data;
            //console.log(drivePath);
            const newDrivePath =
              "/home/rodolfobravogarcia/fonatur-backend/" + drivePath + ".pdf";
            if (fs.existsSync(newDrivePath)) {
              // Verificar si el archivo existe en el filePath
              console.log("archivo existe en server");
              j++;

              if (newDrivePath != undefined && separationPath != undefined) {
                const drivePathseparation = drivePath.split("/");
                const nameFileIn =
                  drivePathseparation[drivePathseparation.length - 1];
                const ultimaBarraDiagonal = separationPath.lastIndexOf("/");
                const pathOutNew = separationPath.substring(
                  0,
                  ultimaBarraDiagonal
                );
                const pathOutNew1 = pathOutNew.replace(/\s/g, "");
                const pathOutFinal = pathOutNew1.replace(/TRAMO/gi, "tramo");
                const tramoNew1 = pathOutFinal.split("/");
                const tramoNew = tramoNew1[0];
                const partseparation = separationPath.split("/");
                const nameFile = partseparation[partseparation.length - 1];
                //openDialog(dataNotification, saveData, "", false);
                var dataSingleDoc = [
                  {
                    doc_name_in: nameFileIn + ".pdf",
                    doc_name_out: nameFile,
                    path_file: drivePath,
                    path_out: pathOutFinal,
                  },
                ];

                const resp = await checkIfDocumentExists(
                  dataSingleDoc[0].doc_name_in
                );

                if (resp) {
                  //console.log(resp, dataSingleDoc);

                  // Obtener el nombre del archivo del filePath
                  const fileName = path.basename(dataSingleDoc[0].doc_name_out);
                  // Combinar el destinationPath con el nombre del archivo para obtener la nueva ruta
                  const newFilePath = path.join(
                    dataSingleDoc[0].path_out,
                    fileName
                  );

                  const destinationDir = path.dirname(newFilePath);
                  const pathDesting =
                    "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
                    newFilePath;
                  try {
                    if (!fs.existsSync(pathDesting)) {
                      fs.mkdirSync(pathDesting, { recursive: true });
                    }
                    //Copiar el archivo utilizando el método `copyFileSync` de fs
                    fs.copyFileSync(newDrivePath, pathDesting);
                    console.log("Archivo copiado");
                    await saveData(dataSingleDoc, tramoNew);
                    console.log(i);
                  } catch (e) {
                    console.log("Error: " + e.message);
                    continue;
                  }
                }
              }
            }
          }
          console.log(i, j);
        })

        .on("error", (error) => {
          console.error("Error al leer el archivo CSV:", error.message);
        });
    } catch (e) {
      console.error("Error", e.message);
    }
  }
}

async function checkIfDocumentExists(documentId) {
  // console.log("parametro de entrada", documentId);
  const collectionRef = admin.firestore().collection("db-split-files");
  const querySnapshot = await collectionRef
    .where("fileNameIn", "==", documentId)
    .limit(1)
    .get();
  querySnapshot.forEach((doc) => {
    // console.log(doc.data());
  });
  return querySnapshot.empty;
}

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
        fileNameIn: dataDoc[0].doc_name_in, //item.doc_name_in,
        fileNameOut: dataDoc[0].doc_name_out, //item.doc_name_out,
        filePathIn: dataDoc[0].path_file, //pathFile,
        filePathOut: dataDoc[0].path_out, //tramo + "/" + area + "/" + folderNameOut,
        paginas: "", //item.doc_split[0].pages,
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
