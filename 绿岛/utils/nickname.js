function nicknameCharactersAllowed(value){
 for(const character of value){
  const code=character.codePointAt(0)
  const latinOrDigit=(code>=48&&code<=57)||(code>=65&&code<=90)||(code>=97&&code<=122)
  const han=(code>=0x3400&&code<=0x4DBF)||(code>=0x4E00&&code<=0x9FFF)||
   (code>=0xF900&&code<=0xFAFF)||(code>=0x20000&&code<=0x2EE5F)||
   (code>=0x2F800&&code<=0x2FA1F)||(code>=0x30000&&code<=0x3347F)||code===0x3007
  if(!latinOrDigit&&!han)return false
 }
 return true
}

export const NICKNAME_MAX=8
export function validateNickname(input){
 const value=String(input||'').normalize('NFKC').trim()
 if([...value].length<2||[...value].length>NICKNAME_MAX)return {ok:false,message:'昵称需要 2–8 个字符'}
 if(!nicknameCharactersAllowed(value))return {ok:false,message:'昵称仅支持中文、字母和数字，不含空格、符号或表情'}
 if(/1\d{10}|https?|www|[\u0000-\u001f]/i.test(value))return {ok:false,message:'昵称不能包含联系方式或链接'}
 if(/傻[逼比b]|煞笔|沙[逼比]|草泥马|操你妈|去死|脑残|废物|狗东西|贱人|他妈|妈的|滚蛋/i.test(value)||/^(sb|s13|2b|nmsl|cnm|nmd|fuck|shit|bitch|asshole)$/i.test(value))return {ok:false,message:'昵称含不适合公开展示的表达，请修改'}
 return {ok:true,value}
}
