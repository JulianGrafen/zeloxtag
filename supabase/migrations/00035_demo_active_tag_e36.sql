-- Align production demo-active-tag vehicle with the BMW E36 showcase twin.
UPDATE public.vehicles v
SET
  make = 'BMW',
  model = '328i',
  year = 1995,
  vin = 'WBABA9105SAL123456',
  tech_specs = jsonb_build_object(
    'engine', '2.8 M52',
    'powerPs', 193,
    'powerKw', 142,
    'torqueNm', 298,
    'displacementCc', 2793,
    'fuelType', 'Benzin',
    'transmission', '5-Gang manuell',
    'drivetrain', 'Heckantrieb',
    'color', 'Arctissilber Metallic',
    'bodyType', 'Coupé',
    'notes', 'E36 · Widebody · GT-Flügel · KW V1 · BBS LM',
    'dynoChartUrl', '/demo/dyno-e36.svg'
  ),
  updated_at = now()
FROM public.tags t
WHERE t.uuid = 'demo-active-tag'
  AND t.vehicle_id = v.id;
