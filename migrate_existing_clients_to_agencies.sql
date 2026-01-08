-- Migration script to assign existing clients to "Contractor Kingdom" agency

-- Step 1: Create "Contractor Kingdom" agency if it doesn't exist
INSERT INTO agencies (name)
VALUES ('Contractor Kingdom')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get the agency ID for "Contractor Kingdom"
DO $$
DECLARE
  contractor_kingdom_id UUID;
BEGIN
  SELECT id INTO contractor_kingdom_id
  FROM agencies
  WHERE name = 'Contractor Kingdom'
  LIMIT 1;

  -- Step 3: Update all existing clients to belong to Contractor Kingdom
  IF contractor_kingdom_id IS NOT NULL THEN
    UPDATE clients
    SET agency_id = contractor_kingdom_id
    WHERE agency_id IS NULL;
    
    RAISE NOTICE 'Assigned % clients to Contractor Kingdom', (SELECT COUNT(*) FROM clients WHERE agency_id = contractor_kingdom_id);
  ELSE
    RAISE EXCEPTION 'Could not find Contractor Kingdom agency';
  END IF;
END $$;
