const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    callbackTime: {
        type: Date,
        default: Date.now      
    },
    qrScanOne: {
        type: Date,
        default: null
    },
    qrScanTwo: {
        type: Date,
        default: null
    },
    queueSize: {
        type: Number,
        default: 0
    },
});

const Voter = mongoose.model('Voter', VoterSchema);
module.exports = Voter;