-- Remove generic placeholder designs (will be replaced by detailed variants)
DELETE FROM designs WHERE is_latest = true;

-- Insert detailed variants from org_designs into designs table
-- Brusset collection_id: 14f35fb7-949d-49fb-9692-afbc1c06dac4
-- Frameshaper collection_id: 07636f6e-9bc3-4f56-ba28-4549fd54d9c4
-- Philipp Haffmanns collection_id: 7e11d32b-f4ae-4e4f-ab5c-b19280f24dc4

INSERT INTO designs (
  name, master_udi_di_base, collection_id, size, construction_type,
  serial_prefix, fixed_gtin, weight_g, lens_width_mm, bridge_width_mm,
  temple_length_mm, glb_preview_url, is_latest, version,
  manufacturer_name, manufacturer_address, manufacturer_atu,
  manufacturer_city, manufacturer_contact
)
SELECT
  od.name,
  COALESCE(od.master_udi_di_base, 'UNKNOWN'),
  CASE
    WHEN od.collection = 'Brusset' THEN '14f35fb7-949d-49fb-9692-afbc1c06dac4'::uuid
    WHEN od.collection = 'Frame Shaper' THEN '07636f6e-9bc3-4f56-ba28-4549fd54d9c4'::uuid
    WHEN od.collection = 'Philipp Haffmans' THEN '7e11d32b-f4ae-4e4f-ab5c-b19280f24dc4'::uuid
  END,
  od.size,
  od.construction_type,
  od.serial_prefix,
  od.fixed_gtin,
  od.weight_g,
  od.lens_width_mm,
  od.bridge_width_mm,
  od.temple_length_mm,
  od.image_url,
  true,
  1,
  od.manufacturer_name,
  od.manufacturer_address,
  od.manufacturer_atu,
  od.manufacturer_city,
  od.manufacturer_contact
FROM org_designs od
WHERE od.is_active = false
  AND od.collection IN ('Brusset', 'Philipp Haffmans', 'Frame Shaper');