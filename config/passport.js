const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load User model 
const Admin = require('../models/Admin');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'name' }, (name, password, done) => {
            // locate admin account
            Admin.findOne({ name: name })
            .then(admin => {
                if (!admin) {
                    return done(null, false, { message: 'Admin Name Not Found' });
                } 

                // compare admin password 
                bcrypt.compare(password, admin.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, admin);
                    } else {
                        return done(null, false, { message: 'Admin Password Incorrect' });
                    }
                });
            })
        })
    );

    // serialize admin session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    // deserialize admin session
    passport.deserializeUser((id, done) => {
        Admin.findById(id, (err, user) => {
            done(err, user);
        });
    });
}