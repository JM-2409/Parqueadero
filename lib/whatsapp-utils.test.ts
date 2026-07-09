import { describe, it, expect } from 'vitest';
import { formatPhoneNumber } from './whatsapp-utils';

describe('formatPhoneNumber', () => {
  it('debería agregar el prefijo whatsapp y el código de país si falta', () => {
    expect(formatPhoneNumber('3001234567')).toBe('whatsapp:+573001234567');
  });

  it('debería agregar el prefijo whatsapp pero no duplicar el código de país si ya está', () => {
    expect(formatPhoneNumber('573001234567')).toBe('whatsapp:+573001234567');
  });

  it('debería limpiar caracteres no numéricos como espacios y guiones', () => {
    expect(formatPhoneNumber('300 123-4567')).toBe('whatsapp:+573001234567');
    expect(formatPhoneNumber('+57 300 123 4567')).toBe('whatsapp:+573001234567');
    expect(formatPhoneNumber('(300) 123-4567')).toBe('whatsapp:+573001234567');
  });

  it('debería manejar strings vacíos devolviendo solo el prefijo y código base', () => {
    expect(formatPhoneNumber('')).toBe('whatsapp:+57');
  });

  it('debería manejar entradas que solo contengan caracteres no numéricos', () => {
    expect(formatPhoneNumber('abc def')).toBe('whatsapp:+57');
  });
});
