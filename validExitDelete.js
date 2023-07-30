const fs = require("fs");
const admin = require("./firebaseConfig");

const getDocumentsSplit = async () => {
  const collectionRef = admin.firestore().collection("db-split-files");
  const querySnapshot = await collectionRef.get();
  return querySnapshot;
};

const deleteDocumentsSplit = async (doc) => {
  try {
    await doc.ref.delete();
    console.log(`Documento con ID ${doc.id} eliminado.`);
  } catch (error) {
    console.error(`Error al eliminar el documento con ID ${doc.id}: ${error}`);
  }
};

const updateStructureFiles = async (categoria, tramo) => {
  try {
    const collectionRefUpdate = await admin
      .firestore()
      .collection("db-structure-files-split");
    const q = collectionRefUpdate
      .where("subCategoria", "==", categoria)
      .where("tramo", "==", tramo);
    const querySnapshot2 = await q.get();
    querySnapshot2.forEach(async (doc) => {
      console.log(doc.data());
      const docRef = doc.ref;
      const countFiles = doc.data().files;
      if (countFiles != 0) {
        const updatedData = {
          files: countFiles - 1,
        };
        await docRef.update(updatedData);
      }
    });
  } catch (err) {
    console.error(`Error al eliminar el documento con ID ${doc.id}: ${error}`);
  }
};

const isExistFiles = (ubicacion, file) => {
  var state = true;
  if (ubicacion) {
    var path =
      "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2/" +
      ubicacion +
      "/" +
      file;
    console.log(path);
    if (!fs.existsSync(path)) {
      state = false;
    }
  }
  return state;
};

const runScript = async () => {
  const getData = await getDocumentsSplit();
  var countExist = 0;
  var countNoExist = 0;
  datalist = [];
  for (const doc of getData.docs) {
    const data = doc.data();
    const filePath = doc.data().filePathOut;
    const fileName = doc.data().fileNameOut;
    const fileTramo = doc.data().tramo;
    const fileCategoria = filePath.split("/")[2];
    const valid = await isExistFiles(filePath, fileName);
    console.log(valid);
    if (!valid) {
      console.log("archivo no existe en server, ese elimina registro");
      countNoExist += 1;
      datalist.push(filePath + "/" + fileName);
      //console.log(data);
      //deleteDocumentsSplit(data);
      //updateStructureFiles(fileTramo, fileCategoria);
    } else {
      console.log(
        "=============== Archivo existe en server=============="
        //data
      );
      countExist += 1;
    }
  }
};

runScript();
