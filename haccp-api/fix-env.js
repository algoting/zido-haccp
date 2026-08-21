const fs = require('fs');
const envPath = '/opt/haccp/haccp-api/.env';
let content = fs.readFileSync(envPath, 'utf8');
content = content.replace(/SMTP_PASSWORD=T5uQ~Uaa\+#/g, 'SMTP_PASSWORD="T5uQ~Uaa+#"');
fs.writeFileSync(envPath, content);
console.log('Fixed SMTP_PASSWORD quoting');
