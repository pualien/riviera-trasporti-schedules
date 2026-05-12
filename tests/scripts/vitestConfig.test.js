import { describe, expect, it } from 'vitest';
import { config } from '../../vitest.config.js';

describe('vitest config', () => {
  it('limits test discovery to the repository test tree and excludes worktrees', () => {
    expect(config.test.include).toEqual(['tests/**/*.test.js']);
    expect(config.test.exclude).toEqual(
      expect.arrayContaining([
        '.worktrees/**',
        'worktrees/**',
      ]),
    );
  });
});
