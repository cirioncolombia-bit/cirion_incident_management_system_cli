import { formatValue, validValue } from './indicators';
describe('Indicator values', () => {
  it('formats all four types without rounding persisted money through a JS number', () => {
    expect(formatValue('9999999999999999.99', 2)).toBe('$ 9.999.999.999.999.999,99 COP');
    expect(formatValue('92.5', 1)).toBe('92,5 %');
    expect(formatValue('25.00', 3)).toBe('25');
    expect(formatValue('1.25', 4)).toBe('1,25 días');
    expect(formatValue('bad', 2)).toBe('—');
  });
  it('rejects fractional integers, formatted strings and more than two decimals', () => {
    expect(validValue('25,5', 3)).toBe(false);
    expect(validValue('25', 3)).toBe(true);
    expect(validValue('1972082,00', 2)).toBe(true);
    expect(validValue('$ 1.972.082,00', 2)).toBe(false);
    expect(validValue('1.234', 4)).toBe(false);
    expect(validValue('1e3', 2)).toBe(false);
  });
});
