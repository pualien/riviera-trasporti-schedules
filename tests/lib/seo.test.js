import { describe, expect, it } from 'vitest';
import {
  applySeoMetadata,
  buildDefaultSeoMetadata,
  buildRouteSeoMetadata,
} from '../../src/lib/seo.js';

describe('seo metadata helpers', () => {
  it('builds default and route-aware metadata', () => {
    expect(buildDefaultSeoMetadata()).toMatchObject({
      title: 'Azzuriva',
    });

    expect(buildRouteSeoMetadata({
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayTypeLabel: 'Weekday',
    })).toMatchObject({
      title: 'Porto Maurizio to Sanremo | Azzuriva',
    });
  });

  it('applies metadata to title, description, og, and twitter tags', () => {
    const tags = {
      'meta[name="description"]': {
        content: 'old',
        setAttribute(name, value) {
          this[name] = value;
          this.content = value;
        },
      },
      'meta[property="og:title"]': {
        content: 'old',
        setAttribute(name, value) {
          this[name] = value;
          this.content = value;
        },
      },
      'meta[property="og:description"]': {
        content: 'old',
        setAttribute(name, value) {
          this[name] = value;
          this.content = value;
        },
      },
      'meta[name="twitter:title"]': {
        content: 'old',
        setAttribute(name, value) {
          this[name] = value;
          this.content = value;
        },
      },
      'meta[name="twitter:description"]': {
        content: 'old',
        setAttribute(name, value) {
          this[name] = value;
          this.content = value;
        },
      },
    };

    const doc = {
      title: 'old',
      querySelector(selector) {
        return tags[selector] ?? null;
      },
    };

    applySeoMetadata(doc, {
      title: 'New Title',
      description: 'New description',
    });

    expect(doc.title).toBe('New Title');
    expect(doc.querySelector('meta[name="description"]').content).toBe('New description');
    expect(doc.querySelector('meta[property="og:title"]').content).toBe('New Title');
    expect(doc.querySelector('meta[property="og:description"]').content).toBe('New description');
    expect(doc.querySelector('meta[name="twitter:title"]').content).toBe('New Title');
    expect(doc.querySelector('meta[name="twitter:description"]').content).toBe('New description');
  });
});
