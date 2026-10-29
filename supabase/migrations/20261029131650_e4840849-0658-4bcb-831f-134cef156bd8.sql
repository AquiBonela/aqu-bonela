CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  contact text CHECK (contact IS NULL OR length(trim(contact)) <= 160),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 5 AND 1000),
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.suggestions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can suggest a business"
  ON public.suggestions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read suggestions"
  ON public.suggestions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update suggestions"
  ON public.suggestions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete suggestions"
  ON public.suggestions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
