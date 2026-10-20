// Khớp validator backend: ký tự đặc biệt được phép nhưng không bắt buộc.
export const PASSWORD_REQUIREMENTS = '8–128 ký tự, có ít nhất 1 chữ hoa (A–Z), 1 chữ thường (a–z) và 1 chữ số (0–9). Ký tự đặc biệt không bắt buộc.';

export function passwordValidationMessage(password: string): string | null {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (password.length > 128) return 'Mật khẩu tối đa 128 ký tự.';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu cần ít nhất 1 chữ hoa.';
  if (!/[a-z]/.test(password)) return 'Mật khẩu cần ít nhất 1 chữ thường.';
  if (!/[0-9]/.test(password)) return 'Mật khẩu cần ít nhất 1 chữ số.';
  return null;
}

export function isPasswordValid(password: string): boolean {
  return passwordValidationMessage(password) === null;
}
