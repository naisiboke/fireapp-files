export const NICKNAME_MAX=8
export function validateNickname(input){
 const value=String(input||'').normalize('NFKC').trim()
 if([...value].length<2||[...value].length>NICKNAME_MAX)return {ok:false,message:'昵称需要 2–8 个字符'}
 if(!/^[\p{Script=Han}A-Za-z0-9]+$/u.test(value))return {ok:false,message:'昵称仅支持中文、字母和数字，不含空格、符号或表情'}
 if(/1\d{10}|https?|www|[\u0000-\u001f]/i.test(value))return {ok:false,message:'昵称不能包含联系方式或链接'}
 if(/傻[逼比b]|煞笔|沙[逼比]|草泥马|操你妈|去死|脑残|废物|狗东西|贱人|他妈|妈的|滚蛋/i.test(value)||/^(sb|s13|2b|nmsl|cnm|nmd|fuck|shit|bitch|asshole)$/i.test(value))return {ok:false,message:'昵称含不适合公开展示的表达，请修改'}
 return {ok:true,value}
}
