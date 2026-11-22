import { describe, expect, it, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), sign: vi.fn(), convert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: (bucket: string) => {
  if (bucket !== 'procedure-images') throw new Error('Wrong bucket');
  return { upload: mocks.upload, createSignedUrl: mocks.sign };
} } } }));
vi.mock('./listing-images', async (original) => ({ ...await original<typeof import('./listing-images')>(), toWebp: mocks.convert }));
import { uploadProcedureImage, procedureImageUrl } from './procedure-images';
beforeEach(() => vi.clearAllMocks());
describe('procedure image storage', () => {
  it('uploads a converted image and returns only its immutable path', async () => {
    const blob = new Blob(['converted'], { type: 'image/webp' });
    mocks.convert.mockResolvedValue(blob); mocks.upload.mockResolvedValue({ error: null });
    const path = await uploadProcedureImage('element-id', new File(['photo'], 'photo.png', { type: 'image/png' }));
    expect(path).toMatch(/^element-id\/[\w-]+\.webp$/);
    expect(mocks.upload).toHaveBeenCalledWith(path, blob, { contentType: 'image/webp' });
  });
  it('rejects non-image files before uploading', async () => {
    await expect(uploadProcedureImage('id', new File(['text'], 'text.html', { type: 'text/html' }))).rejects.toThrow('Solo se admiten');
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('does not return a path if upload fails', async () => {
    mocks.convert.mockResolvedValue(new Blob()); mocks.upload.mockResolvedValue({ error: new Error('Denied') });
    await expect(uploadProcedureImage('id', new File(['x'], 'x.jpg', { type: 'image/jpeg' }))).rejects.toThrow('Denied');
  });
  it('uses temporary signed URLs and propagates denied reads', async () => {
    mocks.sign.mockResolvedValueOnce({ data: { signedUrl: 'https://example.com/signed' }, error: null });
    expect(await procedureImageUrl('id/photo.webp')).toBe('https://example.com/signed');
    expect(mocks.sign).toHaveBeenCalledWith('id/photo.webp', 3600);
    mocks.sign.mockResolvedValueOnce({ data: null, error: new Error('Denied') });
    await expect(procedureImageUrl('id/photo.webp')).rejects.toThrow('Denied');
  });
});