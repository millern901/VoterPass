// passport code found at: http://www.passportjs.org/docs/username-password/

// Strategy dependency
const LocalStrategy = require('passport-local').Strategy;
// Encrpyting dependency
const bcrypt = require('bcryptjs');

// Load mongoose admin schema 
const Admin = require('../models/Admin');

module.exports = passport => {
    passport.use(
        // Create a new local strategy
        new LocalStrategy({ usernameField: 'name' }, (name, password, done) => {
            // Locate admin
            Admin.findOne({ name: name })
            .then(admin => {
                if (!admin) {
                    // Admin does not exist 
                    return done(null, false, { message: 'Admin Name Not Found' });
                } 
                // Compare admin passwords 
                bcrypt.compare(password, admin.password, (err, isMatch) => {
                    if (err) {
                        console.log(err);
                    }
                    if (isMatch) {
                        // Passwords match, allow login
                        return done(null, admin);
                    } else {
                        // Passwords do not match, disallow login
                        return done(null, false, { message: 'Admin Password Incorrect' });
                    }
                });
            })
        })
    );

    // serialize admin
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    // deserialize admin
    passport.deserializeUser((id, done) => {
        Admin.findById(id, (err, user) => {
            done(err, user);
        });
    });
}