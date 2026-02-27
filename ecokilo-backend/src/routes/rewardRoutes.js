import express from 'express';
import { getRewards, redeemReward } from '../controllers/rewardController.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getRewards);
router.post('/redeem/:id', redeemReward);

export default router;
