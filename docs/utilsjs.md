# Utils.js

Utilitários auxiliares para validação de dados e configuração de sinais do processo em Node.js.

## Funções

### `validateCRM(crm)`

Valida um número de CRM (Conselho Regional de Medicina).

**Parâmetros:**

- `crm` (string): Número de CRM a ser validado.

**Retorna:**

- `true` se o CRM for válido (5 ou 6 dígitos numéricos).
- `false` caso contrário.

---

### `sanitizeName(name)`

Sanitiza uma string de nome para evitar injeções e limita seu tamanho.

**Parâmetros:**

- `name` (string): Nome a ser sanitizado.

**Retorna:**

- String sanitizada (sem caracteres especiais como `<`, `>`, `"`, `'`, `&`) e limitada a 100 caracteres.

---

### `validateImageFile(filePath)`

Valida e resolve o caminho de um arquivo de imagem, garantindo que ele está dentro do diretório base e que é acessível.

**Parâmetros:**

- `filePath` (string): Caminho para o arquivo a ser validado.

**Retorna:**

- `Promise<string>` com o caminho resolvido, se válido.

**Lança:**

- Erro se o caminho for inválido ou o arquivo inacessível.

---

### `configSignals()`

Configura o processo para lidar com sinais de término (SIGTERM e SIGINT), permitindo encerramento gracioso do servidor.

**Parâmetros:**

- Nenhum.

**Efeitos:**

- Fecha o servidor e encerra o processo quando os sinais forem recebidos.

---

## Exportações

O módulo exporta as seguintes funções:

```js
{
  validateImageFile,
  validateCRM,
  sanitizeName,
  configSignals,
}
```
