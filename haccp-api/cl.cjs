const fs = require('fs');
const path = 'src/pages/settings/SettingsPage.tsx';
let c = fs.readFileSync(path, 'utf8');
// Remove any non-ASCII chars that appear right before <svg
c = c.replace(/[^\x00-\x7F]+<svg/g, '<svg');
// Also clean up whitespace issues
c = c.replace(/\n\s*<svg/g, '\n            <svg');
fs.writeFileSync(path, c, 'utf8');
console.log('Cleaned');