/*
 * Hình dạng `user` trả về client, khai báo ở đúng MỘT chỗ.
 * Đặt ở core (không phải trong auth.service) để refreshToken.service dùng được
 * mà không tạo vòng import giữa hai service.
 * Tuyệt đối không chứa `password`.
 */
export const serializeUser = (user) => ({
  id: user._id.toString(),
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
