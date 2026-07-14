
CREATE TABLE IF NOT EXISTS public.profile_admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_admin_notes TO authenticated;
GRANT ALL ON public.profile_admin_notes TO service_role;

ALTER TABLE public.profile_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin notes"
  ON public.profile_admin_notes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admins can insert admin notes"
  ON public.profile_admin_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admins can update admin notes"
  ON public.profile_admin_notes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Admins can delete admin notes"
  ON public.profile_admin_notes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER update_profile_admin_notes_updated_at
  BEFORE UPDATE ON public.profile_admin_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
