export function statNumber(value){
 if(value===null||value===undefined)return null;
 const input=String(value).trim().replace(/\s/g,'').replace(',','.');
 return input!==''&&/^[+-]?\d+(?:\.\d+)?$/.test(input)&&Number.isFinite(Number(input))?Number(input):null;
}
