const fs=require('fs'),path=require('path'),beautify=require('js-beautify').js,parser=require('@babel/parser');
const {formatCodeLine}=require('./format-code.cjs');
const D=JSON.parse(fs.readFileSync('template-data.json','utf8'));
function norm(v){
 if(Array.isArray(v))return v.map(norm);
 if(!v||typeof v!=='object')return v;
 const o={};for(const [k,x]of Object.entries(v))if(!['start','end','loc','extra','leadingComments','trailingComments','innerComments','comments','tokens','errors'].includes(k))o[k]=norm(x);
 if(o.type==='BinaryExpression'&&o.operator==='+'&&o.left?.type==='StringLiteral'&&o.right?.type==='StringLiteral')return {type:'StringLiteral',value:o.left.value+o.right.value};
 return o
}
let lines=[],passed=0;
for(const f of D.provenance.sourceFiles){
 const raw=fs.readFileSync(path.join(process.cwd(),'../../../',f.path),'utf8');
 const pretty=beautify(raw,{indent_size:2,wrap_line_length:88,preserve_newlines:false,brace_style:'collapse'});
 const original=pretty.split(/\r?\n/).filter(s=>s.trim());
 const wrapped=original.flatMap(formatCodeLine);
 const a=norm(parser.parse(raw,{sourceType:'unambiguous'})),b=norm(parser.parse(wrapped.join('\n'),{sourceType:'unambiguous'}));
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('AST mismatch: '+f.path);
 lines.push(...wrapped);passed++;
}
const selected=[...lines.slice(0,1500),...lines.slice(-1500)];
console.log(JSON.stringify({astEquivalentFiles:passed,fullFormattedLines:lines.length,selectedLines:selected.length,selectedMatches:JSON.stringify(selected)===JSON.stringify(D.source)}));
if(JSON.stringify(selected)!==JSON.stringify(D.source)){
 console.log('SOURCE_REBUILD_BEGIN');const s=Buffer.from(JSON.stringify(selected)).toString('base64');for(let i=0;i<s.length;i+=1000)console.log(s.slice(i,i+1000));console.log('SOURCE_REBUILD_END');
}
