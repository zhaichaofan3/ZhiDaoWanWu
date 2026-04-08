export function buildUserService({ db, hashPassword, verifyPassword, smsService }) {
  return {
    async getMyStats(userId) {
      const [
        productRows,
        favoriteRows,
        boughtRows,
        soldRows,
      ] = await Promise.all([
        db.query(
          "SELECT COUNT(*) as count FROM products WHERE owner_id = ? AND status <> 'deleted'",
          [userId]
        ),
        db.query("SELECT COUNT(*) as count FROM favorites WHERE user_id = ?", [userId]),
        db.query("SELECT COUNT(*) as count FROM orders WHERE buyer_id = ?", [userId]),
        db.query("SELECT COUNT(*) as count FROM orders WHERE seller_id = ?", [userId]),
      ]);

      const published = Number(productRows?.[0]?.count || 0);
      const favorites = Number(favoriteRows?.[0]?.count || 0);
      const bought = Number(boughtRows?.[0]?.count || 0);
      const sold = Number(soldRows?.[0]?.count || 0);

      return {
        stats: {
          published,
          favorites,
          bought,
          sold,
          trades: bought + sold,
        },
      };
    },

    async updateProfile(meId, body) {
      const fields = {
        nickname: body.nickname,
        avatar: body.avatar,
        gender: body.gender,
        bio: body.bio,
      };

      if (!fields.nickname || !String(fields.nickname).trim()) {
        return { status: 400, body: { message: "nickname 为必填" } };
      }

      const checkSql = "SELECT * FROM users WHERE nickname = ? AND id != ?";
      const users = await db.query(checkSql, [fields.nickname, meId]);
      if (users.length > 0) {
        return { status: 409, body: { message: "昵称已存在" } };
      }

      await db.update("users", meId, fields);
      return { status: 200, body: { message: "ok" } };
    },

    async updatePassword(meId, oldPassword, newPassword) {
      if (!oldPassword || !newPassword) {
        return { status: 400, body: { message: "oldPassword 和 newPassword 为必填" } };
      }
      if (oldPassword === newPassword) {
        return { status: 400, body: { message: "新密码不能与旧密码相同" } };
      }

      const user = await db.getById("users", meId);
      if (!user) return { status: 404, body: { message: "用户不存在" } };

      const v = await verifyPassword(oldPassword, user.password_hash);
      if (!v.ok) return { status: 401, body: { message: "旧密码不正确" } };

      await db.update("users", meId, { password_hash: await hashPassword(newPassword) });
      return { status: 200, body: { message: "ok" } };
    },

    async listAddresses(userId) {
      const sql = `
        SELECT * FROM addresses
        WHERE user_id = ?
        ORDER BY isDefault DESC, created_at DESC
      `;
      const list = await db.query(sql, [userId]);
      return { list };
    },

    async createAddress(userId, body) {
      const { contact, phone, campus, building, detail, isDefault } = body ?? {};
      if (!contact || !phone || !campus || !building || !detail) {
        return { status: 400, body: { message: "contact、phone、campus、building、detail 为必填" } };
      }

      const countSql = "SELECT COUNT(*) as count FROM addresses WHERE user_id = ?";
      const result = await db.query(countSql, [userId]);
      if (result[0].count >= 10) {
        return { status: 400, body: { message: "最多保存 10 个收货地址" } };
      }

      if (isDefault) {
        await db.query("UPDATE addresses SET isDefault = false WHERE user_id = ?", [userId]);
      }

      const createdAt = new Date().toISOString();
      const addressData = {
        user_id: userId,
        contact,
        phone,
        campus,
        building,
        detail,
        isDefault: Boolean(isDefault),
        created_at: createdAt,
      };
      const addressId = await db.insert("addresses", addressData);
      return { status: 201, body: { message: "ok", address: { id: addressId, ...addressData } } };
    },

    async deleteAddress(userId, addressId) {
      const deleteSql = "DELETE FROM addresses WHERE user_id = ? AND id = ?";
      await db.query(deleteSql, [userId, addressId]);
      return { status: 204, body: null };
    },

    async setDefaultAddress(userId, addressId) {
      const address = await db.getById("addresses", addressId);
      if (!address || address.user_id !== userId) {
        return { status: 404, body: { message: "地址不存在" } };
      }

      await db.query("UPDATE addresses SET isDefault = false WHERE user_id = ?", [userId]);
      await db.query("UPDATE addresses SET isDefault = true WHERE id = ?", [addressId]);
      return { status: 200, body: { message: "ok" } };
    },

    async listNotifications(userId) {
      const sql = `
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      const list = await db.query(sql, [userId]);
      return { list };
    },

    async readNotification(userId, id) {
      const checkSql = "SELECT * FROM notifications WHERE id = ? AND user_id = ?";
      const notifications = await db.query(checkSql, [id, userId]);
      if (notifications.length === 0) {
        return { status: 404, body: { message: "通知不存在" } };
      }
      await db.query("UPDATE notifications SET is_read = true WHERE id = ?", [id]);
      return { status: 200, body: { message: "ok" } };
    },

    async readAllNotifications(userId) {
      await db.query("UPDATE notifications SET is_read = true WHERE user_id = ?", [userId]);
      return { status: 200, body: { message: "ok" } };
    },

    listConversations() {
      return {
        conversations: [
          {
            id: "conv1",
            contact: {
              id: 1,
              nickname: "数码小王子",
              avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
            },
            lastMessage: "iPad还在吗？可以便宜点吗",
            lastTime: "10:30",
            unreadCount: 0,
            productTitle: "iPad Air 5 256G 星光色 99新",
            productPrice: 2800,
            productImage: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100&h=100&fit=crop",
            productId: "1",
          },
        ],
      };
    },

    listMessages(authUid) {
      return {
        messages: [
          { id: "m1", senderId: "1", content: "你好，这个iPad还在吗？", type: "text", time: "10:16", isMe: false },
          {
            id: "m2",
            senderId: String(authUid),
            content: "在的，成色很好，有什么想了解的？",
            type: "text",
            time: "10:20",
            isMe: true,
          },
        ],
      };
    },

    sendMessage(authUid, content, type) {
      if (!content) {
        return { status: 400, body: { message: "消息内容不能为空" } };
      }
      return {
        status: 200,
        body: {
          id: `m${Date.now()}`,
          senderId: String(authUid),
          content,
          type: type || "text",
          time: new Date().toLocaleTimeString(),
          isMe: true,
        },
      };
    },

    async sendChangePhoneCode(meId, newPhone) {
      if (!smsService) return { status: 500, body: { message: "短信服务未配置" } };
      const user = await db.getById("users", meId);
      if (!user) return { status: 404, body: { message: "用户不存在" } };

      const p = String(newPhone || "").trim();
      if (!p) return { status: 400, body: { message: "newPhone 为必填" } };

      // 新手机号不可被占用
      const exists = await db.query("SELECT id FROM users WHERE phone = ?", [p]);
      if (exists.length > 0) return { status: 409, body: { message: "该手机号已被占用" } };

      return smsService.sendCode({ phone: p, scene: "change_phone" });
    },

    async confirmChangePhone(meId, newPhone, code) {
      if (!smsService) return { status: 500, body: { message: "短信服务未配置" } };
      const user = await db.getById("users", meId);
      if (!user) return { status: 404, body: { message: "用户不存在" } };

      const p = String(newPhone || "").trim();
      const c = String(code || "").trim();
      if (!p || !c) return { status: 400, body: { message: "newPhone 和 code 为必填" } };

      const exists = await db.query("SELECT id FROM users WHERE phone = ?", [p]);
      if (exists.length > 0) return { status: 409, body: { message: "该手机号已被占用" } };

      const v = smsService.verifyCode({ phone: p, scene: "change_phone", code: c });
      if (!v.ok) return { status: v.status, body: { message: v.message } };

      await db.update("users", meId, { phone: p });
      return { status: 200, body: { message: "手机号已更新" } };
    },
  };
}

