// Queue mongoose schema
const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
    callbackRate: {
        type: Number,
        required: true
    },
    queueOneLength: {
        type: Number,
        default: 0
    },
    queueTwoLength: {
        type: Number,
        default: 0
    },
    dateCreated: {
        type: Date,
        default: Date.now()
    }
});

const Queue = mongoose.model('Queue', QueueSchema);
module.exports = Queue;