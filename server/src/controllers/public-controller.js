import { buildPublicService } from "../services/public-service.js";

export function buildPublicController(deps) {
  const service = buildPublicService(deps);

  return {
    health(_req, res) {
      return res.json({ status: "ok" });
    },

    async announcements(_req, res) {
      try {
        return res.json(await service.getAnnouncements());
      } catch (error) {
        console.error("获取公告列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async banners(_req, res) {
      try {
        return res.json(await service.getBanners());
      } catch (error) {
        console.error("获取轮播图列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async categories(_req, res) {
      try {
        return res.json(await service.getCategories());
      } catch (error) {
        console.error("获取分类列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
  };
}
