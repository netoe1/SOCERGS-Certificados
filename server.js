const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const crypto = require("crypto");
const { createCanvas, loadImage } = require("canvas");
const PDFDocument = require("pdfkit");
const fs = require("fs").promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");

// 1. Configurações de segurança aprimoradas
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
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
    methods: ["GET"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);

// 3. Middleware de parsing ANTES do rate limiting
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 4. Rate limiting específico para certificados (CORRIGIDO)
const certificadoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 tentativas por IP
  message: {
    error: "Muitas tentativas de acesso. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limit para IPs confiáveis (opcional)
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
function hashCRM(crm) {
  const salt = process.env.HASH_SALT || "default-salt-change-in-production";
  return crypto
    .createHash("sha256")
    .update(crm + salt)
    .digest("hex");
}

// Função para validar se arquivo existe e é seguro
async function validateImageFile(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const baseDir = path.resolve(__dirname);

    // Prevenir path traversal
    if (!resolvedPath.startsWith(baseDir)) {
      throw new Error("Caminho inválido");
    }

    await fs.access(resolvedPath, fs.constants.R_OK);
    return resolvedPath;
  } catch (error) {
    throw new Error("Arquivo de certificado não encontrado ou inacessível");
  }
}

// Lista de participantes com CRM hasheado (melhor seria usar banco de dados)
const participantes = {
  [hashCRM("123456")]: "Ana Beatriz Souza",
  [hashCRM("654321")]: "Carlos Henrique Lima",
  [hashCRM("111222")]: "João Pedro Martins",
};

// Validação mais rigorosa do CRM
function validateCRM(crm) {
  if (!crm || typeof crm !== "string") {
    return false;
  }

  const trimmedCRM = crm.trim();

  // Verificar se é exatamente 6 dígitos
  if (!/^\d{6}$/.test(trimmedCRM)) {
    return false;
  }

  // Verificações adicionais (exemplo: não aceitar sequências óbvias)
  if (
    trimmedCRM === "000000" ||
    trimmedCRM === "123456" ||
    trimmedCRM === "111111" ||
    trimmedCRM === "999999"
  ) {
    return false;
  }

  return true;
}

// Sanitizar nome para prevenir injeções
function sanitizeName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .replace(/[<>\"'&]/g, "") // Remove caracteres perigosos
    .substring(0, 100) // Limita tamanho
    .trim();
}

// Rota protegida com melhorias de segurança
app.get("/certificado/:crm", async (req, res) => {
  try {
    const crm = req.params.crm;

    // Validação rigorosa do CRM
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

    // Sanitizar o nome
    const safeName = sanitizeName(nome);
    if (!safeName) {
      console.error(`Nome inválido para CRM: ${crm}`);
      return res.status(500).json({ error: "Erro interno." });
    }

    // Validar arquivo de imagem
    const imagePath = await validateImageFile(
      path.join(__dirname, "certificado-base.png")
    );
    const image = await loadImage(imagePath);

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    // Desenhar imagem base
    ctx.drawImage(image, 0, 0);

    // Configurar texto com fonte mais segura
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

    // Nome do arquivo sanitizado
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

// Middleware para capturar rotas não encontradas
app.use((req, res) => {
  console.warn(
    `Tentativa de acesso a rota inexistente: ${req.method} ${req.path} - IP: ${req.ip}`
  );
  res.status(404).json({ error: "Recurso não encontrado." });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error(
    `Erro não tratado: ${error.message} - IP: ${req.ip} - Path: ${req.path}`
  );
  res.status(500).json({ error: "Erro interno do servidor." });
});

// Configuração mais segura do servidor
const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Servidor rodando de forma segura em http://127.0.0.1:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
});

// Configurações de timeout
server.timeout = 30000; // 30 segundos
server.keepAliveTimeout = 5000; // 5 segundos

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Recebido SIGTERM. Encerrando servidor graciosamente...");
  server.close(() => {
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Recebido SIGINT. Encerrando servidor graciosamente...");
  server.close(() => {
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});

module.exports = app;
