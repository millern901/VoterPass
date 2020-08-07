// passport code found at: http://www.passportjs.org/docs/username-password/

// dependencies
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// mongoose schema 
const Admin = require('../models/Admin');

module.exports = passport => {
    passport.use(
        // create a new local strategy
        new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
            // locate admin
            Admin.findOne({ username: username })
            .then(admin => {
                if (!admin) {
                    // admin does not exist 
                    return done(null, false, { message: 'Admin not found' });
                } 
                // compare passwords 
                bcrypt.compare(password, admin.password, (err, isMatch) => {
                    if (isMatch) {
                        // passwords match, allow login
                        return done(null, admin);
                    } else {
                        // passwords don't match, disallow login
                        return done(null, false, { message: 'Login information is incorrect' });
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