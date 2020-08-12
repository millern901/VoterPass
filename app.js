// dependencies 
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');

// initialize express application 
const app = express();

// configure passport login
require('./config/passport')(passport);

// establish mongodb connection and set preferences 
const db = require('./config/keys').MongoURI;
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('MongoDB Connected...'));
mongoose.set('useFindAndModify', false);

// configure view engine and styling
app.use(expressLayouts);
app.set('view engine', 'ejs');

// set url bodyparser
app.use(express.urlencoded({ extended: true }));

// set application session variables 
app.use(session({
    secret: 'shhhh this is a secret',
    resave: true,
    saveUninitialized: true
}));

// set session passport middleware
app.use(passport.initialize());
app.use(passport.session());

// configure flash messaging
app.use(flash());

// set global variables for flash messaging 
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// set express routing paths  
app.use('/', require('./routes/index.js'));
app.use('/admin', require('./routes/admin.js'));

// set static path for public folder
app.use(express.static('public'));

// start application on port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));
