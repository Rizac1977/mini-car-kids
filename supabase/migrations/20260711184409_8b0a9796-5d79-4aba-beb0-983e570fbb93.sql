
-- 1) administrative_logs: bloquear explicitamente UPDATE e DELETE para todos
CREATE POLICY "Ninguem atualiza logs"
  ON public.administrative_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Ninguem deleta logs"
  ON public.administrative_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- 2) rentals: substituir policy FOR ALL por policies separadas
DROP POLICY IF EXISTS "Owners manage own rentals" ON public.rentals;

CREATE POLICY "Donos criam locações próprias"
  ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos veem locações próprias"
  ON public.rentals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Donos atualizam locações próprias"
  ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos deletam locações próprias"
  ON public.rentals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
