ALTER TABLE public.listings ADD COLUMN urgent_24h boolean NOT NULL DEFAULT false;
UPDATE public.listings SET urgent_24h = true WHERE slug IN ('fontaneria-paco','electricidad-jm');