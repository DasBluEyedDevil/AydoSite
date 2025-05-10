const nodemailer = require('nodemailer');

// Create the transporter with error handling
let transporter;

try {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Add debug option for more detailed logging
        debug: process.env.NODE_ENV !== 'production',
        // Add a longer timeout for slow email servers
        connectionTimeout: 10000, // 10 seconds
        // Disable TLS verification in development (not recommended for production)
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
    });

    // Log email configuration (without sensitive data)
    console.log('Email transporter configured with:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER ? '******' : 'not set',
        debug: process.env.NODE_ENV !== 'production'
    });

    // Verify the connection configuration
    transporter.verify(function(error, success) {
        if (error) {
            console.error('Email transporter verification failed:', error);
        } else {
            console.log('Email server is ready to accept messages');
        }
    });
} catch (error) {
    console.error('Failed to create email transporter:', error);
    // Create a mock transporter that logs instead of sending
    transporter = {
        sendMail: (mailOptions) => {
            console.log('Mock email would be sent:', {
                to: mailOptions.to,
                subject: mailOptions.subject,
                from: mailOptions.from
            });
            // Return a resolved promise to prevent errors
            return Promise.resolve({
                messageId: 'mock-email-' + Date.now(),
                response: 'Mock email delivery simulation'
            });
        }
    };
}

module.exports = transporter;
