// Chẩn đoán SMTP không gửi email, không in tài khoản, mật khẩu hoặc OTP.
import { verifyPasswordResetEmailService } from "../src/services/email.service.js";
try {
  await verifyPasswordResetEmailService();
  console.log("SMTP kết nối/xác thực thành công; chưa xác nhận thư đến hộp thư.");
} catch {
  console.error("SMTP chưa sẵn sàng. Kiểm tra cấu hình, mạng và log mã lỗi backend.");
  process.exitCode = 1;
}
