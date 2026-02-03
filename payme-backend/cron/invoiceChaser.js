const cron = require('node-cron');
const supabase = require('../config/database');
const { generateEmail } = require('../services/emailGenerator');
const { sendEmail, checkAndIncrementLimit } = require('../services/emailSender');
const { calculateDaysLate } = require('../utils/csvParser');

async function processInvoices() {
    console.log('Running invoice chasing logic...');

    try {
        // Get all unpaid invoices with user details
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*, users(name)')
            .neq('status', 'paid');

        if (error) {
            console.error('Error fetching invoices:', error);
            return;
        }

        for (const invoice of invoices) {
            // Check Pause Status
            let currentStatus = invoice.reminder_status || 'active';

            if (currentStatus === 'paused') {
                const pauseUntil = invoice.reminders_paused_until;
                if (pauseUntil && new Date(pauseUntil) > new Date()) {
                    console.log(`⏸️ Invoice #${invoice.invoice_number} is paused until ${pauseUntil}. Skipping.`);
                    continue;
                } else {
                    // Auto-resume if date has passed or no date set (indefinite requires manual resume if we want, or we can treat null as passed?)
                    // The prompt said "If paused_until date has passed, automatically change status back to 'active'"
                    console.log(`▶️ Auto-resuming invoice #${invoice.invoice_number} (Pause period expired)`);
                    await supabase
                        .from('invoices')
                        .update({ reminder_status: 'active', reminders_paused_until: null })
                        .eq('id', invoice.id);
                }
            }

            // Update days late
            const daysLate = calculateDaysLate(invoice.due_date);

            // Determine which email to send
            let emailType = null;

            // Strategy:
            // -3 days: Upcoming
            // 1+ days: Day 1 (if new or only upcoming sent)
            // 7+ days: Day 7 (if day 1 sent)
            // 14+ days: Day 14 (if day 7 sent)

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
                // Check usage limits (Freemium: 10/day)
                const limitCheck = await checkAndIncrementLimit(invoice.user_id);
                if (!limitCheck.allowed) {
                    console.log(`🚫 Skipped invoice #${invoice.invoice_number}: ${limitCheck.message}`);
                    continue;
                }

                try {
                    // Check if user has edited this email type
                    let subject, body;
                    const savedEmails = invoice.generated_emails || {};
                    const edited = savedEmails[emailType];

                    if (edited && edited.user_edited) {
                        console.log(`✏️ Using user-edited version of ${emailType} for invoice #${invoice.invoice_number}`);
                        subject = edited.edited_subject || edited.subject;
                        body = edited.edited_body || edited.body;
                    } else {
                        // Generate email
                        const result = await generateEmail(
                            {
                                ...invoice,
                                days_late: daysLate,
                                sender_name: invoice.users?.name || '[Your Name]'
                            },
                            emailType
                        );
                        subject = result.subject;
                        body = result.body;
                    }

                    // Send email
                    await sendEmail(invoice.id, subject, body, invoice.client_email);

                    // Update status
                    await supabase
                        .from('invoices')
                        .update({
                            status: `${emailType}_sent`,
                            emails_sent: (invoice.emails_sent || 0) + 1,
                            last_email_sent_at: new Date().toISOString(),
                        })
                        .eq('id', invoice.id);

                    console.log(`Sent ${emailType} email for invoice #${invoice.invoice_number}`);
                } catch (error) {
                    console.error(`Failed to send email for invoice #${invoice.invoice_number}:`, error);
                }
            }
        }

        console.log('Invoice chasing completed successfully');
    } catch (error) {
        console.error('Invoice chasing error:', error);
    }
}

function startCronJob() {
    // Run daily at 9 AM (or custom schedule from env)
    const schedule = process.env.CRON_SCHEDULE || '0 9 * * *';

    cron.schedule(schedule, async () => {
        console.log('Running scheduled daily invoice chasing...');
        await processInvoices();
    });

    console.log(`Cron job scheduled: ${schedule}`);
}

module.exports = { startCronJob, processInvoices };
