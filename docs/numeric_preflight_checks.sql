-- =============================================================================
-- Pre-Migration Validation: Numeric Conversion Check
-- Date: 2026-10-02
-- Purpose: Run this script BEFORE applying 20261002000005_phase4_schema_changes.sql
--          to ensure existing data in the evaluations table is castable to NUMERIC.
-- =============================================================================

-- 1. Identify non-numeric correctness values
SELECT evaluation_id, correctness 
FROM evaluations 
WHERE correctness IS NOT NULL 
  AND correctness !~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';

-- 2. Identify non-numeric completeness values
SELECT evaluation_id, completeness 
FROM evaluations 
WHERE completeness IS NOT NULL 
  AND completeness !~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';

-- 3. Identify non-numeric confidence values
SELECT evaluation_id, confidence 
FROM evaluations 
WHERE confidence IS NOT NULL 
  AND confidence !~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';

-- Note: If any of these queries return rows, the data must be cleaned up manually 
-- before the ALTER COLUMN TYPE NUMERIC migration will succeed.
