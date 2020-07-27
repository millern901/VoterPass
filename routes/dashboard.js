// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const moment = require('moment');

// Mongoose model
const Voter = require('../models/Voter');
const Queue = require('../models/Queue');
const Rate = require('../models/Rate');

//Page render requests
router.get('/', (req, res) => {
    res.render('../views/dashboard');
});
// Queue page get request 
router.get('/checkin', (req, res) => {
    res.render('checkin');
});
// Return page get request 
router.get('/return', (req, res) => {
    res.render('return');
});

<<<<<<< HEAD
// have the page render with the current queue parameters
=======

// functionality to add a voter to the queue
router.post('/', (req, res) => {
    // determine the number of voters in the queue
    let queueSize = 0;
    /*
    Voter.count({}, ( err, count ) => {
        queueSize = count;
    });
    */
>>>>>>> qr-scanner-implement

router.get('/checkin/queueUpdate', (req, res) => {
    res.render('queueUpdate');
});

// functionality to add a voter to the queue
router.post('/checkin', async (req, res) => {
        const { boothCount } = req.body;
        let errors = [];
        //Checks if queue is already present
        mainQueue = await Queue.find({})
        if(req.body.button === "createQueue"){
            if(!mainQueue && boothCount != null){
                console.log("GOTTEEEEEEM");
                const queue = new Queue({
                    boothCount: boothCount            
                });
                queue.save();
                console.log("Queue saved!");
            }else if(mainQueue){
                console.log("Queue already exists");
                errors.push({ msg: 'Queue already exists' });
                res.render('checkin', {
                    errors
                });
            }else if(!mainQueue && boothCount === null){
                console.log("Booth count is empty");
                errors.push({ msg: 'Booth count cannot be left empty' });
                res.render('checkin', {
                    errors
                });
            }
        }else if(req.body.button === "addVoter"){
        // calculate callback based on voting rate and number of people in main queue
        //var callbackTime = moment(Date.now).add((queueLength * mainQueue.callbackRate / mainQueue.boothCount), "m").toDate();
        var callbackTime = Date.now();

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
    let boothCount = req.boothCount;
    let totalRate = 0;
    let allRates = await Rate.find({});
    allRates.forEach(rate => {
        totalRate += rate.voterRate;
    });
    let newCallbackRate = totalRate / allRates.length;

    queueQuery = await Queue.find({})
    if (queueQuery.length === 0) {
        // create a new voter object
        const newQueue = new Voter({
            boothCount,
            newCallbackRate
        });

        
        newQueue.save()
        .then(queue => {
            req.flash(
                'success_msg', 
                'Queue Successfully Created.'
            );
            console.log(newQueue);
            res.redirect('/dashboard/checkin');
        })
        .catch(err => console.log(err));
    }
    else {
        let currentQueue = queueQuery[0]


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

// add functinoality for QR code reader  

<<<<<<< HEAD

module.exports = router;
=======
module.exports = router;
>>>>>>> qr-scanner-implement
