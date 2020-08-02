// Routing dependencies 
const express = require('express');
const router = express.Router();
// Password dependencies 
const passwordStrength = require('check-password-strength');
const bcrypt = require('bcryptjs');
// Login dependency
const passport = require('passport');

// Mongoose models
const Voter = require('../models/Voter');
const Queue = require('../models/Queue')
const Rate = require('../models/Rate');
const Admin = require('../models/Admin');

// Load authentication 
const { forwardAuthenticated } = require('../config/auth');

// Startup page get request 
router.get('/startup', forwardAuthenticated, (req, res) => {
    res.render('startup');
});
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login');
});
router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('register');
});

// Handle VoterPass Startup
router.post('/startup', async (req, res) => {
    // Get request body 
    const { name, password, password2, boothCount, callbackRange } = req.body;
    // initialize error list
    let errors = [];

    // Check that the system hasn't been started 
    const masterAdmin = await Admin.findOne({ clearance: true });
    
    // Check that all form fields have been filled
    if (!name || !password || !password2 || !boothCount || !callbackRange) {
        errors.push({ msg: 'All fields must be filled' });
    }
    // Check that both passwords match 
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match.' });
    }
    // Check that the password is strong enough
    if (password) {
        let passStrength = passwordStrength(password); 
        if (passStrength.id === 0) {
            errors.push({ msg: 'Password too weak.' });
        }
    }
    // Check there is atleast on booth  
    if (boothCount <= 0) {
        errors.push({ msg: 'You must have atleast one Active Booth.' });
    }
    // Determine if any errors were encountered 
    if (errors.length > 0) {
        // Rerender the page and return error messages for flashing
        res.render('startup', {
            errors,
            name,
            password,
            password2
        });
    }
    else if (masterAdmin) {
        // Flash system already startup 
        req.flash(
            'error_msg', 
            'System has already been Started.'
        );
        // redirect admin to login page 
        res.redirect('/admin/login');
    }
    else {
        // calculate rate from all rates inside of the Rates collection
        let rateQuery = await Rate.find({})
        .then(rates => {
            console.log(rates);
        })
        .catch(err => {
            console.log(err);
        });
        let callbackRate = 5;

        // if we have some rates average them for new callback rate
        if (rateQuery) {
            let totalRate = 0;
            rateQuery.forEach(rate => {
                totalRate += rate.voterRate;
            });
            callbackRate = totalRate / rateQuery.length;
        }

        // create a new queue object
        const newQueue = new Queue({
            boothCount: boothCount,
            callbackRate: callbackRate,
            callbackRange: callbackRange
        });

        // save the queue to the database
        await newQueue.save()
        .then(queue => {
            console.log(queue);
        })
        .catch(err => {
            console.log(err)
        });

        // Create a new admin object
        const newAdmin = new Admin({
            name: name,
            password: password,
            clearance: true
        });

        // Hash the entered password and save the admin 
        bcrypt.genSalt(10, (err, salt) => { 
            bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                if (err) {
                    console.log(err);
                }
                // Set admin object's password to the newly hashed one
                newAdmin.password = hash;
                // Save the admin to the database
                newAdmin.save()
                .then(admin => {
                    // Flash successful startup 
                    req.flash(
                        'success_msg', 
                        'Master admin registered. You may now begin adding new Admins or Login in.'
                    );
                    // redirect admin to login page 
                    res.redirect('/admin/login');
                })
                .catch(err => console.log(err));
            });
        });
    }
});

// Handle admin registration request  
router.post('/register', async (req, res) => {
    // Get request body 
    const { name, password, password2, password3 } = req.body;
    // initialize error list
    let errors = [];

    // Check all form fields have been filed  
    if (!name || !password || !password2 || !password3) {
        errors.push({ msg: 'All fields are required.' });
    }
    // Check that both passwords match 
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match.' });
    }
    // Check that the password is strong enough 
    if (password) {
        let passStrength = passwordStrength(password); 
        if (passStrength.id === 0) {
            errors.push({ msg: 'Password too weak.' });
        }
    }
    // Check that the system has been started 
    const masterAdmin = await Admin.findOne({ clearance: true });
    if (!masterAdmin) {
        errors.push({ msg: 'System Not Started.' });
    } else {
        // Check that the master password is correct
        const masterPass = await bcrypt.compare(password3, masterAdmin.password);
        if (!masterPass) {
            errors.push({ msg: 'Master password is incorrect.' });
        }
    }
    // Determine if any errors were encountered 
    if (errors.length > 0) {
        // Rerender the page and return error messages for flashing
        res.render('register', {
            errors,
            name,
            password,
            password2,
            password3
        });
    }
    else {
        // Validate that the admin name is not taken 
        Admin.findOne({ name: name})
            .then(admin => {
                if (admin) {
                    // If the admin exists push error message and rerender the registration page 
                    errors.push({ msg: 'Name is already taken' });
                    res.render('register', {
                        errors,
                        name,
                        password,
                        password2
                    });
                } else {
                    // Create a new admin object
                    const newAdmin = new Admin({
                        name: name,
                        password: password,
                        clearance: false
                    });
                    // Hash the entered password
                    bcrypt.genSalt(10, (err, salt) => { 
                        bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                            if (err) throw err;
                            // Set admin password to the newly hashed one
                            newAdmin.password = hash;
                            // Save the admin to the database
                            newAdmin.save()
                            .then(admin => {
                                // On successful registration flash message
                                req.flash(
                                    'success_msg', 
                                    'Admin Registered. You may now login'
                                );
                                // Redirect admin to the login page 
                                res.redirect('/admin/login');
                            })
                            .catch(err => console.log(err));
                        });
                    });
                }
            });
    }
});

// Handle admin login request 
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/admin/login',
        failureFlash: true
    })(req, res, next);
});

// Handle admin logout request
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'Admin has been logged out');
    res.redirect('/admin/login');
});

module.exports = router;
