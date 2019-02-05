const parser = require('fast-xml-parser');
const he = require('he');
const fs = require('fs');
const path = require('path');
const util = require('util');

const data = fs.readFileSync(path.join(__dirname, '..', 'data', 'dc_aeb_eng_indented2_minified.xml')).toString();
let parsed = null;
let obj = null;
const opts = {
  cdataPositionChar: ''
};
if (parser.validate(data, {
  // localRange: '/'
})) {
  parsed = parser.getTraversalObj(data);
  obj = parser.convertToJson(parsed, opts);
};

// console.log(parsed.child.TEI[0].child.text[0].child.body[0].child);
// console.log(util.inspect(obj.TEI.text.body.div[0], {showHidden: false, depth: 5, colors: true}));

const getAllFSTypes = (d) => {
  const entryDiv = d.child.TEI[0].child.text[0].child.body[0].child.div[0];
  console.log(entryDiv);
};
getAllFSTypes(parsed);