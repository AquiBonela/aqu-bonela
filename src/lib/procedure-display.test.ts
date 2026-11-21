import { describe, it, expect } from 'vitest';
import { euroAmount, hasProcedureLink } from './procedure-display';
import { defaultVisibility, editableContent, procedureContentSchema, visibleContent } from './procedure-editor';

describe('procedure presentation rules', () => {
  it.each(['12', '12,50', '0'])('adds euros to numeric amount %s', (value) => {
    expect(euroAmount(value)).toBe(`${value} €`);
  });
  it('does not duplicate euros or alter descriptive prices', () => {
    expect(euroAmount('12 €')).toBe('12 €');
    expect(euroAmount('Tasa oficial vigente')).toBe('Tasa oficial vigente');
    expect(euroAmount('')).toBe('');
  });
  it('requires both a label and URL for any button', () => {
    expect(hasProcedureLink({ label: 'Centro médico', url: '' })).toBe(false);
    expect(hasProcedureLink({ label: '  ', url: '/punto-vuela' })).toBe(false);
    expect(hasProcedureLink({ label: 'Centro médico', url: '/punto-vuela' })).toBe(true);
  });
  it('omits empty actions, sources and step/place links without modifying stored data', () => {
    const empty = { label: '   ', url: '' };
    const input = { primaryAction: empty, links: [empty], guia: { fuentes: [empty], pasos: [{ t: 'Paso', link: empty }], lugares: [{ title: 'Centro', link: empty }] } };
    expect(visibleContent(input, defaultVisibility())).toEqual({ links: [], guia: { fuentes: [], pasos: [{ t: 'Paso' }], lugares: [{ title: 'Centro' }] } });
    expect(input.primaryAction).toEqual(empty);
  });
  it('preserves separate adult and child requirement groups alongside existing requirements', () => {
    const groups = [{ title: 'Mayores de edad', requisitos: ['DNI'] }, { title: 'Menores de edad', requisitos: ['Libro de familia', 'Autorización'] }];
    const input = { ...editableContent(), necesitas: ['Formulario'], requisitosGrupos: groups };
    const parsed = procedureContentSchema.parse(input);
    expect(parsed.requisitosGrupos).toEqual(groups);
    expect(parsed.necesitas).toEqual(['Formulario']);
    expect(visibleContent(input, defaultVisibility())['requisitosGrupos']).toEqual(groups);
    expect(visibleContent(input, { ...defaultVisibility(), necesitas: false })['requisitosGrupos']).toEqual([]);
    expect(input.requisitosGrupos).toEqual(groups);
  });
});