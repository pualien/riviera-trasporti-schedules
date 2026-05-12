import { defineConfig } from 'vitest/config';

export const config = {
  test: {
    include: ['tests/**/*.test.js'],
    exclude: [
      '.worktrees/**',
      'worktrees/**',
      'node_modules/**',
      'dist/**',
    ],
  },
};

export default defineConfig(config);
