import { describe, expect, it } from 'vitest';
import { procedureList } from './admin-procedures';

describe('requested draft cleanup', () => {
  it.each(['vida-laboral', 'demanda-empleo', 'dependencia', 'ayuda-alquiler', 'carnet-conducir', 'multas', 'licencia-obras', 'instancia-general'])('does not restore the deleted %s draft as an unsaved template', (slug) => {
    expect(procedureList([], []).some((t) => t.id === slug)).toBe(false);
  });
  it.each(['nie', 'clave', 'tie'])('keeps the protected %s guide available in the editor', (slug) => {
    expect(procedureList([], []).some((t) => t.id === slug)).toBe(true);
  });
});