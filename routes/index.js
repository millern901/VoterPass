// dependencies 
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// set routing for links off admin without authentication
router.get('/', forwardAuthenticated, (req, res) => {
    res.render('startup');
});

// set routing for links off dashboard with authentication 
router.use('/dashboard', ensureAuthenticated, require('./dashboard.js'));

module.exports = router;