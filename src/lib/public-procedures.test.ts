import { describe, expect, it } from 'vitest';
import { publicProcedureList, procedureTranslationMap } from './public-procedures';
import { editableContent } from './procedure-editor';
import type { ProcedureCategory, ProcedureRow } from './admin-procedures';
import type { Json } from '@/integrations/supabase/types';
import { procedureDeletionMarker, procedureList } from './admin-procedures';
import { TRAMITES } from './tramites';

const category: ProcedureCategory = { id: 'cat', slug: 'documentacion', title: 'Documentación personal', description: '', title_en: '', description_en: '', visible: true, sort_order: 0, created_at: '', updated_at: '' };
const content = { ...editableContent(), title: 'Solicitud', short: 'Texto original', slug: 'solicitud', cat: 'documentacion' };
const row: ProcedureRow = { id: 'procedure', category_id: 'cat', slug: 'solicitud', title: 'Solicitud', summary: '', status: 'publicada', sort_order: 10, source_key: null, content: content as Json, content_en: {}, translations: { nl: { source: content as Json, content: { ...content, title: 'Aanvraag', short: 'Nederlandse correctie' } as Json, manual: true } }, visibility: {}, created_at: '', updated_at: '' };
describe('public saved procedures', () => {
  it('removes the old European health card from admin and public lists without removing TSE', () => {
    const health = { ...category, id: 'health', slug: 'salud' };
    const template = TRAMITES.find((t) => t.slug === 'tarjeta-europea');
    if (!template) throw new Error('Missing European health card template');
    const deleted = { ...row, ...procedureDeletionMarker(template, health.id) };
    const tse = { ...row, id: 'tse', category_id: health.id, title: 'Tarjeta Sanitaria Europea (TSE)', slug: 'tarjeta-sanitaria-europea' };
    const rows = [deleted, tse];
    expect(procedureList(rows, [health]).filter((t) => t.title.includes('Europea'))).toEqual([
      expect.objectContaining({ id: 'tse', title: 'Tarjeta Sanitaria Europea (TSE)' }),
    ]);
    expect(procedureList(rows, [health]).some((t) => t.id === 'tarjeta-europea' || t.id === deleted.id)).toBe(false);
    const publicList = publicProcedureList(rows, [health]).procedures;
    expect(publicList.some((t) => t.slug === 'tarjeta-europea')).toBe(false);
    expect(publicList.find((t) => t.slug === 'tarjeta-sanitaria-europea')?.title).toBe('Tarjeta Sanitaria Europea (TSE)');
  });
  it('suppresses a deleted legacy guide even when its saved slug changed', () => {
    const template = TRAMITES.find((t) => t.slug === 'certificado-digital');
    if (!template) throw new Error('Missing certificate template');
    const saved = { ...row, slug: 'certificado-editado', source_key: 'documentacion/certificado-digital' };
    const deleted = { ...saved, ...procedureDeletionMarker(template, category.id, saved) };
    expect(publicProcedureList([deleted], [category]).procedures.some((t) => ['certificado-digital', 'certificado-editado'].includes(t.slug))).toBe(false);
    expect(procedureList([deleted], [category]).some((t) => ['certificado-digital', saved.id].includes(t.id))).toBe(false);
    expect(deleted.content).toEqual({});
    expect(deleted.translations).toEqual({});
  });
  it('includes published saved guides with their independently corrected Dutch content', () => {
    const result = publicProcedureList([row], [category]);
    const saved = result.procedures.find((t) => t.slug === 'solicitud');
    expect(saved?.title).toBe('Solicitud');
    if (!saved) throw new Error('Missing procedure');
    expect(procedureTranslationMap(saved, 'nl')['Texto original']).toBe('Nederlandse correctie');
    expect(procedureTranslationMap(saved, 'es')).toEqual({});
  });
  it('excludes drafts from public results', () => {
    expect(publicProcedureList([{ ...row, status: 'borrador' }], [category]).procedures.some((t) => t.slug === 'solicitud')).toBe(false);
  });
  it('excludes procedures from hidden categories', () => {
    expect(publicProcedureList([row], [{ ...category, visible: false }]).procedures).toEqual([]);
  });
  it('hides disabled sections without deleting their stored text', () => {
    const input = { ...row, content: { ...content, para: ['Uso original'] } as Json, visibility: { para: false } };
    expect(publicProcedureList([input], [category]).procedures.find((t) => t.slug === 'solicitud')?.para).toEqual([]);
    expect(input.content).toMatchObject({ para: ['Uso original'] });
  });
  it('replaces a legacy guide once its saved replacement is published', () => {
    const replacement = { ...row, slug: 'certificado-digital', source_key: 'documentacion/certificado-digital' };
    const matches = publicProcedureList([replacement], [category]).procedures.filter((t) => t.slug === 'certificado-digital');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.title).toBe('Solicitud');
  });
});