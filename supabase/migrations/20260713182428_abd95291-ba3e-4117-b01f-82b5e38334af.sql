CREATE UNIQUE INDEX IF NOT EXISTS rentals_one_active_per_vehicle
  ON public.rentals (vehicle_id)
  WHERE status = 'ativa';