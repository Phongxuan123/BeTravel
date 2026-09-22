import request from "supertest";

/*
 * Helper dung chung cho test admin: dang ky mot user roi (tuy chon) nang len
 * role admin truc tiep trong DB -- nhanh hon di qua luong nang quyen that,
 * chap nhan duoc vi day la test, khong phai code san pham.
 */
export const registerAndLogin = async (app, { role = "user", email } = {}) => {
  const User = (await import("../src/models/User.js")).default;

  const uniqueEmail =
    email ?? `test_${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;

  await request(app)
    .post("/api/auth/register")
    .send({
      fullName: "Test User",
      email: uniqueEmail,
      phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: "Matkhau123",
      confirmPassword: "Matkhau123",
      termsAccepted: true,
    });

  if (role === "admin") {
    await User.updateOne({ email: uniqueEmail }, { $set: { role: "admin" } });
  }

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: uniqueEmail, password: "Matkhau123" });

  return { accessToken: loginRes.body.data.accessToken, user: loginRes.body.data.user };
};
