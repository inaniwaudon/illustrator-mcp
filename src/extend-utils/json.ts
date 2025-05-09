export const jsonScript = `
if (typeof JSON !== "object") {
    JSON = {};
}
    
function stringify(data) {
  if (data === undefined) {
    return undefined;
  }
  if (data === null) {
    return 'null';
  }
  if (data.toString() === "NaN") {
    return 'null';
  }
  if (data === Infinity) {
    return 'null';
  }
  if (data.constructor === String) {
    return '"' + data.replace(/"/g, '\\"') + '"';
  }
  if (data.constructor === Number) {
    return String(data);
  }
  if (data.constructor === Boolean) {
    return data ? 'true' : 'false';
  }
  if (data.constructor === Array) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var v = data[i];
      if (v === undefined || v === NaN || v === Infinity) {
        result.push('null');
      } else {
        result.push(stringify(v));
      }
    }
    return '[' + result.join(',') + ']';
  }
  if (data.constructor === Object) {
    var result = [];
    for (var k in data) {
      if (data[k] !== undefined) {
        result.push(stringify(k) + ':' + stringify(data[k]));
      }
    }
    return '{' + result.join(',') + '}';
  }
  return '{}'
}

JSON.stringify = stringify;
`;
