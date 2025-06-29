# csvReader.js

Módulo Node.js para leitura e manipulação de arquivos CSV contendo dados de participantes com CRM e nome.

## Dependências

- `fs`: para leitura de arquivos do sistema.
- `crypto`: para geração de hash SHA-256.
- `csv-parser`: para parsear arquivos CSV (instale com `npm install csv-parser`).

## Funcionalidades

### readCSV(csvfilePath)

- Lê um arquivo CSV e retorna um array de objetos representando as linhas.
- Valida se o arquivo existe e se tem extensão `.csv`.
- Retorna uma Promise.

### hashCRM(crm)

- Recebe uma string CRM e retorna o hash SHA-256 correspondente.
- Usado para anonimizar o CRM.

### findOnCSV(table, crm)

- Busca um CRM específico em uma tabela (array de objetos).
- Retorna o nome associado ao CRM, ou `undefined` se não encontrar.

### hashAllCSV(csvfilePath)

- Lê o CSV, gera hashes para todos os CRMs e retorna um objeto `{ hashCRM: nome }`.
- Ignora entradas incompletas.

## Exemplo de uso

```js
const { readCSV, findOnCSV, hashAllCSV, hashCRM } = require("./csvReader");

(async () => {
  const mapa = await hashAllCSV("participantes.csv");
  console.log(mapa);
})();
```
