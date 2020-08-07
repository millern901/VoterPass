const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    clearance: {
        type: Boolean,
        required: true
    },
    dateCreated: {
        type: Date,
        default: Date.now()
    }
});

const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;