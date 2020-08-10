// Routing dependencies 
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
// Database dependency
const mongoose = require('mongoose');
// Messages dependency
const flash = require('connect-flash');
// Session/authentication dependencies
const session = require('express-session');
const passport = require('passport');

// Initialize express application 
const app = express();

// Configure passport login
require('./config/passport')(passport);

// Establish database connection 
const db = require('./config/keys').MongoURI;
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected...'))
    .catch((err) => console.log(err));
mongoose.set('useFindAndModify', false);

// Configure application layout with EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Setup url bodyparser
app.use(express.urlencoded({ extended: true }));

// Initialize application session
app.use(session({
    secret: 'shhhh this is a secret',
    resave: true,
    saveUninitialized: true
}));

// Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure flash messaging
app.use(flash());

// Set global variables for flash messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Set express routing files 
app.use('/', require('./routes/index.js'));
app.use('/admin', require('./routes/admin.js'));

// static public folder
app.use(express.static('public'));

// Start application 
const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));
