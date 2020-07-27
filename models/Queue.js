// Queue mongoose schema
const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
    boothCount: {
        type: Number,
        required: true
    },
    callbackRate: {
        type: Number,
        required: true
    },
    callbackRange: {
        type: Number,
        required: true
    },
    queueLength: {
        type: Number,
        default: 0
    }
});

const Queue = mongoose.model('Queue', QueueSchema);
module.exports = Queue;