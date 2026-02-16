-- Fix locations_with_state view
-- state column is UUID type, joins directly to state_codes.id

DROP VIEW IF EXISTS locations_with_state;

CREATE VIEW locations_with_state AS
SELECT l.*, sc.code as state_code
FROM locations l
LEFT JOIN state_codes sc ON sc.id = l.state;
