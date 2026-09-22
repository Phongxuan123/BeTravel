/*
 * Tao tai khoan admin dau tien, hoac nang quyen mot user co san.
 * Dung: npm run create-admin -- --email a@b.com --password Matkhau123 [--fullName "Ten"]
 */
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import User from "../src/models/User.js";
import { UserRole } from "../src/core/constants.js";

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i += 1;
    }
  }
  return args;
};

const run = async () => {
  const { email, password, fullName } = parseArgs(process.argv.slice(2));

  if (!email || !password) {
    console.error(
      "Thiếu tham số. Dùng: npm run create-admin -- --email a@b.com --password Matkhau123",
    );
    process.exit(1);
  }

  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: env.MONGO_MAX_POOL_SIZE });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    existing.role = UserRole.ADMIN;
    existing.isActive = true;
    await existing.save();
    console.log(`Đã nâng quyền admin cho user có sẵn: ${existing.email} (${existing.username})`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    const usernameBase = normalizedEmail.split("@")[0].replace(/[^a-z0-9_]/g, "") || "admin";

    const created = await User.create({
      username: usernameBase,
      fullName: fullName || "Quản trị viên",
      email: normalizedEmail,
      phone: "",
      password: passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    });
    console.log(`Đã tạo tài khoản admin mới: ${created.email} (${created.username})`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error("Lỗi tạo admin:", error);
  process.exit(1);
});
