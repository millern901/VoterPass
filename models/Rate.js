const mongoose = require('mongoose');

const RateSchema = new mongoose.Schema({
    voterRate: {
        type: Decimal128,
        required: true
    }
});

const Rate = mongoose.model('Rate', RateSchema);
module.exports = Rate;