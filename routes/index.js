// Routing dependencies 
const express = require('express');
const router = express.Router();
// Authentication dependencies
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Set routing for startup/login/register without authentication
router.get('/', forwardAuthenticated, (req, res) => {
    res.render('welcome');
});

// Set routing for admin dashboard with authentication 
router.use('/dashboard', ensureAuthenticated, require('./dashboard.js'));

module.exports = router;