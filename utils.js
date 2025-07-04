// Validação mais rigorosa do CRM
function validateCRM(crm) {
  if (!crm || typeof crm !== "string") {
    return false;
  }

  const trimmedCRM = crm.trim();

  // Ely Neto: Adicionei essa linha para verificar as duas possibilidades, com 5 caracteres ou 6 caracteres.

  if (!/^\d{5,6}$/.test(trimmedCRM)) {
    // console.info("[validadeCRM-INFO]:Não passou no teste REGEX.");
    return false;
  }

  // console.info("[validateCRM()-INFO]: Passou no teste do REGEX.");

  return true;
}

// Sanitizar nome para prevenir injeções
function sanitizeName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .replace(/[<>\"'&]/g, "")
    .substring(0, 100)
    .trim();
}

function configSignals(server) {
  process.on("SIGTERM", () => {
    console.log("[SIGTERM]:Encerrando servidor.");
    server.close(() => {
      console.log("Servidor encerrado.");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("[SIGTERM]:Encerrando servidor graciosamente.");
    server.close(() => {
      console.log("Servidor encerrado.");
      process.exit(0);
    });
  });
}
module.exports = {
  // validateImageFile,
  validateCRM,
  sanitizeName,
  configSignals,
};
