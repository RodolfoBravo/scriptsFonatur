const fs = require("fs");
const path = require("path");

const directorio = "/home/rodolfobravogarcia/fonatur-backend/uploads/etapa2"; // Reemplaza con el path del directorio que deseas analizar

function renombrarArchivos(directorio) {
  fs.readdir(directorio, (err, archivos) => {
    if (err) {
      console.error("Error al leer el directorio:", err);
      return;
    }

    archivos.forEach((archivo) => {
      const rutaArchivo = path.join(directorio, archivo);
      fs.stat(rutaArchivo, (error, stats) => {
        if (error) {
          console.error("Error al obtener información del archivo:", error);
          return;
        }

        if (stats.isDirectory()) {
          // Si es un directorio, recorre sus archivos también
          renombrarArchivos(rutaArchivo);
        } else if (archivo.includes(".pdf.pdf")) {
          console.log(archivo);
          /*
            const nuevoNombre = archivo.replace('.pdf.pdf', '.pdf');
            const rutaNueva = path.join(directorio, nuevoNombre);
  
            fs.rename(rutaArchivo, rutaNueva, (renameError) => {
              if (renameError) {
                console.error(`Error al renombrar el archivo ${archivo}:`, renameError);
              } else {
                console.log(`Archivo ${archivo} renombrado como ${nuevoNombre}`);
              }
            });*/
        }
      });
    });
  });
}

// Inicia el proceso de renombrar archivos desde el directorio raíz
renombrarArchivos(directorio);
