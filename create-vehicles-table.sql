-- ===============================================================================
-- VEHICLE SEARCH SYSTEM (שאילתא) - DATABASE SCHEMA
-- ===============================================================================
-- Hebrew RTL Vehicle Search System for Car Theft Tracking
-- Feature: Allow volunteers to search for vehicle information
-- Access: Only logged-in volunteers, admin management for authorized users
-- Date: August 7, 2025
-- ===============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create vehicles table for the Vehicle Search System
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Vehicle Information
    license_plate TEXT NOT NULL UNIQUE, -- מספר רכב (unique identifier)
    vehicle_type TEXT NOT NULL, -- סוג רכב
    vehicle_model TEXT NOT NULL, -- דגם רכב  
    vehicle_color TEXT NOT NULL, -- צבע רכב
    
    -- Owner Information
    owner_name TEXT NOT NULL, -- שם בעלים
    owner_address TEXT NOT NULL, -- כתובת מגורים
    owner_phone TEXT NOT NULL, -- מספר טלפון
    
    -- Images (stored as URLs in Supabase Storage)
    vehicle_image_url TEXT, -- תמונה של הרכב
    owner_image_url TEXT, -- תמונה של הבעלים או נהג מורשה
    
    -- Metadata
    created_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Search optimization - add indexes
    CONSTRAINT check_license_plate_not_empty CHECK (license_plate != ''),
    CONSTRAINT check_owner_phone_format CHECK (owner_phone ~ '^05[0-9]{8}$|^0[2-4,8-9][0-9]{7,8}$')
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON public.vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_model ON public.vehicles(vehicle_model);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_color ON public.vehicles(vehicle_color);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_name ON public.vehicles(owner_name);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_phone ON public.vehicles(owner_phone);

-- Create full-text search index for combined searching
CREATE INDEX IF NOT EXISTS idx_vehicles_search ON public.vehicles 
USING gin(to_tsvector('english', 
    license_plate || ' ' || 
    vehicle_type || ' ' || 
    vehicle_model || ' ' || 
    vehicle_color || ' ' || 
    owner_name || ' ' || 
    owner_address
));

-- Enable Row Level Security
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicles table
-- Allow all for development (in production, restrict based on user permissions)
DROP POLICY IF EXISTS "Allow all for development" ON public.vehicles;
CREATE POLICY "Allow all for development" ON public.vehicles FOR ALL USING (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_vehicles_updated_at_trigger ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at_trigger
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicles_updated_at();

-- Add permission for vehicle search access
DO $$ 
BEGIN
    -- Add vehicle_search_access permission if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'vehicle_search_access' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permission_type')
    ) THEN
        ALTER TYPE permission_type ADD VALUE 'vehicle_search_access';
        RAISE NOTICE '✅ Added permission: vehicle_search_access';
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add vehicle_admin_access permission if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'vehicle_admin_access' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permission_type')
    ) THEN
        ALTER TYPE permission_type ADD VALUE 'vehicle_admin_access';
        RAISE NOTICE '✅ Added permission: vehicle_admin_access';
    END IF;
END $$;

-- COMMIT the enum changes
COMMIT;

-- Grant vehicle search access to all volunteers and above
INSERT INTO public.role_default_permissions (role, permission, is_default) VALUES
-- All roles can search vehicles
('מפתח', 'vehicle_search_access', true),
('אדמין', 'vehicle_search_access', true),
('פיקוד יחידה', 'vehicle_search_access', true),
('מפקד משל"ט', 'vehicle_search_access', true),
('מוקדן', 'vehicle_search_access', true),
('סייר', 'vehicle_search_access', true),

-- Only admin roles can add/edit/delete vehicles
('מפתח', 'vehicle_admin_access', true),
('אדמין', 'vehicle_admin_access', true),
('פיקוד יחידה', 'vehicle_admin_access', true)
ON CONFLICT (role, permission) DO NOTHING;

-- Grant permissions to existing users
INSERT INTO public.user_permissions (user_id, permission, granted_by_id, is_active)
SELECT 
    u.id,
    'vehicle_search_access',
    NULL, -- System assigned
    true
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = 'vehicle_search_access'
);

INSERT INTO public.user_permissions (user_id, permission, granted_by_id, is_active)
SELECT 
    u.id,
    'vehicle_admin_access',
    NULL, -- System assigned
    true
FROM public.users u
WHERE u.role IN ('מפתח', 'אדמין', 'פיקוד יחידה')
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = 'vehicle_admin_access'
);

-- Insert sample vehicle data for testing
INSERT INTO public.vehicles (
    license_plate, vehicle_type, vehicle_model, vehicle_color,
    owner_name, owner_address, owner_phone,
    created_by_id
) VALUES
(
    '12-345-67',
    'סדאן',
    'טויוטה קורולה',
    'לבן',
    'יוסי כהן',
    'רחוב הרצל 15, תל אביב',
    '0501234567',
    (SELECT id FROM public.users WHERE username = 'admin' LIMIT 1)
),
(
    '89-012-34',
    'רכב שטח',
    'פורד אקספלורר',
    'שחור',
    'רחל לוי',
    'שדרות רוטשילד 25, רמת גן',
    '0529876543',
    (SELECT id FROM public.users WHERE username = 'admin' LIMIT 1)
),
(
    '56-789-01',
    'האצ׳בק',
    'פולקסווגן גולף',
    'כחול',
    'מיכאל אברהם',
    'רחוב דיזנגוף 88, תל אביב',
    '0541122334',
    (SELECT id FROM public.users WHERE username = 'admin' LIMIT 1)
)
ON CONFLICT (license_plate) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.vehicles IS 'טבלת רכבים למערכת שאילתות';
COMMENT ON COLUMN public.vehicles.license_plate IS 'מספר רכב (מזהה ייחודי)';
COMMENT ON COLUMN public.vehicles.vehicle_type IS 'סוג רכב';
COMMENT ON COLUMN public.vehicles.vehicle_model IS 'דגם רכב';
COMMENT ON COLUMN public.vehicles.vehicle_color IS 'צבע רכב';
COMMENT ON COLUMN public.vehicles.owner_name IS 'שם בעלים';
COMMENT ON COLUMN public.vehicles.owner_address IS 'כתובת מגורים';
COMMENT ON COLUMN public.vehicles.owner_phone IS 'מספר טלפון';
COMMENT ON COLUMN public.vehicles.vehicle_image_url IS 'תמונה של הרכב';
COMMENT ON COLUMN public.vehicles.owner_image_url IS 'תמונה של הבעלים או נהג מורשה';

-- Success message
SELECT 'Vehicle Search System (שאילתא) database created successfully! 🚗' as message;

-- Display created data
SELECT 
    'Vehicles table created with ' || COUNT(*) || ' sample records' as result
FROM public.vehicles;
