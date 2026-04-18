export function buildPermissionService({ db }) {
  async function getUserPermissions(userId, tenantId = null) {
    const sql = `
      SELECT DISTINCT p.code
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
        AND r.status = 'active'
        AND p.status = 'active'
        AND (ur.tenant_id IS NULL OR ur.tenant_id = ?)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `;

    const permissions = await db.query(sql, [userId, tenantId]);
    return permissions.map((p) => p.code);
  }

  async function getUserRoles(userId, tenantId = null) {
    const sql = `
      SELECT r.*, ur.created_at as granted_at, ur.expires_at
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
        AND r.status = 'active'
        AND (ur.tenant_id IS NULL OR ur.tenant_id = ?)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `;

    const roles = await db.query(sql, [userId, tenantId]);
    return roles;
  }

  async function hasPermission(userId, permissionCode, tenantId = null) {
    const permissions = await getUserPermissions(userId, tenantId);
    return permissions.includes(permissionCode);
  }

  async function hasRole(userId, roleCode, tenantId = null) {
    const sql = `
      SELECT r.id
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
        AND r.code = ?
        AND r.status = 'active'
        AND (ur.tenant_id IS NULL OR ur.tenant_id = ?)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      LIMIT 1
    `;

    const roles = await db.query(sql, [userId, roleCode, tenantId]);
    return roles.length > 0;
  }

  async function isSuperAdmin(userId) {
    return hasRole(userId, "super_admin", null);
  }

  async function isTenantAdmin(userId, tenantId) {
    if (!tenantId) return false;
    const sql = `
      SELECT ur.id
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
        AND r.code = 'tenant_admin'
        AND ur.tenant_id = ?
        AND r.status = 'active'
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      LIMIT 1
    `;
    const roles = await db.query(sql, [userId, tenantId]);
    return roles.length > 0;
  }

  async function grantRole(userId, roleId, tenantId, grantedBy) {
    const role = await db.getById("roles", roleId);
    if (!role) {
      return { status: 404, body: { message: "角色不存在" } };
    }

    if (role.type === "system" && role.tenant_id === null) {
      if (tenantId !== null) {
        return { status: 403, body: { message: "系统角色不能分配给租户用户" } };
      }
    }

    const existing = await db.query(
      "SELECT id FROM user_roles WHERE user_id = ? AND role_id = ? AND tenant_id <=> ?",
      [userId, roleId, tenantId]
    );

    if (existing[0]) {
      return { status: 409, body: { message: "用户已有该角色" } };
    }

    const id = await db.insert("user_roles", {
      user_id: userId,
      role_id: roleId,
      tenant_id: tenantId,
      granted_by: grantedBy,
      created_at: new Date().toISOString(),
    });

    return { status: 201, body: { id, message: "角色分配成功" } };
  }

  async function revokeRole(userId, roleId, tenantId) {
    const result = await db.query(
      "DELETE FROM user_roles WHERE user_id = ? AND role_id = ? AND tenant_id <=> ?",
      [userId, roleId, tenantId]
    );

    if (result.affectedRows === 0) {
      return { status: 404, body: { message: "角色分配记录不存在" } };
    }

    return { status: 200, body: { message: "角色回收成功" } };
  }

  async function getRoles(query = {}) {
    const { type, tenantId, status, keyword, page = 1, limit = 20 } = query;
    let sql = "SELECT * FROM roles WHERE 1=1";
    const params = [];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }

    if (tenantId !== undefined && tenantId !== null) {
      sql += " AND (tenant_id IS NULL OR tenant_id = ?)";
      params.push(tenantId);
    } else {
      sql += " AND tenant_id IS NULL";
    }

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (keyword) {
      sql += " AND (name LIKE ? OR code LIKE ? OR description LIKE ?)";
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += " ORDER BY sort ASC, created_at DESC";

    const offset = (Number(page) - 1) * Number(limit);
    sql += " LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const roles = await db.query(sql, params);

    const countSql = "SELECT COUNT(*) as total FROM roles WHERE 1=1" +
      (type ? " AND type = ?" : "") +
      (tenantId !== undefined && tenantId !== null ? " AND (tenant_id IS NULL OR tenant_id = ?)" : " AND tenant_id IS NULL") +
      (status ? " AND status = ?" : "") +
      (keyword ? " AND (name LIKE ? OR code LIKE ? OR description LIKE ?)" : "");
    const countParams = [
      ...(type ? [type] : []),
      ...(tenantId !== undefined && tenantId !== null ? [tenantId] : []),
      ...(status ? [status] : []),
      ...(keyword ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`] : []),
    ];
    const [{ total }] = await db.query(countSql, countParams);

    return {
      status: 200,
      body: {
        list: roles,
        total,
        page: Number(page),
        limit: Number(limit),
      },
    };
  }

  async function getPermissions(query = {}) {
    const { module, status, keyword } = query;
    let sql = "SELECT * FROM permissions WHERE 1=1";
    const params = [];

    if (module) {
      sql += " AND module = ?";
      params.push(module);
    }

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (keyword) {
      sql += " AND (name LIKE ? OR code LIKE ?)";
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    sql += " ORDER BY module ASC, sort ASC";

    const permissions = await db.query(sql, params);
    return { status: 200, body: { list: permissions } };
  }

  async function assignPermissionsToRole(roleId, permissionIds) {
    const role = await db.getById("roles", roleId);
    if (!role) {
      return { status: 404, body: { message: "角色不存在" } };
    }

    await db.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

    for (const permId of permissionIds) {
      await db.insert("role_permissions", {
        role_id: roleId,
        permission_id: permId,
        created_at: new Date().toISOString(),
      });
    }

    return { status: 200, body: { message: "权限分配成功" } };
  }

  async function getRolePermissions(roleId) {
    const sql = `
      SELECT p.*
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `;
    const permissions = await db.query(sql, [roleId]);
    return { status: 200, body: { list: permissions } };
  }

  return {
    getUserPermissions,
    getUserRoles,
    hasPermission,
    hasRole,
    isSuperAdmin,
    isTenantAdmin,
    grantRole,
    revokeRole,
    getRoles,
    getPermissions,
    assignPermissionsToRole,
    getRolePermissions,
  };
}
