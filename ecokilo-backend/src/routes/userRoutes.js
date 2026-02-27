import express from 'express';
import { getUserProfile, updateUserProfile, getUserHistory } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth); // Protect all routes

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/history', getUserHistory);

export default router;
