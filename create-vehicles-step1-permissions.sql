-- ===============================================================================
-- VEHICLE SEARCH SYSTEM (שאילתא) - STEP 1: ADD PERMISSIONS
-- ===============================================================================
-- This script adds the new permissions to the enum type
-- Run this FIRST, then run step 2
-- ===============================================================================

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
    ELSE
        RAISE NOTICE '⚠️ Permission vehicle_search_access already exists';
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
    ELSE
        RAISE NOTICE '⚠️ Permission vehicle_admin_access already exists';
    END IF;
END $$;

-- Success message
SELECT 'Step 1 Complete: Vehicle permissions added to enum! 🎯' as message;
SELECT 'Next: Run step 2 to create table and assign permissions' as next_step;
