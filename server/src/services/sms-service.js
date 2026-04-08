import crypto from "node:crypto";

// 轻量验证码服务：开发/教学项目使用
// - 内存存储（重启即失效）
// - 简单限流（单手机号/场景）

const store = new Map(); // key -> { codeHash, expAt, createdAt, attemptsLeft }
const rate = new Map(); // rateKey -> number[] timestamps(ms)

function now() {
  return Date.now();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "");
}

function isValidCNPhone(phone) {
  return /^1\d{10}$/.test(phone);
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function random6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function takeRate(rateKey, { perMinute = 1, perHour = 5 } = {}) {
  const t = now();
  const arr = rate.get(rateKey) || [];
  const oneMinuteAgo = t - 60 * 1000;
  const oneHourAgo = t - 60 * 60 * 1000;
  const kept = arr.filter((x) => x > oneHourAgo);
  const lastMinuteCount = kept.filter((x) => x > oneMinuteAgo).length;
  const lastHourCount = kept.length;
  if (lastMinuteCount >= perMinute) return { ok: false, message: "请求过于频繁，请稍后再试" };
  if (lastHourCount >= perHour) return { ok: false, message: "今日请求次数过多，请稍后再试" };
  kept.push(t);
  rate.set(rateKey, kept);
  return { ok: true };
}

export function buildSmsService({
  fetchImpl,
  templateId,
  signName = "推送助手",
  codeTtlMs = 5 * 60 * 1000,
  maxAttempts = 5,
} = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const tpl = String(templateId || "").trim();

  if (!fetchFn) {
    throw new Error("SmsService: 缺少 fetch 实现（Node 18+ 自带 fetch）");
  }
  if (!tpl) {
    throw new Error("SmsService: 缺少短信模板编号（templateId）");
  }

  async function sendCode({ phone, scene }) {
    const p = normalizePhone(phone);
    const s = String(scene || "").trim();
    if (!s) return { status: 400, body: { message: "scene 为必填" } };
    if (!isValidCNPhone(p)) return { status: 400, body: { message: "手机号格式不正确" } };

    const rateKey = `${p}:${s}`;
    const limited = takeRate(rateKey);
    if (!limited.ok) return { status: 429, body: { message: limited.message } };

    const code = random6();
    const key = `sms:${p}:${s}`;
    store.set(key, {
      codeHash: sha256Hex(`${p}:${s}:${code}`),
      expAt: now() + codeTtlMs,
      createdAt: now(),
      attemptsLeft: maxAttempts,
    });

    const url = `https://push.spug.cc/sms/${encodeURIComponent(tpl)}`;
    const payload = { name: String(signName || "推送助手"), code, to: p };
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("短信发送失败:", res.status, text);
      return { status: 502, body: { message: "短信发送失败，请稍后再试" } };
    }

    // 不回传 code；前端仅需要知道成功即可
    return { status: 200, body: { message: "验证码已发送" } };
  }

  function verifyCode({ phone, scene, code }) {
    const p = normalizePhone(phone);
    const s = String(scene || "").trim();
    const c = String(code || "").trim();
    if (!s) return { ok: false, status: 400, message: "scene 为必填" };
    if (!isValidCNPhone(p)) return { ok: false, status: 400, message: "手机号格式不正确" };
    if (!/^\d{4,8}$/.test(c)) return { ok: false, status: 400, message: "验证码格式不正确" };

    const key = `sms:${p}:${s}`;
    const item = store.get(key);
    if (!item) return { ok: false, status: 400, message: "验证码无效或已过期" };
    if (item.expAt < now()) {
      store.delete(key);
      return { ok: false, status: 400, message: "验证码已过期" };
    }
    if (item.attemptsLeft <= 0) {
      store.delete(key);
      return { ok: false, status: 400, message: "验证码错误次数过多，请重新获取" };
    }

    const expected = item.codeHash;
    const actual = sha256Hex(`${p}:${s}:${c}`);
    if (actual !== expected) {
      item.attemptsLeft -= 1;
      store.set(key, item);
      return { ok: false, status: 400, message: "验证码不正确" };
    }

    store.delete(key);
    return { ok: true };
  }

  return { sendCode, verifyCode };
}

