ALTER TABLE public.listing_contacts ADD COLUMN email text, ADD COLUMN show_email boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN public_email text;
CREATE OR REPLACE FUNCTION public.sync_public_contact() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET public_phone = NULL, public_whatsapp = NULL, public_address = NULL, public_email = NULL WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN NEW.address END,
    public_email = CASE WHEN NEW.show_email THEN NEW.email END
  WHERE id = NEW.listing_id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_public_contact() FROM PUBLIC, anon, authenticated;
GRANT SELECT (contact_email, admin_whatsapp) ON public.site_settings TO anon;