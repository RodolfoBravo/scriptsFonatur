const admin = require("./firebaseConfig");

async function findAndSaveDuplicateDocs() {
  try {
    const collectionRef = admin.firestore().collection("db-split-files");
    const querySnapshot = await collectionRef
      .where("tramo", "==", "tramo1")
      .get();

    const duplicateDocs = [];
    const seenFiles = new Set();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const filePathIn = data.filePathIn;
      const isDuplicateFile = seenFiles.has(filePathIn);

      if (isDuplicateFile) {
        duplicateDocs.push(doc);
      } else {
        seenFiles.add(filePathIn);
      }
    });

    // Imprime los documentos duplicados encontrados
    console.log("Documentos duplicados encontrados: " + duplicateDocs.length);

    await Promise.all(
      duplicateDocs.map(async (doc) => {
        try {
          await doc.ref.delete();
          console.log(`Documento eliminado: ${doc.id}`);
        } catch (error) {
          console.error(`Error al eliminar el documento ${doc.id}:`, error);
        }
      })
    );

    // Exporta los documentos duplicados a un archivo CSV
    return duplicateDocs;
  } catch (error) {
    console.error("Error al buscar documentos duplicados:", error);
    return [];
  }
}

findAndSaveDuplicateDocs();
