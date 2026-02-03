const cron = require('node-cron');
const supabase = require('../config/database');
const { generateEmail } = require('../services/emailGenerator');
const { sendEmail, checkAndIncrementLimit } = require('../services/emailSender');
const { calculateDaysLate } = require('../utils/csvParser');
const logger = require('../config/logger');

async function processInvoices() {
    try {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*, users(name)')
            .neq('status', 'paid');

        if (error) {
            logger.error('Error fetching invoices:', error);
            return;
        }

        for (const invoice of invoices) {
            let currentStatus = invoice.reminder_status || 'active';

            if (currentStatus === 'paused') {
                const pauseUntil = invoice.reminders_paused_until;
                if (pauseUntil && new Date(pauseUntil) > new Date()) {
                    continue;
                } else {
                    await supabase
                        .from('invoices')
                        .update({ reminder_status: 'active', reminders_paused_until: null })
                        .eq('id', invoice.id);
                }
            }

            const daysLate = calculateDaysLate(invoice.due_date);
            const lateFee = daysLate >= 7 ? 20 : 0;
            await supabase
                .from('invoices')
                .update({
                    days_late: daysLate,
                    late_fee: lateFee
                })
                .eq('id', invoice.id);

            let emailType = null;

            if (daysLate === -3 && invoice.status === 'pending') {
                emailType = 'upcoming';
            } else if (daysLate >= 1 && (invoice.status === 'pending' || invoice.status === 'upcoming_sent')) {
                emailType = 'day1';
            } else if (daysLate >= 7 && invoice.status === 'day1_sent') {
                emailType = 'day7';
            } else if (daysLate >= 14 && invoice.status === 'day7_sent') {
                emailType = 'day14';
            }

            if (emailType) {
                const limitCheck = await checkAndIncrementLimit(invoice.user_id);
                if (!limitCheck.allowed) continue;

                try {
                    let subject, body;
                    const savedEmails = invoice.generated_emails || {};
                    const edited = savedEmails[emailType];

                    if (edited && edited.user_edited) {
                        subject = edited.edited_subject || edited.subject;
                        body = edited.edited_body || edited.body;
                    } else {
                        const result = await generateEmail(
                            {
                                ...invoice,
                                days_late: daysLate,
                                late_fee: lateFee,
                                sender_name: invoice.users?.name || '[Your Name]'
                            },
                            emailType
                        );
                        subject = result.subject;
                        body = result.body;
                    }

                    await sendEmail(invoice.id, subject, body, invoice.client_email);

                    await supabase
                        .from('invoices')
                        .update({
                            status: `${emailType}_sent`,
                            emails_sent: (invoice.emails_sent || 0) + 1,
                            last_email_sent_at: new Date().toISOString(),
                        })
                        .eq('id', invoice.id);
                } catch (error) {
                    logger.error(`Failed to send email for invoice #${invoice.invoice_number}:`, error);
                }
            }
        }
    } catch (error) {
        logger.error('Invoice chasing error:', error);
    }
}

function startCronJob() {
    const schedule = process.env.CRON_SCHEDULE || '0 9 * * *';
    cron.schedule(schedule, async () => {
        await processInvoices();
    });
}

module.exports = { startCronJob, processInvoices };
