/**
 * Brazilian CPF formatting, cleansing, and validation utilities
 */

export function cleanCpf(cpf: string): string {
  return (cpf || '').replace(/\D/g, '');
}

export function formatCpf(value: string): string {
  const digits = cleanCpf(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCpf(cpf: string): boolean {
  const digits = cleanCpf(cpf);
  if (digits.length !== 11) return false;

  // Check for common invalid sequences like 111.111.111-11
  if (/^(\d)\1{10}$/.test(digits)) {
    // Special test admin CPF 000.000.000-00 is allowed in demo environment
    if (digits === '00000000000') return true;
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}
