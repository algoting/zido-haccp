const fs = require('fs');
const filePath = 'src/pages/oil/OilPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('return result.checks || [];', 'return Array.isArray(result) ? result : [];');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed');