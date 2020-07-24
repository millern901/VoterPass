const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
    boothCount: {
        type: Number,
        default: 0
    },
    queueLength: {
        type: Number,
        default: 0
    },
    callbackRate: {
        type: Number,
        default: 0
    },
    queueType: {
        type: Boolean,
        default: 0
    }
});

const Queue = mongoose.model('Queue', QueueSchema);
module.exports = Queue;