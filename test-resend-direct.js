const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const resendApiKey = process.env.RESEND_API_KEY;
console.log('Testing Resend with API key:', resendApiKey?.substring(0, 15) + '...\n');

const resend = new Resend(resendApiKey);

async function testEmail() {
  try {
    console.log('Sending test email from: SignalsLoop <noreply@signalsloop.com>');
    console.log('Sending test email to: biorevanth@gmail.com\n');
    
    const { data, error } = await resend.emails.send({
      from: 'SignalsLoop <noreply@signalsloop.com>',
      to: ['biorevanth@gmail.com'],
      subject: 'Test from SignalsLoop',
      html: '<p>Testing email delivery</p>',
    });

    if (error) {
      console.error('❌ Error:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ Success! Email ID:', data.id);
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

testEmail();
