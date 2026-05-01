import { describe, expect, it } from 'vitest';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

describe('renderSearchForm', () => {
  it('renders location actions on both route fields', () => {
    const html = renderSearchForm();

    expect(html).toContain('data-location-field="from"');
    expect(html).toContain('data-location-field="to"');
    expect(html).toContain('Use my location');
  });
});
