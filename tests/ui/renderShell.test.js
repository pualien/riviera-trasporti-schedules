import { describe, expect, it } from 'vitest';
import { renderShell } from '../../src/ui/renderShell.js';

describe('renderShell', () => {
  it('renders the approved lockup, descriptor, and official-site link', () => {
    const html = renderShell('<section>Body</section>');

    expect(html).toContain('./assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png');
    expect(html).toContain('alt="Riviera Trasporti Ricerca Percorsi wordmark"');
    expect(html).toContain('Official PDF, clearer route lookup');
    expect(html).toContain('Official Riviera Trasporti site');
    expect(html).toContain('<section>Body</section>');
  });
});
