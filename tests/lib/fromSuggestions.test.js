import { describe, expect, it } from 'vitest';
import { buildFromSuggestionSections } from '../../src/lib/fromSuggestions.js';

const localities = [
  { id: 'sanremo', label: 'Sanremo', aliases: ['Sanremo Autostazione'] },
  { id: 'andora', label: 'Andora', aliases: ['Andora Stazione FS'] },
  { id: 'porto-maurizio', label: 'Porto Maurizio', aliases: ['Imperia Porto Maurizio'] },
];

describe('buildFromSuggestionSections', () => {
  it('shows all localities alphabetically before the user types', () => {
    const sections = buildFromSuggestionSections({
      inputValue: '',
      localities,
      selectedLocalityLabel: '',
      exactStopChoices: [],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual([
      'Andora',
      'Porto Maurizio',
      'Sanremo',
    ]);
    expect(sections.exactStops).toEqual([]);
  });

  it('keeps area browsing available after a locality is selected and adds exact-stop refinement', () => {
    const sections = buildFromSuggestionSections({
      inputValue: 'porto',
      localities,
      selectedLocalityLabel: 'Porto Maurizio',
      exactStopChoices: [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
        { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'imperia porto maurizio piazza dante' },
      ],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual(['Porto Maurizio']);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'imperia porto maurizio',
      'imperia porto maurizio piazza dante',
    ]);
    expect(sections.exactStopHeading).toBe('Porto Maurizio');
  });
});
