const express = require('express');
const passport = require('passport');
const logger = require('../../utils/logger');

module.exports = (app) => {
    const router = express.Router();

    // Authentication
    const isAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/auth/discord');
    };

    // Auth
    router.get('/auth/discord', passport.authenticate('discord'));
    router.get('/auth/discord/callback', passport.authenticate('discord', {
        failureRedirect: '/'
    }), (req, res) => {
        res.redirect('/dashboard');
    });

    // Dashboard route
    router.get('/dashboard', isAuthenticated, (req, res) => {
        res.json({ message: 'Dashboard endpoint' });
    });

    // Challenge management routes
    router.get('/api/challenges', isAuthenticated, (req, res) => {
        res.json({ message: 'Get challenges endpoint' });
    });

    router.post('/api/challenges', isAuthenticated, (req, res) => {
        res.json({ message: 'Create challenge endpoint' });
    });

    // Warning management routes
    router.get('/api/warnings', isAuthenticated, (req, res) => {
        res.json({ message: 'Get warnings endpoint' });
    });

    router.post('/api/warnings', isAuthenticated, (req, res) => {
        res.json({ message: 'Create warning template endpoint' });
    });

    // User profile routes
    router.get('/api/users/:id', isAuthenticated, (req, res) => {
        res.json({ message: 'Get user profile endpoint' });
    });

    // FAQ management routes
    router.get('/api/faqs', isAuthenticated, (req, res) => {
        res.json({ message: 'Get FAQs endpoint' });
    });

    router.post('/api/faqs', isAuthenticated, (req, res) => {
        res.json({ message: 'Create FAQ endpoint' });
    });

    // Error handling
    router.use((err, req, res, next) => {
        logger.error('Route error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    app.use('/', router);
}; 