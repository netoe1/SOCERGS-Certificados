// Task do ClickUp: https://app.clickup.com/t/86a9t2wzw

const fs = require("fs");
let csvParser;

try {
  csvParser = require("csv-parser");
} catch {
  throw new Error(
    "[csvReader.js-err]: Módulo 'csv-parser' não instalado. Rode: npm install csv-parser"
  );
}

//
// ===== Região: Função readCSV =====
// Função responsável por ler um arquivo CSV e retornar os dados em formato de array de objetos.
// - Recebe o caminho do arquivo (relativo ou absoluto).
// - Verifica se o caminho termina com ".csv".
// - Verifica se o arquivo existe no sistema.
// - Usa streams e o pacote csv-parser para ler e parsear os dados.
// - Retorna uma Promise que resolve com os dados lidos.
//

const readCSV = (csvfilePath) => {
  if (!csvfilePath.endsWith(".csv")) {
    throw new Error("[csvReader.js-err]: O arquivo não é válido.");
  }

  if (!fs.existsSync(csvfilePath)) {
    throw new Error("[csvReader.js-err]: O arquivo não existe.");
  }

  return new Promise((resolve, reject) => {
    const resultados = [];

    fs.createReadStream(csvfilePath)
      .pipe(csvParser())
      .on("data", (dados) => resultados.push(dados))
      .on("end", () => resolve(resultados))
      .on("error", (err) =>
        reject(new Error("Erro ao ler o CSV: " + err.message))
      );
  });
};

(async () => {
  try {
    const dados = await readCSV("teste.csv");
    console.log(JSON.stringify(dados, null, 2));
  } catch (err) {
    console.error(err.message);
  }
})();
