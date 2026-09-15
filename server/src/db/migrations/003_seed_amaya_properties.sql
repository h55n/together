-- Canonical V1 starter-property instances. Stable UUIDs make household assignment deterministic across environments.
INSERT INTO properties (id, city_id, property_type, building_id, unit_id, base_layout_id) VALUES
  ('10000000-0000-4000-8000-000000000001', 'amaya_bay', 'couple_studio', 'mogra_court_a', 'a-102', 'studio_01'),
  ('10000000-0000-4000-8000-000000000002', 'amaya_bay', 'one_bhk', 'mogra_court_b', 'b-204', 'one_bhk_01'),
  ('10000000-0000-4000-8000-000000000003', 'amaya_bay', 'courtyard_2bhk', 'mogra_court_c', 'c-101', 'courtyard_2bhk_01'),
  ('10000000-0000-4000-8000-000000000004', 'amaya_bay', 'pg_house', 'rain_tree_pg_01', 'house', 'pg_house_01'),
  ('10000000-0000-4000-8000-000000000005', 'amaya_bay', 'hostel_floor', 'mogra_hostel_01', 'floor-3', 'hostel_floor_01')
ON CONFLICT (id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  property_type = EXCLUDED.property_type,
  building_id = EXCLUDED.building_id,
  unit_id = EXCLUDED.unit_id,
  base_layout_id = EXCLUDED.base_layout_id;
