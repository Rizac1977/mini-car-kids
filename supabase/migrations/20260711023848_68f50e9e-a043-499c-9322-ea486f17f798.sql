
CREATE POLICY "Donos leem suas fotos de veiculos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'platform_admin')));

CREATE POLICY "Donos enviam suas fotos de veiculos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Donos atualizam suas fotos de veiculos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Donos removem suas fotos de veiculos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
