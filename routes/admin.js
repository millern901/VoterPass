const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const passwordStrength = require('check-password-strength')

// User model
const Admin = require('../models/Admin');
const { forwardAuthenticated } = require('../config/auth');

// Login page 
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login');
});

// Register page 
router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('register');
});

// Register Hanle 
router.post('/register', (req, res) => {
    const { name, password, password2 } = req.body;
    let errors = [];

    // Check required fields 
    if (!name || !password || !password2) {
        errors.push({ msg: 'All Fields are Required' });
    }

    // Check is passwords match 
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not Match' });
    }

    // Check password strength
    let passStrength = passwordStrength(password); 
    if (passStrength.id === 0) {
        errors.push({ msg: 'Password Strength is too weak' });
    }

    // Check found errors
    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            password,
            password2
        });
    }
    else {
        // Validation passed
        Admin.findOne({ name: name})
            .then(admin => {
                if (admin) {
                    // User exists
                    errors.push({ msg: 'Name is already taken' });
                    res.render('register', {
                        errors,
                        name,
                        password,
                        password2
                    });
                } else {
                    const newAdmin = new Admin({
                        name,
                        password
                    });

                    // Hash Password
                    bcrypt.genSalt(10, (err, salt) => { 
                        bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                            if (err) throw err;
                            // set hashed password
                            newAdmin.password = hash;
                            // save user
                            newAdmin.save()
                            .then(admin => {
                                req.flash(
                                    'success_msg', 
                                    'Admin Registered. You may now login'
                                );
                                res.redirect('/admin/login');
                            })
                            .catch(err => console.log(err));
                        });
                    });
                }
            });
    }
});

// Login Handle 
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/admin/login',
        failureFlash: true
    })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'Admin has been logged out');
    res.redirect('/admin/login');
});


module.exports = router;