// Quick script to fix template literals
const fs = require('fs');

let content = fs.readFileSync('src/routes/adminStatsRoutes.js', 'utf8');

// Replace all escaped template literals
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\\'/g, "\\'");
content = content.replace(/\\\${/g, '${');

fs.writeFileSync('src/routes/adminStatsRoutes.js', content);
console.log('Fixed template literals');