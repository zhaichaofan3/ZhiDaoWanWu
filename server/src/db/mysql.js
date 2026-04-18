import mysql from "mysql2/promise";

let pool = null;

function quoteIdentifier(name) {
  return `\`${String(name).replace(/`/g, "``")}\``;
}

function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "second_hand",
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0,
  };
}

async function ensurePool() {
  if (pool) return pool;
  const cfg = getMysqlConfig();
  pool = mysql.createPool(cfg);
  return pool;
}

export const mysqlDb = {
  async initDatabase() {
    await ensurePool();
    console.log("数据库连接成功");
  },

  async query(sql, params = []) {
    const p = await ensurePool();
    const [rows] = await p.query(sql, params);
    return rows;
  },

  async getById(table, id) {
    const p = await ensurePool();
    const tableName = quoteIdentifier(table);
    const [rows] = await p.query(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async insert(table, dataObj) {
    const p = await ensurePool();
    const keys = Object.keys(dataObj);
    const values = keys.map((k) => dataObj[k]);
    const tableName = quoteIdentifier(table);
    const cols = keys.map((k) => quoteIdentifier(k)).join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const [ret] = await p.query(
      `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`,
      values
    );
    return ret.insertId;
  },

  async update(table, id, dataObj) {
    const p = await ensurePool();
    const keys = Object.keys(dataObj);
    if (keys.length === 0) return;
    const tableName = quoteIdentifier(table);
    const values = keys.map((k) => dataObj[k]);
    const setClause = keys.map((k) => `${quoteIdentifier(k)} = ?`).join(", ");
    await p.query(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`, [...values, id]);
  },

  async delete(table, id) {
    const p = await ensurePool();
    const tableName = quoteIdentifier(table);
    await p.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
  },
};