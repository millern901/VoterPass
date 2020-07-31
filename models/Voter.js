const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    callbackStart: {
        type: Date,
        required: true
    },
    callbackEnd: {
        type: Date,
        required: true
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