const express = require('express');
const router = express.Router();
const QRCode = require('qrcode')

// Mongoose model
const Voter = require('../models/Voter');
const Queue = require('../models/Queue');

// Main dashboard get request
router.get('/', (req, res) => {
    res.render('../views/dashboard');
});
// Queue page get request 
router.get('/checkin', (req, res) => {
    res.render('queue');
});
// Return page get request 
router.get('/return', (req, res) => {
    res.render('return');
});

// functinoality to add a voter to the queue
router.post('/checkin', async (req, res) => {
    queueuQuery = await Queue.find({})
    if (queueuQuery.length === 0) {
        req.flash(
            'error_msg', 
            'No Queue has been set up.'
        );
        res.redirect('/dashboard/checkin');
    }
    else {
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
            res.redirect('/dashboard/checkin');
        })
        .catch(err => console.log(err));
    }
});

// functinoality to remove a voter from the queue
router.post('/return', async (req, res) => {
    const { voterId } = req.body.url;
});

// add functinoality for QR code reader  


module.exports = router;