const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    callbackTime: {
        type: Date,
        default: Date.now      
    }
});

const Voter = mongoose.model('Voter', VoterSchema);
module.exports = Voter;