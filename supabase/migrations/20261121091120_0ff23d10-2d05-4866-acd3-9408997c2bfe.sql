ALTER TABLE public.listings ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.procedures ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE public.translation_gateway_state (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 blocked boolean NOT NULL DEFAULT false,
 reason text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.translation_gateway_state TO authenticated;
GRANT ALL ON public.translation_gateway_state TO service_role;
ALTER TABLE public.translation_gateway_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read translation state" ON public.translation_gateway_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create translation state" ON public.translation_gateway_state FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update translation state" ON public.translation_gateway_state FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER translation_state_updated BEFORE UPDATE ON public.translation_gateway_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();