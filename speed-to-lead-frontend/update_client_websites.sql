-- Update client websites based on research
-- This script adds website URLs for all existing clients

-- High Caliber - Multiple locations found, using Cullman, AL (most established)
UPDATE clients SET website = 'https://www.highcalibermechanical.com/' WHERE id = 'High Caliber';

-- New Century Duct - LA based company
UPDATE clients SET website = 'https://www.newcentury-hvac.com' WHERE id = 'New Century Duct';

-- AAdvantage - VA based company (most established)
UPDATE clients SET website = 'https://www.a-advantage.com/' WHERE id = 'AAdvantage';

-- Air Pro - Using Pittsburgh location as main site
UPDATE clients SET website = 'https://aphvac.com/' WHERE id = 'Air Pro';

-- Air Pro LP - No specific LP company found, using general Air Pro Virginia
UPDATE clients SET website = 'https://airproinc.net/' WHERE id = 'Air Pro LP';

-- Bridge Plumbing - Using Utah location (most comprehensive site)
UPDATE clients SET website = 'https://www.bridgeplumbing.net/' WHERE id = 'Bridge Plumbing';

-- CBrooks - Using New Jersey Brooks Plumbing & Heating
UPDATE clients SET website = 'https://brooksplumbingheatingllc.com/' WHERE id = 'CBrooks';

-- Climate Doctor - Using Michigan location (most established)
UPDATE clients SET website = 'https://climate-doctor.com/' WHERE id = 'Climate Doctor';

-- Comfort Craftsmen - Using Massachusetts location
UPDATE clients SET website = 'https://www.comfort-craftsmen.com/' WHERE id = 'Comfort Craftsmen';

-- Dale Plumbing - Using Redwood City, CA (most established, 65+ years)
UPDATE clients SET website = 'https://daleplumbinginc.com/' WHERE id = 'Dale Plumbing';

-- Empire Plumbing LP - No specific LP found, using generic Empire Plumbing
UPDATE clients SET website = 'https://empireplumbingac.com/' WHERE id = 'Empire Plumbing LP';

-- Girdner Heat & Air - Found exact match in Oklahoma
UPDATE clients SET website = 'https://girdnerheatandair.com/' WHERE id = 'Girdner Heat & Air';

-- Green Bay Moving - Using local Green Bay company
UPDATE clients SET website = 'https://greenbaymovingco.com/' WHERE id = 'Green Bay Moving';

-- Harris Plumbing - Using NJ/PA/DE company (most established since 1986)
UPDATE clients SET website = 'https://www.callharrisnow.com/' WHERE id = 'Harris Plumbing';

-- KSR - Using Illinois KSR HVAC & Electrical
UPDATE clients SET website = 'https://ksr-hvac.com/' WHERE id = 'KSR';

-- My Cool Neighbor - Found exact match in Kansas
UPDATE clients SET website = 'https://mycoolneighbor.com/' WHERE id = 'My Cool Neighbor';

-- Platinum HVAC - Using New Jersey location
UPDATE clients SET website = 'https://platinumhvac.us/' WHERE id = 'Platinum HVAC';

-- Ridgeline - Using Idaho location (comprehensive site)
UPDATE clients SET website = 'https://idahofallsheatingandcooling.com/' WHERE id = 'Ridgeline';

-- Running Water Plumbing - Using Idaho location (most established)
UPDATE clients SET website = 'https://runningwaterplumbingidaho.com/' WHERE id = 'Running Water Plumbing';

-- Southern Air - Using Virginia location (most established since 1946)
UPDATE clients SET website = 'https://www.southern-air.com/' WHERE id = 'Southern Air';

-- Tegrity - No specific match found, using general contractor site
UPDATE clients SET website = 'https://www.buildzoom.com/contractor/tegrity-contractors-inc' WHERE id = 'Tegrity';

-- The Comfort Specialists - Using Massachusetts location
UPDATE clients SET website = 'https://tcs-ma.com/' WHERE id = 'The Comfort Specialists';

-- Add timestamp to track when websites were added
-- (Note: PostgreSQL doesn't auto-update updated_at, so we'll manually update it)
UPDATE clients SET updated_at = NOW() 
WHERE id IN (
    'High Caliber', 'New Century Duct', 'AAdvantage', 'Air Pro', 'Air Pro LP',
    'Bridge Plumbing', 'CBrooks', 'Climate Doctor', 'Comfort Craftsmen', 'Dale Plumbing',
    'Empire Plumbing LP', 'Girdner Heat & Air', 'Green Bay Moving', 'Harris Plumbing',
    'KSR', 'My Cool Neighbor', 'Platinum HVAC', 'Ridgeline', 'Running Water Plumbing',
    'Southern Air', 'Tegrity', 'The Comfort Specialists'
);