const fs = require("fs");
const crypto = require("crypto");
const { resolveObjectURL } = require("buffer");
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
const readCSV = (csvfilePath, tlwr_header = false) => {
  // Valida se o caminho do arquivo termina com ".csv"
  if (!csvfilePath.endsWith(".csv")) {
    throw new Error("[readCSV()-err]: O arquivo não é .csv");
  }

  // Verifica se o arquivo existe no sistema de arquivos
  if (!fs.existsSync(csvfilePath)) {
    throw new Error("[readCSV()-err]: O arquivo não existe.");
  }

  // Retorna uma Promise que será resolvida com os dados lidos do CSV
  return new Promise((resolve, reject) => {
    const resultados = []; // Array que vai armazenar as linhas do CSV como objetos

    // Cria um stream de leitura do arquivo CSV e conecta ao parser
    fs.createReadStream(csvfilePath)
      .pipe(
        csvParser({
          // Opção para mapear os headers (nomes das colunas)
          mapHeaders: ({ header }) => {
            // Converte os nomes das colunas para minúsculas, se parâmetro for true
            return tlwr_header ? header.toLowerCase() : header;
          },
        })
      )
      // Cada evento 'data' recebe uma linha do CSV como objeto, que é adicionado ao array
      .on("data", (dados) => resultados.push(dados))
      // Evento chamado quando a leitura do CSV termina
      .on("end", () => {
        // Verifica se o array está vazio (sem dados lidos)
        if (resultados.length === 0) {
          // Rejeita a Promise com erro informando CSV vazio ou inválido
          return reject(
            new Error(
              "[readCSV()-err]: O CSV está vazio ou objeto está vazio. Cheque as colunas."
            )
          );
        }
        // Se tudo certo, resolve a Promise com o array de objetos
        resolve(resultados);
      })
      // Evento de erro na leitura do arquivo CSV
      .on("error", (err) =>
        reject(
          new Error(
            "[readCSV()-err]: Erro inesperado ao ler o CSV: " + err.message
          )
        )
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
async function hashAllCSV(csvfilePath, tlwr_header) {
  if (typeof tlwr_header != "boolean") {
    throw new Error(
      "[readCSV()-err]: Você não definiu da forma válida o parâmetro da função."
    );
  }
  let dados;
  try {
    dados = await readCSV(csvfilePath, tlwr_header);
  } catch (err) {
    console.log("[hashAllCSV-err]:" + err);
    return undefined;
  }

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
