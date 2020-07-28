const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    callbackTime: {
        type: Date,
        default: Date.now      
    },
    queueType: {
        type: Boolean,
        default: true
    },
    qrScanOne: {
        type: Date,
        default: null
    },
    queueLength: {
        type: Number,
        default: 1
    }
});

const Voter = mongoose.model('Voter', VoterSchema);
module.exports = Voter;