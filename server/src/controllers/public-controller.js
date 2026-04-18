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

    async dicts(req, res) {
      try {
        const { type } = req.query ?? {};
        return res.json(await service.getDictItems(type));
      } catch (error) {
        console.error("获取字典失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async tenants(_req, res) {
      try {
        return res.json(await service.getTenants());
      } catch (error) {
        console.error("获取租户列表失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },

    async tenantById(req, res) {
      try {
        const tenantId = Number(req.params.id);
        if (!Number.isFinite(tenantId) || tenantId <= 0) {
          return res.status(400).json({ message: "无效的租户ID" });
        }
        const tenant = await service.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "租户不存在" });
        }
        return res.json(tenant);
      } catch (error) {
        console.error("获取租户信息失败:", error);
        return res.status(500).json({ message: "服务器内部错误" });
      }
    },
  };
}
