import express from "express";

import { applyAdminAiPromptRoutes } from "./admin/ai-prompts.js";
import { applyAdminAnnouncementRoutes } from "./admin/announcements.js";
import { applyAdminBannerRoutes } from "./admin/banners.js";
import { applyAdminCategoryRoutes } from "./admin/categories.js";
import { applyAdminComplaintRoutes } from "./admin/complaints.js";
import { applyAdminDictRoutes } from "./admin/dicts.js";
import { applyAdminEvaluationRoutes } from "./admin/evaluations.js";
import { applyAdminFavoriteRoutes } from "./admin/favorites.js";
import { applyAdminLogRoutes } from "./admin/logs.js";
import { applyAdminOrderRoutes } from "./admin/orders.js";
import { applyAdminProductRoutes } from "./admin/products.js";
import { applyAdminStatsRoutes } from "./admin/stats.js";
import { applyAdminTenantRoutes } from "./admin/tenants.js";
import { applyAdminUserRoutes } from "./admin/users.js";
import { applyTenantAdminRoutes } from "./admin/tenant-admin.js";
import { applyAdminRoleRoutes } from "./admin/roles.js";
import { applyAdminPermissionRoutes } from "./admin/permissions.js";
import { applyPointRoutes } from "./admin/points.js";
import { applyUserPointRoutes } from "./admin/user-points.js";

export function createAdminRouter(deps) {
  const router = express.Router();

  applyAdminTenantRoutes(router, deps);
  applyTenantAdminRoutes(router, deps);

  applyAdminAiPromptRoutes(router, deps);
  applyAdminUserRoutes(router, deps);
  applyAdminRoleRoutes(router, deps);
  applyAdminPermissionRoutes(router, deps);
  applyAdminStatsRoutes(router, deps);
  applyAdminAnnouncementRoutes(router, deps);
  applyAdminBannerRoutes(router, deps);
  applyAdminCategoryRoutes(router, deps);
  applyAdminDictRoutes(router, deps);
  applyAdminProductRoutes(router, deps);
  applyAdminOrderRoutes(router, deps);
  applyAdminComplaintRoutes(router, deps);
  applyAdminLogRoutes(router, deps);
  applyAdminEvaluationRoutes(router, deps);
  applyAdminFavoriteRoutes(router, deps);
  applyPointRoutes(router, deps);
  applyUserPointRoutes(router, deps);

  return router;
}
