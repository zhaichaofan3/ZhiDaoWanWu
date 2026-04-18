import express from 'express';

export function applyAdminRoleRoutes(router, { db, adminRequired }) {

  // 获取角色列表
  router.get('/admin/roles', adminRequired, async (req, res) => {
    try {
      const { page = 1, pageSize = 20, code, name, status } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      let whereClause = '';
      const params = [];

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

      const countQuery = `SELECT COUNT(*) as total FROM roles${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const total = countResult[0].total;

      const query = `SELECT * FROM roles${whereClause} ORDER BY sort ASC, id ASC LIMIT ? OFFSET ?`;
      const result = await db.query(query, [...params, limit, offset]);

      res.json({
        list: result,
        total
      });
    } catch (error) {
      console.error('获取角色列表失败:', error);
      res.status(500).json({ message: '获取角色列表失败' });
    }
  });

  // 获取角色权限
  router.get('/admin/roles/:id/permissions', adminRequired, async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT p.* 
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY p.module ASC, p.sort ASC
      `;

      const result = await db.query(query, [id]);
      res.json(result);
    } catch (error) {
      console.error('获取角色权限失败:', error);
      res.status(500).json({ message: '获取角色权限失败' });
    }
  });

  // 更新角色权限
  router.put('/admin/roles/:id/permissions', adminRequired, async (req, res) => {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;

      // 删除现有权限
      await db.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

      // 插入新权限
      if (permissionIds && permissionIds.length > 0) {
        const values = permissionIds.map(permissionId => [id, permissionId]);
        await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
      }

      res.json({ message: '权限更新成功' });
    } catch (error) {
      console.error('更新角色权限失败:', error);
      res.status(500).json({ message: '更新角色权限失败' });
    }
  });
}
