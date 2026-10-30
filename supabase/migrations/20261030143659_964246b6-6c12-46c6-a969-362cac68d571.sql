ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS public_website text,
  ADD COLUMN IF NOT EXISTS home_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_area text NOT NULL DEFAULT '';

CREATE TABLE public.listing_activities (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, activity_id)
);
CREATE INDEX listing_activities_activity_idx ON public.listing_activities(activity_id);

GRANT SELECT ON public.listing_activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_activities TO authenticated;
GRANT ALL ON public.listing_activities TO service_role;

ALTER TABLE public.listing_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads activities of published" ON public.listing_activities
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_activities.listing_id AND l.status = 'publicada'));

CREATE POLICY "Admins manage listing activities" ON public.listing_activities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rellenar con la actividad principal actual de cada ficha
INSERT INTO public.listing_activities (listing_id, activity_id, sort_order)
SELECT l.id, a.id, 0
FROM public.listings l
JOIN public.activities a ON a.name = l.activity AND (l.category_id IS NULL OR a.category_id = l.category_id)
ON CONFLICT DO NOTHING;