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
      availableExactStops: [],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual(['Porto Maurizio']);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'imperia porto maurizio',
      'imperia porto maurizio piazza dante',
    ]);
    expect(sections.exactStopHeading).toBe('Porto Maurizio');
  });

  it('matches locality aliases and network-wide departure stops before a locality is selected', () => {
    const sections = buildFromSuggestionSections({
      inputValue: 'imperia porto maurizio',
      localities,
      selectedLocalityLabel: '',
      exactStopChoices: [],
      availableExactStops: [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
        { id: 'diano-marina', canonical: 'diano marina', variants: [] },
      ],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual(['Porto Maurizio']);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual(['imperia porto maurizio']);
  });

  it('shows exact departure stops before typing when locality coverage is incomplete', () => {
    const sections = buildFromSuggestionSections({
      inputValue: '',
      localities: [
        {
          id: 'porto-maurizio',
          label: 'Porto Maurizio',
          aliases: ['Imperia Porto Maurizio'],
          stopIds: ['imperia-porto-maurizio'],
        },
      ],
      selectedLocalityLabel: '',
      exactStopChoices: [],
      availableExactStops: [
        { id: 'diano-marina', canonical: 'diano marina', variants: [] },
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
      ],
    });

    expect(sections.areas.map((entry) => entry.value)).toEqual(['Porto Maurizio']);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'diano marina',
      'imperia porto maurizio',
    ]);
  });
});
