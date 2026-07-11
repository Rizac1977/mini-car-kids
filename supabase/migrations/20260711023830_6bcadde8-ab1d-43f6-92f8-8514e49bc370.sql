
CREATE TYPE public.vehicle_status AS ENUM ('disponivel','em_locacao','manutencao','inativo');

CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  model TEXT,
  color TEXT,
  purchase_date DATE,
  purchase_value NUMERIC(10,2),
  photo_url TEXT,
  notes TEXT,
  status public.vehicle_status NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donos gerenciam seus veículos"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'platform_admin'));

CREATE INDEX idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX idx_vehicles_location_id ON public.vehicles(location_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
