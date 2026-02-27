-- Step 1: Run this entire snippet in your Supabase SQL Editor

-- Enums
CREATE TYPE user_role AS ENUM ('HOUSEHOLD', 'RECYCLER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'BANNED', 'PENDING_VERIFICATION');
CREATE TYPE pickup_status AS ENUM ('PENDING', 'ACCEPTED', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED');
CREATE TYPE assignment_status AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
CREATE TYPE transaction_type AS ENUM ('CREDIT_WASTE', 'DEBIT_WITHDRAWAL', 'CREDIT_BONUS');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Core Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'HOUSEHOLD',
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    points_balance INT DEFAULT 0,
    status user_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE waste_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_per_kg DECIMAL(10, 2) NOT NULL,
    points_per_kg INT NOT NULL,
    icon_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pickup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES users(id) ON DELETE NO ACTION,
    address_id UUID REFERENCES addresses(id) ON DELETE NO ACTION,
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status pickup_status DEFAULT 'PENDING',
    estimated_weight DECIMAL(10, 2),
    actual_weight DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pickup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
    waste_type_id UUID REFERENCES waste_types(id) ON DELETE RESTRICT,
    estimated_weight_kg DECIMAL(10, 2),
    actual_weight_kg DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recycler_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE UNIQUE,
    recycler_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status assignment_status DEFAULT 'ASSIGNED'
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    type transaction_type NOT NULL,
    reference_id UUID,
    status transaction_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE impact_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_plastic_kg DECIMAL(10, 2) DEFAULT 0.00,
    co2_saved_kg DECIMAL(10, 2) DEFAULT 0.00,
    trees_equivalent DECIMAL(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically add a new public "User" when somebody logs in with Google!
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'HOUSEHOLD');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
