-- Run this in the Supabase SQL Editor to assign the correct roles to our demo users. 
-- The backend setup script created the accounts correctly, but RLS prevents it from modifying the 'role' column.

-- 1. Set Suraj as RECYCLER
UPDATE public.users 
SET role = 'RECYCLER' 
WHERE full_name = 'Suraj Kumar';

-- 2. Set Admin as ADMIN
UPDATE public.users 
SET role = 'ADMIN' 
WHERE full_name = 'System Admin';

-- Rakesh Sharma should already be 'HOUSEHOLD' by default due to the database trigger, but let's ensure it:
UPDATE public.users 
SET role = 'HOUSEHOLD' 
WHERE full_name = 'Rakesh Sharma';

-- Verify the update
SELECT id, full_name, email, role FROM public.users;
