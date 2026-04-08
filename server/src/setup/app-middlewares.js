import cors from "cors";
import express from "express";

export function setupAppMiddlewares(app, { UPLOADS_DIR }) {
  app.use(cors());
  app.use(express.json());
  app.use(
    "/uploads",
    express.static(UPLOADS_DIR, {
      maxAge: "1h",
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      },
    }),
  );
}

