import express from 'express';
import { getWasteTypes } from '../controllers/wasteController.js';

const router = express.Router();

// Public route to get waste prices/types
router.get('/types', getWasteTypes);

export default router;
