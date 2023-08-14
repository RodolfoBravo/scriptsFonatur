const admin = require("./firebaseConfig");

async function findAndSaveDuplicateDocs() {
  const collectionRef = admin.firestore().collection("db-split-files");
  const querySnapshot = await collectionRef
    .where("tramo", "==", "tramo6")
    .get();

  const seenFiles = new Set();

  try {
    const deletePromises = [];
    i = 0;
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const filePathIn = data.filePathIn;
      const filePathOut = data.filePathOut;
      var filePathOutSplit = filePathOut.split("/");
      if (
        filePathOutSplit[0] == "tramo6" &&
        filePathOutSplit[1] == "contratos" &&
        filePathOutSplit[2] == "1.2.2Entrega_del_derecho_de_via_(Actas)"
      ) {
        if (seenFiles.has(filePathIn)) {
          const deletePromise = await doc.ref
            .delete()
            .then(() => {
              console.log(`Documento eliminado: ${doc.id}`);
              i++;
              console.log(i);
            })
            .catch((error) => {
              console.error(`Error al eliminar doc ${doc.id}:`, error);
            });
          deletePromises.push(deletePromise);
        } else {
          seenFiles.add(filePathIn);
        }
      }
    }

    // Esperar a que todas las operaciones de eliminación se completen antes de continuar
    await Promise.all(deletePromises);

    console.log("Documentos duplicados encontrados y eliminados.");
  } catch (error) {
    console.error("Error al buscar y eliminar documentos duplicados:", error);
  }
}

findAndSaveDuplicateDocs(); // Debe obtener los documentos duplicados antes de llamar a esta función
