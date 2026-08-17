/**
 * 密码复杂度校验（与后端 backend/auth.py 的 validate_password_strength 保持一致）
 * 规则：长度 ≥ 8；大写/小写/数字/特殊字符至少 3 类。
 * 返回错误信息字符串，校验通过返回空字符串。
 * （"不含用户名"与弱密码黑名单由后端兜底校验，前端不重复实现）
 */
export function passwordStrengthError(value: string): string {
  if (!value || value.length < 8) return '密码至少 8 位';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  if (kinds < 3) return '需包含大写字母、小写字母、数字、特殊字符中的至少 3 类';
  return '';
}
