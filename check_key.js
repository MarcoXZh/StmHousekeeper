/**
 * Check keys from an encrypted key file
 * @author:     MarcoXZh3
 * @version:    1.0.0
 */
const fs = require('fs');

const encryption = require('./libs/libencryption');


if (!fs.existsSync('pw.log')) {
  throw new ReferenceError('No owner\'s password file found');
} // if (!fs.existsSync('pw.log'))
const password = fs.readFileSync('pw.log', 'utf8').toString().trim();
const keys = JSON.parse(encryption.importFileSync(process.argv[2], password));
console.log(JSON.stringify(keys, null, 4));
process.exit(0);
