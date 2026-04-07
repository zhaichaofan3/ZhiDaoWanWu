import { Router } from "express";
import { buildPublicController } from "../controllers/public-controller.js";

export function createPublicRouter(deps) {
  const router = Router();
  const controller = buildPublicController(deps);

  router.get("/health", controller.health);
  router.get("/announcements", controller.announcements);
  router.get("/banners", controller.banners);
  router.get("/categories", controller.categories);

  return router;
}
