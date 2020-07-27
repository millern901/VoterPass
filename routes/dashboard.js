// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const moment = require('moment');

// Mongoose model
const Voter = require('../models/Voter');
const Queue = require('../models/Queue')
const Rate = require('../models/Rate');

// URL Page Requests
router.get('/', (req, res) => {
    res.render('../views/dashboard');
});
router.get('/checkin', (req, res) => {
    res.render('checkin');
});
router.get('/return', (req, res) => {
    res.render('return');
});
router.get('/checkin/queueUpdate', (req, res) => {
    res.render('queueUpdate');
});

// functionality to add a voter to the queue
router.post('/checkin', async (req, res) => {
    // determine if there is an active queue
    let queueQuery = await Queue.find({});
    let currentTime = new Date();

    if (queueQuery.length !== 0) {
        let queue = queueQuery[0];
        // calculate callback based on voting rate and number of people in main queue
        let dif = Math.round(queue.queueLength * queue.callbackRate / queue.boothCount);
        let callbackTime = new Date(currentTime.getTime() + dif*60000);

        // create a new voter object
        const newVoter = new Voter({
            callbackTime
        });
        
        // Generate Voter specific QR Code from Voter id
        QRCode.toDataURL(String(newVoter._id), { type: 'terminal' }, (err, url) => {
            if (err) {
                console.log(err);
            }
            else {
                console.log(url);
            }
        });

        // increase length of queue
        Queue.findByIdAndUpdate(queue._id, { queueLength: queue.queueLength + 1}, (err) => {
            if (err) {
                console.log(err);
            } 
        });

        // save the voter to the database 
        newVoter.save()
        .then(voter => {
            req.flash(
                'success_msg', 
                'Voter has been Added to the Queue.'
            );
            console.log(voter);
            res.redirect('/dashboard/checkin');
        })
        .catch(err => console.log(err));
    }
    else {
        req.flash(
            'error_msg', 
            'Please Setup a Queue before Adding Voters.'
        );
        res.redirect('/dashboard/checkin/queueUpdate');
    }
});

// functionality to update the queue
router.post('/checkin/queueUpdate', async (req, res) => {
    // Get request body 
    const { boothCount, callbackRange } = req.body;
    // initialize error list
    let errors = [];

    // Check all form fields have been filed  
    if (!boothCount || !callbackRange) {
        errors.push({ msg: 'All Fields are Required.' });
    }
    if (boothCount <= 0) {
        errors.push({ msg: 'You must have atleast one Active Booth.' });
    }

    // Determine if any errors were encountered 
    if (errors.length > 0) {
        // Rerender the page and return error messages for flashing
        res.render('queueUpdate', {
            errors,
            boothCount
        });
    } else {
        // calculate rate from all rates inside of the Rates collection
        let rateQuery = await Rate.find({}, (err) => {
            if (err) {
                console.log(err);
            }
        });
        let newCallbackRate = 15;

        // if we have some rates average them 
        if (rateQuery.length !== 0) {
            let totalRate = 0;
            rateQuery.forEach(rate => {
                totalRate += rate.voterRate;
            });
            newCallbackRate = totalRate / rateQuery.length;
        }

        // query for active queue
        let queueQuery = await Queue.find({}, (err) => {
            if (err) {
                console.log(err);
            }
        });

        // queue is not set up
        if (queueQuery.length === 0) {
            // create a new voter object
            const newQueue = new Queue({
                boothCount: boothCount,
                callbackRate: newCallbackRate,
                callbackRange: callbackRange
            });

            newQueue.save()
            .then(queue => {
                req.flash(
                    'success_msg', 
                    'Queue successfully created. You may now begin adding Voters to it.'
                );
                console.log(queue);
                res.redirect('/dashboard/checkin');
            })
            .catch(err => console.log(err));
        }
        // updating an active queue
        else {
            let queueId = queueQuery[0]._id;
            
            Queue.findByIdAndUpdate(queueId, { boothCount: boothCount, callbackRate: newCallbackRate, callbackRange: callbackRange }, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    req.flash(
                        'success_msg', 
                        'Queue successfully updated. You may continue adding Voters to it.'
                    );
                    res.redirect('/dashboard/checkin');
                }
            });
        }
    }
});

// functinoality to compute rates of returning voters
router.post('/return', async (req, res) => {
    const { voterURL } = req.body.url;
    let returningVoter = await Voter.findById(id=voterURL, (err) => {
        if (err) {
            console.log(err);
        }
    });

    if (!returningVoterQuery) {
        req.flash(
            'error_msg', 
            'This QR Code Does not exists.'
        );
        res.redirect('/dashboard/return');
    }
    else {
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
            // save the rate to the database 
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
