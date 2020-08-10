// dependencies 
const express = require('express');
const router = express.Router();
const passwordStrength = require('check-password-strength');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// forward authentication 
const { forwardAuthenticated } = require('../config/auth');

// mongoose schemas
const Queue = require('../models/Queue')
const Rate = require('../models/Rate');
const Admin = require('../models/Admin');

// admin webpage get requests
router.get('/startup', forwardAuthenticated, (req, res) => {
    res.render('startup');
});
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login');
});
router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('register');
});

// admin startup request
router.post('/startup', async (req, res) => {
    // locate admins (i.e. system started)
    const adminQuery = await Admin.find({});

    if (adminQuery.length !== 0) {
        // flash message and redirect on valid system
        req.flash(
            'error_msg', 
            'System has already been started.'
        );
        res.redirect('/admin/login');
    }
    else {
        // grab form body 
        const { firstname, lastname, username, password1, password2 } = req.body;
        
        // error catching 
        let errors = [];
        if (!firstname || !lastname || !username || !password1 || !password2) {
            // determine that every field has been filled out 
            errors.push({ msg: 'Please fill out all fields.' });
        }
        if (password1 !== password2) {
            // determine matching passwords 
            errors.push({ msg: 'Passwords do not match.' });
        }
        if (password1) {
            // determine password strength
            if (passwordStrength(password1).id === 0) {
                errors.push({ msg: 'Password is too weak.' });
            }
        }

        if (errors.length > 0) {
            // rerender page on form errors
            res.render('startup', {
                errors,
                firstname,
                lastname,
                username,
                password1,
                password2
            });
        } else {
            // locate saved rates (e.g. from previous day)
            const rateQuery = await Rate.find({})

            // calculate callback rate
            let newCallbackRate = 15;
            if (rateQuery.length !== 0) {
                // average saved rates
                let totalRate = 0;
                rateQuery.forEach(rate => { totalRate += rate.votingRate; });
                newCallbackRate = totalRate / rateQuery.length;
            } 

            // create and save new queue (with calculated rate)
            const newQueue = new Queue({ callbackRate: newCallbackRate });
            await newQueue.save();

            // create new admin
            let master = true;
            const newAdmin = new Admin({
                firstName: firstname,
                lastName: lastname,
                username: username,
                password: password1,
                clearance: master
            });

            // password encryption
            bcrypt.genSalt(10, (err, salt) => { 
                bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                    // set admin password to the encrypted one
                    newAdmin.password = hash;

                    // save the master admin
                    newAdmin.save()
                    .then(() => {
                        // flash message successful save 
                        req.flash(
                            'success_msg', 
                            'System has been started and master admin has been set. You may now begin adding new admins or you may login.'
                        );
                        res.redirect('/admin/login');
                    });
                });
            });
        }
    }
});

// Handle admin registration request  
router.post('/register', async (req, res) => {
    // locate admins (i.e. system started)
    const adminQuery = await Admin.find({});

    if (adminQuery.length === 0) {
        // flash message and redirect on no system
        req.flash(
            'error_msg', 
            'System has not been started.'
        );
        res.redirect('/admin/startup');
    }
    else {
        // grab form body 
        const { firstname, lastname, username, password1, password2, password3 } = req.body;
        
        // error catching 
        let errors = [];
        if (!firstname || !lastname || !username || !password1 || !password2 || !password3) {
            // determine that every field has been filled out 
            errors.push({ msg: 'Please fill out all fields.' });
        }
        if (password1 !== password2) {
            // determine matching passwords 
            errors.push({ msg: 'Passwords do not match.' });
        }
        if (password1) {
            // determine password strength
            if (passwordStrength(password1).id === 0) {
                errors.push({ msg: 'Password is too weak.' });
            }
        }
        let userTaken = false
        adminQuery.forEach(admin => { 
            if (username === admin.username) {
                userTaken = true;
            }
        });
        if (userTaken) {
            // determine taken username
            errors.push({ msg: 'Username is already taken.' });
        }
        const masterAdmin = await Admin.findOne({ clearance: true });
        const masterPass = await bcrypt.compare(password3, masterAdmin.password);
        if (!masterPass) {
            // determine correct master password
            errors.push({ msg: 'Master password is incorrect.' });
        }

        if (errors.length > 0) {
            // rerender page on form errors
            res.render('register', {
                errors,
                firstname,
                lastname,
                username,
                password1,
                password2,
                password3
            });
        } else {
            // create new admin
            let master = false;
            const newAdmin = new Admin({
                firstName: firstname,
                lastName: lastname,
                username: username,
                password: password1,
                clearance: master
            });

            // password encryption
            bcrypt.genSalt(10, (err, salt) => { 
                bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                    // set admin password to the encrypted one
                    newAdmin.password = hash;

                    // save the master admin
                    newAdmin.save()
                    .then(() => {
                        // flash message successful save 
                        req.flash(
                            'success_msg', 
                            'Admin registered. You may now login in.'
                        );
                        res.redirect('/admin/login');
                    });
                });
            });
        }
    }
});

// admin login request 
router.post('/login', async (req, res, next) => {
    // locate admins (i.e. system started)
    const adminQuery = await Admin.find({});

    if (adminQuery.length === 0) {
        // flash message and redirect on no system
        req.flash(
            'error_msg', 
            'System has not been started.'
        );
        res.redirect('/admin/startup');
    } else {
        // authenticate admin
        passport.authenticate('local', {
            successRedirect: '/dashboard',
            failureRedirect: '/admin/login',
            failureFlash: true,
            successFlash: {
                type: 'success_msg',
                message: 'Login successful. Welcome to VoterPass!'
            }
        })(req, res, next);
    }
});

// admin logout request
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'Admin has been logged out');
    res.redirect('/admin/login');
});

module.exports = router;
