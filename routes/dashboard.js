// dependencies 
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
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
    // grab form body 
    const { firstName, lastName, username, password1, password2 } = req.body;
    
    // error catching 
    let errors = [];
    if (password1) {
        if (password1 !== password2) {
            // determine matching passwords 
            errors.push({ msg: 'Passwords do not match.' });
        }
    }
    
    if (password1) {
        // determine password strength
        if (passwordStrength(password1).id === 0) {
            errors.push({ msg: 'Password is too weak.' });
        }
    }
    let userTaken = false
    adminQuery.forEach(admin => { 
        if (username === admin.username) {
            userTaken = true;
        }
    });
    if (userTaken) {
        // determine taken username
        errors.push({ msg: 'Username is already taken.' });
    }
    const masterAdmin = await Admin.findOne({ clearance: true });
    const masterPass = await bcrypt.compare(password3, masterAdmin.password);
    if (!masterPass) {
        // determine correct master password
        errors.push({ msg: 'Master password is incorrect.' });
    }

    if (errors.length > 0) {
        // rerender page on form errors
        res.render('register', {
            errors,
            firstname,
            lastname,
            username,
            password1,
            password2,
            password3
        });
    } else {
        // create new admin
        let master = false;
        const newAdmin = new Admin({
            firstName: firstname,
            lastName: lastname,
            username: username,
            password: password1,
            clearance: master
        });

        // password encryption
        bcrypt.genSalt(10, (err, salt) => { 
            bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                // set admin password to the encrypted one
                newAdmin.password = hash;

                // save the master admin
                newAdmin.save()
                .then(() => {
                    // flash message successful save 
                    req.flash(
                        'success_msg', 
                        'Admin registered. You may now login in.'
                    );
                    res.redirect('/admin/login');
                });
            });
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
