import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import crypto from "node:crypto";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "data.json");

function now() {
  return new Date().toISOString();
}

function readData() {
  let data;
  if (!fs.existsSync(dataPath)) {
    data = {
      users: [],
      products: [],
      favorites: [],
      orders: [],
      addresses: [],
      evaluations: [],
      complaints: [],
      notifications: [],
      logs: [],
      counters: { users: 0, products: 0, favorites: 0, orders: 0, addresses: 0, evaluations: 0, complaints: 0, notifications: 0, logs: 0 },
      // 可后续按 PRD 扩展：公告/轮播图/分类/统计等
      announcements: [],
      banners: [],
      categories: [],
    };
  } else {
    data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    // 确保所有必要的表和字段都存在
    if (!data.counters) {
      data.counters = { users: 0, products: 0, favorites: 0, orders: 0, addresses: 0, evaluations: 0, complaints: 0, notifications: 0, logs: 0 };
    }
    if (!data.addresses) data.addresses = [];
    if (!data.announcements) data.announcements = [];
    if (!data.banners) data.banners = [];
    if (!data.evaluations) data.evaluations = [];
    if (!data.complaints) data.complaints = [];
    if (!data.notifications) data.notifications = [];
    if (!data.logs) data.logs = [];
    if (!data.categories) data.categories = [];
    
    // 确保 counters 中所有必要的字段都存在
    data.counters.users ||= 0;
    data.counters.products ||= 0;
    data.counters.favorites ||= 0;
    data.counters.orders ||= 0;
    data.counters.addresses ||= 0;
    data.counters.evaluations ||= 0;
    data.counters.complaints ||= 0;
    data.counters.notifications ||= 0;
    data.counters.logs ||= 0;
  }
  return data;
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

function nextId(data, key) {
  data.counters[key] += 1;
  return data.counters[key];
}

function nowDate() {
  return new Date().toISOString();
}

const PASSWORD_SALT = "secondhand-salt";

function hashPasswordMD5(password) {
  return `md5:${crypto.createHash("md5").update(`${PASSWORD_SALT}:${password}`).digest("hex")}`;
}

function normalizeUser(user) {
  // 兼容旧数据：没有字段的补齐默认值
  if (!user.role) user.role = "user";
  if (!user.status) user.status = "active";
  if (!user.nickname) user.nickname = user.name || user.email || "User";
  if (!user.created_at && user.createdAt) user.created_at = user.createdAt;

  // 兼容旧数据字段
  if (!user.phone) user.phone = "";
  if (!user.studentId && user.student_id) user.studentId = user.student_id;
  if (!user.studentId) user.studentId = "";
  if (!user.gender) user.gender = "other";
  if (!user.grade) user.grade = "";
  if (!user.major) user.major = "";
  if (!user.bio) user.bio = "";
  if (!user.avatar) user.avatar = "";
  if (!user.password_hash) user.password_hash = "demo";

  return user;
}

function migrateData(data) {
  if (!data.counters) {
    data.counters = { users: 0, products: 0, favorites: 0, orders: 0, addresses: 0, evaluations: 0, complaints: 0, notifications: 0, logs: 0 };
  }
  if (!"addresses" in data) data.addresses = [];
  if (!"announcements" in data) data.announcements = [];
  if (!"banners" in data) data.banners = [];
  if (!"evaluations" in data) data.evaluations = [];
  if (!"complaints" in data) data.complaints = [];
  if (!"notifications" in data) data.notifications = [];
  if (!"logs" in data) data.logs = [];

  data.counters.users ||= 0;
  data.counters.products ||= 0;
  data.counters.favorites ||= 0;
  data.counters.orders ||= 0;
  data.counters.addresses ||= 0;
  data.counters.evaluations ||= 0;
  data.counters.complaints ||= 0;
  data.counters.notifications ||= 0;
  data.counters.logs ||= 0;

  data.users = Array.isArray(data.users) ? data.users : [];
  return data;
}

export function seedIfEmpty() {
  const data = readData();
  let changed = false;

  // 必要字段补齐（旧数据迁移）
  if (!data.counters) {
    changed = true;
    data.counters = { users: 0, products: 0, favorites: 0, orders: 0, addresses: 0, evaluations: 0, complaints: 0, notifications: 0, logs: 0 };
  }
  if (!"addresses" in data) {
    changed = true;
    data.addresses = [];
  }
  if (!"announcements" in data) {
    changed = true;
    data.announcements = [];
  }
  if (!"banners" in data) {
    changed = true;
    data.banners = [];
  }
  if (!"categories" in data) {
    changed = true;
    data.categories = [];
  }
  if (!"evaluations" in data) {
    changed = true;
    data.evaluations = [];
  }
  if (!"complaints" in data) {
    changed = true;
    data.complaints = [];
  }
  if (!"notifications" in data) {
    changed = true;
    data.notifications = [];
  }
  if (!"logs" in data) {
    changed = true;
    data.logs = [];
  }

  data.counters.users ||= 0;
  data.counters.products ||= 0;
  data.counters.favorites ||= 0;
  data.counters.orders ||= 0;
  data.counters.addresses ||= 0;
  data.counters.evaluations ||= 0;
  data.counters.complaints ||= 0;
  data.counters.notifications ||= 0;
  data.counters.logs ||= 0;

  if (!Array.isArray(data.users)) {
    changed = true;
    data.users = [];
  }

  // 数据为空则创建演示账号
  if (data.users.length === 0) {
    changed = true;
    const aliceId = nextId(data, "users");
    data.users.push({
      id: aliceId,
      email: "alice@example.com",
      name: "Alice",
      nickname: "数码小王子",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
      phone: "13800000001",
      studentId: "2021001",
      gender: "other",
      grade: "2022级",
      major: "计算机科学与技术",
      bio: "喜欢数码产品，乐于分享好物~",
      role: "user",
      status: "active",
      password_hash: hashPasswordMD5("demo"),
      created_at: nowDate(),
    });

    const adminId = nextId(data, "users");
    data.users.push({
      id: adminId,
      email: "admin@example.com",
      name: "Admin",
      nickname: "管理员",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin",
      phone: "13800000002",
      studentId: "2022002",
      gender: "other",
      grade: "2022级",
      major: "项目管理",
      bio: "平台运营与管理",
      role: "admin",
      status: "active",
      password_hash: hashPasswordMD5("demo"),
      created_at: nowDate(),
    });
  }

  if (!Array.isArray(data.announcements)) {
    changed = true;
    data.announcements = [];
  }
  if (!Array.isArray(data.banners)) {
    changed = true;
    data.banners = [];
  }
  if (!Array.isArray(data.categories)) {
    changed = true;
    data.categories = [];
  }

  if (data.announcements.length === 0) {
    changed = true;
    data.announcements.push(
      {
        id: `ann_${Date.now()}_1`,
        title: "🎉 平台上线公告",
        content: "校园二手交易平台已上线，欢迎体验！",
        isTop: true,
        status: "published",
        created_at: nowDate(),
      },
      {
        id: `ann_${Date.now()}_2`,
        title: "⚠️ 交易安全提醒",
        content: "请优先选择校内当面交易，不要站外转账。",
        isTop: false,
        status: "published",
        created_at: nowDate(),
      }
    );
  }

  if (data.banners.length === 0) {
    changed = true;
    data.banners.push(
      {
        id: `ban_${Date.now()}_1`,
        title: "毕业季闲置大甩卖",
        image: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=1200&h=400&fit=crop",
        link: "/products",
        sort: 1,
        active: true,
        created_at: nowDate(),
      },
      {
        id: `ban_${Date.now()}_2`,
        title: "教材书籍专区",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=400&fit=crop",
        link: "/products",
        sort: 2,
        active: true,
        created_at: nowDate(),
      }
    );
  }

  if (data.categories.length === 0) {
    changed = true;
    data.categories.push(
      { id: "c1", name: "数码产品", parentId: null, sort: 1, enabled: true },
      { id: "c1-1", name: "手机", parentId: "c1", sort: 1, enabled: true },
      { id: "c1-2", name: "平板电脑", parentId: "c1", sort: 2, enabled: true },
      { id: "c2", name: "教材书籍", parentId: null, sort: 2, enabled: true },
      { id: "c2-1", name: "公共课教材", parentId: "c2", sort: 1, enabled: true }
    );
  }

  // 迁移旧用户数据补齐 role/status 等字段
  for (let i = 0; i < data.users.length; i++) {
    const before = JSON.stringify(data.users[i]);
    data.users[i] = normalizeUser(data.users[i]);
    const after = JSON.stringify(data.users[i]);
    if (before !== after) changed = true;
  }

  // 为旧数据提供可登录的演示账号字段（确保能测试后台权限）
  for (let i = 0; i < data.users.length; i++) {
    const u = data.users[i];
    if (u.email === "alice@example.com") {
      const before = JSON.stringify(u);
      u.nickname = u.nickname || "数码小王子";
      u.studentId = u.studentId || "2021001";
      u.phone = u.phone || "13800000001";
      u.avatar = u.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix";
      u.role = u.role || "user";
      u.status = u.status || "active";
      if (before !== JSON.stringify(u)) changed = true;
    }
    if (u.email === "bob@example.com") {
      const before = JSON.stringify(u);
      u.nickname = u.nickname || "管理员";
      u.studentId = u.studentId || "2022002";
      u.phone = u.phone || "13800000002";
      u.avatar = u.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin";
      u.role = "admin"; // 确保至少有一个管理员可测试权限
      u.status = u.status || "active";
      if (before !== JSON.stringify(u)) changed = true;
    }
  }

  if (changed || data.users.length === 0) {
    writeData(data);
  }
}

export const jsonDb = {
  read: readData,
  write: writeData,
  nextId,
  now: nowDate,
};