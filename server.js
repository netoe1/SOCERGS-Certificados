const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
// const crypto = require("crypto");
const { createCanvas, loadImage } = require("canvas");
const PDFDocument = require("pdfkit");
const fs = require("fs").promises;

// Ely Neto: CSV Reader
const { hashCRM, hashAllCSV } = require("./csvReader");
const {
  validateImageFile,
  validateCRM,
  sanitizeName,
  configSignals,
} = require("./utils");
// Ely Neto: Parametrização do servidor
const app = express();
const PORT = process.env.PORT || 3000;
const TIMEOUT_AMOUNT = 30000;
const KEEP_ALIVE_TIMEOUT = 5000;

// Configurar EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// 1. Configurações de segurança aprimoradas
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:", "https://cdnjs.cloudflare.com"],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// 2. CORS mais restritivo
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

// 3. Middleware de parsing ANTES do rate limiting
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 4. Rate limiting específico para certificados
const certificadoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 tentativas por IP
  message: {
    error: "Muitas tentativas de acesso. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const trustedIPs = process.env.TRUSTED_IPS
      ? process.env.TRUSTED_IPS.split(",")
      : [];
    return trustedIPs.includes(req.ip);
  },
});

// 5. Aplicar rate limit específico
app.use("/certificado", certificadoLimiter);

// 6. Rate limit global mais permissivo
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Muitas requisições. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// 7. Outros middlewares de segurança
app.use(xss());
app.use(hpp());
app.use(compression());

// 8. Middleware de log de segurança
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${
      req.ip
    } - User-Agent: ${req.get("User-Agent")?.substring(0, 100)}`
  );
  next();
});

// Função para gerar hash mais seguro com salt
// function hashCRM(crm) {
//   const salt = process.env.HASH_SALT || "default-salt-change-in-production";
//   return crypto
//     .createHash("sha256")
//     .update(crm + salt)
//     .digest("hex");
// }

// Função para validar se arquivo existe e é seguro
// async function validateImageFile(filePath) {
//   try {
//     const resolvedPath = path.resolve(filePath);
//     const baseDir = path.resolve(__dirname);

//     if (!resolvedPath.startsWith(baseDir)) {
//       throw new Error("Caminho inválido");
//     }

//     await fs.access(resolvedPath, fs.constants.R_OK);
//     return resolvedPath;
//   } catch (error) {
//     throw new Error("Arquivo de certificado não encontrado ou inacessível");
//   }
// }

// Lista de participantes com CRM hasheado
const participantes = {
  [hashCRM("123456")]: "Ana Beatriz Souza",
  [hashCRM("654321")]: "Carlos Henrique Lima",
  [hashCRM("111222")]: "João Pedro Martins",
};

// // Validação mais rigorosa do CRM
// function validateCRM(crm) {
//   if (!crm || typeof crm !== "string") {
//     return false;
//   }

//   const trimmedCRM = crm.trim();

//   // Ely Neto: Adicionei essa linha para verificar as duas possibilidades, com 5 caracteres ou 6 caracteres.

//   if (!/^\d{5,6}$/.test(trimmedCRM)) {
//     // console.info("[validadeCRM-INFO]:Não passou no teste REGEX.");
//     return false;
//   }
//   // console.info("[validateCRM()-INFO]: Passou no teste do REGEX.");

//   return true;
// }

// // Sanitizar nome para prevenir injeções
// function sanitizeName(name) {
//   if (!name || typeof name !== "string") {
//     return "";
//   }

//   return name
//     .replace(/[<>\"'&]/g, "")
//     .substring(0, 100)
//     .trim();
// }

//#region ROTAS_FRONTEND
// Rota principal - página de busca
app.get("/", (req, res) => {
  const { error } = req.query;
  res.render("index", {
    title: "Sistema de Certificados",
    error: error || null,
    message: null,
  });
});

// Rota para processar formulário
app.post("/buscar", async (req, res) => {
  try {
    const { crm } = req.body;

    if (!validateCRM(crm)) {
      console.log("[ERRO]: O crm não é válido!");
      return res.render("index", {
        title: "Sistema de Certificados",
        error: "CRM inválido. Digite um CRM válido com 6 dígitos.",
        message: null,
      });
    }

    const hashedCRM = hashCRM(crm.trim());
    const nome = participantes[hashedCRM];

    if (!nome) {
      console.info(
        "[search-route-info]: Não foi possível encontrar a sua pessoa."
      );
      return res.redirect("/?error=" + encodeURIComponent("CRM inválido."));
    }

    // Redirecionar para a página de visualização do certificado
    return res.render("certificado", {
      title: "Certificado Encontrado",
      nome: sanitizeName(nome),
      crm: crm.trim(),
      error: null,
      message: "Certificado encontrado com sucesso!",
    });
  } catch (error) {
    console.error(`Erro na busca: ${error.message}`);
    res.render("index", {
      title: "Sistema de Certificados",
      error: "Erro interno do servidor. Tente novamente mais tarde.",
      message: null,
    });
  }
});

// ROTA API - geração do PDF (mantida do código original)
app.get("/certificado/:crm", async (req, res) => {
  try {
    const crm = req.params.crm;

    if (!validateCRM(crm)) {
      console.warn(
        `Tentativa de acesso com CRM inválido: ${crm} - IP: ${req.ip}`
      );
      return res.status(400).json({ error: "CRM inválido." });
    }

    const hashedCRM = hashCRM(crm.trim());
    const nome = participantes[hashedCRM];

    if (!nome) {
      console.warn(
        `Tentativa de acesso com CRM não encontrado: ${crm} - IP: ${req.ip}`
      );
      return res.status(404).json({ error: "CRM não encontrado." });
    }

    const safeName = sanitizeName(nome);
    if (!safeName) {
      console.error(`Nome inválido para CRM: ${crm}`);
      return res.status(500).json({ error: "Erro interno." });
    }

    // Validar arquivo de imagem
    console.log("\t" + path.join(__dirname, "certificado-base.png"));
    // const imagePath = await validateImageFile(
    //   path.join(__dirname, "certificado-base.png")
    // );

    const imagePath = path.join(__dirname, "certificado-base.png");
    const image = await loadImage(imagePath);

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    // Desenhar imagem base
    ctx.drawImage(image, 0, 0);

    // Configurar texto
    ctx.font = "bold 64px Arial, sans-serif";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Adicionar texto do nome
    ctx.fillText(safeName, canvas.width / 2, canvas.height / 2 + 32);

    // Criar PDF
    const doc = new PDFDocument({
      size: [canvas.width, canvas.height],
      info: {
        Title: `Certificado - ${safeName}`,
        Author: "Sistema de Certificados",
        Subject: "Certificado de Participação",
        Creator: "Gerador de Certificados v2.0",
      },
    });

    // Headers de segurança para PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const safeFileName = `Certificado-${crm.replace(/[^0-9]/g, "")}.pdf`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName}"`
    );

    const stream = doc.pipe(res);
    const imgBuffer = canvas.toBuffer("image/png");

    doc.image(imgBuffer, 0, 0, {
      width: canvas.width,
      height: canvas.height,
    });

    doc.end();

    stream.on("finish", () => {
      console.log(
        `PDF gerado com sucesso para CRM: ${crm} - Nome: ${safeName} - IP: ${req.ip}`
      );
    });

    stream.on("error", (error) => {
      console.error(
        `Erro ao enviar PDF para CRM: ${crm} - Erro: ${error.message}`
      );
    });
  } catch (error) {
    console.error(
      `Erro ao gerar certificado para CRM: ${req.params.crm} - Erro: ${error.message} - IP: ${req.ip}`
    );
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});
//#endregion ROTAS_FRONTEND

//#region ROTAS_ERRO
// Middleware para capturar rotas não encontradas
app.use((req, res) => {
  console.warn(
    `Tentativa de acesso a rota inexistente: ${req.method} ${req.path} - IP: ${req.ip}`
  );
  res.status(404).render("404", {
    title: "Página Não Encontrada",
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error(
    `Erro não tratado: ${error.message} - IP: ${req.ip} - Path: ${req.path}`
  );
  res.status(500).json({ error: "Erro interno do servidor." });
});

//#endregion ROTAS_ERRO

//#region SERVER_LISTEN
const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Servidor rodando de forma segura em http://127.0.0.1:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
});

//#endregion SERVER_LISTEN

server.timeout = TIMEOUT_AMOUNT;
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;

configSignals(server);

module.exports = app;
