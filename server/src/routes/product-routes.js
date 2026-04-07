import { Router } from "express";
import { buildProductController } from "../controllers/product-controller.js";

export function createProductRouter(deps) {
  const router = Router();
  const controller = buildProductController(deps);

  router.get("/products", controller.list);
  router.get("/products/:id", controller.detail);
  router.post("/products", deps.authRequired, controller.create);
  router.put("/products/:id", deps.authRequired, controller.update);
  router.patch("/products/:id/status", deps.authRequired, controller.changeStatus);
  router.delete("/products/:id", deps.authRequired, controller.remove);

  router.get("/users/:userId/favorites", controller.listFavorites);
  router.post("/users/:userId/favorites", controller.addFavorite);
  router.delete("/users/:userId/favorites/:productId", controller.removeFavorite);

  return router;
}

