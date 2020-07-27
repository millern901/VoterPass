const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    callbackTime: {
        type: Date,
        default: Date.now      
    },
    queueType: {
        type: Boolean,
        default: 0
    },
    qrScanOne: {
        type: Date,
        default: null
    },
    qrScanTwo: {
        type: Date,
        default: null
    }
});

const Voter = mongoose.model('Voter', VoterSchema);
module.exports = Voter;