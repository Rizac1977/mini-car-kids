
-- 1) rental_renewals
CREATE TABLE public.rental_renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_minutes INTEGER NOT NULL CHECK (added_minutes > 0),
  added_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (added_amount >= 0),
  previous_end_at TIMESTAMPTZ NOT NULL,
  new_end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX rental_renewals_rental_id_idx ON public.rental_renewals(rental_id);
CREATE INDEX rental_renewals_user_id_idx ON public.rental_renewals(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_renewals TO authenticated;
GRANT ALL ON public.rental_renewals TO service_role;

ALTER TABLE public.rental_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donos veem suas renovações"
  ON public.rental_renewals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Donos criam renovações próprias"
  ON public.rental_renewals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Campos de cancelamento em rentals
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- 3) Atualiza o trigger para liberar veículo também quando cancelada
CREATE OR REPLACE FUNCTION public.sync_vehicle_status_on_rental()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'ativa' THEN
    UPDATE public.vehicles SET status = 'em_locacao' WHERE id = NEW.vehicle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ativa' AND NEW.status <> 'ativa' THEN
    UPDATE public.vehicles SET status = 'disponivel' WHERE id = NEW.vehicle_id
      AND NOT EXISTS (
        SELECT 1 FROM public.rentals
        WHERE vehicle_id = NEW.vehicle_id AND status = 'ativa' AND id <> NEW.id
      );
  END IF;
  RETURN NEW;
END;
$function$;
