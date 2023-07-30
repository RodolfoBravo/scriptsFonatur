const fs = require("fs");
const path = require("path");

const directorio = "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2"; // Reemplaza con el path del directorio que deseas analizar

fs.readdir(directorio, (err, archivos) => {
  if (err) {
    console.error("Error al leer el directorio:", err);
    return;
  }

  archivos.forEach((archivo) => {
    if (archivo.includes(".pdf.pdf")) {
      console.log(archivo);
      //const nuevoNombre = archivo.replace(".pdf.pdf", ".pdf");
      /* const rutaAnterior = path.join(directorio, archivo);
      const rutaNueva = path.join(directorio, nuevoNombre);

      fs.rename(rutaAnterior, rutaNueva, (error) => {
        if (error) {
          console.error(`Error al renombrar el archivo ${archivo}:`, error);
        } else {
          console.log(`Archivo ${archivo} renombrado como ${nuevoNombre}`);
        }
      });
      */
    }
  });
});
