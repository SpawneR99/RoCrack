const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// AdBlueMedia API Configuration
const ADBLUEMEDIA_CONFIG = {
    endpoint: 'https://d1y3y09sav47f5.cloudfront.net/public/offers/feed.php',
    apiKey: 'aae3663b2d691169b7643a13f62685f5',
    userId: '47937'
};

// Serve static files from the root directory
app.use(express.static(__dirname));

// Parse JSON bodies
app.use(express.json());

// AdBlueMedia Offers API - Server-side proxy
app.get('/api/offers', async (req, res) => {
    try {
        // Get client IP (handle proxies like Cloudflare/Coolify)
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        req.headers['x-real-ip'] ||
                        req.connection?.remoteAddress ||
                        req.socket?.remoteAddress || '';
        
        // Clean up IP (remove ::ffff: prefix, handle localhost)
        let cleanIp = clientIp.replace('::ffff:', '').replace('::1', '').replace('127.0.0.1', '');
        
        const userAgent = req.headers['user-agent'] || '';
        
        // Get niche from query param (e.g., "BloxCrackFruits", "CrackDeltaExecutor")
        const niche = req.query.niche || 'BloxCrack';
        const maxOffers = req.query.max || '6';
        
        // Build API URL with params
        const params = new URLSearchParams({
            user_id: ADBLUEMEDIA_CONFIG.userId,
            api_key: ADBLUEMEDIA_CONFIG.apiKey,
            s1: niche  // Dynamic niche tracking (same as before)
        });
        
        // Add IP if available (for geo-targeting)
        if (cleanIp) {
            params.append('ip', cleanIp);
        }
        
        // Add user agent if available
        if (userAgent) {
            params.append('user_agent', userAgent);
        }
        
        const apiUrl = `${ADBLUEMEDIA_CONFIG.endpoint}?${params.toString()}`;
        
        console.log(`📡 Fetching offers for: ${niche} | IP: ${cleanIp || 'auto'}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const offers = await response.json();
        
        if (Array.isArray(offers) && offers.length > 0) {
            // Limit to max offers
            const limitedOffers = offers.slice(0, parseInt(maxOffers));
            console.log(`✅ Loaded ${limitedOffers.length} offers for ${niche}`);
            // Debug: Log first offer structure to see available fields
            console.log('📋 Offer fields:', Object.keys(offers[0]));
            console.log('📋 First offer:', JSON.stringify(offers[0], null, 2));
            res.json({ success: true, offers: limitedOffers });
        } else {
            console.log(`⚠️ No offers returned`);
            res.json({ success: false, error: 'No offers available', offers: [] });
        }
    } catch (error) {
        console.error('❌ Offers API Error:', error.message);
        res.json({ success: false, error: error.message, offers: [] });
    }
});

// API endpoint for generating fake user data
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    // Simulate API delay
    setTimeout(() => {
        res.json({
            success: true,
            user: {
                id: userId,
                found: true,
                username: `Player_${userId}`,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150`
            }
        });
    }, 500);
});

// API endpoint for online users count
app.get('/api/stats', (req, res) => {
    res.json({
        onlineUsers: Math.floor(Math.random() * 100) + 800,
        totalDownloads: '12.4M',
        lastUpdate: new Date().toISOString()
    });
});

// API endpoint for generating activation key
app.get('/api/generate-key', (req, res) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY_';
    for (let i = 0; i < 16; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    res.json({
        success: true,
        key: key,
        expiresIn: 300 // 5 minutes
    });
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`🎮 RoCrack Server running at http://${HOST}:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`📡 AdBlueMedia API proxy ready at /api/offers`);
});
