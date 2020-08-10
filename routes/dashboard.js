// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const passwordStrength = require('check-password-strength');
const bcrypt = require('bcryptjs');

// mongoose schemas
const Voter = require('../models/Voter');
const Queue = require('../models/Queue');
const Rate = require('../models/Rate');
const Admin = require('../models/Admin');

// dashboard webpage get requests
router.get('/', async (req, res) => {
    const queueQuery = await Queue.find({});
    let queue = queueQuery[0];
    let currentTime = new Date();
    let queueLength = queue.queueOneLength;
    let nextCallbackTime = new Date(currentTime.getTime() + Math.round(queue.callbackRate * queueLength)*60000);

    currentTime = String(currentTime).split("GMT");
    currentTime = currentTime[0];
    nextCallbackTime = String(nextCallbackTime).split("GMT");
    nextCallbackTime = nextCallbackTime[0];

    res.render('dashboard', 
        {
            currentTime: currentTime, 
            queueLength: queueLength, 
            nextCallbackTime: nextCallbackTime, 
            user: req.user
        });
});
router.get('/checkin', async (req, res) => {
    const queueQuery = await Queue.find({});
    let queue = queueQuery[0];
    let currentTime = new Date();
    let queueLength = queue.queueOneLength;
    let nextCallbackTime = new Date(currentTime.getTime() + Math.round(queue.callbackRate * queueLength)*60000);

    currentTime = String(currentTime).split("GMT");
    currentTime = currentTime[0];
    nextCallbackTime = String(nextCallbackTime).split("GMT");
    nextCallbackTime = nextCallbackTime[0];

    res.render('checkin', 
        {
            currentTime: currentTime, 
            queueLength: queueLength, 
            nextCallbackTime: nextCallbackTime
        });
});
router.get('/return', (req, res) => {
    res.render('return');
});
router.get('/update', (req, res) => {
    res.render('update', 
        {
            user: req.user
        });
});
router.get('/ticket', async (req, res) => {
    const dirPath = path.resolve('public/tickets');
    const tickets = fs.readdirSync(dirPath).map(name => {
        return {
            name: path.basename(name, ".pdf"),
            url: `/tickets/${name}`
        };
    });
    const updatedTickets = [];
    for (let i = 0; i < tickets.length; i++) {
        let tempID = mongoose.Types.ObjectId(String(tickets[i].name));
        const voter = await Voter.findById(id = tempID);
        const tempTuple = [
            tickets[i].name, 
            tickets[i].url, 
            voter.callbackStart, 
            voter.callbackEnd
        ];
        updatedTickets.push(tempTuple);
    }
    console.log(updatedTickets.length);        
    console.log(updatedTickets);

    res.render('ticket', { updatedTickets });
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
    const voterQRCode = await QRCode.toFile('./public/voter-qr-code.png', voterURL)
    let filepath = './public/tickets/' + newVoter._id + '.pdf';
    
    // create a new voter ticket using the generated qrcode
    const doc = new PDFDocument;
    // pipe the ticket, add text to the ticket, and add the qrcode to the ticket
    doc.pipe(fs.createWriteStream(filepath));
    doc.fontSize(12).text(`Callback Time Start:\n ${newVoter.callbackStart} \n\n Callback Time End:\n ${newVoter.callbackEnd}`, 100, 100);
    doc.image('./public/voter-qr-code.png', { align: 'center', valign: 'center' });
    // save the voting ticket 
    doc.end();

    // increment the queue length
    await Queue.findByIdAndUpdate(id = queue._id, { queueOneLength: queue.queueOneLength + 1 });
    
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
    // set update object 
    let objForUpdate = {};
    let errors = []

    // error catching
    if (req.body.firstName) {
        objForUpdate.firstName = req.body.firstName;
    }
    if (req.body.lastName) {
        objForUpdate.lastName = req.body.lastName;
    }
    if (req.body.password1 || req.body.password2) {
        if (req.body.password1 && req.body.password2) {
            if (req.body.password1 === req.body.password2) {
                if (passwordStrength(req.body.password1).id === 0) {
                    errors.push({ msg: 'Password is too weak.' });
                }
                else {
                    // password encryption
                    bcrypt.genSalt(10, (err, salt) => { 
                        bcrypt.hash(req.body.password1, salt, (err, hash) => {
                            // set admin password to the encrypted one
                            objForUpdate.password = hash;
                        });
                    });
                }
            }
            else {
                errors.push({ msg: 'Passwords do not match.' });
            }
        } else {
            errors.push({ msg: 'Both passwords must be filled in.' });
        }
    }
    if (req.body.username) {
        const usernameQuery = await Admin.find({ username: req.body.username });
        if (usernameQuery.length === 0) {
            objForUpdate.username = req.body.username;
        } else {
            errors.push({ msg: 'Username is taken.' });
        }
    }
    if (objForUpdate.length === 0)  {
        errors.push({ msg: 'Nothing was submitted.' });
    }

    if (errors.length > 0) {
        const { firstName, lastName, username, password1, password2 } = req.body;
        res.render('update', {
            errors,
            firstName,
            lastName,
            username,
            password1,
            password2
        });
    } else {
        // update admin
        objForUpdate = { $set: objForUpdate };
        Admin.findByIdAndUpdate(_id = req.user._id, objForUpdate)
        .then(() => {
            // flash message successful save 
            req.flash(
                'success_msg', 
                'Profile updated.'
            );
            res.redirect('/dashboard/update');
        });
    }
});


// shutdown system request 
router.get('/shutdown', async (req, res) => {
    await Voter.deleteMany({});
    await Queue.deleteMany({});
    // await Admin.remove({});
    req.logout();
    req.flash('success_msg', 'System has been shut down.');
    res.redirect('/admin/startup');
});

module.exports = router;
