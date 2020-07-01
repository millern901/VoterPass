const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Welcome index
router.get('/', forwardAuthenticated, (req, res) => {
    res.render('welcome');
});

// Dashboard index 
router.get('/dashboard', ensureAuthenticated, (req, res) => { 
    res.render('dashboard', {
        admin: req.user
    })
});

module.exports = router;