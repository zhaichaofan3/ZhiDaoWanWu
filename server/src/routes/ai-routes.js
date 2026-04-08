import express from "express";
import WebSocket from "ws";

function buildAuthorizedWsUrl({ crypto, wsUrl, apiKey, apiSecret }) {
  const u = new URL(wsUrl);
  const host = u.host;
  const path = u.pathname;
  const date = new Date().toUTCString();

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signatureSha = crypto.createHmac("sha256", apiSecret).update(signatureOrigin).digest("base64");
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
  const authorization = Buffer.from(authorizationOrigin).toString("base64");

  u.searchParams.set("authorization", authorization);
  u.searchParams.set("date", date);
  u.searchParams.set("host", host);
  return u.toString();
}

async function callSparkWs({ crypto, wsUrl, domain, appId, apiKey, apiSecret, messages, temperature, maxTokens }) {
  const authedUrl = buildAuthorizedWsUrl({ crypto, wsUrl, apiKey, apiSecret });

  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(authedUrl);
    let done = false;
    let content = "";

    const cleanup = () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };

    ws.on("open", () => {
      const payload = {
        header: {
          app_id: String(appId),
          uid: "campus-second-hand-market",
        },
        parameter: {
          chat: {
            domain: String(domain),
            temperature: typeof temperature === "number" ? temperature : 0.7,
            max_tokens: typeof maxTokens === "number" ? maxTokens : 1024,
          },
        },
        payload: {
          message: {
            text: messages,
          },
        },
      };
      ws.send(JSON.stringify(payload));
    });

    ws.on("message", (data) => {
      try {
        const text = typeof data === "string" ? data : data.toString("utf-8");
        const msg = JSON.parse(text);
        const header = msg?.header;
        const code = Number(header?.code);
        if (Number.isFinite(code) && code !== 0) {
          done = true;
          cleanup();
          return reject(Object.assign(new Error(String(header?.message || "Spark WS error")), { upstream: header }));
        }

        const choices = msg?.payload?.choices;
        const parts = choices?.text || [];
        for (const p of parts) {
          if (p?.content) content += String(p.content);
        }

        const status = Number(header?.status ?? choices?.status);
        if (status === 2 && !done) {
          done = true;
          cleanup();
          resolve(content);
        }
      } catch (e) {
        done = true;
        cleanup();
        reject(e);
      }
    });

    ws.on("error", (err) => {
      if (done) return;
      done = true;
      cleanup();
      reject(err);
    });

    ws.on("close", () => {
      if (done) return;
      done = true;
      reject(new Error("Spark WS closed before completion"));
    });
  });
}

export function createAiRouter({ crypto, xfWsUrl, xfDomain, xfAppId, xfApiKey, xfApiSecret }) {
  const router = express.Router();

  // AI 生成商品描述和价格估计
  router.post("/ai/generate-product", async (req, res) => {
    try {
      const { description, images } = req.body;

      if (!description && !images) {
        return res.status(400).json({ error: "请提供商品描述或图片" });
      }

      // 构建提示词
      let prompt = `你是一个专业的二手商品描述专家，帮我为以下商品生成一个完整且简练的商品介绍，并根据市场情况估计一个合理的价格。\n\n`;

      if (description) {
        prompt += `商品描述：${description}\n\n`;
      }

      if (images && images.length > 0) {
        prompt += `商品图片：${images.length}张\n\n`;
        prompt += `请仔细分析图片内容，识别商品的类型、品牌、型号、成色等信息，并在生成的描述中体现出来。\n\n`;
      }

      prompt += `要求：\n1. 生成的描述要专业、详细，突出商品的特点和优势\n2. 描述结构清晰，包括商品特点、使用情况、转手原因、交易方式等\n3. 价格估计要合理，基于市场情况和商品状况\n4. 自动识别商品的分类和成色，并在描述中明确体现\n5. 输出格式：\n   - 分类：商品分类\n   - 成色：商品成色\n   - 描述：商品描述\n   - 价格估计：¥XXX\n\n请严格按照上述格式输出，不要添加任何其他内容。`;

      try {
        if (!xfWsUrl || !xfDomain || !xfAppId || !xfApiKey || !xfApiSecret) {
          return res.status(400).json({
            error: "科大讯飞 WebSocket 配置不完整：请设置 XF_WS_URL/XF_DOMAIN/XF_APP_ID/XF_API_KEY/XF_API_SECRET",
          });
        }

        // 构建消息内容
        const messages = [
          {
            role: "system",
            content:
              "你是一个专业的二手商品描述专家，擅长生成详细、准确的商品介绍和合理的价格估计。你能够根据商品描述和图片识别商品的类型、品牌、型号、成色等信息，并生成专业的商品描述。",
          },
          {
            role: "user",
            content: prompt,
          },
        ];

        // 如果有图片，添加图片数据
        if (images && images.length > 0) {
          images.forEach((image, index) => {
            messages.push({
              role: "user",
              content: `图片 ${index + 1}：data:image/jpeg;base64,${image}`,
            });
          });
        }

        const aiResponse = await callSparkWs({
          crypto,
          wsUrl: xfWsUrl,
          domain: xfDomain,
          appId: xfAppId,
          apiKey: xfApiKey,
          apiSecret: xfApiSecret,
          messages,
          temperature: 0.7,
          maxTokens: 1024,
        });

        // 提取价格信息
        let estimatedPrice = "3500"; // 默认价格
        const priceMatch = aiResponse.match(/价格[:：]\s*¥?\s*(\d+)/);
        if (priceMatch) {
          estimatedPrice = priceMatch[1].trim();
        }

        // 生成商品描述（移除分类、成色和价格信息）
        let generatedDescription = aiResponse
          .split("\n")
          .filter((line) => !line.includes("分类") && !line.includes("成色") && !line.includes("价格"))
          .join("\n");

        generatedDescription = generatedDescription.trim();

        res.json({
          description: generatedDescription,
          price: estimatedPrice,
        });
      } catch (error) {
        console.error("科大讯飞 WS 调用失败:", error);
        return res.status(502).json({ error: "AI 生成失败（科大讯飞WS调用异常）", upstream: error?.upstream });
      }
    } catch (error) {
      console.error("AI 生成失败:", error);
      res.status(500).json({ error: "AI 生成失败，请重试" });
    }
  });

  return router;
}

