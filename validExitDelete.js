const fs = require("fs");
const admin = require("./firebaseConfig");

const getDocumentsSplit = async () => {
  const collectionRef = admin.firestore().collection("db-split-files");
  const querySnapshot = await collectionRef.get();
  return querySnapshot;
};

const getDocuments = async () => {
  //
  const collectionRef = admin.firestore().collection("db-register-files");
  const q = collectionRef
    //.where("subCategoria", "==", categoria)
    .where("tramo", "==", "drive");
  const querySnapshot = await q.get();
  return querySnapshot;
};

const deleteDocuments = async (doc) => {
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
      "/home/rodolfobravogarcia/fonatur-backend/" + ubicacion + ".pdf ";
    //console.log(path);
    if (!fs.existsSync(path)) {
      state = false;
    }
  }
  return state;
};

const updateDocumentsSplit = async (doc) => {
  try {
    const archivo = doc.data().fileNameOut;
    if (!archivo.endsWith(".pdf")) {
      const nuevoNombre = archivo + ".pdf";
      await doc.ref.update({ fileNameOut: nuevoNombre });
      console.log(
        `Documento con ID  actualizado con nuevo nombre: ${nuevoNombre}`
      );
    } else {
      console.log(
        `Documento con ID  ya tiene la extensión ".pdf". No se necesita actualizar.`
      );
    }
  } catch (error) {
    console.error(`Error al actualizar el documento con ID ${doc}: ${error}`);
  }
};

const runScript = async () => {
  const getData = await getDocuments();
  var countIteration = 0;
  var countExist = 0;
  var countNoExist = 0;
  datalist = [];
  for (const doc of getData.docs) {
    const data = doc.data();
    const filePath = doc.data().fileInformation.path;
    const fileName = doc.data().fileInformation.originalname;
    //console.log(data);
    countIteration += 1;
    const valid = await isExistFiles(filePath);
    console.log(valid);
    if (!valid) {
      //console.log("archivo no existe en server, ese elimina registro");
      countNoExist += 1;
      // await updateDocumentsSplit(doc);
      //datalist.push(filePath + "/" + fileName);
      //console.log(data);
      // deleteDocumentsSplit(doc);
      //updateStructureFiles(fileTramo, fileCategoria);
    } else {
      //console.log(fileName); //
      countExist += 1;
    }
  }
  console.log(countIteration, countExist, countNoExist);
};

runScript();
