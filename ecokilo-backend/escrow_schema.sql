-- Phase 7: Real Escrow System Schema Additions

-- Enums
CREATE TYPE escrow_status AS ENUM ('HOLDING', 'RELEASED', 'DISPUTED', 'CANCELLED');
CREATE TYPE escrow_tx_type AS ENUM ('INITIATE', 'DEPOSIT', 'RELEASE_USER', 'RELEASE_RECYCLER', 'FEE_DEDUCTION', 'PENALTY');

-- Escrow Accounts Table
CREATE TABLE escrow_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE UNIQUE,
    recycler_id UUID REFERENCES users(id),
    user_id UUID REFERENCES users(id),
    estimated_amount DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) NOT NULL,
    status escrow_status DEFAULT 'HOLDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow Transactions Ledger
CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE CASCADE,
    type escrow_tx_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow Disputes Table
CREATE TABLE escrow_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID REFERENCES escrow_accounts(id) ON DELETE CASCADE,
    raised_by UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN',
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS (Optional depending on current project config, but good practice)
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_disputes ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow users and recyclers to read their own escrows)
CREATE POLICY "Users can view their escrows" ON escrow_accounts
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recycler_id);

CREATE POLICY "Users can view their escrow txs" ON escrow_transactions
    FOR SELECT USING (
        escrow_id IN (
            SELECT id FROM escrow_accounts 
            WHERE user_id = auth.uid() OR recycler_id = auth.uid()
        )
    );
