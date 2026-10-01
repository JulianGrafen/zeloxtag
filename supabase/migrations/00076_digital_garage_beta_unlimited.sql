-- =============================================================================
-- ZeloxTag · Remove digital-garage beta slot cap (was 15 testers)
-- Migration: 00076_digital_garage_beta_unlimited
--
-- NULL digital_garage_beta_max disables limiting in digital_garage_beta_status
-- and create_garage_vehicle (see 00075).
-- =============================================================================

update public.platform_config
set
  value_int = null,
  updated_at = now()
where key = 'digital_garage_beta_max';

notify pgrst, 'reload schema';
