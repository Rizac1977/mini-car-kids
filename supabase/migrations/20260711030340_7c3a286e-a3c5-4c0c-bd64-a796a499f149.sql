
CREATE TYPE public.rental_status AS ENUM ('ativa','finalizada','cancelada');

CREATE TABLE public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  planned_minutes integer NOT NULL CHECK (planned_minutes > 0),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  planned_end_at timestamptz NOT NULL,
  ended_at timestamptz,
  status public.rental_status NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rentals_user_status_idx ON public.rentals (user_id, status);
CREATE INDEX rentals_vehicle_active_idx ON public.rentals (vehicle_id) WHERE status = 'ativa';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentals TO authenticated;
GRANT ALL ON public.rentals TO service_role;

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own rentals"
  ON public.rentals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all rentals"
  ON public.rentals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER update_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep vehicle status in sync
CREATE OR REPLACE FUNCTION public.sync_vehicle_status_on_rental()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'ativa' THEN
    UPDATE public.vehicles SET status = 'em_locacao' WHERE id = NEW.vehicle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ativa' AND NEW.status <> 'ativa' THEN
    UPDATE public.vehicles SET status = 'disponivel' WHERE id = NEW.vehicle_id
      AND NOT EXISTS (SELECT 1 FROM public.rentals WHERE vehicle_id = NEW.vehicle_id AND status = 'ativa' AND id <> NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rentals_sync_vehicle_status
  AFTER INSERT OR UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_status_on_rental();
