import { describe, expect, it, vi } from 'vitest';
import { contentUnits, correctedFields, editTranslation, languagesToGenerate, mergeGlossary, readTranslations, resetTranslationField } from './content-translations';

const calls = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('./ai/responses.server.ts', () => ({ createResponsesCall: calls.create }));
import { translateSource } from './translate.server';

describe('correction-aware refresh', () => {
  const spanish = { description: 'Pide cita previa.', short_description: 'Ayuda local' };
  const uk = { source: spanish, content: { description: 'Запишіться на прийом.', short_description: 'Місцева допомога' }, manual: false };
  it('records only the Ukrainian field edited and stores its preferred phrase', () => {
    const edited = editTranslation({ uk }, 'uk', { ...uk.content, description: 'Заздалегідь запишіться на прийом.' }, spanish);
    expect(correctedFields(edited.uk)).toEqual(['description']);
    expect(edited.uk?.glossary?.[0]).toMatchObject({ source: 'Pide cita previa.', target: 'Заздалегідь запишіться на прийом.' });
    expect(languagesToGenerate(edited, { ...spanish, short_description: 'Ayuda municipal' })).toContain('uk');
  });
  it('does not mark untouched empty fields as manual when creating the first translation', () => {
    const edited = editTranslation({}, 'uk', { description: 'Запишіться на прийом.', short_description: '' }, spanish);
    expect(edited.uk?.manualFields).toEqual(['description']);
    expect(languagesToGenerate(edited, spanish)).toContain('uk');
  });
  it('reuses the unchanged corrected field exactly and translates changed Spanish fields', async () => {
    calls.create.mockReturnValue({ result: { output: Promise.resolve({ strings: ['Муніципальна допомога'] }) } });
    const previous = { ...uk, manual: true, manualFields: ['description'] };
    const result = await translateSource({ ...spanish, short_description: 'Ayuda municipal' }, 'uk', 'unit-test', previous);
    expect(result['description']).toBe('Запишіться на прийом.');
    expect(result['short_description']).toBe('Муніципальна допомога');
    const input = JSON.parse(calls.create.mock.calls.at(-1)?.[2][0].content);
    expect(input.strings).toEqual(['Ayuda municipal']);
  });
  it('updates a corrected field with current facts and supplies the old correction and shared glossary', async () => {
    calls.create.mockReturnValue({ result: { output: Promise.resolve({ strings: ['Заздалегідь запишіться на прийом за 2 дні.'] }) } });
    const preferred = { source: 'cita previa', target: 'попередній запис', updatedAt: 1 };
    const previous = { ...uk, manual: true, manualFields: ['description'] };
    const result = await translateSource({ ...spanish, description: 'Pide cita previa con 2 días.' }, 'uk', 'unit-test', previous, [preferred]);
    expect(result['description']).toBe('Заздалегідь запишіться на прийом за 2 дні.');
    const input = JSON.parse(calls.create.mock.calls.at(-1)?.[2][0].content);
    expect(input.context.previousTranslation.description).toBe('Запишіться на прийом.');
    expect(input.context.glossary).toEqual([preferred]);
    expect(input.context.correctedFields).toEqual(['description']);
  });
  it('does not reuse array items by position after Spanish step reordering', () => {
    expect(contentUnits({ guia: { pasos: [{ t: 'Primero' }, { t: 'Segundo' }] } })).toEqual({ 'guia.pasos': [{ t: 'Primero' }, { t: 'Segundo' }] });
  });
  it('keeps glossary and field corrections when reading saved JSON', () => {
    const saved = editTranslation({ uk }, 'uk', { ...uk.content, description: 'Corrección' }, spanish);
    const read = readTranslations(JSON.parse(JSON.stringify(saved)));
    expect(read.uk?.manualFields).toEqual(['description']);
    expect(read.uk?.glossary?.[0]?.target).toBe('Corrección');
  });
  it('keeps the most recent preference for the same Spanish phrase across records', () => {
    expect(mergeGlossary([{ source: 'Cita previa', target: 'Old', updatedAt: 1 }, { source: 'Cita previa', target: 'Corrected', updatedAt: 2 }])).toEqual([{ source: 'Cita previa', target: 'Corrected', updatedAt: 2 }]);
  });
  it('resets only the selected corrected field', () => {
    const previous = { ...uk, manual: true, manualFields: ['description', 'short_description'] };
    const reset = resetTranslationField({ uk: previous }, 'uk', 'description');
    expect(reset.uk?.manualFields).toEqual(['short_description']);
    expect(reset.uk?.source['short_description']).toBe('Ayuda local');
    expect(languagesToGenerate(reset, spanish)).toContain('uk');
  });
  it('ignores identifier and visibility tags when choosing translation work', () => {
    expect(languagesToGenerate({ uk: { ...uk, source: { ...spanish, slug: 'old', tags: ['gratis'] } } }, { ...spanish, slug: 'new', tags: [] })).not.toContain('uk');
  });
});