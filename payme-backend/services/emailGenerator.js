const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmail(invoice, emailType, isPro = false, tone = 'professional') {
    const model = 'gpt-4o-mini'; // Always use minimum model as requested

    const toneInstructions = {
        friendly: 'The tone should be warm, casual, and friendly.',
        professional: 'The tone should be professional, polite, and clear.',
        firm: 'The tone should be firm, authoritative, and direct (use legal-leaning language for seriously overdue invoices).'
    };

    const selectedTone = toneInstructions[tone] || toneInstructions.professional;

    const prompts = {
        upcoming: `Write an invoice reminder email for:
- Invoice #${invoice.invoice_number}
- Client: ${invoice.client_name}
- Amount: ${invoice.currency} ${invoice.amount}
- Due date: ${invoice.due_date}

${selectedTone}
Just a heads-up that the invoice is due in 3 days. Keep it under 80 words.
Sign off specifically as: "${invoice.sender_name}"`,

        day1: `Write an invoice reminder email for:
- Invoice #${invoice.invoice_number}
- Client: ${invoice.client_name}
- Amount: ${invoice.currency} ${invoice.amount}
- Due date: ${invoice.due_date}

${selectedTone}
Assume they may have already paid but it's now overdue by 1 day. Keep it under 100 words.
Sign off specifically as: "${invoice.sender_name}"`,

        day7: `Write a follow-up email for an overdue invoice:
- Invoice #${invoice.invoice_number}
- Client: ${invoice.client_name}
- Amount: ${invoice.currency} ${invoice.amount}
- ${invoice.days_late} days overdue

${selectedTone}
Asking for an update as the invoice is 1 week late. Keep it under 120 words.
Sign off specifically as: "${invoice.sender_name}"`,

        day14: `Write a final notice email for a seriously overdue invoice:
- Invoice #${invoice.invoice_number}
- Client: ${invoice.client_name}
- Amount: ${invoice.currency} ${invoice.amount}
- ${invoice.days_late} days overdue

${selectedTone}
Mentioning potential consequences if payment isn't received soon. Keep it under 150 words.
Sign off specifically as: "${invoice.sender_name}"`,
    };

    try {
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a professional invoice collection assistant. Write clear, polite, and effective reminder emails.',
                },
                {
                    role: 'user',
                    content: prompts[emailType],
                },
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        const emailBody = completion.choices[0].message.content.trim();

        const subjects = {
            upcoming: `Upcoming Invoice #${invoice.invoice_number} - Due Soon`,
            day1: `Invoice #${invoice.invoice_number} - Friendly Reminder`,
            day7: `Following up on Invoice #${invoice.invoice_number}`,
            day14: `Final Notice - Invoice #${invoice.invoice_number}`,
        };

        return {
            subject: subjects[emailType],
            body: emailBody,
        };
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error('Failed to generate email');
    }
}

module.exports = { generateEmail };
