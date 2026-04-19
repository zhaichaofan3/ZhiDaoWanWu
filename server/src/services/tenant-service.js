export function buildTenantService({ db }) {
  async function createTenant(data) {
    const { code, name, short_name, logo, logo_dark, description, settings } = data;
    if (!code || !name) {
      return { status: 400, body: { message: "code 和 name 为必填" } };
    }

    const existing = await db.query("SELECT id FROM tenants WHERE code = ?", [code]);
    if (existing.length > 0) {
      return { status: 409, body: { message: "租户编码已存在" } };
    }

    const tenantData = {
      code,
      name,
      short_name: short_name || "",
      logo: logo || "",
      logo_dark: logo_dark || "",
      description: description || "",
      status: "active",
      settings: settings ? JSON.stringify(settings) : null,
      created_at: new Date().toISOString(),
    };

    const id = await db.insert("tenants", tenantData);
    return { status: 201, body: { id, message: "租户创建成功" } };
  }

  async function updateTenant(id, data) {
    const { name, short_name, logo, logo_dark, description, status, settings } = data;
    const tenant = await db.getById("tenants", id);
    if (!tenant) {
      return { status: 404, body: { message: "租户不存在" } };
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (short_name !== undefined) updateData.short_name = short_name;
    if (logo !== undefined) updateData.logo = logo;
    if (logo_dark !== undefined) updateData.logo_dark = logo_dark;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (settings !== undefined) updateData.settings = JSON.stringify(settings);

    await db.update("tenants", id, updateData);
    return { status: 200, body: { message: "租户更新成功" } };
  }

  async function deleteTenant(id) {
    const tenant = await db.getById("tenants", id);
    if (!tenant) {
      return { status: 404, body: { message: "租户不存在" } };
    }

    const userCount = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE tenant_id = ?",
      [id]
    );
    if (userCount[0]?.count > 0) {
      return {
        status: 400,
        body: { message: "该租户下仍有用户，无法删除" },
      };
    }

    await db.delete("tenants", id);
    return { status: 200, body: { message: "租户删除成功" } };
  }

  async function getTenants(query = {}) {
    const { status, keyword, page = 1, limit = 20 } = query;
    let sql = "SELECT * FROM tenants WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (keyword) {
      sql += " AND (name LIKE ? OR code LIKE ? OR short_name LIKE ?)";
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += " ORDER BY created_at DESC";

    const offset = (Number(page) - 1) * Number(limit);
    sql += " LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const tenants = await db.query(sql, params);

    const countSql = "SELECT COUNT(*) as total FROM tenants WHERE 1=1" +
      (status ? " AND status = ?" : "") +
      (keyword ? " AND (name LIKE ? OR code LIKE ? OR short_name LIKE ?)" : "");
    const countParams = [...(status ? [status] : []), ...(keyword ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`] : [])];
    const [{ total }] = await db.query(countSql, countParams);

    return {
      status: 200,
      body: {
        list: tenants,
        total,
        page: Number(page),
        limit: Number(limit),
      },
    };
  }

  async function getTenantById(id) {
    const tenant = await db.getById("tenants", id);
    if (!tenant) {
      return { status: 404, body: { message: "租户不存在" } };
    }

    return {
      status: 200,
      body: tenant,
    };
  }

  async function getTenantByCode(code) {
    const tenants = await db.query("SELECT * FROM tenants WHERE code = ? LIMIT 1", [code]);
    if (!tenants[0]) {
      return { status: 404, body: { message: "租户不存在" } };
    }
    return { status: 200, body: tenants[0] };
  }

  return {
    createTenant,
    updateTenant,
    deleteTenant,
    getTenants,
    getTenantById,
    getTenantByCode,
  };
}
