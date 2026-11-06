const fs=require('fs'),path=require('path'),beautify=require('js-beautify').js,parser=require('@babel/parser');
const D=JSON.parse(fs.readFileSync('template-data.json','utf8'));
const width=s=>[...s].reduce((n,c)=>n+(c.charCodeAt(0)>255?2:1),0);
function norm(v){if(Array.isArray(v))return v.map(norm);if(!v||typeof v!=='object')return v;const o={};for(const[k,x]of Object.entries(v))if(!['start','end','loc','extra','leadingComments','trailingComments','innerComments','comments','tokens','errors'].includes(k))o[k]=norm(x);if(o.type==='BinaryExpression'&&o.operator==='+'&&o.left?.type==='StringLiteral'&&o.right?.type==='StringLiteral')return{type:'StringLiteral',value:o.left.value+o.right.value};return o}
function splitStrings(raw){
 const ast=parser.parse(raw,{sourceType:'unambiguous'}),edits=[];
 function walk(n,parent,key){if(!n||typeof n!=='object')return;if(n.type==='StringLiteral'&&width(n.value)>60){
 const allowed=parent&&((parent.type==='ObjectProperty'&&key==='value')||['BinaryExpression','ArrayExpression','ReturnStatement','VariableDeclarator','CallExpression'].includes(parent.type));
 if(allowed){let a=[],s='';for(const c of n.value){if(width(s+c)>38){a.push(s);s=''}s+=c}if(s)a.push(s);edits.push({start:n.start,end:n.end,text:'('+a.map(JSON.stringify).join(' + ') +')'});}
 }for(const[k,v]of Object.entries(n))if(v&&typeof v==='object'&&!['loc','extra','comments','leadingComments','trailingComments','innerComments','tokens'].includes(k))if(Array.isArray(v))v.forEach(x=>walk(x,n,k));else walk(v,n,k);}
 walk(ast,null,null);let s=raw;for(const e of edits.sort((a,b)=>b.start-a.start))s=s.slice(0,e.start)+e.text+s.slice(e.end);return s;
}
function commentLines(line){if(!line.trimStart().startsWith('//'))return[line];const indent=line.match(/^\s*/)[0],a=[];let rest=line.trimStart().slice(2).trim();while(width(indent+'// '+rest)>80){let i=1;while(i<rest.length&&width(indent+'// '+rest.slice(0,i+1))<=80)i++;let space=rest.lastIndexOf(' ',i);if(space>i/2)i=space;a.push(indent+'// '+rest.slice(0,i).trim());rest=rest.slice(i).trim()}return[...a,indent+'// '+rest]}
let lines=[],passed=0;
for(const f of D.provenance.sourceFiles){
 const raw=fs.readFileSync(path.join(process.cwd(),'../../../',f.path),'utf8');
 const pretty=beautify(splitStrings(raw),{indent_size:2,wrap_line_length:35,preserve_newlines:false,brace_style:'collapse'});
 const result=pretty.split(/\r?\n/).filter(s=>s.trim()).flatMap(commentLines);
 try{const a=norm(parser.parse(raw,{sourceType:'unambiguous'})),b=norm(parser.parse(result.join('\n'),{sourceType:'unambiguous'}));if(JSON.stringify(a)!==JSON.stringify(b))throw Error('AST mismatch')}catch(e){console.error('SOURCE_FILE='+f.path);throw e}
 lines.push(...result);passed++;
}
const selected=[...lines.slice(0,1500),...lines.slice(-1500)];
console.log(JSON.stringify({astEquivalentFiles:passed,fullFormattedLines:lines.length,selectedLines:selected.length,selectedMatches:JSON.stringify(selected)===JSON.stringify(D.source),maxWidth:Math.max(...selected.map(width))}));
console.log('WIDEST_LINES='+JSON.stringify(selected.map(s=>({s,w:width(s)})).sort((a,b)=>b.w-a.w).slice(0,5)));
if(JSON.stringify(selected)!==JSON.stringify(D.source)){console.log('SOURCE_REBUILD_BEGIN');const s=Buffer.from(JSON.stringify(selected)).toString('base64');for(let i=0;i<s.length;i+=1000)console.log(s.slice(i,i+1000));console.log('SOURCE_REBUILD_END');}
