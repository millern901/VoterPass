const mongoose = require('mongoose');

const ReturnVoterSchema = new mongoose.Schema({
    qrScanOne: {
        type: Date,
        default: Date.now
    },
    qrScanTwo: {
        type: Date,
        default: null
    }
});

const ReturnVoter = mongoose.model('ReturnVoter', ReturnVoterSchema);
module.exports = ReturnVoter;