-- State Codes Reference Table
-- Contains all US states and territories with coordinates and regions

-- Drop existing table if it exists (to ensure clean schema)
DROP TABLE IF EXISTS state_codes;

-- Create the state_codes table with UUID primary key for WhaleSync compatibility
CREATE TABLE state_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  region VARCHAR(20)
);

-- Create index on region for filtering
CREATE INDEX idx_state_codes_region ON state_codes(region);

-- Insert all state data
INSERT INTO state_codes (code, name, latitude, longitude, region) VALUES
  ('AK', 'Alaska', 63.588753, -154.493062, 'West'),
  ('AL', 'Alabama', 32.318231, -86.902298, 'Southeast'),
  ('AR', 'Arkansas', 35.20105, -91.831833, 'Southeast'),
  ('AZ', 'Arizona', 34.048928, -111.093731, 'Southwest'),
  ('CA', 'California', 36.778261, -119.417932, 'West'),
  ('CO', 'Colorado', 39.550051, -105.782067, 'West'),
  ('CT', 'Connecticut', 41.603221, -73.087749, 'Northeast'),
  ('DC', 'District of Columbia', 38.905985, -77.033418, 'Southeast'),
  ('DE', 'Delaware', 38.910832, -75.52767, 'Southeast'),
  ('FL', 'Florida', 27.664827, -81.515754, 'Southeast'),
  ('GA', 'Georgia', 32.157435, -82.907123, 'Southeast'),
  ('HI', 'Hawaii', 19.898682, -155.665857, 'West'),
  ('IA', 'Iowa', 41.878003, -93.097702, 'Midwest'),
  ('ID', 'Idaho', 44.068202, -114.742041, 'West'),
  ('IL', 'Illinois', 40.633125, -89.398528, 'Midwest'),
  ('IN', 'Indiana', 40.551217, -85.602364, 'Midwest'),
  ('KS', 'Kansas', 39.011902, -98.484246, 'Midwest'),
  ('KY', 'Kentucky', 37.839333, -84.270018, 'Southeast'),
  ('LA', 'Louisiana', 30.984298, -91.962333, 'Southeast'),
  ('MA', 'Massachusetts', 42.407211, -71.382437, 'Northeast'),
  ('MD', 'Maryland', 39.045755, -76.641271, 'Southeast'),
  ('ME', 'Maine', 45.253783, -69.445469, 'Northeast'),
  ('MI', 'Michigan', 44.314844, -85.602364, 'Midwest'),
  ('MN', 'Minnesota', 46.729553, -94.6859, 'Midwest'),
  ('MO', 'Missouri', 37.964253, -91.831833, 'Midwest'),
  ('MS', 'Mississippi', 32.354668, -89.398528, 'Southeast'),
  ('MT', 'Montana', 46.879682, -110.362566, 'West'),
  ('NC', 'North Carolina', 35.759573, -79.0193, 'Southeast'),
  ('ND', 'North Dakota', 47.551493, -101.002012, 'Midwest'),
  ('NE', 'Nebraska', 41.492537, -99.901813, 'Midwest'),
  ('NH', 'New Hampshire', 43.193852, -71.572395, 'Northeast'),
  ('NJ', 'New Jersey', 40.058324, -74.405661, 'Northeast'),
  ('NM', 'New Mexico', 34.97273, -105.032363, 'Southwest'),
  ('NV', 'Nevada', 38.80261, -116.419389, 'West'),
  ('NY', 'New York', 43.299428, -74.217933, 'Northeast'),
  ('OH', 'Ohio', 40.417287, -82.907123, 'Midwest'),
  ('OK', 'Oklahoma', 35.007752, -97.092877, 'Southwest'),
  ('OR', 'Oregon', 43.804133, -120.554201, 'West'),
  ('PA', 'Pennsylvania', 41.203322, -77.194525, 'Northeast'),
  ('PR', 'Puerto Rico', 18.220833, -66.590149, NULL),
  ('RI', 'Rhode Island', 41.580095, -71.477429, 'Northeast'),
  ('SC', 'South Carolina', 33.836081, -81.163725, 'Southeast'),
  ('SD', 'South Dakota', 43.969515, -99.901813, 'Midwest'),
  ('TN', 'Tennessee', 35.517491, -86.580447, 'Southeast'),
  ('TX', 'Texas', 31.968599, -99.901813, 'Southwest'),
  ('UT', 'Utah', 39.32098, -111.093731, 'West'),
  ('VA', 'Virginia', 37.431573, -78.656894, 'Southeast'),
  ('VT', 'Vermont', 44.558803, -72.577841, 'Northeast'),
  ('WA', 'Washington', 47.751074, -120.740139, 'West'),
  ('WI', 'Wisconsin', 43.78444, -88.787868, 'Midwest'),
  ('WV', 'West Virginia', 38.597626, -80.454903, 'Southeast'),
  ('WY', 'Wyoming', 43.075968, -107.290284, 'West');

-- Grant access (adjust based on your RLS policies)
-- ALTER TABLE state_codes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read access to all authenticated users" ON state_codes
--   FOR SELECT TO authenticated USING (true);
