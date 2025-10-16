require('dotenv').config({ path: '.env.local' });

async function testWelcomeEmail() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in .env.local');
    return;
  }

  console.log('✅ RESEND_API_KEY found:', RESEND_API_KEY.substring(0, 10) + '...');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'SignalsLoop <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: '👋 Welcome to SignalsLoop - Test',
      html: '<h1>Welcome!</h1><p>This is a test welcome email from your SignalsLoop setup.</p>'
    })
  });

  const result = await response.json();

  if (response.ok) {
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', result.id);
  } else {
    console.error('❌ Failed to send email:', result);
  }
}

testWelcomeEmail().catch(console.error);
