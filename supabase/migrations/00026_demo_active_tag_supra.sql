-- Align production demo-active-tag vehicle with the Toyota Supra A80 showcase twin.
UPDATE public.vehicles v
SET
  make = 'Toyota',
  model = 'Supra',
  year = 1998,
  vin = 'JT2JA82J0W0000001',
  tech_specs = jsonb_build_object(
    'engine', '3.0 Twin-Turbo (2JZ-GTE)',
    'powerPs', 330,
    'powerKw', 243,
    'displacementCc', 2997,
    'fuelType', 'Benzin',
    'transmission', '6-Gang manuell',
    'drivetrain', 'Heckantrieb',
    'color', 'Deep Blue Mica',
    'bodyType', 'Coupé',
    'notes', 'A80 · Widebody · GReddy Wing'
  ),
  updated_at = now()
FROM public.tags t
WHERE t.uuid = 'demo-active-tag'
  AND t.vehicle_id = v.id;
