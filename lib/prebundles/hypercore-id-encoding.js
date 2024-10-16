/**
 * Bundled by jsDelivr using Rollup v2.79.1 and Terser v5.19.2.
 * Original file: /npm/b4a@1.6.6/browser.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var t$1={exports:{}};function e$1(t){return t.length}var n$2={byteLength:e$1,toString:function(t){const e=t.byteLength;let n="";for(let r=0;r<e;r++)n+=String.fromCharCode(t[r]);return n},write:function(t,n,r=0,o=e$1(n)){const f=Math.min(o,t.byteLength-r);for(let e=0;e<f;e++)t[r+e]=n.charCodeAt(e);return f}};const r$1="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",o$2=new Uint8Array(256);for(let t=0;t<64;t++)o$2[r$1.charCodeAt(t)]=t;function f$1(t){let e=t.length;return 61===t.charCodeAt(e-1)&&e--,e>1&&61===t.charCodeAt(e-1)&&e--,3*e>>>2}o$2[45]=62,o$2[95]=63;var i$1={byteLength:f$1,toString:function(t){const e=t.byteLength;let n="";for(let o=0;o<e;o+=3)n+=r$1[t[o]>>2]+r$1[(3&t[o])<<4|t[o+1]>>4]+r$1[(15&t[o+1])<<2|t[o+2]>>6]+r$1[63&t[o+2]];return e%3==2?n=n.substring(0,n.length-1)+"=":e%3==1&&(n=n.substring(0,n.length-2)+"=="),n},write:function(t,e,n=0,r=f$1(e)){const i=Math.min(r,t.byteLength-n);for(let n=0,r=0;r<i;n+=4){const f=o$2[e.charCodeAt(n)],i=o$2[e.charCodeAt(n+1)],u=o$2[e.charCodeAt(n+2)],a=o$2[e.charCodeAt(n+3)];t[r++]=f<<2|i>>4,t[r++]=(15&i)<<4|u>>2,t[r++]=(3&u)<<6|63&a;}return i}};function u(t){return t.length>>>1}var a$1={byteLength:u,toString:function(t){const e=t.byteLength;t=new DataView(t.buffer,t.byteOffset,e);let n="",r=0;for(let o=e-e%4;r<o;r+=4)n+=t.getUint32(r).toString(16).padStart(8,"0");for(;r<e;r++)n+=t.getUint8(r).toString(16).padStart(2,"0");return n},write:function(t,e,n=0,r=u(e)){const o=Math.min(r,t.byteLength-n);for(let r=0;r<o;r++){const o=c(e.charCodeAt(2*r)),f=c(e.charCodeAt(2*r+1));if(void 0===o||void 0===f)return t.subarray(0,r);t[n+r]=o<<4|f;}return o}};function c(t){return t>=48&&t<=57?t-48:t>=65&&t<=70?t-65+10:t>=97&&t<=102?t-97+10:void 0}function g(t){let e=0;for(let n=0,r=t.length;n<r;n++){const o=t.charCodeAt(n);if(o>=55296&&o<=56319&&n+1<r){const r=t.charCodeAt(n+1);if(r>=56320&&r<=57343){e+=4,n++;continue}}e+=o<=127?1:o<=2047?2:3;}return e}let s$2,y;if("undefined"!=typeof TextDecoder){const t=new TextDecoder;s$2=function(e){return t.decode(e)};}else s$2=function(t){const e=t.byteLength;let n="",r=0;for(;r<e;){let o=t[r];if(o<=127){n+=String.fromCharCode(o),r++;continue}let f=0,i=0;if(o<=223?(f=1,i=31&o):o<=239?(f=2,i=15&o):o<=244&&(f=3,i=7&o),e-r-f>0){let e=0;for(;e<f;)o=t[r+e+1],i=i<<6|63&o,e+=1;}else i=65533,f=e-r;n+=String.fromCodePoint(i),r+=f+1;}return n};if("undefined"!=typeof TextEncoder){const t=new TextEncoder;y=function(e,n,r=0,o=g(n)){const f=Math.min(o,e.byteLength-r);return t.encodeInto(n,e.subarray(r,r+f)),f};}else y=function(t,e,n=0,r=g(e)){const o=Math.min(r,t.byteLength-n);t=t.subarray(n,n+o);let f=0,i=0;for(;f<e.length;){const n=e.codePointAt(f);if(n<=127){t[i++]=n,f++;continue}let r=0,o=0;for(n<=2047?(r=6,o=192):n<=65535?(r=12,o=224):n<=2097151&&(r=18,o=240),t[i++]=o|n>>r,r-=6;r>=0;)t[i++]=128|n>>r&63,r-=6;f+=n>=65536?2:1;}return o};var b={byteLength:g,toString:s$2,write:y};function h(t){return 2*t.length}var l={byteLength:h,toString:function(t){const e=t.byteLength;let n="";for(let r=0;r<e-1;r+=2)n+=String.fromCharCode(t[r]+256*t[r+1]);return n},write:function(t,e,n=0,r=h(e)){const o=Math.min(r,t.byteLength-n);let f=o;for(let r=0;r<e.length&&!((f-=2)<0);++r){const o=e.charCodeAt(r),f=o>>8,i=o%256;t[n+2*r]=i,t[n+2*r+1]=f;}return o}};!function(t,e){const r=n$2,o=i$1,f=a$1,u=b,c=l,g=255===new Uint8Array(Uint16Array.of(255).buffer)[0];function s(t){switch(t){case"ascii":return r;case"base64":return o;case"hex":return f;case"utf8":case"utf-8":case void 0:return u;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return c;default:throw new Error(`Unknown encoding: ${t}`)}}function y(t){return t instanceof Uint8Array}function h(t,e,n){return "string"==typeof t?function(t,e){const n=s(e),r=new Uint8Array(n.byteLength(t));return n.write(r,t,0,r.byteLength),r}(t,e):Array.isArray(t)?function(t){const e=new Uint8Array(t.length);return e.set(t),e}(t):ArrayBuffer.isView(t)?function(t){const e=new Uint8Array(t.byteLength);return e.set(t),e}(t):function(t,e,n){return new Uint8Array(t,e,n)}(t,e,n)}function L(t,e,n,r,o){if(0===t.byteLength)return -1;if("string"==typeof n?(r=n,n=0):void 0===n?n=o?0:t.length-1:n<0&&(n+=t.byteLength),n>=t.byteLength){if(o)return -1;n=t.byteLength-1;}else if(n<0){if(!o)return -1;n=0;}if("string"==typeof e)e=h(e,r);else if("number"==typeof e)return e&=255,o?t.indexOf(e,n):t.lastIndexOf(e,n);if(0===e.byteLength)return -1;if(o){let r=-1;for(let o=n;o<t.byteLength;o++)if(t[o]===e[-1===r?0:o-r]){if(-1===r&&(r=o),o-r+1===e.byteLength)return r}else -1!==r&&(o-=o-r),r=-1;}else {n+e.byteLength>t.byteLength&&(n=t.byteLength-e.byteLength);for(let r=n;r>=0;r--){let n=!0;for(let o=0;o<e.byteLength;o++)if(t[r+o]!==e[o]){n=!1;break}if(n)return r}}return -1}function w(t,e,n,r){return L(t,e,n,r,!0)}function d(t,e,n){const r=t[e];t[e]=t[n],t[n]=r;}t.exports=e={isBuffer:y,isEncoding:function(t){try{return s(t),!0}catch{return !1}},alloc:function(t,n,r){const o=new Uint8Array(t);return void 0!==n&&e.fill(o,n,0,o.byteLength,r),o},allocUnsafe:function(t){return new Uint8Array(t)},allocUnsafeSlow:function(t){return new Uint8Array(t)},byteLength:function(t,e){return s(e).byteLength(t)},compare:function(t,e){if(t===e)return 0;const n=Math.min(t.byteLength,e.byteLength);t=new DataView(t.buffer,t.byteOffset,t.byteLength),e=new DataView(e.buffer,e.byteOffset,e.byteLength);let r=0;for(let o=n-n%4;r<o;r+=4){if(t.getUint32(r,g)!==e.getUint32(r,g))break}for(;r<n;r++){const n=t.getUint8(r),o=e.getUint8(r);if(n<o)return -1;if(n>o)return 1}return t.byteLength>e.byteLength?1:t.byteLength<e.byteLength?-1:0},concat:function(t,e){void 0===e&&(e=t.reduce(((t,e)=>t+e.byteLength),0));const n=new Uint8Array(e);let r=0;for(const e of t){if(r+e.byteLength>n.byteLength){const t=e.subarray(0,n.byteLength-r);return n.set(t,r),n}n.set(e,r),r+=e.byteLength;}return n},copy:function(t,e,n=0,r=0,o=t.byteLength){if(o>0&&o<r)return 0;if(o===r)return 0;if(0===t.byteLength||0===e.byteLength)return 0;if(n<0)throw new RangeError("targetStart is out of range");if(r<0||r>=t.byteLength)throw new RangeError("sourceStart is out of range");if(o<0)throw new RangeError("sourceEnd is out of range");n>=e.byteLength&&(n=e.byteLength),o>t.byteLength&&(o=t.byteLength),e.byteLength-n<o-r&&(o=e.length-n+r);const f=o-r;return t===e?e.copyWithin(n,r,o):e.set(t.subarray(r,o),n),f},equals:function(t,e){if(t===e)return !0;if(t.byteLength!==e.byteLength)return !1;const n=t.byteLength;t=new DataView(t.buffer,t.byteOffset,t.byteLength),e=new DataView(e.buffer,e.byteOffset,e.byteLength);let r=0;for(let o=n-n%4;r<o;r+=4)if(t.getUint32(r,g)!==e.getUint32(r,g))return !1;for(;r<n;r++)if(t.getUint8(r)!==e.getUint8(r))return !1;return !0},fill:function(t,e,n,r,o){if("string"==typeof e?"string"==typeof n?(o=n,n=0,r=t.byteLength):"string"==typeof r&&(o=r,r=t.byteLength):"number"==typeof e?e&=255:"boolean"==typeof e&&(e=+e),n<0||t.byteLength<n||t.byteLength<r)throw new RangeError("Out of range index");if(void 0===n&&(n=0),void 0===r&&(r=t.byteLength),r<=n)return t;if(e||(e=0),"number"==typeof e)for(let o=n;o<r;++o)t[o]=e;else {const f=(e=y(e)?e:h(e,o)).byteLength;for(let o=0;o<r-n;++o)t[o+n]=e[o%f];}return t},from:h,includes:function(t,e,n,r){return -1!==w(t,e,n,r)},indexOf:w,lastIndexOf:function(t,e,n,r){return L(t,e,n,r,!1)},swap16:function(t){const e=t.byteLength;if(e%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(let n=0;n<e;n+=2)d(t,n,n+1);return t},swap32:function(t){const e=t.byteLength;if(e%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(let n=0;n<e;n+=4)d(t,n,n+3),d(t,n+1,n+2);return t},swap64:function(t){const e=t.byteLength;if(e%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(let n=0;n<e;n+=8)d(t,n,n+7),d(t,n+1,n+6),d(t,n+2,n+5),d(t,n+3,n+4);return t},toBuffer:function(t){return t},toString:function(t,e,n=0,r=t.byteLength){const o=t.byteLength;return n>=o||r<=n?"":(n<0&&(n=0),r>o&&(r=o),(0!==n||r<o)&&(t=t.subarray(n,r)),s(e).toString(t))},write:function(t,e,n,r,o){return void 0===n?o="utf8":void 0===r&&"string"==typeof n?(o=n,n=void 0):void 0===o&&"string"==typeof r&&(o=r,r=void 0),s(o).write(t,e,n,r)},writeDoubleLE:function(t,e,n){return void 0===n&&(n=0),new DataView(t.buffer,t.byteOffset,t.byteLength).setFloat64(n,e,!0),n+8},writeFloatLE:function(t,e,n){return void 0===n&&(n=0),new DataView(t.buffer,t.byteOffset,t.byteLength).setFloat32(n,e,!0),n+4},writeUInt32LE:function(t,e,n){return void 0===n&&(n=0),new DataView(t.buffer,t.byteOffset,t.byteLength).setUint32(n,e,!0),n+4},writeInt32LE:function(t,e,n){return void 0===n&&(n=0),new DataView(t.buffer,t.byteOffset,t.byteLength).setInt32(n,e,!0),n+4},readDoubleLE:function(t,e){return void 0===e&&(e=0),new DataView(t.buffer,t.byteOffset,t.byteLength).getFloat64(e,!0)},readFloatLE:function(t,e){return void 0===e&&(e=0),new DataView(t.buffer,t.byteOffset,t.byteLength).getFloat32(e,!0)},readUInt32LE:function(t,e){return void 0===e&&(e=0),new DataView(t.buffer,t.byteOffset,t.byteLength).getUint32(e,!0)},readInt32LE:function(t,e){return void 0===e&&(e=0),new DataView(t.buffer,t.byteOffset,t.byteLength).getInt32(e,!0)}};}(t$1,t$1.exports);var L=t$1.exports;

/**
 * Bundled by jsDelivr using Rollup v2.79.1 and Terser v5.19.2.
 * Original file: /npm/z32@1.1.0/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var r={};const n$1=L,e="ybndrfg8ejkmcpqxot1uwisza345h769",o$1=49,a=122,s$1=new Int8Array(1+a-o$1);s$1.fill(-1);for(let t=0;t<32;t++){const r=e.charCodeAt(t)-o$1;s$1[r]=t;}r.encode=function(t){"string"==typeof t&&(t=n$1.from(t));const r=8*t.byteLength;let o="";for(let n=0;n<r;n+=5){const r=n>>>3,a=7&n;if(a<=3){o+=e[t[r]>>>3-a&31];continue}const s=a-3,c=t[r]<<s&31,i=(r>=t.byteLength?0:t[r+1])>>>8-s;o+=e[c|i];}return o};r.decode=function(t,r){let e=0,o=0;const a=7&t.length,s=(t.length-a)/8;r||(r=n$1.allocUnsafe(Math.ceil(5*t.length/8)));for(let n=0;n<s;n++){const n=f(t,o++),a=f(t,o++),s=f(t,o++),c=f(t,o++),i=f(t,o++),u=f(t,o++),l=f(t,o++),h=f(t,o++);r[e++]=n<<3|a>>>2,r[e++]=(3&a)<<6|s<<1|c>>>4,r[e++]=(15&c)<<4|i>>>1,r[e++]=(1&i)<<7|u<<2|l>>>3,r[e++]=(7&l)<<5|h;}if(0===a)return r.subarray(0,e);const c=f(t,o++),i=f(t,o++);if(r[e++]=c<<3|i>>>2,a<=2)return r.subarray(0,e);const u=f(t,o++),l=f(t,o++);if(r[e++]=(3&i)<<6|u<<1|l>>>4,a<=4)return r.subarray(0,e);const h=f(t,o++);if(r[e++]=(15&l)<<4|h>>>1,a<=5)return r.subarray(0,e);const b=f(t,o++),d=f(t,o++);if(r[e++]=(1&h)<<7|b<<2|d>>>3,a<=7)return r.subarray(0,e);const y=f(t,o++);return r[e++]=(7&d)<<5|y,r.subarray(0,e)};r.ALPHABET=e;function f(t,r){if(r>t.length)return 0;const n=t.charCodeAt(r);if(n<o$1||n>a)throw Error('Invalid character in base32 input: "'+t[r]+'" at position '+r);const e=s$1[n-o$1];if(-1===e)throw Error('Invalid character in base32 input: "'+t[r]+'" at position '+r);return e}

/**
 * Bundled by jsDelivr using Rollup v2.79.1 and Terser v5.19.2.
 * Original file: /npm/hypercore-id-encoding@1.3.0/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
const t=r,n=L;var o={encode:i,decode:s,normalize:function(e){return i(s(e))},isValid:function(e){try{return s(e),!0}catch{return !1}}};function i(e){if(!n.isBuffer(e))throw new Error("Key must be a Buffer");if(32!==e.byteLength)throw new Error("Key must be 32-bytes long");return t.encode(e)}function s(e){if(n.isBuffer(e)){if(32!==e.byteLength)throw new Error("ID must be 32-bytes long");return e}if("string"==typeof e){if(e.startsWith("pear://")&&(e=e.slice(7).split("/")[0]),52===e.length)return t.decode(e);if(64===e.length){const r=n.from(e,"hex");if(32===r.byteLength)return r}}throw new Error("Invalid Hypercore key")}o.decode;o.encode;o.isValid;o.normalize;

export { o as default };