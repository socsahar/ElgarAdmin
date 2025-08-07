-- Vehicle System Setup for Supabase
-- Run these commands in your Supabase SQL Editor

-- 1. Add vehicle permissions to existing ENUM
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'vehicle_use_system';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'vehicle_manage_system';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'vehicle_manage_permissions';

-- 2. Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate TEXT NOT NULL UNIQUE,
    vehicle_type TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    owner_name TEXT,
    owner_address TEXT,
    owner_phone TEXT,
    vehicle_image_url TEXT,
    owner_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id)
);

-- 3. Create updated_at trigger for vehicles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS on vehicles table (optional - disable for now)
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Note: RLS disabled for now as this system uses custom auth, not Supabase auth
-- You can enable RLS later if needed with proper policies

-- 5. Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO postgres;
GRANT ALL ON vehicles TO postgres;

-- Success message
SELECT 'Vehicle system database setup complete!' as message;
