/**
 * How to deal with conflictions
 */
const MODE_CONCAT =    module.exports.MODE_CONCAT    = 0;
const MODE_SKIP =      module.exports.MODE_SKIP      = 1;
const MODE_OVERWRITE = module.exports.MODE_OVERWRITE = 2;


/**
 * Concatenate two same-type object
 * @param {json|string|object}  source      the source object
 * @param {json|string|object}  target      the target object
 * @param {integer}             conflict    the flag to deal with confilictions
 * @return {array|json}                     the concatenated object
 */
const concatSame = function(source, target, conflict) {
  if (!conflict || conflict === MODE_CONCAT) {
    if (source instanceof Array) {
      return source.concat(target);
    } else if (source.constructor === {}.constructor) {
      return concatJson(source, target, conflict);
    } else {
      return [source, target];
    } // if ... else if ... else ...
  } else if (conflict === MODE_SKIP) {
    let keys = Object.keys(source);
    return keys.length === 1 && keys[0].startsWith('$key') ?
              source[keys[0]] : source;
  } else if (conflict === MODE_OVERWRITE) {
    return target;
  } // if ... else if ...

  // Unsupported mode
  return null;
}; // var concatSame = function(source, target, conflict) { ... };


/**
 * Concatenate two nested objects
 * @param {json|string} source      the source object
 * @param {json|string} target      the target object
 * @param {integer}     conflict    the flag to deal with confilictions
 * @return {array|json}             the concatenated object
 */
const concatJson = module.exports = function(source, target, conflict) {
  let obj = {};

  // Everything in source
  for (k in source) {
    if (!{}.hasOwnProperty.call(source, k)) {
      continue;
    } // if (!{}.hasOwnProperty.call(source, k))
    obj[k] = source[k];
    if (source[k] instanceof Array) {                           // Array
      if (!(k in target)) {                                         // null
        // Do not concat
      } else if (target[k] instanceof Array) {                      // Array
        obj[k] = concatSame(source[k], target[k], conflict);
      } else if (target[k].constructor === {}.constructor) {        // Json
        obj[k] = concatSame(source[k], Object.values(target[k]), conflict);
      } else {                                                      // Others
        obj[k] = concatSame(source[k], [target[k]], conflict);
      } // if ... else if ... else
    } else if (source[k].constructor === {}.constructor) {      // Json
      if (!(k in target)) {                                         // null
        // Do not concat
      } else if (target[k] instanceof Array) {                      // Array
        let obj0 = {};
        target[k].forEach(function(e, i) {
          let keys = Object.keys(source[k]).concat(Object.keys(obj));
          while (('$key' + i) in keys) {
            i ++;
          } // while (('$key' + i) in keys)
          obj0['$key' + i] = e;
        }); // target[k].forEach(function(e, i) { ... });
        obj[k] = concatSame(source[k], obj0, conflict);
      } else if (target[k].constructor === {}.constructor) {        // Json
        obj[k] = concatSame(source[k], target[k], conflict);
      } else {                                                      // Others
        let obj0 = {};
        let i = 0;
        while (('$key' + i) in Object.keys(source[k])) {
          i ++;
        } // while (('$key' + i) in Object.keys(source[k]))
        obj0['$key' + i] = e;
        obj[k] = concatSame(source[k], obj0, conflict);
      } // if ... else if ... else
    } else {                                                    // Others
      if (!(k in target)) {                                         // null
        // Do not concat
      } else if (target[k] instanceof Array) {                      // Array
        obj[k] = concatSame([source[k]], obj, conflict);
      } else if (target[k].constructor === {}.constructor) {        // Json
        let obj0 = {};
        let i = 0;
        while (('$key' + i) in Object.keys(target[k])) {
          i ++;
        } // while (('$key' + i) in Object.keys(target[k]))
        obj0['$key' + i] = e;
        obj[k] = concatSame(obj0, target[k], conflict);
      } else {                                                      // Others
        obj[k] = concatSame(source[k], target[k], conflict);
      } // if ... else if ... else
    } // if ... else if ... else ...
  } // for (k in source)

  // Anything in target but not source
  for (k in target) {
    if (k in source) {
      continue;
    } // if (k in source)
    obj[k] = target[k];
  } // for (k in target) {

  return obj;
}; // function concatJson(source, target, conflict)
