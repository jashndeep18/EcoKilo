-- DEMO DATA SEEDER FOR ESCROW VAULT

DO $$
DECLARE
    v_household_id UUID;
    v_recycler_id UUID;
    v_pickup_1 UUID;
    v_pickup_2 UUID;
    v_pickup_3 UUID;
    v_pickup_4 UUID;
BEGIN
    -- 1. Grab ANY two users to act as our Household and Recycler
    SELECT id INTO v_household_id FROM users LIMIT 1;
    SELECT id INTO v_recycler_id FROM users WHERE id != v_household_id LIMIT 1;

    -- If we don't have enough users, exit safely
    IF v_household_id IS NULL OR v_recycler_id IS NULL THEN
        RAISE NOTICE 'Not enough users in the DB to create mock escrow data.';
        RETURN;
    END IF;

    -- 2. Create 4 fake pickup requests
    INSERT INTO pickup_requests (household_id, estimated_weight, scheduled_date, time_slot, status)
    VALUES (v_household_id, 15.5, CURRENT_DATE, 'Morning (9 AM - 12 PM)', 'PENDING')
    RETURNING id INTO v_pickup_1;

    INSERT INTO pickup_requests (household_id, estimated_weight, scheduled_date, time_slot, status)
    VALUES (v_household_id, 2.0, CURRENT_DATE, 'Afternoon (12 PM - 3 PM)', 'PENDING')
    RETURNING id INTO v_pickup_2;

    INSERT INTO pickup_requests (household_id, estimated_weight, scheduled_date, time_slot, status)
    VALUES (v_household_id, 10.0, CURRENT_DATE, 'Evening (3 PM - 6 PM)', 'PENDING')
    RETURNING id INTO v_pickup_3;

    INSERT INTO pickup_requests (household_id, estimated_weight, scheduled_date, time_slot, status)
    VALUES (v_household_id, 8.5, CURRENT_DATE, 'Morning (9 AM - 12 PM)', 'PENDING')
    RETURNING id INTO v_pickup_4;

    -- 3. Create Escrow Accounts linked to these Pickups
    INSERT INTO escrow_accounts (pickup_id, recycler_id, user_id, estimated_amount, security_deposit, status)
    VALUES 
    (v_pickup_1, v_recycler_id, v_household_id, 465.00, 150.00, 'HOLDING'),
    (v_pickup_2, v_recycler_id, v_household_id, 300.00, 100.00, 'RELEASED'),
    (v_pickup_3, v_recycler_id, v_household_id, 120.00, 50.00, 'DISPUTED'),
    (v_pickup_4, v_recycler_id, v_household_id, 380.00, 120.00, 'HOLDING');

    -- Note: The triggers or logic for escrow_transactions can be mocked later if needed, 
    -- but this will populate the Data Table and Summary cards perfectly!

    RAISE NOTICE 'Successfully seeded Escrow Vault demo data!';
END $$;
