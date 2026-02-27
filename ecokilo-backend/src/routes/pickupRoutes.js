import express from 'express';
import { createPickup, getPickups, acceptPickup, verifyPickup } from '../controllers/pickupController.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

// All pickup routes require authentication
router.use(requireAuth);

router.get('/', getPickups);
router.get('/all', getPickups); // Alias or separate logic depending on query.

// Only households can schedule
router.post('/schedule', requireRole(['HOUSEHOLD']), createPickup);

// Only recyclers can accept
router.post('/:id/accept', requireRole(['RECYCLER']), acceptPickup);

// Only recyclers can verify physical weight and trigger escrow release
router.post('/:id/verify', requireRole(['RECYCLER']), verifyPickup);

export default router;
