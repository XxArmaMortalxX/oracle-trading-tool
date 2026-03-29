'use strict';

const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'claritystudios606@gmail.com', // your email
        pass: 'your-email-password', // your password or app password
    },
});

// Function to send an email
const sendEmail = (to, subject, text) => {
    const mailOptions = {
        from: 'claritystudios606@gmail.com', // sender address
        to, // list of receivers
        subject, // Subject line
        text, // plain text body
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };