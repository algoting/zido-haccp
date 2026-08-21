require('dotenv').config();
const nm = require('nodemailer');

console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASSWORD ? '***set***' : 'MISSING');
console.log('SMTP_FROM:', process.env.SMTP_FROM);

const t = nm.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});

t.sendMail({
  from: process.env.SMTP_FROM,
  to: 'mouradelarari@gmail.com',
  subject: 'HACCP Test Email',
  html: '<p>Test email from HACCP app</p>'
})
  .then(function(info) { console.log('SEND OK:', info.messageId); })
  .catch(function(e) { console.log('SEND ERROR:', e.message, e.code); });
