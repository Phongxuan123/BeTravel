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
/*
 * B4: nguong RAG_MIN_TOP_SCORE/RAG_MIN_SOFT_SCORE mac dinh (0.62/0.55) duoc
 * hieu chinh cho hinh hoc cosine cua embedding THAT (Gemini). MockEmbedding
 * (bag-of-words bam tu, xem rag/embedding/mock.embedding.js) khong co ngu
 * nghia thuc su nen diem cosine thap hon nhieu du noi dung THUC SU lien quan
 * (~0.15-0.35 quan sat duoc qua smoke test that). Ha nguong CHI trong test de
 * golden test (SEARCH_DRIVER=memory + LLM_PROVIDER=mock, CLAUDE.md bat buoc
 * khong goi API that) van phan biet duoc noi dung lien quan/khong lien quan,
 * KHONG anh huong nguong that dung voi Gemini o production (.env rieng).
 */
process.env.RAG_MIN_TOP_SCORE ??= "0.27";
process.env.RAG_MIN_SOFT_SCORE ??= "0.2";
process.env.RAG_MIN_CHUNKS ??= "1";

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
