import express from 'express';
import { initiateEscrow, getRecyclerEscrows, releaseEscrow } from '../controllers/escrowController.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Escrow Endpoints (Protected)
router.post('/initiate', requireAuth, initiateEscrow);
router.post('/release', requireAuth, releaseEscrow);
router.get('/recycler', requireAuth, getRecyclerEscrows);

export default router;
