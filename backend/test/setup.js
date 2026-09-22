import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

/*
 * Test dùng mongodb-memory-server thay vì Atlas thật: chạy được offline, trong
 * CI, và không tốn kết nối Atlas M0 (vốn đã eo hẹp). Atlas thật chỉ bắt buộc
 * cho Vector Search / Atlas Search ở B4 trở đi.
 */
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-only-secret-please-change-in-real-env";
process.env.AUTH_TRANSPORT ??= "both";
// Nhỏ có chủ đích: env.js đóng băng giá trị này lúc import đầu tiên nên test
// không thể đổi nó giữa chừng -- đặt sẵn 1 giây để test "trong cửa sổ ân hạn"
// chạy ngay lập tức và test "ngoài cửa sổ ân hạn" chỉ cần chờ hơn 1 giây.
process.env.REFRESH_ROTATION_GRACE_SECONDS ??= "1";

let mongod;

export const startTestDb = async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
};

export const stopTestDb = async () => {
  await mongoose.disconnect();
  await mongod?.stop();
};

export const clearTestDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};
