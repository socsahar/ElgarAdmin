-- Migration script to add the new 'can_connect_to_website' permission
-- This script should be run after updating the database-setup.sql with the new ENUM value

-- First, add the new ENUM value to existing permission_type (if not already added)
-- Note: This requires dropping and recreating the type if it already exists with data
-- In production, you'd use ALTER TYPE ADD VALUE instead

-- Update existing users to have the new permission based on their role
-- Default users (role = 'user') should have canConnectToWebsite = true
-- All other roles should also have this permission

-- Update users table to add the new permission to existing users
UPDATE public.users 
SET permissions = permissions || jsonb_build_object('canConnectToWebsite', true)
WHERE permissions IS NOT NULL;

-- For users without permissions object, create it with the new permission
UPDATE public.users 
SET permissions = jsonb_build_object('canConnectToWebsite', true)
WHERE permissions IS NULL;

-- Update specific role defaults if needed
-- Admin users - they should have all permissions including the new one
UPDATE public.users 
SET permissions = permissions || jsonb_build_object(
    'canManageUsers', true,
    'canManageIncidents', true,
    'canManageVolunteers', true,
    'canViewReports', true,
    'canManageSystem', true,
    'canAccessAdmin', true,
    'canConnectToWebsite', true
)
WHERE role = 'admin';

-- Unit commanders
UPDATE public.users 
SET permissions = permissions || jsonb_build_object(
    'canManageUsers', false,
    'canManageIncidents', true,
    'canManageVolunteers', true,
    'canViewReports', true,
    'canManageSystem', false,
    'canAccessAdmin', true,
    'canConnectToWebsite', true
)
WHERE role = 'unit_commander';

-- Dispatchers
UPDATE public.users 
SET permissions = permissions || jsonb_build_object(
    'canManageUsers', false,
    'canManageIncidents', true,
    'canManageVolunteers', false,
    'canViewReports', true,
    'canManageSystem', false,
    'canAccessAdmin', true,
    'canConnectToWebsite', true
)
WHERE role = 'dispatcher';

-- Operations managers
UPDATE public.users 
SET permissions = permissions || jsonb_build_object(
    'canManageUsers', false,
    'canManageIncidents', true,
    'canManageVolunteers', true,
    'canViewReports', true,
    'canManageSystem', false,
    'canAccessAdmin', true,
    'canConnectToWebsite', true
)
WHERE role = 'ops_manager';

-- Regular users - they should only have canConnectToWebsite = true by default
UPDATE public.users 
SET permissions = jsonb_build_object(
    'canManageUsers', false,
    'canManageIncidents', false,
    'canManageVolunteers', false,
    'canViewReports', false,
    'canManageSystem', false,
    'canAccessAdmin', false,
    'canConnectToWebsite', true
)
WHERE role = 'user' OR role IS NULL OR role = '';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added canConnectToWebsite permission to all users';
END $$;
