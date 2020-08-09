// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// mongoose schemas
const Voter = require('../models/Voter');
const Queue = require('../models/Queue');
const Rate = require('../models/Rate');
const Admin = require('../models/Admin');

// dashboard webpage get requests
router.get('/', (req, res) => {
    res.render('dashboard');
});
router.get('/checkin', (req, res) => {
    res.render('checkin');
});
router.get('/return', (req, res) => {
    res.render('return');
});
router.get('/update', (req, res) => {
    res.render('update');
});
router.get('/help', (req, res) => {
    res.render('help');
});

// dashboard checkin request
router.post('/checkin', async (req, res) => {
    // locate the queue and get the current time 
    const queueQuery = await Queue.find({});
    let queue = queueQuery[0];
    let currentTime = new Date();

    // calculate the callback start and end times
    let dif = Math.round(queue.callbackRate * queue.queueOneLength);
    let callbackRange = 30;
    let voterCallbackStart = new Date(currentTime.getTime() + dif*60000);
    let voterCallbackEnd = new Date(voterCallbackStart.getTime() + callbackRange*60000);

    // create new voter (with calculated callback times)
    const newVoter = new Voter({
        callbackStart: voterCallbackStart,
        callbackEnd: voterCallbackEnd
    });

    // create a voter qrcode using the url generated from it's mongodb id)
    voterURL = 'http://localhost:5000/dashboard/return/' + newVoter._id;        
    const voterQRCode = await QRCode.toFile('./voter-qr-code.png', voterURL)
    
    // create a new voter ticket using the generated qrcode
    const doc = new PDFDocument;
    // pipe the ticket, add text to the ticket, and add the qrcode to the ticket
    doc.pipe(fs.createWriteStream('./tickets/' + newVoter._id + '.pdf'));
    doc.fontSize(12).text(`Callback Time Start:\n ${newVoter.callbackStart} \n\n Callback Time End:\n ${newVoter.callbackEnd}`, 100, 100);
    doc.image('./voter-qr-code.png', { align: 'center', valign: 'center' });
    // save the voting ticket 
    doc.end();

    // increment the queue length
    await Queue.findByIdAndUpdate(
        id = queue._id, 
        { 
            queueOneLength: queue.queueOneLength + 1 
        }
    );
    
    // save the voter to mongoDB 
    newVoter.save()
    .then(() => {
        req.flash(
            'success_msg', 
            'Voter has been added to the queue.'
        );
        res.redirect('/dashboard/checkin');
    });
});

// dashboard return request
router.post('/return/*', async (req, res) => {
    // get the id from the http request
    let requestURL = String(req.url);
    const voterId = requestURL.substring(requestURL.lastIndexOf('/') + 1);

    // locate the voter and initialize error list
    const voterQuery = await Voter.find({ _id: voterId });

    if (voterQuery.length === 0) {
        // determine ticket validity
        res.send("This Ticket is Invalid.");
    }
    else {
        // locate the queue, set the voter, and get the current time
        const queueQuery = await Queue.find({});
        let queue = queueQuery[0];
        let voter = voterQuery[0];
        let currentTime = new Date();
        
        // voter has no return scan 
        if (voter.qrScanOne === null) {
            // get the time difference between now and the callbacktime
            let callbackRange = 30;
            let timeDifference = Math.round(currentTime.getTime() - (voter.callbackStart.getTime() / 60000));
            // let timeDifferenceEnd = Math.round((voter.callbackEnd.getTime() / 60000) - currentTime.getTime());

            if (0 < timeDifference && timeDifference < callbackRange) {
                // determine if the callback has not started
                res.send("You have missed your callback time.");
            } else if (0 > timeDifference && -timeDifference < callbackRange) {
                // determine if the callback has ended
                res.send("Your callback time has not started.");
            } else {
                // update queue lengths
                await Queue.findByIdAndUpdate(
                    id = queue._id, 
                    { 
                        queueOneLength: queue.queueOneLength - 1, 
                        queueTwoLength: queue.queueTwoLength + 1 
                    }
                );

                // update voter scan one value 
                Voter.findByIdAndUpdate(
                    id = voter._id, 
                    {
                        qrScanOne: currentTime, 
                        queueLength: ((queue.queueTwoLength === 0) ? 1 : queue.queueTwoLength)
                    }
                ).then(() => {
                    // flash message successful return 
                    res.send("Have have successfully returned.");
                });
            }
        }
        else {
            // calculate voting rate for second scan
            let timeDifference = (currentTime.getTime() - voter.qrScanOne.getTime()) / 60000;
            let voterRate = timeDifference / voter.queueLength;
            const newRate = new Rate({ votingRate: voterRate });

            // save the calculated rate
            await newRate.save();

            // update the queue
            await Queue.findByIdAndUpdate(id = queue._id, { queueTwoLength: queue.queueTwoLength - 1 });

            // delete the voter 
            Voter.findByIdAndRemove(id = voter._id)
            .then(() => {
                // flash message successful deletion 
                res.send("You may now go and vote. Have a nice day.");
            });
        }
    }
});


// update admin profile request
router.post('/update', async (req, res) => {
    // Get request body 
    const { callbackRange } = req.body;
    // initialize error list
    let errors = [];

    // Check all form fields have been filed  
    if (!callbackRange) {
        errors.push({ msg: 'All Fields are Required.' });
    }

    // Determine if any errors were encountered 
    if (errors.length > 0) {
        // Rerender the page and return error messages for flashing
        res.render('update', {
            errors
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
            
            Queue.findByIdAndUpdate(queueId, { callbackRange: callbackRange }, (err) => {
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

// shutdown system request 
router.get('/shutdown', async (req, res) => {
    await Voter.deleteMany({});
    await Queue.deleteMany({});
    await Admin.remove({});
    req.logout();
    req.flash('success_msg', 'System has been shut down.');
    res.redirect('/admin/startup');
});

module.exports = router;
