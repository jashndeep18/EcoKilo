import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import pickupRoutes from './src/routes/pickupRoutes.js';
import wasteRoutes from './src/routes/wasteRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import rewardRoutes from './src/routes/rewardRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';
import escrowRoutes from './src/routes/escrowRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow frontend to connect
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/pickups', pickupRoutes);
app.use('/api/v1/waste', wasteRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/escrow', escrowRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'EcoKilo API', timestamp: new Date() });
});

// Socket.io for Live GPS
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Recycler joins a specific pickup room to broadcast location
    socket.on('join_pickup', (data) => {
        const { pickup_id, role } = data;
        socket.join(pickup_id);
        console.log(`👥 Client ${socket.id} (${role}) joined pickup: ${pickup_id}`);
    });

    // Recycler sends their coordinates
    socket.on('send_location', (data) => {
        const { pickup_id, lat, lng } = data;
        // Broadcast to the household waiting on that pickup_id
        socket.to(pickup_id).emit('location_update', {
            lat,
            lng,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Start Server (using existing configured native 'server' instead of Express 'app')
server.listen(PORT, () => {
    console.log(`🚀 EcoKilo server running on http://localhost:${PORT}`);
    console.log(`🛰️  WebSocket GPS Tracker running on ws://localhost:${PORT}`);
});
