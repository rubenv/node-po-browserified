require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],"JKuBD+":[function(require,module,exports){
var fs = require('fs'),
    isArray = require('lodash.isarray');

function trim(string) {
    return string.replace(/^\s+|\s+$/g, '');
}

var PO = function () {
    this.comments = [];
    this.headers = {};
    this.items = [];
};

PO.prototype.save = function (filename, callback) {
    fs.writeFile(filename, this.toString(), callback);
};

PO.prototype.toString = function () {
    var lines = [],
        that = this;

    if (this.comments) {
        this.comments.forEach(function (comment) {
            lines.push('# ' + comment);
        });
    }

    lines.push('msgid ""');
    lines.push('msgstr ""');

    var keys = Object.keys(this.headers);
    keys.forEach(function (key) {
        lines.push('"' + key + ': ' + that.headers[key] + '\\n"');
    });

    lines.push('');

    this.items.forEach(function (item) {
        lines.push(item.toString());
        lines.push('');
    });

    return lines.join("\n");
};

PO.load = function (filename, callback) {
    fs.readFile(filename, 'utf-8', function (err, data) {
        if (err) {
            return callback(err);
        }
        var po = PO.parse(data);
        callback(null, po);
    });
};

PO.parse = function (data) {
    //support both unix and windows newline formats.
    data = data.replace(/\r\n/g, '\n');
    var po = new PO(),
        sections = data.split(/\n\n/),
        headers = sections.shift(),
        lines = sections.join("\n").split(/\n/);

    po.headers = {
        'Project-Id-Version': '',
        'Report-Msgid-Bugs-To': '',
        'POT-Creation-Date': '',
        'PO-Revision-Date': '',
        'Last-Translator': '',
        'Language': '',
        'Language-Team': '',
        'Content-Type': '',
        'Content-Transfer-Encoding': '',
        'Plural-Forms': '',
    };

    headers.split(/\n/).forEach(function (header) {
        if (header.match(/^#/)) {
            po.comments.push(header.replace(/^#\s*/, ''));
        }
        if (header.match(/^"/)) {
            header = header.trim().replace(/^"/, '').replace(/\\n"$/, '');
            var p = header.split(/:/),
                name = p.shift().trim(),
                value = p.join(':').trim();
            po.headers[name] = value;
        }
    });

    var item = new PO.Item(),
        context = null,
        plural = 0;

    function finish() {
        if (item.msgid.length > 0) {
            po.items.push(item);
            item = new PO.Item();
        }
    }

    function extract(string) {
        string = trim(string);
        string = string.replace(/^[^"]*"|"$/g, '');
        string = string.replace(/\\"/g, '"');
        string = string.replace(/\\\\/g, '\\');
        return string;
    }

    while (lines.length > 0) {
        var line = trim(lines.shift()),
            add = false;
        if (line.match(/^#:/)) { // Reference
            finish();
            item.references.push(trim(line.replace(/^#:/, '')));
        }
        else if (line.match(/^#,/)) { // Flags
            finish();
            var flags = trim(line.replace(/^#,/, '')).split(",");
            for (var i = 0; i < flags.length; i++) {
                item.flags[flags[i]] = true;
            }
        }
        else if (line.match(/^#/)) { // Comment
            finish();
            item.comments.push(trim(line.replace(/^#/, '')));
        }
        else if (line.match(/^msgid_plural/)) { // Plural form
            item.msgid_plural = extract(line);
            context = 'msgid_plural';
        }
        else if (line.match(/^msgid/)) { // Original
            finish();
            item.msgid = extract(line);
            context = 'msgid';
        }
        else if (line.match(/^msgstr/)) { // Translation
            var m = line.match(/^msgstr\[(\d+)\]/);
            plural = m && m[1] ? parseInt(m[1]) : 0;
            item.msgstr[plural] = extract(line);
            context = 'msgstr';
        }
        else { // Probably multiline string or blank
            if (line.length > 0) {
                if (context === 'msgstr') {
                    item.msgstr[plural] += extract(line);
                }
                else if (context === 'msgid') {
                    item.msgid += extract(line);
                }
                else if (context === 'msgid_plural') {
                    item.msgid_plural += extract(line);
                }
            }
        }
    }
    finish();

    return po;
};

PO.Item = function () {
    this.msgid = '';
    this.references = [];
    this.msgid_plural = null;
    this.msgstr = [];
    this.comments = [];
    this.flags = {};
};

PO.Item.prototype.toString = function () {
    var lines = [],
        that = this;

    var _process = function (keyword, text, i) {
        var lines = [],
            parts = text.split(/\n/),
            index = typeof i !== 'undefined' ? '[' + i + ']' : '';
        if (parts.length > 1) {
            lines.push(keyword + index + ' ""');
            parts.forEach(function (part) {
                lines.push('"' + part + '"');
            });
        }
        else {
            lines.push(keyword + index + ' "' + text + '"');
        }
        return lines;
    };

    if (this.references.length > 0) {
        this.references.forEach(function (ref) {
            lines.push('#: ' + ref);
        });
    }

    var flags = Object.keys(this.flags);
    if (flags.length > 0) {
        lines.push('#, ' + flags.join(","));
    }

    ['msgid', 'msgid_plural', 'msgstr'].forEach(function (keyword) {
        var text = that[keyword];
        if (text != null) {
            if (isArray(text) && text.length > 1) {
                text.forEach(function (t, i) {
                    lines = lines.concat(_process(keyword, t, i));
                });
            }
            else {
                text = isArray(text) ? text.join() : text;
                lines = lines.concat(_process(keyword, text));
            }
        }
    });

    return lines.join("\n");
};

module.exports = PO;

},{"fs":1,"lodash.isarray":4}],"node-po":[function(require,module,exports){
module.exports=require('JKuBD+');
},{}],4:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative');

/** `Object#toString` result shortcuts */
var arrayClass = '[object Array]';

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/* Native method shortcuts for methods with the same name as other `lodash` methods */
var nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray;

/**
 * Checks if `value` is an array.
 *
 * @static
 * @memberOf _
 * @type Function
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
 * @example
 *
 * (function() { return _.isArray(arguments); })();
 * // => false
 *
 * _.isArray([1, 2, 3]);
 * // => true
 */
var isArray = nativeIsArray || function(value) {
  return value && typeof value == 'object' && typeof value.length == 'number' &&
    toString.call(value) == arrayClass || false;
};

module.exports = isArray;

},{"lodash._isnative":5}],5:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/** Used to detect if a method is native */
var reNative = RegExp('^' +
  String(toString)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/toString| for [^\]]+/g, '.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
 */
function isNative(value) {
  return typeof value == 'function' && reNative.test(value);
}

module.exports = isNative;

},{}]},{},["JKuBD+"])
;