import express from "express";

export function createOssRouter({
  authRequired,
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
}) {
  const router = express.Router();

  router.get("/oss/config", authRequired, (_req, res) => {
    res.json({
      enabled: ossReady,
      provider: OSS_PROVIDER,
      bucket: OSS_BUCKET || null,
      uploadExpires: OSS_UPLOAD_EXPIRES,
    });
  });

  router.post("/oss/presign-upload", authRequired, async (req, res) => {
    if (!ossReady || !s3Client) {
      return res.status(400).json({ message: "OSS 未配置完整" });
    }

    try {
      const { filename, contentType, folder } = req.body ?? {};
      if (!filename || !contentType) {
        return res.status(400).json({ message: "filename 和 contentType 为必填" });
      }

      const safeFolder = String(folder || "uploads").replace(/^\/*/, "").replace(/\/*$/, "").replace(/\.\./g, "");
      const ext = String(filename).includes(".") ? String(filename).split(".").pop() : "";
      const key = `${safeFolder}/${new Date().toISOString().slice(0, 10)}/${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext ? `.${ext}` : ""}`;

      const command = new PutObjectCommand({
        Bucket: OSS_BUCKET,
        Key: key,
        ContentType: String(contentType),
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: OSS_UPLOAD_EXPIRES });

      const publicBase = String(OSS_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const publicUrl = publicBase ? `${publicBase}/${OSS_BUCKET}/${key}` : null;

      res.json({
        uploadUrl,
        method: "PUT",
        headers: { "Content-Type": String(contentType) },
        key,
        bucket: OSS_BUCKET,
        publicUrl,
      });
    } catch (error) {
      console.error("生成 OSS 上传签名失败:", error);
      return res.status(500).json({ message: "生成上传签名失败" });
    }
  });

  router.post("/oss/upload", authRequired, upload.single("file"), async (req, res) => {
    if (!ossReady || !s3Client) {
      return res.status(400).json({ message: "OSS 未配置完整" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "file 为必填" });
    }

    try {
      const folder = String(req.body?.folder || "uploads").replace(/^\/*/, "").replace(/\/*$/, "").replace(/\.\./g, "");
      const originalName = req.file.originalname || "upload.bin";
      const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
      const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext ? `.${ext}` : ""}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: OSS_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || "application/octet-stream",
        }),
      );

      const path = `/api/oss/object?key=${encodeURIComponent(key)}`;
      res.json({ key, bucket: OSS_BUCKET, path, url: path });
    } catch (error) {
      console.error("后端代理上传 OSS 失败:", error);
      return res.status(500).json({ message: "后端代理上传失败" });
    }
  });

  router.get("/oss/object", async (req, res) => {
    if (!ossReady || !s3Client) {
      return res.status(400).json({ message: "OSS 未配置完整" });
    }

    const key = String(req.query?.key || "");
    if (!key) {
      return res.status(400).json({ message: "key 为必填" });
    }

    try {
      const result = await s3Client.send(
        new GetObjectCommand({
          Bucket: OSS_BUCKET,
          Key: key,
        }),
      );
      if (result.ContentType) res.setHeader("Content-Type", result.ContentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      if (result.Body && typeof result.Body.pipe === "function") {
        result.Body.pipe(res);
      } else {
        res.status(500).json({ message: "读取对象失败" });
      }
    } catch (error) {
      console.error("读取 OSS 对象失败:", error);
      return res.status(404).json({ message: "图片不存在或无权限访问" });
    }
  });

  return router;
}

