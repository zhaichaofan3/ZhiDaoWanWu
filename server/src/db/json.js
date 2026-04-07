import fs from "node:fs";
import path from "node:path";

const dataPath = path.resolve("server/data.json");

const defaultData = {
  users: [],
  products: [],
  favorites: [],
  addresses: [],
  orders: [],
  announcements: [],
  banners: [],
  categories: [],
  notifications: [],
  complaints: [],
  evaluations: [],
  logs: [],
};

function read() {
  if (!fs.existsSync(dataPath)) return JSON.parse(JSON.stringify(defaultData));
  try {
    const raw = fs.readFileSync(dataPath, "utf-8");
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultData));
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function write(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
}

function now() {
  return new Date().toISOString();
}

function nextId(data, table) {
  const list = data[table] || [];
  const max = list.reduce((m, x) => {
    const id = Number(x.id || 0);
    return id > m ? id : m;
  }, 0);
  return max + 1;
}

export function seedIfEmpty() {
  const data = read();
  const hasAny = Object.values(data).some((v) => Array.isArray(v) && v.length > 0);
  if (!hasAny) write(data);
}

export const jsonDb = {
  read,
  write,
  now,
  nextId,
};
