import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), translate: vi.fn() }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/lib/translate.server', () => ({ translateSource: mocks.translate }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const chain = {
    middleware: () => chain,
    inputValidator: () => chain,
    handler: (handler: (ctx: unknown) => unknown) => (input: { data: unknown }) => handler({ data: input.data, context: {
      userId: 'test-user', supabase: { rpc: mocks.rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }), upsert: mocks.upsert }) },
    } }),
  };
  return chain;
} }));
import { generateTranslation } from './translation.functions';
const data = { source: { description: 'Texto original' }, lang: 'nl' as const };
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
function allowed() {
  vi.stubEnv('LOVABLE_API_KEY', 'unit-test-placeholder');
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
}
describe('authorized translation requests', () => {
  it('denies ordinary accounts before making a billed translation call', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(generateTranslation({ data })).rejects.toThrow('Solo los administradores');
    expect(mocks.translate).not.toHaveBeenCalled();
  });
  it('does not automatically retry a persisted credit or access block', async () => {
    allowed();
    mocks.maybeSingle.mockResolvedValue({ data: { blocked: true, reason: 'Access denied' }, error: null });
    expect(await generateTranslation({ data })).toMatchObject({ ok: false, blocked: true, message: 'Access denied' });
    expect(mocks.translate).not.toHaveBeenCalled();
  });
  it('persists upstream access denials without retrying', async () => {
    allowed();
    mocks.translate.mockRejectedValue({ statusCode: 403, responseBody: JSON.stringify({ message: 'Provider access denied' }) });
    expect(await generateTranslation({ data })).toMatchObject({ ok: false, blocked: true, message: 'Provider access denied' });
    expect(mocks.translate).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith({ id: true, blocked: true, reason: 'Provider access denied' });
  });
  it('clears a pause only after an explicit successful administrator action', async () => {
    allowed();
    mocks.maybeSingle.mockResolvedValue({ data: { blocked: true, reason: 'Limit' }, error: null });
    mocks.translate.mockResolvedValue({ description: 'Nederlandse tekst' });
    expect(await generateTranslation({ data: { ...data, resume: true } })).toEqual({ ok: true, contentJson: '{"description":"Nederlandse tekst"}' });
    expect(mocks.upsert).toHaveBeenCalledWith({ id: true, blocked: false, reason: '' });
  });
});