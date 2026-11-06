function width(s){return [...s].reduce((n,c)=>n+(c.charCodeAt(0)>255?2:1),0)}
function formatCodeLine(line){
 const BT=String.fromCharCode(96),indent=line.match(/^\s*/)[0],pad=indent+'  ';
 if(line.trimStart().startsWith('//')){let rest=line.trimStart().slice(2).trim(),a=[];while(width(indent+'// '+rest)>80){let i=1;while(i<rest.length&&width(indent+'// '+rest.slice(0,i+1))<=80)i++;let k=rest.lastIndexOf(' ',i);if(k>i/2)i=k;a.push(indent+'// '+rest.slice(0,i).trim());rest=rest.slice(i).trim()}return [...a,indent+'// '+rest]}
 let q=null,e=false,start=0;
 for(let i=0;i<line.length;i++){let c=line[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q){if(q!==BT&&width(line.slice(start,i+1))>75){const val=new Function('return '+line.slice(start,i+1))();let a=[],v='';for(const x of val){if(width(v+x)>56){a.push(v);v=''}v+=x}if(v)a.push(v);line=line.slice(0,start)+'('+a.map(JSON.stringify).join(' + ')+')'+line.slice(i+1);break}q=null}}else if(c==="'"||c==='"'||c===BT){q=c;start=i}}
 let a=[],r=line;
 while(width(r)>80){q=null;e=false;let cut=0;for(let i=0;i<r.length;i++){const c=r[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;continue}if(c==="'"||c==='"'||c===BT){q=c;continue}if(c==='/'&&r[i+1]==='/')break;
 const h=r.slice(0,i+1).trimEnd(),tail=r.slice(i+1).trimStart();
 if((c===' '||c===','||c===';')&&width(h)<=80&&h.trim().length>1&&!/\b(?:return|throw|yield|await|async|new)$/.test(h)&&!tail.startsWith('=>'))cut=i+1}
 if(!cut)throw Error('Unwrappable '+r);a.push(r.slice(0,cut).trimEnd());r=pad+r.slice(cut).trimStart();
 }return [...a,r]
}
module.exports={formatCodeLine};