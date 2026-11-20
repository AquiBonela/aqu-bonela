ALTER TABLE public.listing_contacts
  ADD COLUMN phone_2 text,
  ADD COLUMN show_phone_2 boolean NOT NULL DEFAULT false,
  ADD COLUMN linkedin text,
  ADD COLUMN show_linkedin boolean NOT NULL DEFAULT false,
  ADD COLUMN facebook text,
  ADD COLUMN show_facebook boolean NOT NULL DEFAULT false,
  ADD COLUMN youtube text,
  ADD COLUMN show_youtube boolean NOT NULL DEFAULT false,
  ADD COLUMN x_twitter text,
  ADD COLUMN show_x_twitter boolean NOT NULL DEFAULT false,
  ADD COLUMN instagram text,
  ADD COLUMN show_instagram boolean NOT NULL DEFAULT false,
  ADD COLUMN tiktok text,
  ADD COLUMN show_tiktok boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN public_phone_2 text,
  ADD COLUMN public_linkedin text,
  ADD COLUMN public_facebook text,
  ADD COLUMN public_youtube text,
  ADD COLUMN public_x_twitter text,
  ADD COLUMN public_instagram text,
  ADD COLUMN public_tiktok text;

CREATE OR REPLACE FUNCTION public.sync_public_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET
      public_phone = NULL,
      public_phone_2 = NULL,
      public_whatsapp = NULL,
      public_address = NULL,
      public_email = NULL,
      public_linkedin = NULL,
      public_facebook = NULL,
      public_youtube = NULL,
      public_x_twitter = NULL,
      public_instagram = NULL,
      public_tiktok = NULL
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;

  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_phone_2 = CASE WHEN NEW.show_phone_2 THEN NEW.phone_2 END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN NEW.address END,
    public_email = CASE WHEN NEW.show_email THEN NEW.email END,
    public_linkedin = CASE WHEN NEW.show_linkedin THEN NEW.linkedin END,
    public_facebook = CASE WHEN NEW.show_facebook THEN NEW.facebook END,
    public_youtube = CASE WHEN NEW.show_youtube THEN NEW.youtube END,
    public_x_twitter = CASE WHEN NEW.show_x_twitter THEN NEW.x_twitter END,
    public_instagram = CASE WHEN NEW.show_instagram THEN NEW.instagram END,
    public_tiktok = CASE WHEN NEW.show_tiktok THEN NEW.tiktok END
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$function$;