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
