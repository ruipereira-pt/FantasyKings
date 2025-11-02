import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
  it('should perform basic math operations', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  it('should handle string operations', () => {
    const str = 'Fantasy Kings';
    expect(str.toLowerCase()).toBe('fantasy kings');
    expect(str.length).toBe(13);
  });

  it('should validate array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
    expect(arr.filter(n => n > 2)).toEqual([3]);
  });
});

