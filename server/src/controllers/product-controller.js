import { buildProductService } from "../services/product-service.js";

export function buildProductController(deps) {
  const service = buildProductService(deps);

  return {
    async list(req, res) {
      try {
        const products = await service.listProducts();
        return res.json(products);
      } catch (error) {
        console.error("获取商品列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async detail(req, res) {
      try {
        const id = Number(req.params.id);
        const product = await service.getProductDetail(id);
        if (!product) {
          return res.status(404).json({ message: "商品不存在" });
        }
        return res.json(product);
      } catch (error) {
        console.error("获取商品详情失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async create(req, res) {
      try {
        const result = await service.createProduct(req.auth.uid, req.body ?? {});
        if (result.status === 204) {
          return res.status(204).send();
        }
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("创建商品失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async update(req, res) {
      try {
        const id = Number(req.params.id);
        const result = await service.updateProduct(req.auth.uid, id, req.body ?? {});
        return res.status(result.status).json(result.body ?? {});
      } catch (error) {
        console.error("更新商品失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async changeStatus(req, res) {
      try {
        const id = Number(req.params.id);
        const { status } = req.body ?? {};
        const result = await service.changeStatus(req.auth.uid, id, status);
        return res.status(result.status).json(result.body ?? {});
      } catch (error) {
        console.error("更新商品状态失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async remove(req, res) {
      try {
        const id = Number(req.params.id);
        const result = await service.deleteProduct(req.auth.uid, id);
        if (result.status === 204) {
          return res.status(204).send();
        }
        return res.status(result.status).json(result.body ?? {});
      } catch (error) {
        console.error("删除商品失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async listFavorites(req, res) {
      try {
        const userId = Number(req.params.userId);
        const favorites = await service.listFavorites(userId);
        return res.json(favorites);
      } catch (error) {
        console.error("获取收藏列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async addFavorite(req, res) {
      try {
        const userId = Number(req.params.userId);
        const { product_id } = req.body ?? {};
        const result = await service.addFavorite(userId, product_id);
        return res.status(result.status).json(result.body ?? {});
      } catch (error) {
        console.error("创建收藏失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async removeFavorite(req, res) {
      try {
        const userId = Number(req.params.userId);
        const productId = Number(req.params.productId);
        const result = await service.removeFavorite(userId, productId);
        if (result.status === 204) {
          return res.status(204).send();
        }
        return res.status(result.status).json(result.body ?? {});
      } catch (error) {
        console.error("删除收藏失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
  };
}

