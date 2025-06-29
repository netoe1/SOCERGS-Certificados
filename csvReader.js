const fs = require("fs");
const crypto = require("crypto");
let csvParser;

// Tenta importar csv-parser e avisa caso não esteja instalado
try {
  csvParser = require("csv-parser");
} catch {
  throw new Error(
    "[csvReader.js-err]: Módulo 'csv-parser' não instalado. Rode: npm install csv-parser"
  );
}

// ===== Região: Leitura do CSV =====
const readCSV = (csvfilePath) => {
  // Validação da extensão
  if (!csvfilePath.endsWith(".csv")) {
    throw new Error("[csvReader.js-err]: O arquivo não é válido.");
  }

  // Validação de existência
  if (!fs.existsSync(csvfilePath)) {
    throw new Error("[csvReader.js-err]: O arquivo não existe.");
  }

  // Retorna uma Promise com os dados lidos
  return new Promise((resolve, reject) => {
    const resultados = [];

    fs.createReadStream(csvfilePath)
      .pipe(csvParser())
      .on("data", (dados) => resultados.push(dados)) // Cada linha vira um objeto
      .on("end", () => resolve(resultados)) // Fim da leitura
      .on("error", (err) =>
        reject(new Error("Erro ao ler o CSV: " + err.message))
      );
  });
};

// ===== Região: Hash =====
// Recebe um CRM e retorna seu hash SHA-256
function hashCRM(crm) {
  const salt = process.env.HASH_SALT || "default-salt-change-in-production";
  return crypto
    .createHash("sha256")
    .update(crm + salt)
    .digest("hex");
}

// ===== Região: Buscar por CRM =====
// Busca por um CRM específico em uma lista de objetos
function findOnCSV(table, crm) {
  const encontrado = table.find((item) => item.crm === crm);
  return encontrado ? encontrado.nome : undefined;
}

// ===== Região: Gerar mapa com hash do CSV =====
// Lê o CSV, gera hash dos CRMs e monta um objeto { hashCRM: nome }
async function hashAllCSV(csvfilePath) {
  const dados = await readCSV(csvfilePath);
  const mapa = {};

  for (const { crm, nome } of dados) {
    if (!crm || !nome) continue; // Ignora registros incompletos
    mapa[hashCRM(crm.trim())] = nome.trim(); // Adiciona ao mapa
  }

  return mapa;
}

// ===== Teste local (remova ou comente em produção) =====
/*
(async () => {
  try {
    const hashMap = await hashAllCSV("teste.csv");
    console.log(hashMap);
  } catch (err) {
    console.error(err.message);
  }
})();
*/

module.exports = { readCSV, findOnCSV, hashAllCSV, hashCRM };
