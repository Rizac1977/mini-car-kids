
ALTER TABLE public.rentals DROP COLUMN IF EXISTS location_id;
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS location_id;
DROP TABLE IF EXISTS public.locations CASCADE;
