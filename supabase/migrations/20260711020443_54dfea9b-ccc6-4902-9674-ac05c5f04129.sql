-- =========================
-- SUBSCRIPTIONS
-- =========================
CREATE TYPE public.subscription_status AS ENUM ('trial', 'ativa', 'inadimplente', 'cancelada');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status public.subscription_status NOT NULL DEFAULT 'trial',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono ve sua assinatura" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin ve todas assinaturas" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admin gerencia assinaturas" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- LOCATIONS
-- =========================
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_user_id ON public.locations(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono ve seus locais" ON public.locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Dono cria seus locais" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono atualiza seus locais" ON public.locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono apaga seus locais" ON public.locations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin ve todos locais" ON public.locations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admin gerencia locais" ON public.locations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Assinatura automatica no signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, business_name, phone, city, state, account_status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    'pendente'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vehicle_owner');

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'trial', 'trial');

  RETURN NEW;
END;
$$;

-- Backfill: assinatura trial para donos que ja existem
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT p.user_id, 'trial', 'trial'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.user_id
);
