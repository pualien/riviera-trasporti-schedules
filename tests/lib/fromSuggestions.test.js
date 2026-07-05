import { describe, expect, it } from 'vitest';
import { buildFromSuggestionSections } from '../../src/lib/fromSuggestions.js';

const localities = [
  { id: 'sanremo', label: 'Sanremo', aliases: ['Sanremo Autostazione'], stopIds: ['sanremo-autostazione'] },
  { id: 'andora', label: 'Andora', aliases: ['Andora Stazione FS'], stopIds: ['andora-stazione-fs'] },
  {
    id: 'porto-maurizio',
    label: 'Porto Maurizio',
    aliases: ['Imperia Porto Maurizio'],
    stopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
  },
];

describe('buildFromSuggestionSections', () => {
  it('shows exact departure stops with zone context instead of broad area options', () => {
    const sections = buildFromSuggestionSections({
      inputValue: '',
      localities,
      selectedLocalityLabel: '',
      exactStopChoices: [],
      availableExactStops: [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: [] },
      ],
    });

    expect(sections.areas).toEqual([]);
    expect(sections.exactStops).toEqual([
      {
        value: 'imperia porto maurizio',
        label: 'imperia porto maurizio (Porto Maurizio)',
        meta: 'Stop',
        type: 'exact-stop',
      },
      {
        value: 'sanremo autostazione',
        label: 'sanremo autostazione (Sanremo)',
        meta: 'Stop',
        type: 'exact-stop',
      },
    ]);
  });

  it('shows all departure stops alphabetically before the user types', () => {
    const sections = buildFromSuggestionSections({
      inputValue: '',
      localities,
      selectedLocalityLabel: '',
      exactStopChoices: [],
      availableExactStops: [
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
        { id: 'andora-stazione-fs', canonical: 'andora stazione fs' },
      ],
    });

    expect(sections.areas).toEqual([]);
    expect(sections.exactStops.map((entry) => entry.label)).toEqual([
      'andora stazione fs (Andora)',
      'sanremo autostazione (Sanremo)',
    ]);
  });

  it('keeps exact-stop choices available after a locality is restored from an old link', () => {
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

    expect(sections.areas).toEqual([]);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'imperia porto maurizio',
      'imperia porto maurizio piazza dante',
    ]);
    expect(sections.exactStopHeading).toBe('Porto Maurizio');
  });

  it('matches locality aliases by showing the zone stops, not a zone row', () => {
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

    expect(sections.areas).toEqual([]);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual(['imperia porto maurizio']);
  });

  it('shows exact departure stops before typing regardless of locality coverage', () => {
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

    expect(sections.areas).toEqual([]);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'diano marina',
      'imperia porto maurizio',
    ]);
  });

  it('keeps the blank picker stop-first when locality coverage is broadly useful', () => {
    const sections = buildFromSuggestionSections({
      inputValue: '',
      localities: [
        {
          id: 'imperia',
          label: 'Imperia',
          aliases: ['Porto Maurizio'],
          stopIds: ['imperia-porto-maurizio', 'imperia-oneglia'],
        },
        {
          id: 'sanremo',
          label: 'Sanremo',
          aliases: [],
          stopIds: ['sanremo-autostazione'],
        },
      ],
      selectedLocalityLabel: '',
      exactStopChoices: [],
      availableExactStops: [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: [] },
        { id: 'imperia-oneglia', canonical: 'imperia oneglia', variants: [] },
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: [] },
        { id: 'diano-marina', canonical: 'diano marina', variants: [] },
      ],
    });

    expect(sections.areas).toEqual([]);
    expect(sections.exactStops.map((entry) => entry.value)).toEqual([
      'diano marina',
      'imperia oneglia',
      'imperia porto maurizio',
      'sanremo autostazione',
    ]);
  });
});
