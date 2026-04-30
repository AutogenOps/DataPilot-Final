CREATE OR REFRESH STREAMING TABLE swapi_demo.load_swap.characters
COMMENT 'Silver streaming table for SWAPI characters from bronze raw_data.characters'
AS
SELECT
  name,
  CASE
    WHEN height IS NULL OR lower(height) = 'unknown' THEN NULL
    ELSE height
  END AS height_raw,
  TRY_CAST(NULLIF(lower(height), 'unknown') AS INT) AS height_cm,
  CASE
    WHEN mass IS NULL OR lower(mass) = 'unknown' THEN NULL
    ELSE mass
  END AS mass_raw,
  TRY_CAST(REGEXP_REPLACE(NULLIF(lower(mass), 'unknown'), ',', '') AS DECIMAL(10,2)) AS mass_kg,
  birth_year,
  homeworld,
  current_timestamp() AS _ingested_at,
  current_timestamp() AS _silver_processed_at
FROM STREAM(swapi_demo.raw_data.characters);
