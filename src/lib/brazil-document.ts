function allDigitsEqual(value: string) {
  return /^([0-9])\1+$/.test(value);
}

function hasValidCheckDigits(value: string, baseLength: number, firstFactor: number) {
  let base = value.slice(0, baseLength);
  for (let digitIndex = baseLength; digitIndex < value.length; digitIndex += 1) {
    let sum = 0;
    let factor = firstFactor + (digitIndex - baseLength);
    for (const digit of base) {
      sum += Number(digit) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? 0 : 11 - remainder;
    if (checkDigit !== Number(value[digitIndex])) return false;
    base += String(checkDigit);
  }
  return true;
}

export function documentDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpfCnpj(value: string) {
  const digits = documentDigits(value);
  if (allDigitsEqual(digits)) return false;

  if (digits.length === 11) {
    let sum = 0;
    for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== Number(digits[9])) return false;

    sum = 0;
    for (let index = 0; index < 10; index += 1) sum += Number(digits[index]) * (11 - index);
    check = (sum * 10) % 11;
    if (check === 10) check = 0;
    return check === Number(digits[10]);
  }

  if (digits.length === 14) return hasValidCheckDigits(digits, 12, 5);
  return false;
}