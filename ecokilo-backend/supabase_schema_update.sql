-- Add Avatar URL column
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Transaction query for testing
-- SELECT * FROM transactions t 
-- JOIN pickup_requests pr ON t.reference_id = pr.id
-- WHERE t.user_id = 'user-uuid' ORDER BY t.created_at DESC;

-- PHASE 5: Rewards & Leaderboard
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    points_required INT NOT NULL,
    stock_quantity INT DEFAULT -1,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'PENDING',
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo rewards (Optional but helpful for testing)
INSERT INTO rewards (name, description, points_required, stock_quantity, image_url) VALUES 
('₹100 Amazon Voucher', 'A digital gift card to spend on Amazon.', 1000, 50, 'https://cdn-icons-png.flaticon.com/512/5978/5978229.png'),
('EcoKilo Merch T-Shirt', 'Show off your EcoKilo pride with this sustainable cotton t-shirt.', 2500, 20, 'https://cdn-icons-png.flaticon.com/512/2950/2950666.png'),
('₹500 Myntra Gift Card', 'Fashion coupon for your favorite brands.', 4500, 10, 'https://cdn-icons-png.flaticon.com/512/3225/3225103.png');
