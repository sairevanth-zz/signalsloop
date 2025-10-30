// Quick script to check email configuration
console.log('Checking email configuration...\n');

const resendKey = process.env.RESEND_API_KEY;

console.log('RESEND_API_KEY present:', !!resendKey);
if (resendKey) {
  console.log('RESEND_API_KEY starts with:', resendKey.substring(0, 10) + '...');
}

console.log('\nChecking if Resend package is installed...');
try {
  require('resend');
  console.log('✅ Resend package is installed');
} catch (e) {
  console.log('❌ Resend package NOT installed');
}
