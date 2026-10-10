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

  it('keeps the light theme on semantic contrast-safe roles', () => {
    const source = fs.readFileSync('styles.css', 'utf8');
    const rootBlock = source.match(/^:root\s*\{[\s\S]*?^\}/m)?.[0] ?? '';
    const componentCss = source.replace(rootBlock, '');

    expect(rootBlock).toContain('color-scheme: light');
    expect(rootBlock).toContain('--color-cream:');
    expect(rootBlock).toContain('--color-ink:');
    expect(rootBlock).toContain('--color-coral:');
    expect(rootBlock).toContain('--surface-selected:');
    expect(rootBlock).toContain('--border-control:');
    expect(rootBlock).toContain('--focus-ring:');
    expect(rootBlock).toContain('--scrim:');

    expect(componentCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(componentCss).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(/);
    expect(componentCss).not.toMatch(/^\s*color:\s*var\(--accent/m);
    expect(componentCss).not.toMatch(/outline:\s*none/);
    expect(source).not.toContain('gradient(');
    expect(source).not.toContain('prefers-color-scheme');
  });
});
