const nodemailer = require('nodemailer');
const supabase = require('../config/database');
const logger = require('../config/logger');

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
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>`,
        };

        const info = await transporter.sendMail(mailOptions);

        await supabase.from('email_logs').insert({
            invoice_id: invoiceId,
            email_type: getEmailType(subject),
            subject: subject,
            body: body,
            status: 'sent',
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Email sending error:', error);
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
        const { data: user, error } = await supabase
            .from('users')
            .select('subscription_status, daily_email_count, last_email_reset')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const now = new Date();
        const lastReset = new Date(user.last_email_reset);
        const isNewDay = now.getDate() !== lastReset.getDate() ||
            now.getMonth() !== lastReset.getMonth() ||
            now.getFullYear() !== lastReset.getFullYear();

        let currentCount = user.daily_email_count;

        if (isNewDay) {
            currentCount = 0;
            await supabase.from('users').update({
                daily_email_count: 0,
                last_email_reset: now.toISOString()
            }).eq('id', userId);
        }

        const isFree = user.subscription_status === 'free' || !user.subscription_status;
        if (isFree && currentCount >= 10) {
            return { allowed: false, message: 'Daily free limit reached.' };
        }

        await supabase.from('users').update({
            daily_email_count: currentCount + 1
        }).eq('id', userId);

        return { allowed: true };
    } catch (error) {
        logger.error('Limit check error:', error);
        return { allowed: false, message: 'Usage check failed.' };
    }
}

function getEmailType(subject) {
    if (subject.includes('Reminder')) return 'day1';
    if (subject.includes('Overdue')) return 'day7';
    if (subject.includes('Final Notice')) return 'day14';
    return 'unknown';
}

module.exports = { sendEmail, checkAndIncrementLimit };
