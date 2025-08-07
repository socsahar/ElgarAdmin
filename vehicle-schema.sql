-- Vehicle Search System Database Schema
-- Creates tables for vehicles, owners, and search functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create vehicle_owners table
CREATE TABLE IF NOT EXISTS vehicle_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    id_number TEXT UNIQUE,
    date_of_birth DATE,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate TEXT NOT NULL UNIQUE,
    make TEXT,
    model TEXT,
    year INTEGER,
    color TEXT,
    vehicle_type TEXT, -- רכב, אופנוע, משאית וכו'
    owner_id UUID REFERENCES vehicle_owners(id) ON DELETE SET NULL,
    vin TEXT UNIQUE, -- Vehicle Identification Number
    engine_number TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active', -- active, stolen, impounded, etc.
    notes TEXT,
    insurance_company TEXT,
    insurance_policy TEXT,
    insurance_expires DATE,
    last_seen_location TEXT,
    last_seen_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create vehicle_search_logs table for audit trail
CREATE TABLE IF NOT EXISTS vehicle_search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    search_query TEXT,
    search_type TEXT, -- license_plate, owner_name, phone, etc.
    results_count INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles USING gin(license_plate gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles USING gin((make || ' ' || model) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);

CREATE INDEX IF NOT EXISTS idx_vehicle_owners_full_name ON vehicle_owners USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicle_owners_phone ON vehicle_owners USING gin(phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicle_owners_id_number ON vehicle_owners(id_number);

CREATE INDEX IF NOT EXISTS idx_vehicle_search_logs_user_id ON vehicle_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_search_logs_created_at ON vehicle_search_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_owners_updated_at ON vehicle_owners;
CREATE TRIGGER update_vehicle_owners_updated_at 
    BEFORE UPDATE ON vehicle_owners 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_search_logs ENABLE ROW LEVEL SECURITY;

-- Policy for vehicle_search_access permission
CREATE POLICY "Users with vehicle_search_access can view vehicles" ON vehicles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.permission_name = 'vehicle_search_access'
            AND up.is_active = true
        )
    );

CREATE POLICY "Users with vehicle_search_access can view vehicle_owners" ON vehicle_owners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.permission_name = 'vehicle_search_access'
            AND up.is_active = true
        )
    );

-- Policy for vehicle_admin_access permission
CREATE POLICY "Users with vehicle_admin_access can manage vehicles" ON vehicles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.permission_name = 'vehicle_admin_access'
            AND up.is_active = true
        )
    );

CREATE POLICY "Users with vehicle_admin_access can manage vehicle_owners" ON vehicle_owners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.permission_name = 'vehicle_admin_access'
            AND up.is_active = true
        )
    );

-- Policy for search logs - users can only see their own logs
CREATE POLICY "Users can view their own search logs" ON vehicle_search_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own search logs" ON vehicle_search_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all search logs
CREATE POLICY "Admins can view all search logs" ON vehicle_search_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.permission_name = 'vehicle_admin_access'
            AND up.is_active = true
        )
    );

-- Create a view for comprehensive vehicle search
CREATE OR REPLACE VIEW vehicle_search_view AS
SELECT 
    v.id,
    v.license_plate,
    v.make,
    v.model,
    v.year,
    v.color,
    v.vehicle_type,
    v.vin,
    v.engine_number,
    v.image_url,
    v.status,
    v.notes as vehicle_notes,
    v.insurance_company,
    v.insurance_policy,
    v.insurance_expires,
    v.last_seen_location,
    v.last_seen_date,
    v.created_at,
    v.updated_at,
    o.id as owner_id,
    o.full_name as owner_name,
    o.phone as owner_phone,
    o.address as owner_address,
    o.id_number as owner_id_number,
    o.date_of_birth as owner_birth_date,
    o.image_url as owner_image_url,
    o.notes as owner_notes,
    -- Create search text for full-text search
    (
        COALESCE(v.license_plate, '') || ' ' ||
        COALESCE(v.make, '') || ' ' ||
        COALESCE(v.model, '') || ' ' ||
        COALESCE(v.color, '') || ' ' ||
        COALESCE(v.vin, '') || ' ' ||
        COALESCE(o.full_name, '') || ' ' ||
        COALESCE(o.phone, '') || ' ' ||
        COALESCE(o.id_number, '')
    ) as search_text
FROM vehicles v
LEFT JOIN vehicle_owners o ON v.owner_id = o.id;

-- Grant necessary permissions
GRANT SELECT ON vehicle_search_view TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_owners TO authenticated;
GRANT SELECT, INSERT ON vehicle_search_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE vehicles IS 'רכבים - מכיל מידע על כלי רכב במערכת';
COMMENT ON TABLE vehicle_owners IS 'בעלי רכב - מכיל מידע על בעלי הרכבים';
COMMENT ON TABLE vehicle_search_logs IS 'לוגים של חיפושים - לביקורת ומעקב';
COMMENT ON VIEW vehicle_search_view IS 'תצוגה מקיפה לחיפוש רכבים ובעלים';

-- Insert sample data (optional - remove if not needed)
-- INSERT INTO vehicle_owners (full_name, phone, id_number) VALUES
-- ('יוסי כהן', '0501234567', '123456789'),
-- ('שרה לוי', '0507654321', '987654321');

-- INSERT INTO vehicles (license_plate, make, model, year, color, owner_id) VALUES
-- ('12-345-67', 'טויוטה', 'קורולה', 2020, 'לבן', (SELECT id FROM vehicle_owners WHERE full_name = 'יוסי כהן')),
-- ('98-765-43', 'מאזדה', 'CX5', 2019, 'שחור', (SELECT id FROM vehicle_owners WHERE full_name = 'שרה לוי'));

COMMIT;
