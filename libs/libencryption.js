/**
 * Encryption-related libraries
 * @author  MarcoXZh3
 * @version 1.5.3
 */
const name = module.exports.name = 'encryption';


const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const fs = require('fs');

/**
 * Supportive settings: key length and salty symbols
 */
const DATA_LENGTH = 1024;               // 1024 bytes = 8192 bits
const KEY_LENGTH = 32;                  // 32 bytes = 256 bits
const FULL_DUMMY = Array(127).fill()    // All printable ASCII chars
                             .map( (x, i)=>String.fromCharCode(i) )
                             .slice(32);
const SEPERATOR = '~~~';


/**
 * the encryption function, syncronized version
 * @param {string|array}    plainData   the plain data to be ecnrypted
 * @param {string}          password    the password for encryption
 * @return {bytes}                      the encrypted bytes
 */
const encryptDataSync = module.exports.encryptDataSync =
function(plainData, password) {
  if (!plainData) {
    throw new TypeError(name +
                        '.encryptDataSync<plainData>: expect=string|array' +
                        '; get=' + typeof plainData);
  } else if (typeof plainData !== 'string') {
    plainData = plainData.toString();
  } else if (plainData.length === 0) {
    throw new RangeError(name + '.encryptDataSync<plainData>: length=' +
                         plainData.length);
  } // if - else if ...
  if (!password || typeof password !== 'string') {
    throw new TypeError(name +
                        '.encryptDataSync<password>: expect=string; get=' +
                        typeof plainData);
  } else if (password.length === 0) {
    throw new RangeError(name + '.encryptDataSync<password>: length=' +
                         password.length);
  } // if - else if ...

  // Prepare password
  while (password.length < KEY_LENGTH) {
    password += password;
  } // while (password.length < KEY_LENGTH)
  password = password.slice(0, KEY_LENGTH);

  // Salt the data with dummies
  const dummies = FULL_DUMMY.filter( (d)=>!plainData.includes(d) );
  let encrypted = plainData.toString();
  while (encrypted.length + SEPERATOR.length + dummies.length < DATA_LENGTH) {
    let idx1 = Math.floor(encrypted.length * Math.random());
    let idx2 = Math.floor(dummies.length * Math.random());
    encrypted = encrypted.substring(0, idx1) +
                  dummies[idx2] +
                  encrypted.substring(idx1, encrypted.length);
  } // while ( ... )
  encrypted += SEPERATOR + dummies.join('');

  // Encrypt
  const cipher = crypto.createCipher(algorithm, password);
  encrypted = cipher.update(encrypted, 'utf8', 'binary');
  encrypted += cipher.final('binary');
  return encrypted;
}; // function encryptDataSync(plainData, password)

/**
 * the encryption function, asyncronized version
 * @param {string|array}    plainData  the plain data to be ecnrypted
 * @param {string}          password    the password for encryption
 * @param {function}        callback    the call back function
 *      @param {array}      encryptedData   the encrypted data
 */
const encryptData = module.exports.encryptData =
function(plainData, password, callback) {
  if (callback) {
    callback(encryptDataSync(plainData, password));
  } else {
    throw new TypeError(name + '.encryptData: missing callback function');
  } // else - if (callback)
}; // function encryptData(plainData, password, callback)

/**
 * the decryption function, syncronized version
 * @param {array}   encryptedData   the encrypted data to be decrypted
 * @param {string}  password        the password for decryption
 * @return {bytes}                  the decrypted bytes
 */
const decryptDataSync = module.exports.decryptDataSync =
function(encryptedData, password) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new TypeError(name +
                        '.decryptDataSync<encryptedData>: expect=string' +
                        '; get=' + typeof encryptedData);
  } else if (encryptedData.length === 0) {
    throw new RangeError(name + '.decryptDataSync<encryptedData>: length=' +
                         encryptedData.length);
  } // if - else if ...
  if (!password || typeof password !== 'string') {
    throw new TypeError(name +
                        'decryptDataSync<password>: expect=string; get=' +
                        typeof plainData);
  } else if (password.length === 0) {
    throw new RangeError(name + 'decryptDataSync<password>: length=' +
                         password.length);
  } // if - else if ...

  // Prepare password
  while (password.length < KEY_LENGTH) {
    password += password;
  } // while (password.length < KEY_LENGTH)
  password = password.slice(0, KEY_LENGTH);

  // Decrypt
  const decipher = crypto.createDecipher(algorithm, password);
  let decrypted = decipher.update(encryptedData, 'binary', 'utf8');
  decrypted += decipher.final('utf8');

  // Un-salt the decrypted data
  const values = decrypted.split(SEPERATOR);
  const dummies = values[values.length - 1];
  decrypted = values.slice(0, values.length-1).join(SEPERATOR);
  dummies.split('').forEach(function(dummy) {
    decrypted = decrypted.split(dummy).join('');
  }); // DUMMY.split('').forEach(function(dummy) { ... });

    return decrypted;
}; // function decryptDataSync(encryptedData, password)

/**
 * the decryption function, asyncronized version
 * @param {array}       encryptedData  the encrypted data to be decrypted
 * @param {string}      password        the password for decryption
 * @param {function}    callback        the call back function
 *      @param {array}      decryptedData  the decrypted data
 */
const decryptData = module.exports.decryptData =
function(encryptedData, password, callback) {
  if (callback) {
    callback(decryptDataSync(encryptedData, password));
  } else {
    throw new TypeError(name + '.decryptData: missing callback function');
  } // else - if (callback)
}; // function decryptData(encryptedData, password, callback)

/**
 * import encrypted data from file and decrypt, syncronized version
 * @param {string}      filename    the file that stores the encrypted data
 * @param {string}      password    the password for decryption
 * @return {bytes}                  the encrypted bytes
 */
const importFileSync = module.exports.importFileSync =    // eslint-disable-line
function(filename, password) {
  try {
    const data = fs.readFileSync(filename, {'flag': 'r'});
    return decryptDataSync(data.toString(), password);
  } catch (err) {
    err.message = name + '.' + err.message;
    throw err;
  } // try - catch (err)
}; // function importFileSync(filename, password)

/**
 * import encrypted data from file and decrypt, asyncronized version
 * @param {string}      filename    the file that stores the encrypted data
 * @param {string}      password    the password for decryption
 * @param {function}    callback    the call back function
 *      @param {array}      encryptedData   the encrypted data
 */
const importFile = module.exports.importFile =            // eslint-disable-line
function(filename, password, callback) {
  if (callback) {
    fs.readFile(filename, {'flag': 'r'}, function(err, data) {
      if (err) {
        err.message = name + '.' + err.message;
        throw err;
      } // if (err)
      decryptData(data.toString(), password, function(decryptedData) {
        callback(decryptedData);
      }); // decryptData( ... );
    }); // fs.readFile(filename, {'flag': 'r'}), (err, data) )
  } else {
    throw new TypeError(name + '.importFile: missing callback function');
  } // else - if (!callback)
}; // function importFile(filename, password, callback)

/**
 * export plain data with encryption, syncronized version
 * @param {string|array}  plainData   the plain data to be ecnrypted
 * @param {string}        filename    the file that stores the encrypted data
 * @param {string}        password    the password for decryption
 */
const exportFileSync = module.exports.exportFileSync =    // eslint-disable-line
function(plainData, filename, password) {
  const encryptedData = encryptDataSync(plainData, password);
  try {
    fs.writeFileSync(filename, encryptedData, {'flag': 'w'});
  } catch (err) {
    err.message = name + '.' + err.message;
    throw err;
  } // try - catch (err)
}; // function exportFileSync(plainData, filename, password)

/**
 * export plain data with encryption, asyncronized version
 * @param {string|array}  plainData   the plain data to be ecnrypted
 * @param {string}        filename    the file that stores the encrypted data
 * @param {string}        password    the password for decryption
 * @param {function}      callback    the call back function
 */
const exportFile = module.exports.exportFile =            // eslint-disable-line
function(plainData, filename, password, callback) {
  if (callback) {
    encryptData(plainData, password, function(encryptedData) {
      fs.writeFile(filename, encryptedData, {'flag': 'w'}, function(err) {
        if (err) {
          err.message = name + '.' + err.message;
          throw err;
        } // if (err)
        callback();
      }); // fs.writeFileSync( ... );
    }); // encryptData( ... );
  } else {
    throw new TypeError(name + '.exportFile: missing callback function');
  } // else - if (callback)
}; // function exportFile(plainData, filename, password, callback)
