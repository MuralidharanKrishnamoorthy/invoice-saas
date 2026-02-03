const nodemailer = require('nodemailer');
const supabase = require('../config/database');

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendEmail(invoiceId, subject, body, recipientEmail) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: recipientEmail,
            subject: subject,
            text: body,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(
                /\n/g,
                '<br>'
            )}</div>`,
        };

        const info = await transporter.sendMail(mailOptions);

        // Log the email
        const { error } = await supabase.from('email_logs').insert({
            invoice_id: invoiceId,
            email_type: getEmailType(subject),
            subject: subject,
            body: body,
            status: 'sent',
        });

        if (error) {
            console.error('Failed to log email:', error);
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending error:', error);

        // Log the failure
        await supabase.from('email_logs').insert({
            invoice_id: invoiceId,
            email_type: getEmailType(subject),
            subject: subject,
            body: body,
            status: 'failed',
            error_message: error.message,
        });

        throw new Error('Failed to send email');
    }
}

async function checkAndIncrementLimit(userId) {
    try {
        // 1. Get user status
        const { data: user, error } = await supabase
            .from('users')
            .select('subscription_status, daily_email_count, last_email_reset')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const now = new Date();
        const lastReset = new Date(user.last_email_reset);

        // Check if it's a new day (UTC)
        const isNewDay = now.getDate() !== lastReset.getDate() ||
            now.getMonth() !== lastReset.getMonth() ||
            now.getFullYear() !== lastReset.getFullYear();

        let currentCount = user.daily_email_count;

        // 2. Reset logic
        if (isNewDay) {
            currentCount = 0;
            // Update reset time in background
            await supabase.from('users').update({
                daily_email_count: 0,
                last_email_reset: now.toISOString()
            }).eq('id', userId);
        }

        // 3. Check Limit
        const isFree = user.subscription_status === 'free' || !user.subscription_status;

        if (isFree && currentCount >= 10) {
            return { allowed: false, message: 'Daily free limit reached (10 emails/day).' };
        }

        // 4. Increment
        await supabase.from('users').update({
            daily_email_count: currentCount + 1
        }).eq('id', userId);

        return { allowed: true };

    } catch (error) {
        console.error('Limit check error:', error);
        // Fail open or closed? Let's fail safe (allow) but log error, or fail closed. 
        // Failing closed is safer for business.
        return { allowed: false, message: 'Failed to check usage limits.' };
    }
}

function getEmailType(subject) {
    if (subject.includes('Friendly Reminder')) return 'day1';
    if (subject.includes('Following up')) return 'day7';
    if (subject.includes('Final Notice')) return 'day14';
    return 'unknown';
}

module.exports = { sendEmail, checkAndIncrementLimit };
