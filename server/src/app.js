import "dotenv/config";
import express from "express";
import { mysqlDb } from "./db/index.js";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import axios from "axios";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { createAuthRouter } from "./routes/auth-routes.js";
import { createPublicRouter } from "./routes/public-routes.js";
import { createProductRouter } from "./routes/product-routes.js";
import { createUserRouter } from "./routes/user-routes.js";
import { createTradeRouter } from "./routes/trade-routes.js";
import { createAdminRouter } from "./routes/admin-routes.js";
import { createRecommendRouter } from "./routes/recommend-routes.js";
import { createOssRouter } from "./routes/oss-routes.js";
import { createAiRouter } from "./routes/ai-routes.js";
import { setupAppMiddlewares } from "./setup/app-middlewares.js";
import { buildSmsService } from "./services/sms-service.js";
import { buildSmtpService } from "./services/smtp-service.js";
import { buildPermissionService } from "./services/permission-service.js";
import { buildAuthMiddleware } from "./middlewares/auth-middleware.js";
import bcrypt from "bcryptjs";

const db = mysqlDb;

const app = express();
const PORT = process.env.PORT || 4000;
const TOKEN_SECRET = process.env.TOKEN_SECRET;
const PASSWORD_SALT = process.env.PASSWORD_SALT;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
if (!TOKEN_SECRET) {
  throw new Error("Missing required env var: TOKEN_SECRET");
}
if (!Number.isFinite(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 8 || BCRYPT_ROUNDS > 15) {
  throw new Error("Invalid env var: BCRYPT_ROUNDS (recommended 10-12)");
}

const xfWsUrl = process.env.XF_WS_URL || "wss://spark-api.xf-yun.com/v4.0/chat";
const xfDomain = process.env.XF_DOMAIN || "4.0Ultra";
const xfAppId = process.env.XF_APP_ID || "";
const xfApiKey = process.env.XF_API_KEY || "";
const xfApiSecret = process.env.XF_API_SECRET || "";

const SPUG_SMS_TEMPLATE_ID = process.env.SPUG_SMS_TEMPLATE_ID || "";
const SPUG_SMS_SIGN_NAME = process.env.SPUG_SMS_SIGN_NAME || "推送助手";
if (!SPUG_SMS_TEMPLATE_ID) {
  throw new Error("Missing required env var: SPUG_SMS_TEMPLATE_ID");
}
const smsService = buildSmsService({
  fetchImpl: globalThis.fetch,
  templateId: SPUG_SMS_TEMPLATE_ID,
  signName: SPUG_SMS_SIGN_NAME,
});

// 创建 SMTP 服务
const smtpService = buildSmtpService();

const OSS_PROVIDER = process.env.OSS_PROVIDER || "s3-compatible";
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || "";
const OSS_SECRET_ACCESS_KEY = process.env.OSS_SECRET_ACCESS_KEY || "";
const OSS_BUCKET = process.env.OSS_BUCKET || "";
const OSS_REGION = process.env.OSS_REGION || "us-east-1";
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || process.env.OSS_EXTERNAL_ENDPOINT || "";
const OSS_PUBLIC_BASE_URL = process.env.OSS_PUBLIC_BASE_URL || process.env.OSS_EXTERNAL_ENDPOINT || "";
const OSS_FORCE_PATH_STYLE = String(process.env.OSS_FORCE_PATH_STYLE || "true").toLowerCase() !== "false";
const OSS_UPLOAD_EXPIRES = Number(process.env.OSS_UPLOAD_EXPIRES || 600);

const ossReady = Boolean(OSS_ACCESS_KEY_ID && OSS_SECRET_ACCESS_KEY && OSS_BUCKET && OSS_ENDPOINT);
const s3Client = ossReady
  ? new S3Client({
      region: OSS_REGION,
      endpoint: OSS_ENDPOINT,
      forcePathStyle: OSS_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: OSS_ACCESS_KEY_ID,
        secretAccessKey: OSS_SECRET_ACCESS_KEY,
      },
    })
  : null;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString();
}

function createToken(payload) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const body = { ...payload, exp };
  const tokenBody = base64UrlEncode(JSON.stringify(body));
  const sig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(tokenBody)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${tokenBody}.${sig}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [tokenBody, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(tokenBody)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(tokenBody));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPasswordMD5(password) {
  if (!PASSWORD_SALT) {
    throw new Error("Missing required env var: PASSWORD_SALT (needed for legacy md5 password compatibility)");
  }
  return `md5:${crypto.createHash("md5").update(`${PASSWORD_SALT}:${password}`).digest("hex")}`;
}

async function hashPassword(password) {
  return await bcrypt.hash(String(password || ""), BCRYPT_ROUNDS);
}

async function verifyPassword(password, passwordHash) {
  const plain = String(password || "");
  const stored = String(passwordHash || "");

  if (stored === "demo") {
    const ok = plain === "demo";
    return { ok, needsUpgrade: ok };
  }
  if (stored === plain) {
    return { ok: true, needsUpgrade: true };
  }
  if (stored.startsWith("md5:")) {
    return { ok: stored === hashPasswordMD5(plain), needsUpgrade: true };
  }

  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return { ok: await bcrypt.compare(plain, stored), needsUpgrade: false };
  }

  return { ok: false, needsUpgrade: false };
}

const permissionService = buildPermissionService({ db });

const authMiddleware = buildAuthMiddleware({ db, verifyToken, permissionService });

setupAppMiddlewares(app, { UPLOADS_DIR });
app.use(
  "/api/auth",
  createAuthRouter({
    db,
    createToken,
    hashPassword,
    verifyPassword,
    authRequired: authMiddleware.authRequired,
    smsService,
    smtpService,
  })
);
app.use(
  "/api",
  createProductRouter({
    db,
    authRequired: authMiddleware.authRequired,
  })
);
app.use(
  "/api",
  createUserRouter({
    db,
    hashPassword,
    verifyPassword,
    authRequired: authMiddleware.authRequired,
    smsService,
  })
);
app.use(
  "/api",
  createTradeRouter({
    db,
    authRequired: authMiddleware.authRequired,
  })
);
app.use(
  "/api",
  createAdminRouter({
    db,
    adminRequired: authMiddleware.adminRequired,
    superAdminRequired: authMiddleware.superAdminRequired,
    tenantAdminRequired: authMiddleware.tenantAdminRequired,
    requirePermission: authMiddleware.requirePermission,
    hashPassword,
    upload,
    crypto,
    fs,
    path,
    UPLOADS_DIR,
    ossReady,
    s3Client,
    PutObjectCommand,
    OSS_BUCKET,
    OSS_PUBLIC_BASE_URL,
    permissionService,
  })
);
app.use(
  "/api",
  createRecommendRouter({
    db,
    authRequired: authMiddleware.authRequired,
    getDb: () => db,
  })
);
app.use("/api", createPublicRouter({ db }));
app.use(
  "/api",
  createOssRouter({
    authRequired: authMiddleware.authRequired,
    upload,
    crypto,
    getSignedUrl,
    PutObjectCommand,
    GetObjectCommand,
    ossReady,
    s3Client,
    OSS_PROVIDER,
    OSS_BUCKET,
    OSS_PUBLIC_BASE_URL,
    OSS_UPLOAD_EXPIRES,
  })
);
app.use(
  "/api",
  createAiRouter({
    db,
    crypto,
    xfWsUrl,
    xfDomain,
    xfAppId,
    xfApiKey,
    xfApiSecret,
  })
);

const WEB_DIST_DIR = path.resolve("dist");
const WEB_INDEX_HTML = path.join(WEB_DIST_DIR, "index.html");
if (fsSync.existsSync(WEB_DIST_DIR) && fsSync.existsSync(WEB_INDEX_HTML)) {
  app.use(express.static(WEB_DIST_DIR));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return res.sendFile(WEB_INDEX_HTML);
  });
}

async function initDb() {
  await db.initDatabase();
  console.log("MySQL 数据库初始化成功");
}

async function startServer() {
  await initDb();

  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

export { app, startServer };
