import express from 'express';
import { getDashboardKPIs } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// GET /api/v1/admin/dashboard
router.get('/dashboard', getDashboardKPIs);

export default router;
