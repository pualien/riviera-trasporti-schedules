import { describe, expect, it } from 'vitest';
import { renderAdSlot } from '../../src/ui/renderAdSlot.js';

describe('renderAdSlot', () => {
  it('renders nothing when a slot has no content', () => {
    expect(renderAdSlot({ slotId: 'shell-lead', content: '' })).toBe('');
  });

  it('renders a configured slot with a stable identifier', () => {
    const html = renderAdSlot({
      slotId: 'shell-lead',
      className: 'ad-slot--lead',
      content: '<div>Lead sponsor</div>',
    });

    expect(html).toContain('data-ad-slot="shell-lead"');
    expect(html).toContain('class="ad-slot ad-slot--lead"');
    expect(html).toContain('<div>Lead sponsor</div>');
  });
});
