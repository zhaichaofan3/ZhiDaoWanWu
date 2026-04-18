import express from 'express';

export function applyAdminPermissionRoutes(router, { db, adminRequired }) {

  // 获取权限列表
  router.get('/admin/permissions', adminRequired, async (req, res) => {
    try {
      const { module, code, name, status } = req.query;

      let whereClause = '';
      const params = [];

      if (module) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'module = ?';
        params.push(module);
      }

      if (code) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'code LIKE ?';
        params.push(`%${code}%`);
      }

      if (name) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'name LIKE ?';
        params.push(`%${name}%`);
      }

      if (status) {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'status = ?';
        params.push(status);
      }

      const query = `SELECT * FROM permissions${whereClause} ORDER BY module ASC, sort ASC`;
      const result = await db.query(query, params);

      res.json(result);
    } catch (error) {
      console.error('获取权限列表失败:', error);
      res.status(500).json({ message: '获取权限列表失败' });
    }
  });
}
