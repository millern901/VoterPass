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
            nextCallbackTime: nextCallbackTime,
            user: req.user
        });
});
router.get('/return', (req, res) => {
    res.render('return', 
    {
        user: req.user
    });
});
router.get('/update', (req, res) => {
    res.render('update', 
        {
            user: req.user
        });
});
router.get('/ticket', async (req, res) => {
    let currentTime = new Date();
    const dirPath = path.resolve('public/tickets');
    const tickets = fs.readdirSync(dirPath).map(name => {
        return {
            name: path.basename(name, ".pdf"),
            url: `/tickets/${name}`
        };
    });
    const tempTickets = [];
    for (let i = 0; i < tickets.length; i++) {
        let tempID = mongoose.Types.ObjectId(String(tickets[i].name));
        const voter = await Voter.findById(id = tempID);
        if (voter) {
            if (voter.callbackEnd.getTime() < currentTime.getTime()) {
                await Voter.findByIdAndRemove(id = voter._id);
            } else {
                const tempTuple = [
                    tickets[i].name, 
                    tickets[i].url, 
                    voter.callbackStart, 
                    voter.callbackEnd
                ];
                tempTickets.push(tempTuple);
            }
        } else {
            continue;
        }
    }
    const updatedTickets = tempTickets.sort((a, b) => {
        return b[2].getTime() - a[2].getTime();
    });
    
    res.render('ticket', { updatedTickets, user: req.user });
});
router.get('/help', (req, res) => {
    res.render('help', 
    {
        user: req.user
    });
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
    } else {
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
                await Voter.findByIdAndRemove(id = voter._id);
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
                    res.send("You have successfully returned.");
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

// dashboard update request
router.post('/update', async (req, res) => {
    // set update object 
    let objForUpdate = {};
    let errors = []
    let tempPassword = ''

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
                } else {
                    tempPassword = req.body.password1;
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

    if (errors.length > 0) {
        const { firstName, lastName, username, password1, password2 } = req.body;
        res.render('update', {
            errors,
            firstName,
            lastName,
            username,
            password1,
            password2,
            user: req.user
        });
    } else {
        // update admin
        const adminQuery = await Admin.findById(_id = req.user._id);

        if (objForUpdate.firstName) {
            adminQuery.firstName = objForUpdate.firstName;
        }
        if (objForUpdate.lastName) {
            adminQuery.lastName = objForUpdate.lastName;
        }
        if (objForUpdate.username) {
            adminQuery.username = objForUpdate.username;
        }
        if (tempPassword !== '') {
            bcrypt.genSalt(10, (err, salt) => { 
                bcrypt.hash(tempPassword, salt, (err, hash) => {
                    // set admin password to the encrypted one
                    adminQuery.password = hash;
                    // save the master admin
                    adminQuery.save()
                    .then(() => {
                        req.flash(
                            'success_msg', 
                            'Profile updated.'
                        );
                        res.redirect('/dashboard/update');
                    });

                });
            });
        } else {
            adminQuery.save()
            .then(() => {
                req.flash(
                    'success_msg', 
                    'Profile updated.'
                );
                res.redirect('/dashboard/update');
            });
        }
    }
});

// check that a file exists 
function fileExists(path) {
    try  {
        return fs.statSync(path).isFile();
    }
    catch (e) {
      if (e.code == 'ENOENT') { // no such file or directory. File really does not exist
        return false;
      }
    }
}
// dashboard shutdown request 
router.get('/shutdown', async (req, res) => {
    // delete all tickets 
    const dirPath = path.resolve('public/tickets');
    fs.readdir(dirPath, (err, files) => {
        if (files.length !== 0) {
            for (const file of files) {
                fs.unlinkSync(path.join(dirPath, file));
            }
        }
    });

    // remove temporary png 
    const dirPath2 = path.resolve('public');
    let pngPath = path.join(dirPath2, 'voter-qr-code.png');
    if (fileExists(pngPath)) {
        fs.unlinkSync(pngPath);
    }

    // clear all collections (except for rates)
    await Voter.deleteMany({});
    await Queue.deleteMany({});
    await Admin.remove({});

    // logout and flash 
    req.logout();
    req.flash('success_msg', 'System has been shut down.');
    res.redirect('/admin/startup');
});

module.exports = router;
