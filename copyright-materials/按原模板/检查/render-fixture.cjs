const fs=require('fs');
const html=fs.readFileSync('copyright-materials/按原模板/按原模板生成.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1].split('const shots={}')[0];
const {D,build}=new Function(script+';return {D:DATA,build:buildTemplateDocuments}')();
const shots={};for(const p of D.manual.filter(x=>x.pic))shots[p.pic]={width:720,height:1600,type:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XhZkAAAAASUVORK5CYII='};
const d=build(D,{owner:'版面检查专用'},shots);
fs.writeFileSync('/tmp/layout-fixture.docx',Buffer.from(d.manual.bytes));
