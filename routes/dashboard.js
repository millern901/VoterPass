// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const moment = require('moment');

// Mongoose models
const Voter = require('../models/Voter');
const Queue = require('../models/Queue');
const Rate = require('../models/Rate');


// Page render requests
router.get('/', (req, res) => {
    res.render('../views/dashboard');
});
router.get('/checkin', (req, res) => {
    res.render('queue');
});
router.get('/return', (req, res) => {
    res.render('return');
});
// have the page render with the current queue parameters
router.get('/checkin/queueUpdate', (req, res) => {
    res.render('queueUpdate');
});


// functionality to add person to the main queue
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
        queue = queueuQuery[0];

        // determine the number of voters in the queue
        voterLengthQuery = await Voter.find({queueType: true}, (err) => {
            if (err) console.log(err);
        });
        queueLength = voterLengthQuery.length

        // calculate callback based on voting rate and number of people in main queue
        var callbackTime = moment(Date.now).add((queueLength * queue.callbackRate / queue.boothCount), "m").toDate();

        // create a new voter object
        const newVoter = new Voter({
            callbackTime
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
// functionality to update the queue
router.post('/checkin/queueUpdate', async (req, res) => {
    queueQuery = await Queue.find({})
    if (queueQuery.length === 0) {
        req.flash(
            'error_msg', 
            'No Queue has been set up.'
        );
        res.redirect('/dashboard/checkin');
    }
    else {
        let currentQueue = queueQuery[0]
        currentQueue.boothCount = req.boothCount;

        let totalRate = 0;
        let allRates = await Rate.find({});
        allRates.forEach(rate => {
            totalRate += rate.voterRate;
        });
        let newCallbackRate = totalRate / allRates.length;
        currentQueue.callbackRate = newCallbackRate;

        currentQueue.save()
        .then(newQueue => {
            req.flash(
                'success_msg', 
                'Queue Successfully Updated.'
            );
            console.log(newQueue);
            res.redirect('/dashboard/checkin');
        })
        .catch(err => console.log(err));
    }
});


// functinoality to compute rates of returning voters
router.post('/return', async (req, res) => {
    const { voterId } = req.body.url;
    returningVoterQuery = await Voter.find({}, (err) => {
        if (err) console.log(err);
    });

    if (returningVoterQuery.length === 0) {
        req.flash(
            'error_msg', 
            'No voter exists.'
        );
        res.redirect('/dashboard/return');
    }
    else {
        returningVoter = returningVoterQuery[0];

        if (returningVoter.queueType) {
            let timeDifference = currentTime.getTime() - returningVoter.callbackTime.getTime();
            let currentTime = Date.now;
            let errors = [];

            if (timeDifference > 30) {
                errors.push({ msg: 'You missed your callback time.' });
            }
            if (timeDifference < 0) {
                errors.push({ msg: 'Your callback time has not started.' });
            }

            if (errors.length > 0) {
                // Rerender the page and return error messages for flashing
                res.render('return', {
                    errors
                });
            }
            else {
                returningVoter.qrScanOne = currentTime;
                returningVoter.queueType = false;
                returningVoter.queueLength = await Voter.find({queueType: false}, (err) => { if (err) console.log(err); }).length;

                returningVoter.save()
                .then(voter => {
                    req.flash(
                        'success_msg', 
                        'Have have successfully returned.'
                    );
                    console.log(voter);
                    res.redirect('/dashboard/return');
                })
                .catch(err => console.log(err));
            }
        }
        else {
            let boothCount = await Queue.find({})[0].boothCount;
            let queueLength = returningVoter.queueLength;
            let startTime = returningVoter.qrScanOne;
            let endTime = Date.now;

            // TODO: check rate calculation 
            let rate = (endTime.getTime() - startTime.getTime()) * boothCount / queueLength;

            const newRate = new Rate({
                rate
            });
            // save the voter to the database 
            newRate.save()
            .then(rate => {
                console.log(rate);
            })
            .catch(err => console.log(err));

            Voter.findByIdAndRemove(id = returningVoter._id)
            .then((doc) => {
                req.flash(
                    'success_msg', 
                    'You may now go vote'
                );
                res.redirect('/dashboard/return');
                })
                .catch(err => console.log(err));
        }
    }
});

module.exports = router;