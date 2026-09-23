import { z } from "zod";

const normalizePhoneInput = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[\s.-]/g, "");

const vietnamPhoneSchema = z
  .string()
  .transform(normalizePhoneInput)
  .refine((phone) => /^(0|\+84)[0-9]{9}$/.test(phone), "Số điện thoại không hợp lệ");

const strongPasswordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(128, "Mật khẩu quá dài")
  .regex(/[A-Z]/, "Mật khẩu cần có ít nhất 1 chữ hoa")
  .regex(/[a-z]/, "Mật khẩu cần có ít nhất 1 chữ thường")
  .regex(/[0-9]/, "Mật khẩu cần có ít nhất 1 chữ số");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(150, "Họ tên quá dài"),

    // Username không hiển thị trên màn hình đăng ký.
    // Nếu client không gửi, backend sẽ tự sinh từ email.
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username phải có ít nhất 3 ký tự")
      .max(30, "Username tối đa 30 ký tự")
      .regex(/^[a-z0-9_]+$/, "Username chỉ được chứa chữ thường, số và dấu gạch dưới")
      .optional(),

    email: z.string().trim().toLowerCase().email("Email không hợp lệ"),

    // Số điện thoại bắt buộc khi đăng ký (quyết định nghiệp vụ) -- màn hình
    // đăng ký mobile có ô nhập riêng, xem register.tsx.
    phone: vietnamPhoneSchema,

    password: strongPasswordSchema,

    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),

    termsAccepted: z.boolean().refine((value) => value === true, "Bạn phải đồng ý với điều khoản"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Vui lòng nhập email, số điện thoại hoặc tên tài khoản"),

  password: z.string().min(1, "Vui lòng nhập mật khẩu"),

  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: strongPasswordSchema,
});
