module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Page requires admin privileges');
        res.redirect('/admin/login');
    },
    forwardAuthenticated: (req, res, next) => {
        if (!req.isAuthenticated()) {
          return next();
        }
        res.redirect('/dashboard');
    }
};
