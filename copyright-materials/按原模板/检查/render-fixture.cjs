const fs=require('fs'),zlib=require('zlib');
const html=fs.readFileSync('copyright-materials/按原模板/按原模板生成.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1].split('const shots={}')[0];
const {D,build,crc32}=new Function(script+';return {D:DATA,build:buildTemplateDocuments,crc32}')();
function chunk(type,bytes){const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([name,bytes])));return Buffer.concat([size,name,bytes,crc])}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(Buffer.from([0,255,255,255]))),chunk('IEND',Buffer.alloc(0))]).toString('base64');
const shots={};for(const p of D.manual.filter(x=>x.pic))shots[p.pic]={width:720,height:1600,type:'image/png',base64:png};
const d=build(D,{owner:'版面检查专用'},shots);
fs.writeFileSync('/tmp/layout-fixture.docx',Buffer.from(d.manual.bytes));
