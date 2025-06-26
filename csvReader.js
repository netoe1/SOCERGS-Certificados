const fs = require("fs");
const csvParser = require("csv-parser");
const path = require("path");

if (!fs || !csvParser || !path) {
  throw new Error("[csvReader.js-err]: Módulo fs e csv-parser não instalados!");
}

const readCSV = (csvfile) => {
  console.log(csvfile);
  if (!csvfile.toString().includes(".csv")) {
    // Verifica se o arquivo é da extensão é .csv
    throw new Error("[csvReader.js-err]:O arquivo não é válido para isso.");
  }
  // csvfile = path.join(__dirname, csvfile); // Faz o tratamento do path.join()

  if (!fs.existsSync(csvfile)) {
    throw new Error("[csvReader.js-err]: O arquivo não existe.");
  }
  return new Promise((resolve, reject) => {
    const resultados = [];

    fs.createReadStream(csvfile)
      .pipe(csvParser())
      .on("data", (dados) => resultados.push(dados))
      .on("end", () => {
        console.log(
          "[csv-reader.js-info]: Terminou o processamento do arquivo."
        );
        resolve(resultados); // retorna os dados lidos
      })
      .on("error", (err) => {
        reject(new Error("Erro ao dar o parse no CSV: " + err.message));
      });
  });
};

const dado = readCSV("teste.csv");
console.log(JSON.stringify(dado));
