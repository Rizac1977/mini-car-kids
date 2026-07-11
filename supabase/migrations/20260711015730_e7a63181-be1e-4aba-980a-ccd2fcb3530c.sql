-- ============================================================
-- FASE 2: Autenticação, perfis, papéis e logs administrativos
-- ============================================================

-- Enum: papel do usuário
CREATE TYPE public.app_role AS ENUM ('platform_admin', 'vehicle_owner');

-- Enum: situação da conta
CREATE TYPE public.account_status AS ENUM ('pendente', 'ativo', 'suspenso', 'recusado');

-- ============================================================
-- Função utilitária: atualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Tabela: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  profile_photo_url TEXT,
  city TEXT,
  state TEXT,
  account_status public.account_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Tabela: user_roles
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Função security definer: has_role
-- Evita recursão em políticas RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================
-- Tabela: administrative_logs
-- ============================================================
CREATE TABLE public.administrative_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  administrator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  affected_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.administrative_logs TO authenticated;
GRANT ALL ON public.administrative_logs TO service_role;

ALTER TABLE public.administrative_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS: profiles
-- ============================================================

-- Dono vê o próprio perfil
CREATE POLICY "Dono ve seu perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin vê todos os perfis
CREATE POLICY "Admin ve todos os perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Dono cria o próprio perfil (usado pelo trigger de signup também)
CREATE POLICY "Dono cria seu perfil"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Dono atualiza o próprio perfil, MAS não pode mudar o account_status
CREATE POLICY "Dono atualiza seu perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND account_status = (SELECT account_status FROM public.profiles WHERE user_id = auth.uid())
);

-- Admin atualiza qualquer perfil (inclusive account_status)
CREATE POLICY "Admin atualiza qualquer perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- ============================================================
-- POLÍTICAS RLS: user_roles
-- ============================================================

-- Dono vê o próprio papel
CREATE POLICY "Usuario ve seu papel"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin vê todos os papéis
CREATE POLICY "Admin ve todos os papeis"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Somente service_role/trigger insere. Usuário não pode inserir papel manualmente
-- (evita escalada de privilégio). Sem policy de INSERT/UPDATE/DELETE para authenticated.

-- ============================================================
-- POLÍTICAS RLS: administrative_logs
-- ============================================================

-- Somente admin lê
CREATE POLICY "Admin le logs"
ON public.administrative_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Somente admin escreve (e o administrator_id precisa bater com quem escreve)
CREATE POLICY "Admin escreve logs"
ON public.administrative_logs FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'platform_admin')
  AND administrator_id = auth.uid()
);

-- ============================================================
-- Trigger: criar profile + role automaticamente após signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    business_name,
    phone,
    city,
    state,
    account_status
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
