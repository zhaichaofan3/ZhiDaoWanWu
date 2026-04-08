export function buildPublicService({ db }) {
  return {
    async getAnnouncements() {
      const sql = `
        SELECT * FROM announcements
        WHERE status = 'published'
        ORDER BY isTop DESC, created_at DESC
      `;
      const list = await db.query(sql);
      return { list };
    },

    async getBanners() {
      const sql = `
        SELECT * FROM banners
        WHERE active = true
        ORDER BY sort ASC
      `;
      const list = await db.query(sql);
      return { list };
    },

    async getCategories() {
      const sql = `
        SELECT * FROM categories
        WHERE enabled = true
        ORDER BY sort ASC
      `;
      const list = await db.query(sql);
      return { list };
    },

    async getDictItems(type) {
      const dictType = String(type || "").trim();
      if (!dictType) return { list: [] };
      const sql = `
        SELECT * FROM dict_items
        WHERE dict_type = ? AND enabled = true
        ORDER BY sort ASC
      `;
      const list = await db.query(sql, [dictType]);
      return { list };
    },
  };
}
