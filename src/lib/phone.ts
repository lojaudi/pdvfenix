/**
 * Normaliza telefone brasileiro: remove não-dígitos e garante prefixo 55.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

/**
 * Formata telefone para exibição: +55 (XX) XXXXX-XXXX
 */
export function formatPhoneDisplay(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length < 12) return d;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
}
