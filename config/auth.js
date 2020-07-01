module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Page Requires Admin Privilages');
        res.redirect('/admin/login');
    },
    forwardAuthenticated: (req, res, next) => {
        if (!req.isAuthenticated()) {
          return next();
        }
        res.redirect('/dashboard');      
    }
};
