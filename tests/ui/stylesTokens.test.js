import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('styles design tokens', () => {
  it('keeps product CSS on reusable tokens instead of brittle one-off heading styles', () => {
    const source = fs.readFileSync('styles.css', 'utf8');

    expect(source).toContain('--surface-solid:');
    expect(source).not.toContain('#ffffff');
    expect(source).not.toMatch(/letter-spacing:\s*-/);
    expect(source).not.toContain('font-size: clamp(');
  });
});
