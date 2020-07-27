const mongoose = require('mongoose');

const RateSchema = new mongoose.Schema({
    voterRate: {
        type: Number,
        required: true
    }
});

const Rate = mongoose.model('Rate', RateSchema);
module.exports = Rate;