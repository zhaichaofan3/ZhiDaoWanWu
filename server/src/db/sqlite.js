import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db = null;

async function ensureDb() {
  if (db) return db;
  const sqlitePath = path.resolve(process.env.SQLITE_PATH || "./server/data.sqlite");
  db = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });
  return db;
}

async function runSchemaIfNeeded() {
  const d = await ensureDb();
  const schemaPath = path.resolve("server/schema.sql");
  if (!fs.existsSync(schemaPath)) return;
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await d.exec(schema);
}

export const sqliteDb = {
  async initDatabase() {
    await ensureDb();
    await runSchemaIfNeeded();
    console.log("数据库初始化完成");
  },

  async query(sql, params = []) {
    const d = await ensureDb();
    const s = String(sql).trim().toUpperCase();
    if (s.startsWith("SELECT")) return d.all(sql, params);
    await d.run(sql, params);
    return [];
  },

  async getById(table, id) {
    const d = await ensureDb();
    return d.get(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  },

  async insert(table, dataObj) {
    const d = await ensureDb();
    const keys = Object.keys(dataObj);
    const values = keys.map((k) => dataObj[k]);
    const cols = keys.join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const ret = await d.run(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
      values
    );
    return ret.lastID;
  },

  async update(table, id, dataObj) {
    const d = await ensureDb();
    const keys = Object.keys(dataObj);
    if (keys.length === 0) return;
    const values = keys.map((k) => dataObj[k]);
    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    await d.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, id]);
  },

  async delete(table, id) {
    const d = await ensureDb();
    await d.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  },
};
