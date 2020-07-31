// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

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
    // grab all queues 
    let queueQuery = await Queue.find({});

    // check that there is a queue
    if (queueQuery.length !== 0) {
        // get the current time and first queue in the database 
        let currentTime = new Date();
        let queue = queueQuery[0];

        // calculate when the callback time should be set to
        let dif = Math.round(queue.callbackRate * (queue.queueOneLength / queue.boothCount));
        let callbackStart = new Date(currentTime.getTime() + dif*60000);
        let callbackEnd = new Date(callbackStart.getTime() + (queue.callbackRange)*60000);

        // create a new voter object with the calculated callback time 
        const newVoter = new Voter({
            callbackStart: callbackStart,
            callbackEnd: callbackEnd
        });

        // create a voter profile url with the voter's generated mongoDB id 
        voterURL = 'http://localhost:5000/dashboard/return/' + newVoter._id;        
        
        // Generate QR Code from the URL created before 
        QRCode.toDataURL(voterURL, { type: 'terminal' })
        .then(url => {
            console.log(url);
        })
        .catch(err => {
            console.log(err);
        });

        // increment the queue length
        Queue.findByIdAndUpdate(queue._id, { queueOneLength: queue.queueOneLength + 1})
        .then(doc => {
            console.log('Queue 1 Length Incremented');
        })
        .catch(err => {
            console.log(err);
        });

        // save the voter to mongoDB 
        newVoter.save()
        .then(voter => {
            req.flash(
                'success_msg', 
                'Voter has been Added to the Queue.'
            );
            res.redirect('/dashboard/checkin');
        })
        .catch(err => { 
            console.log(err);
        });
    }
    // otherwise no queue has been set up. So redirect to creation form
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
        let newCallbackRate = 1;

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
router.post('/return/*', async (req, res) => {
    // get the url request
    requestURL = String(req.url);
    const voterId = requestURL.substring(requestURL.lastIndexOf('/') + 1)

    // search for a voter profile with the same id 
    let returningVoter = await Voter.findById(voterId).exec();

    // log if no voter exists
    if (!returningVoter) {
       console.log('This QR Code Does not exists.');
    }
    else {
        // query for the currently active queue
        let queueQuery = await Queue.find({});
        let queue = queueQuery[0];

        // get the current time 
        let currentTime = new Date();
        
        // check that this is the voters first scan 
        if (returningVoter.qrScanOne === null) {
            // get the time difference between now and the callbacktime
            let timeDifMin = Math.round((currentTime.getTime() - returningVoter.callbackStart.getTime()) / 60000);
            //let errors = [];

            // check that the difference is within the queue range 
            if (timeDifMin > queue.callbackRange) {
                console.log('You missed your callback time.');
            } else if (timeDifMin < 0) {
                console.log('Your callback time has not started.');
            } 
            // if the voter passes update the mongoDB entries  
            else {
                // determine if no one is in the second queue (edge case)
                let secondQueueLength = queue.queueTwoLength;
                if (secondQueueLength === 0) {
                    secondQueueLength = 1;
                } 

                // update the voter currently selected 
                Voter.findByIdAndUpdate(id=returningVoter._id, {qrScanOne: currentTime, queueLength: secondQueueLength})
                .then(doc => {
                   console.log('Have have successfully returned.');
                })
                .catch(err => {
                    console.log(err);
                });

                // decrement the number of people currently in the main queue
                Queue.findByIdAndUpdate(id=queue._id, { queueOneLength: queue.queueOneLength - 1, queueTwoLength: queue.queueTwoLength + 1 })
                .then(voter => {
                    console.log('Main Queue has been decremented.');
                    console.log('Second Queue has been incremented.');
                 })
                .catch(err => {
                    console.log(err);
                });
            }
        }
        // otherwise it is there second return
        else {
            // calculate and create voting rate
            let timeDifMili = currentTime.getTime() - returningVoter.qrScanOne.getTime();
            let timeDifMin = timeDifMili / 60000;
            let rate = timeDifMin * (returningVoter.queueLength / queue.boothCount);
            const newRate = new Rate({
                voterRate: rate
            });

            // save the rate to the database 
            newRate.save()
            .then(rate => {
                console.log('Rate has been saved');
                console.log(rate);
            })
            .catch(err => {
                console.log(err)
            });

            // delete the voter from the database 
            Voter.findByIdAndRemove(id = returningVoter._id)
            .then(doc => {
                console.log('You may now go and vote.');
            })
            .catch(err => {
                console.log(err)
            });

            // decrement the number of people currently in the main queue
            Queue.findByIdAndUpdate(id=queue._id, { queueTwoLength: queue.queueTwoLength - 1 })
            .then(doc => {
                console.log('Second Queue has been decremented.');
             })
            .catch(err => {
                console.log(err);
            });
        }
    }
});

module.exports = router;
