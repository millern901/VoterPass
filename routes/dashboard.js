const express = require('express');
const router = express.Router();
const passport = require('passport');
const QRCode = require('qrcode')

// User model
const Voter = require('../models/Voter');
router.get('/', (req, res) => {
    res.render('../views/dashboard');
});

// functinoality to add a voter to the queue
router.post('/', (req, res) => {
    // determine the number of voters in the queue
    let queueSize = 0;
    /*
    Voter.count({}, ( err, count ) => {
        queueSize = count;
    });
    */

    // ----------------------------------------------------------------------    
    // calculate callback based on voting rate and number of people in main queue
    let callback = Date.now;

    // ----------------------------------------------------------------------

    // create a new voter object
    const newVoter = new Voter({
        callback
    });

    // Create voter segments and generate QR Code from DB id
    QRCode.toDataURL(String(newVoter._id), { type: 'terminal' }, (err, url) => {
        console.log(url);
    });

    // save the voter to the database 
    newVoter.save()
    .then(voter => {
        req.flash(
            'success_msg', 
            'Voter Added to Queue.'
        );
        console.log(voter);
        res.redirect('/dashboard');
    })
    .catch(err => console.log(err));
});

// functinoality to remove a voter from the queue
router.delete('/', (req, res) => {

});

// add functinoality for QR code reader  


module.exports = router;