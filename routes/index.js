// dependencies 
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// set routing for admin links without authentication
router.get('/', forwardAuthenticated, (req, res) => {
    res.render('startup');
});

// set routing for dashboard links with authentication 
// router.use('/dashboard', ensureAuthenticated, require('./dashboard.js'));
router.use('/dashboard', ensureAuthenticated, require('./dashboard.js'));

module.exports = router;