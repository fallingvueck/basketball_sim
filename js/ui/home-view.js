function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function RNG(s){let a=hash(s);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function ri(r,a,b){return Math.floor(r()*(b-a+1))+a}
function newAvatarSeed(){
 try{
   const data=new Uint32Array(2);crypto.getRandomValues(data);
   return `${data[0].toString(36)}${data[1].toString(36)}`.toUpperCase().slice(0,14);
 }catch(_){return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,9)}`.toUpperCase().slice(0,14)}
}
function avatarProfile(avatarSeed,pos="PG"){
 const r=RNG(`career-avatar-${String(avatarSeed||"BL-PLAYER")}-${pos}`);
 const skins=[
   ["#f0c8ab","#ffe0c7","#bd7e60"],["#dfa67e","#efbe98","#a76548"],
   ["#c88762","#dea17a","#8b5139"],["#aa6848","#c27e59","#71402f"],
   ["#7c4a35","#976148","#503026"],["#513329","#6b4738","#33221d"]
 ];
 const hairs=["#111316","#241b18","#35251f","#090c10","#4a362d"];
 const eyes=["#1d1715","#35251f","#49352b","#171d20"];
 const jerseys=[
   ["#d9823b","#101923"],["#315f9b","#e4a451"],["#1f7775","#e79149"],
   ["#8b3437","#e2b760"],["#604783","#e28f4a"],["#394b58","#ef9b4e"]
 ];
 const skin=skins[ri(r,0,skins.length-1)];
 const jersey=jerseys[ri(r,0,jerseys.length-1)];
 return {
   skin:skin[0],skinLight:skin[1],skinShadow:skin[2],hair:hairs[ri(r,0,hairs.length-1)],eye:eyes[ri(r,0,eyes.length-1)],
   jersey:jersey[0],trim:jersey[1],hairStyle:ri(r,0,5),faceShape:ri(r,0,3),headband:r()<.16,
   beardStyle:ri(r,0,4),browLift:ri(r,-1,1),eyeGap:ri(r,-1,2),eyeTilt:ri(r,-1,1),mouth:ri(r,0,2),
   number:String(ri(r,0,99)).padStart(2,"0")
 };
}
function avatarFacePath(a){
 if(a.faceShape===1)return "M29 32Q29 14 50 12Q71 14 71 32L68 53Q65 67 50 73Q35 67 32 53Z";
 if(a.faceShape===2)return "M32 31Q32 13 50 11Q68 13 68 31L66 54Q62 69 50 74Q38 69 34 54Z";
 if(a.faceShape===3)return "M30 31Q31 14 50 12Q69 14 70 31L67 52Q63 64 50 70Q37 64 33 52Z";
 return "M31 31Q31 13 50 11Q69 13 69 31L67 52Q64 67 50 72Q36 67 33 52Z";
}
function avatarHairSVG(a){
 if(a.hairStyle===0)return `<path d="M30 35Q28 15 50 10Q72 14 70 36Q64 24 50 23Q37 24 30 35Z" fill="${a.hair}"/><path d="M31 30Q33 21 39 17" fill="none" stroke="#ffffff18" stroke-width="1.4"/>`;
 if(a.hairStyle===1)return `<path d="M30 34Q29 13 50 10Q71 13 70 34Q62 23 50 23Q38 23 30 34Z" fill="${a.hair}"/><g fill="#ffffff14"><circle cx="38" cy="17" r="2.2"/><circle cx="46" cy="14" r="2"/><circle cx="55" cy="14" r="2.3"/><circle cx="63" cy="18" r="2"/></g>`;
 if(a.hairStyle===2)return `<path d="M31 30Q33 15 50 12Q67 15 69 30Q60 21 50 21Q40 21 31 30Z" fill="${a.hair}" opacity=".92"/><path d="M34 24Q50 14 66 24" fill="none" stroke="#ffffff18" stroke-width="1"/>`;
 if(a.hairStyle===3)return `<path d="M31 32L33 13Q50 7 67 13L69 32Q61 22 50 22Q39 22 31 32Z" fill="${a.hair}"/><path d="M34 13Q50 9 66 13" fill="none" stroke="#ffffff1b" stroke-width="1.4"/>`;
 if(a.hairStyle===4)return `<path d="M29 36Q27 15 50 9Q73 14 71 36Q63 25 50 24Q37 25 29 36Z" fill="${a.hair}"/><g fill="none" stroke="#ffffff16" stroke-width="1.1"><path d="M34 20Q38 14 42 19"/><path d="M43 16Q48 10 52 16"/><path d="M53 16Q58 11 63 19"/></g>`;
 return `<path d="M32 27Q36 14 50 12Q64 14 68 27Q59 20 50 20Q41 20 32 27Z" fill="${a.hair}" opacity=".34"/><path d="M34 23Q50 15 66 23" fill="none" stroke="${a.hair}" stroke-width="1.2" opacity=".55"/>`;
}
function playerAvatarSVG(avatarSeed,pos="PG",age=16,label="球員頭像"){
 const a=avatarProfile(avatarSeed,pos),older=Number(age)>=34,grey=Number(age)>=38;
 if(grey)a.hair="#5b5754";
 const uid=`av${hash(`${avatarSeed}-${pos}`).toString(36)}`;
 const safe=String(label||"球員頭像").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const beard=Number(age)>=23&&a.beardStyle?`<path d="M34 52Q36 66 50 72Q64 66 67 52Q63 63 50 66Q38 63 34 52Z" fill="${a.hair}" opacity="${a.beardStyle===1?".16":a.beardStyle===2?".34":".58"}"/>${a.beardStyle>=3?`<path d="M44 58Q50 61 56 58L55 66Q50 69 45 66Z" fill="${a.hair}" opacity=".72"/>`:""}`:"";
 const wrinkles=older?`<g fill="none" stroke="${a.skinShadow}" stroke-width=".65" opacity=".38"><path d="M33 43Q37 42 40 43"/><path d="M60 43Q64 42 68 43"/><path d="M43 61Q50 63 57 61"/></g>`:"";
 return `<svg viewBox="0 0 100 100" role="img" aria-label="${safe}" xmlns="http://www.w3.org/2000/svg">
   <defs><linearGradient id="${uid}bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#21303b"/><stop offset=".55" stop-color="#101a22"/><stop offset="1" stop-color="#080d12"/></linearGradient><linearGradient id="${uid}skin" x1=".18" y1=".12" x2=".82" y2=".88"><stop stop-color="${a.skinLight}"/><stop offset=".48" stop-color="${a.skin}"/><stop offset="1" stop-color="${a.skinShadow}"/></linearGradient><linearGradient id="${uid}jersey" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a.jersey}"/><stop offset="1" stop-color="#10151b"/></linearGradient><radialGradient id="${uid}light" cx="35%" cy="24%" r="66%"><stop stop-color="#ffffff" stop-opacity=".18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
   <rect width="100" height="100" fill="url(#${uid}bg)"/><circle cx="82" cy="18" r="35" fill="#d9853c" opacity=".10"/><path d="M0 77Q50 62 100 77V100H0Z" fill="#000" opacity=".18"/>
   <path d="M3 100Q7 79 31 73L41 69H59L69 73Q93 79 97 100Z" fill="url(#${uid}jersey)"/><path d="M31 74L41 68Q50 77 59 68L69 74L63 84Q50 77 37 84Z" fill="${a.trim}" opacity=".92"/><path d="M36 79Q50 86 64 79L61 100H39Z" fill="${a.jersey}"/>
   <path d="M42 59H58V73Q50 80 42 73Z" fill="url(#${uid}skin)"/><path d="M42 61Q50 68 58 61V69Q50 76 42 69Z" fill="${a.skinShadow}" opacity=".25"/>
   <ellipse cx="30" cy="43" rx="4.8" ry="7" fill="${a.skin}"/><ellipse cx="70" cy="43" rx="4.8" ry="7" fill="${a.skinShadow}"/><path d="${avatarFacePath(a)}" fill="url(#${uid}skin)"/>
   <path d="M32 31Q31 48 36 58" fill="none" stroke="${a.skinLight}" stroke-width="1.2" opacity=".45"/><path d="M68 30Q70 48 64 59" fill="none" stroke="${a.skinShadow}" stroke-width="2" opacity=".32"/>
   ${avatarHairSVG(a)}${a.headband?`<path d="M30 30Q50 24 70 30L69 35Q50 30 31 35Z" fill="${a.trim}"/><path d="M34 30Q50 27 66 30" fill="none" stroke="#fff" stroke-width=".7" opacity=".25"/>`:""}
   <g fill="none" stroke="${a.hair}" stroke-width="2.1" stroke-linecap="round"><path d="M35 ${39+a.browLift}Q40 ${36+a.browLift} 45 ${39+a.browLift}"/><path d="M55 ${39+a.browLift}Q60 ${36+a.browLift} 66 ${39+a.browLift}"/></g>
   <g><ellipse cx="${40-a.eyeGap}" cy="44" rx="4.3" ry="2.3" fill="#f4eee7" opacity=".88"/><ellipse cx="${60+a.eyeGap}" cy="44" rx="4.3" ry="2.3" fill="#f4eee7" opacity=".88"/><circle cx="${40-a.eyeGap}" cy="${44+a.eyeTilt*.3}" r="1.75" fill="${a.eye}"/><circle cx="${60+a.eyeGap}" cy="${44-a.eyeTilt*.3}" r="1.75" fill="${a.eye}"/><circle cx="${39.5-a.eyeGap}" cy="43.4" r=".45" fill="#fff"/><circle cx="${59.5+a.eyeGap}" cy="43.4" r=".45" fill="#fff"/></g>
   <path d="M50 43Q47 50 47 54Q50 56 54 54" fill="none" stroke="${a.skinShadow}" stroke-width="1.15" stroke-linecap="round"/><path d="M51 45L53 52" stroke="${a.skinLight}" stroke-width=".7" opacity=".55"/>
   ${beard}${wrinkles}<path d="${a.mouth===0?"M42 60Q50 63 58 60":a.mouth===1?"M42 61Q50 59 58 61":"M42 60Q50 60.5 58 60"}" fill="none" stroke="#633832" stroke-width="1.35" stroke-linecap="round"/><path d="M44 60Q50 61 56 60" stroke="#d78f82" stroke-width=".55" opacity=".5"/>
   <rect width="100" height="100" fill="url(#${uid}light)"/>
 </svg>`;
}
function renderPlayerAvatar(el,avatarSeed,pos,age,label){if(el)el.innerHTML=playerAvatarSVG(avatarSeed,pos,age,label)}
function drawPlayerAvatarCanvas(c,x,y,size,avatarSeed,pos="PG",age=16){
 const a=avatarProfile(avatarSeed,pos),older=Number(age)>=34;if(Number(age)>=38)a.hair="#5b5754";
 c.save();c.translate(x,y);c.scale(size/100,size/100);c.beginPath();c.rect(0,0,100,100);c.clip();
 let bg=c.createLinearGradient(0,0,100,100);bg.addColorStop(0,"#21303b");bg.addColorStop(.55,"#101a22");bg.addColorStop(1,"#080d12");c.fillStyle=bg;c.fillRect(0,0,100,100);c.globalAlpha=.1;c.fillStyle="#d9853c";c.beginPath();c.arc(82,18,35,0,Math.PI*2);c.fill();c.globalAlpha=1;
 let jersey=c.createLinearGradient(0,72,100,100);jersey.addColorStop(0,a.jersey);jersey.addColorStop(1,"#10151b");c.fillStyle=jersey;c.beginPath();c.moveTo(3,100);c.quadraticCurveTo(7,79,31,73);c.lineTo(41,69);c.lineTo(59,69);c.lineTo(69,73);c.quadraticCurveTo(93,79,97,100);c.closePath();c.fill();
 c.fillStyle=a.trim;c.beginPath();c.moveTo(31,74);c.lineTo(41,68);c.quadraticCurveTo(50,77,59,68);c.lineTo(69,74);c.lineTo(63,84);c.quadraticCurveTo(50,77,37,84);c.closePath();c.fill();c.fillStyle=a.jersey;c.beginPath();c.moveTo(36,79);c.quadraticCurveTo(50,86,64,79);c.lineTo(61,100);c.lineTo(39,100);c.closePath();c.fill();
 let skin=c.createLinearGradient(30,18,68,70);skin.addColorStop(0,a.skinLight);skin.addColorStop(.48,a.skin);skin.addColorStop(1,a.skinShadow);c.fillStyle=skin;c.fillRect(42,58,16,16);c.beginPath();c.ellipse(30,43,4.8,7,0,0,Math.PI*2);c.ellipse(70,43,4.8,7,0,0,Math.PI*2);c.fill();
 c.beginPath();if(a.faceShape===1){c.moveTo(29,32);c.quadraticCurveTo(29,14,50,12);c.quadraticCurveTo(71,14,71,32);c.lineTo(68,53);c.quadraticCurveTo(65,67,50,73);c.quadraticCurveTo(35,67,32,53)}else if(a.faceShape===2){c.moveTo(32,31);c.quadraticCurveTo(32,13,50,11);c.quadraticCurveTo(68,13,68,31);c.lineTo(66,54);c.quadraticCurveTo(62,69,50,74);c.quadraticCurveTo(38,69,34,54)}else if(a.faceShape===3){c.moveTo(30,31);c.quadraticCurveTo(31,14,50,12);c.quadraticCurveTo(69,14,70,31);c.lineTo(67,52);c.quadraticCurveTo(63,64,50,70);c.quadraticCurveTo(37,64,33,52)}else{c.moveTo(31,31);c.quadraticCurveTo(31,13,50,11);c.quadraticCurveTo(69,13,69,31);c.lineTo(67,52);c.quadraticCurveTo(64,67,50,72);c.quadraticCurveTo(36,67,33,52)}c.closePath();c.fill();
 c.fillStyle=a.hair;c.strokeStyle=a.hair;c.lineCap="round";
 c.beginPath();if(a.hairStyle===3){c.moveTo(31,32);c.lineTo(33,13);c.quadraticCurveTo(50,7,67,13);c.lineTo(69,32);c.quadraticCurveTo(61,22,50,22);c.quadraticCurveTo(39,22,31,32)}else if(a.hairStyle===5){c.globalAlpha=.34;c.moveTo(32,27);c.quadraticCurveTo(36,14,50,12);c.quadraticCurveTo(64,14,68,27);c.quadraticCurveTo(59,20,50,20);c.quadraticCurveTo(41,20,32,27)}else{c.moveTo(30,35);c.quadraticCurveTo(28,14,50,10);c.quadraticCurveTo(72,14,70,35);c.quadraticCurveTo(63,24,50,23);c.quadraticCurveTo(37,24,30,35)}c.closePath();c.fill();c.globalAlpha=1;
 if(a.headband){c.fillStyle=a.trim;c.beginPath();c.moveTo(30,30);c.quadraticCurveTo(50,24,70,30);c.lineTo(69,35);c.quadraticCurveTo(50,30,31,35);c.closePath();c.fill()}
 c.strokeStyle=a.hair;c.lineWidth=2.1;c.beginPath();c.moveTo(35,39+a.browLift);c.quadraticCurveTo(40,36+a.browLift,45,39+a.browLift);c.moveTo(55,39+a.browLift);c.quadraticCurveTo(60,36+a.browLift,66,39+a.browLift);c.stroke();
 c.fillStyle="#f4eee7";c.globalAlpha=.88;c.beginPath();c.ellipse(40-a.eyeGap,44,4.3,2.3,0,0,Math.PI*2);c.ellipse(60+a.eyeGap,44,4.3,2.3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;c.fillStyle=a.eye;c.beginPath();c.arc(40-a.eyeGap,44+a.eyeTilt*.3,1.75,0,Math.PI*2);c.arc(60+a.eyeGap,44-a.eyeTilt*.3,1.75,0,Math.PI*2);c.fill();
 c.strokeStyle=a.skinShadow;c.lineWidth=1.15;c.beginPath();c.moveTo(50,43);c.quadraticCurveTo(47,50,47,54);c.quadraticCurveTo(50,56,54,54);c.stroke();
 if(Number(age)>=23&&a.beardStyle){c.globalAlpha=a.beardStyle===1?.16:a.beardStyle===2?.34:.58;c.fillStyle=a.hair;c.beginPath();c.moveTo(34,52);c.quadraticCurveTo(36,66,50,72);c.quadraticCurveTo(64,66,67,52);c.quadraticCurveTo(63,63,50,66);c.quadraticCurveTo(38,63,34,52);c.fill();c.globalAlpha=1}
 c.strokeStyle="#633832";c.lineWidth=1.35;c.beginPath();c.moveTo(42,60);if(a.mouth===0)c.quadraticCurveTo(50,63,58,60);else if(a.mouth===1)c.quadraticCurveTo(50,59,58,61);else c.quadraticCurveTo(50,60.5,58,60);c.stroke();
 if(older){c.globalAlpha=.38;c.strokeStyle=a.skinShadow;c.lineWidth=.65;c.beginPath();c.moveTo(33,43);c.quadraticCurveTo(37,42,40,43);c.moveTo(60,43);c.quadraticCurveTo(64,42,68,43);c.stroke();c.globalAlpha=1}
 let light=c.createRadialGradient(35,24,2,35,24,66);light.addColorStop(0,"rgba(255,255,255,.16)");light.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=light;c.fillRect(0,0,100,100);c.restore();
}
// Procedural Taiwanese sports-manga portraits. Each trait is selected by the
// career-owned avatar seed, producing a large portrait space without a server.
function mangaAvatarProfile(avatarSeed,pos="PG"){
 const r=RNG(`taiwan-manga-avatar-v2-${String(avatarSeed||"BL-PLAYER")}-${pos}`);
 const skins=[
   ["#e3ae82","#f0c49f","#a86747"],["#d59a70","#e9b58d","#91583d"],
   ["#c98760","#dda47c","#805038"],["#b97452","#cf8d68","#71452f"],
   ["#a76548","#bf7d5b","#613b2b"],["#8f563f","#aa6b50","#523326"]
 ];
 const jerseys=[["#14283d","#e38438"],["#d97a2f","#16293c"],["#176d70","#e19643"],["#7d2932","#e2ad68"],["#225b9a","#e2e7e9"],["#25333e","#d7823c"]];
 const skin=skins[ri(r,0,skins.length-1)],jersey=jerseys[ri(r,0,jerseys.length-1)];
 return {skin:skin[0],light:skin[1],shadow:skin[2],jersey:jersey[0],trim:jersey[1],
   face:ri(r,0,5),hair:ri(r,0,9),eyes:ri(r,0,4),brows:ri(r,0,4),nose:ri(r,0,4),mouth:ri(r,0,3),
   beard:ri(r,0,6),eyeGap:ri(r,-1,2),eyeY:ri(r,-1,1),browY:ri(r,-1,1),ear:ri(r,0,2),
   cheek:ri(r,0,3),hairInk:ri(r,0,2),scar:r()<.06,headband:r()<.08,wideShoulders:pos==="PF"||pos==="C"};
}
function mangaFacePath(a){
 const paths=[
  "M31 31Q31 13 50 10Q69 13 69 31L67 51Q64 66 50 72Q36 66 33 51Z",
  "M29 31Q30 13 50 11Q70 13 71 31L68 53Q65 66 50 71Q35 66 32 53Z",
  "M32 29Q33 12 50 10Q67 12 68 29L66 53Q62 69 50 74Q38 69 34 53Z",
  "M30 30Q30 12 50 9Q70 12 70 30L69 52Q64 63 50 68Q36 63 31 52Z",
  "M31 30Q32 12 50 10Q68 12 69 30L66 55Q61 67 50 71Q39 67 34 55Z",
  "M28 32Q29 14 50 11Q71 14 72 32L68 51Q63 64 50 69Q37 64 32 51Z"
 ];return paths[a.face];
}
function mangaHairSVG(a,hairColor,rim){
 const shine=`stroke="${rim}" stroke-width="1.15" fill="none" opacity=".72" stroke-linecap="round"`;
 if(a.hair===0)return `<path d="M30 34Q28 14 50 9Q72 14 70 35Q63 23 50 22Q37 23 30 34Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><path d="M32 25Q39 12 49 13M42 20Q52 9 61 17M56 18Q66 14 69 28" ${shine}/>`;
 if(a.hair===1)return `<path d="M31 29Q34 14 50 12Q66 14 69 29Q60 21 50 21Q40 21 31 29Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><path d="M35 23Q50 14 65 23" ${shine}/>`;
 if(a.hair===2)return `<path d="M29 35Q27 13 50 9Q73 13 71 35Q63 23 50 22Q37 23 29 35Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><g ${shine}><path d="M32 26L39 14"/><path d="M38 22L46 11"/><path d="M46 20L53 10"/><path d="M54 20L62 13"/><path d="M61 24L68 19"/></g>`;
 if(a.hair===3)return `<path d="M30 34L32 15Q46 8 68 14L70 34Q62 22 50 22Q38 22 30 34Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><path d="M34 17Q50 11 66 15M51 12Q48 19 43 23" ${shine}/>`;
 if(a.hair===4)return `<path d="M29 35Q27 14 49 8Q72 12 71 35Q62 23 50 23Q38 23 29 35Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><g ${shine}><path d="M31 24Q36 15 41 21"/><path d="M39 18Q45 9 50 17"/><path d="M49 16Q56 8 61 18"/><path d="M59 19Q67 13 70 26"/></g>`;
 if(a.hair===5)return `<path d="M29 35Q28 13 50 9Q72 13 71 35Q63 23 50 23Q37 23 29 35Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><g fill="none" stroke="${rim}" stroke-width="1" opacity=".68"><path d="M33 23Q36 15 40 22"/><path d="M39 18Q44 11 48 19"/><path d="M47 17Q52 10 56 18"/><path d="M55 18Q62 11 66 23"/></g>`;
 if(a.hair===6)return `<path d="M30 34Q30 15 48 10Q65 7 71 27L70 35Q62 23 50 22Q38 23 30 34Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><path d="M34 22Q48 9 67 15M38 26Q52 15 69 20" ${shine}/>`;
 if(a.hair===7)return `<path d="M32 27Q37 14 50 12Q64 14 68 27Q59 20 50 20Q41 20 32 27Z" fill="${hairColor}" opacity=".82" stroke="#080b0d" stroke-width="1.5"/><path d="M37 20Q50 14 63 20" ${shine}/>`;
 if(a.hair===8)return `<path d="M29 36Q27 14 50 8Q73 13 71 36Q63 24 50 23Q37 24 29 36Z" fill="${hairColor}" stroke="#080b0d" stroke-width="1.8"/><g ${shine}><path d="M31 26L37 15L41 22L47 10L52 19L58 11L62 22L69 17"/></g>`;
 return `<path d="M33 28Q37 15 50 13Q63 15 67 28Q58 21 50 21Q42 21 33 28Z" fill="${hairColor}" opacity=".72" stroke="#080b0d" stroke-width="1.5"/><path d="M37 20Q50 15 63 20" ${shine}/>`;
}
function playerAvatarSVG(avatarSeed,pos="PG",age=16,label="球員頭像"){
 const a=mangaAvatarProfile(avatarSeed,pos),veteran=Number(age)>=38,mature=Number(age)>=32;
 const uid=`mg${hash(`${avatarSeed}-${pos}`).toString(36)}`,hairColor=veteran?"#272526":"#101216",rim=veteran?"#ba7c42":"#e48a3d";
 const safe=String(label||"球員頭像").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const left=40-a.eyeGap,right=60+a.eyeGap,ey=43+a.eyeY,eyeH=[1.55,1.8,1.35,2,1.45][a.eyes],eyeW=[4.2,3.7,4.6,3.9,4.4][a.eyes];
 const beardOn=Number(age)>=23&&a.beard>1,grey=veteran&&a.beard>2?`<path d="M45 62Q50 66 55 62" stroke="#8a8279" stroke-width=".8" opacity=".55"/>`:"";
 const beard=beardOn?`<path d="M34 52Q37 66 50 72Q63 66 67 52Q62 63 50 65Q38 63 34 52Z" fill="${hairColor}" opacity="${a.beard<4?".16":".38"}"/>${a.beard>=4?`<path d="M44 57Q50 60 56 57L55 66Q50 69 45 66Z" fill="${hairColor}" opacity=".78"/>`:""}${a.beard===6?`<path d="M42 57Q50 54 58 57" stroke="${hairColor}" stroke-width="2.4"/>`:""}${grey}`:"";
 const ageLines=mature?`<g fill="none" stroke="${a.shadow}" stroke-width=".65" opacity="${veteran?".58":".32"}"><path d="M34 47Q37 46 40 47"/><path d="M60 47Q64 46 67 47"/>${veteran?`<path d="M39 57Q42 55 44 55"/><path d="M56 55Q59 55 62 57"/><path d="M43 65Q50 68 57 65"/>`:""}</g>`:"";
 const nose=[`M50 43L47 54Q50 56 54 54`,`M50 43Q47 50 48 55Q51 57 55 54`,`M49 43L46 53Q49 56 54 55`,`M51 43Q48 49 48 54Q51 56 53 55`,`M50 43L49 53Q51 55 55 53`][a.nose];
 const mouth=[`M42 60Q50 62 58 60`,`M42 61Q50 59 58 61`,`M43 60L57 60`,`M42 60Q50 64 58 60`][a.mouth];
 return `<svg viewBox="0 0 100 100" role="img" aria-label="${safe}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${uid}bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1c2c3b"/><stop offset=".55" stop-color="#101923"/><stop offset="1" stop-color="#070b10"/></linearGradient><linearGradient id="${uid}skin" x1=".18" y1=".08" x2=".82" y2=".92"><stop stop-color="${a.light}"/><stop offset=".46" stop-color="${a.skin}"/><stop offset="1" stop-color="${a.shadow}"/></linearGradient><linearGradient id="${uid}jersey" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a.jersey}"/><stop offset="1" stop-color="#11161b"/></linearGradient></defs><rect width="100" height="100" fill="url(#${uid}bg)"/><g stroke="#d57c35" stroke-width=".8" opacity=".22"><path d="M70 4L96 28"/><path d="M77 1L99 21"/><path d="M4 83L24 100"/><path d="M83 36L98 50"/></g><path d="M${a.wideShoulders?1:4} 100Q7 79 30 73L41 68H59L70 73Q93 79 ${a.wideShoulders?99:96} 100Z" fill="url(#${uid}jersey)" stroke="#080b0e" stroke-width="1.5"/><path d="M31 74L41 68Q50 77 59 68L69 74L63 84Q50 77 37 84Z" fill="${a.trim}"/><path d="M36 79Q50 86 64 79L61 100H39Z" fill="${a.jersey}"/><path d="M42 59H58V73Q50 80 42 73Z" fill="url(#${uid}skin)" stroke="#3d251c" stroke-width="1"/><ellipse cx="30" cy="43" rx="${4.4+a.ear*.35}" ry="${6.2+a.ear*.4}" fill="${a.skin}" stroke="#4b2a20" stroke-width="1.2"/><ellipse cx="70" cy="43" rx="${4.4+a.ear*.35}" ry="${6.2+a.ear*.4}" fill="${a.shadow}" stroke="#4b2a20" stroke-width="1.2"/><path d="${mangaFacePath(a)}" fill="url(#${uid}skin)" stroke="#171313" stroke-width="1.7"/><path d="M33 31Q31 47 36 57M67 30Q70 46 64 58" fill="none" stroke="${a.shadow}" stroke-width="1.4" opacity=".56"/>${mangaHairSVG(a,hairColor,rim)}${a.headband?`<path d="M30 30Q50 24 70 30L69 35Q50 30 31 35Z" fill="${a.trim}" stroke="#111" stroke-width="1"/>`:""}<g fill="none" stroke="${hairColor}" stroke-width="${[2.5,2.1,2.8,2.3,2.6][a.brows]}" stroke-linecap="round"><path d="M34 ${38+a.browY}Q40 ${35+a.browY} 45 ${38+a.browY}"/><path d="M55 ${38+a.browY}Q61 ${35+a.browY} 67 ${38+a.browY}"/></g><g><path d="M${left-eyeW} ${ey}Q${left} ${ey-eyeH} ${left+eyeW} ${ey}Q${left} ${ey+eyeH} ${left-eyeW} ${ey}Z" fill="#eadfd2" stroke="#221916" stroke-width=".8"/><path d="M${right-eyeW} ${ey}Q${right} ${ey-eyeH} ${right+eyeW} ${ey}Q${right} ${ey+eyeH} ${right-eyeW} ${ey}Z" fill="#eadfd2" stroke="#221916" stroke-width=".8"/><circle cx="${left}" cy="${ey}" r="1.55" fill="#171515"/><circle cx="${right}" cy="${ey}" r="1.55" fill="#171515"/><circle cx="${left-.5}" cy="${ey-.5}" r=".35" fill="#f6eee8"/><circle cx="${right-.5}" cy="${ey-.5}" r=".35" fill="#f6eee8"/></g><path d="${nose}" fill="none" stroke="${a.shadow}" stroke-width="1.25" stroke-linecap="round"/><path d="M50 44L53 52" stroke="${a.light}" stroke-width=".65" opacity=".55"/>${beard}${ageLines}<path d="${mouth}" fill="none" stroke="#572d2b" stroke-width="1.45" stroke-linecap="round"/><path d="M44 60Q50 61 56 60" stroke="#cf8276" stroke-width=".55" opacity=".48"/>${a.cheek?`<g stroke="${a.shadow}" stroke-width=".55" opacity=".34"><path d="M34 53L40 50"/><path d="M60 50L66 53"/>${a.cheek>1?`<path d="M35 56L40 54"/><path d="M60 54L65 56"/>`:""}</g>`:""}${a.scar?`<path d="M63 41L67 48" stroke="#63352d" stroke-width="1.1" opacity=".7"/>`:""}<path d="M31 24Q38 11 49 11" fill="none" stroke="${rim}" stroke-width=".8" opacity=".7"/></svg>`;
}
const mangaAvatarImageCache=new Map();
function mangaAvatarAgeStage(age){return Number(age)>=38?40:Number(age)>=32?34:Number(age)>=23?25:18}
function mangaAvatarImageRecord(avatarSeed,pos="PG",age=16){
 const staged=mangaAvatarAgeStage(age),key=`${avatarSeed}|${pos}|${staged}`;if(mangaAvatarImageCache.has(key))return mangaAvatarImageCache.get(key);
 const img=new Image(),svg=playerAvatarSVG(avatarSeed,pos,staged,"球員頭像");img.decoding="async";
 const record={img,ready:false,promise:null};record.promise=new Promise(resolve=>{const done=()=>{record.ready=!!img.naturalWidth;resolve(record)};img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});setTimeout(done,2500)});img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;mangaAvatarImageCache.set(key,record);return record;
}
function drawPlayerAvatarCanvas(c,x,y,size,avatarSeed,pos="PG",age=16){
 const record=mangaAvatarImageRecord(avatarSeed,pos,age);c.save();c.beginPath();c.rect(x,y,size,size);c.clip();c.fillStyle="#0b151c";c.fillRect(x,y,size,size);
 if(record.ready&&record.img.naturalWidth)c.drawImage(record.img,x,y,size,size);else{const g=c.createLinearGradient(x,y,x+size,y+size);g.addColorStop(0,"#263847");g.addColorStop(1,"#0a0f14");c.fillStyle=g;c.fillRect(x,y,size,size)}c.restore();
}
function preloadPlayerAvatarSprites(){return p?mangaAvatarImageRecord(p.avatarSeed,p.pos,p.age).promise:Promise.resolve()}

// V7.50.5 modular portrait compositor. Face, hair and facial hair are selected
// independently from a career-owned avatar seed, so a world Seed never implies
// one fixed face. Mirroring, crop, offset, face-tone and hair-tone variants provide 69,120
// stable combinations at every age stage.
const MODULAR_AVATAR_ASSETS={
 face:"./basketball-avatar-face-bases.webp",
 hair:"./basketball-avatar-hair.webp"
};
function modularAvatarProfile(avatarSeed,pos="PG"){
 const r=RNG(`taiwan-player-portrait-v4-${String(avatarSeed||"BL-PLAYER")}-${pos}`);
 return {
  face:ri(r,0,15),hair:ri(r,0,15),hairTone:ri(r,0,2),faceTone:ri(r,0,4),
  flip:r()<.5,variant:ri(r,0,2),shift:ri(r,-1,1)*.65
 };
}
function modularAvatarCellPosition(index){
 return `${(index%4)*(100/3)}% ${Math.floor(index/4)*(100/3)}%`;
}
function modularAvatarTransform(a){
 const zoom=[1,1.022,1.042][a.variant];
 return `translateX(${a.shift}%) scale(${a.flip?-zoom:zoom},${zoom})`;
}
function modularAvatarFaceFilter(a){
 return ["","filter:brightness(.97) contrast(1.04)","filter:saturate(.92) sepia(.05)","filter:saturate(1.05) hue-rotate(-3deg)","filter:contrast(1.05) brightness(1.02)"][a.faceTone];
}
function modularAvatarAgeSVG(age){
 const mature=Number(age)>=32,veteran=Number(age)>=38;if(!mature)return "";
 return `<svg class="avatarPortraitAge" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="${veteran?"#4a2a21":"#5b3328"}" stroke-width="${veteran?.72:.52}" stroke-linecap="round" opacity="${veteran?.64:.36}"><path d="M31 48Q36 46 41 48"/><path d="M59 48Q64 46 69 48"/>${veteran?'<path d="M39 57Q42 55 45 56"/><path d="M55 56Q58 55 62 57"/><path d="M43 65Q50 68 57 65"/>':""}</g></svg>`;
}
function playerAvatarSVG(avatarSeed,pos="PG",age=16,label="球員頭像"){
 const a=modularAvatarProfile(avatarSeed,pos),transform=modularAvatarTransform(a);
 const safe=String(label||"球員頭像").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const veteran=Number(age)>=38;
 const hairTone=["","filter:brightness(.88) saturate(.92)","filter:brightness(1.08) saturate(.76)"][a.hairTone],faceTone=modularAvatarFaceFilter(a);
 const hairFilter=veteran?"filter:saturate(.28) brightness(1.15)":hairTone;
 const ageFilter=veteran?"filter:saturate(.82) contrast(1.04)":"";
 return `<span class="avatarComposite" role="img" aria-label="${safe}" style="${ageFilter}"><span class="avatarPortraitRig" style="transform:${transform}"><span class="avatarPortraitLayer avatarPortraitBase" style="background-position:${modularAvatarCellPosition(a.face)};${faceTone}"></span><span class="avatarPortraitLayer avatarPortraitHair" style="background-position:${modularAvatarCellPosition(a.hair)};${hairFilter}"></span></span>${modularAvatarAgeSVG(age)}</span>`;
}
const modularAvatarAssetCache=new Map();
function modularAvatarAsset(src){
 if(modularAvatarAssetCache.has(src))return modularAvatarAssetCache.get(src);
 const img=new Image();img.decoding="async";
 const record={img,ready:false,promise:null};
 record.promise=new Promise(resolve=>{let settled=false;const done=()=>{if(settled)return;settled=true;record.ready=!!img.naturalWidth;resolve(record)};img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});setTimeout(done,5000)});
 img.src=src;modularAvatarAssetCache.set(src,record);return record;
}
function drawModularAvatarLayer(c,record,index,x,y,size){
 if(!record?.ready||!record.img.naturalWidth)return false;
 const cell=record.img.naturalWidth/4,sx=(index%4)*cell,sy=Math.floor(index/4)*cell;
 c.drawImage(record.img,sx,sy,cell,cell,x,y,size,size);return true;
}
function drawPlayerAvatarCanvas(c,x,y,size,avatarSeed,pos="PG",age=16){
 const a=modularAvatarProfile(avatarSeed,pos),zoom=[1,1.022,1.042][a.variant],veteran=Number(age)>=38;
 const face=modularAvatarAsset(MODULAR_AVATAR_ASSETS.face),hair=modularAvatarAsset(MODULAR_AVATAR_ASSETS.hair);
 c.save();c.beginPath();c.rect(x,y,size,size);c.clip();c.fillStyle="#0b151c";c.fillRect(x,y,size,size);
 c.translate(x+size/2+(a.shift/100)*size,y+size/2);c.scale(a.flip?-zoom:zoom,zoom);
 const dx=-size/2,dy=-size/2;
 c.filter=modularAvatarFaceFilter(a).replace(/^filter:/,"")||"none";
 if(!drawModularAvatarLayer(c,face,a.face,dx,dy,size)){const g=c.createLinearGradient(dx,dy,dx+size,dy+size);g.addColorStop(0,"#263847");g.addColorStop(1,"#0a0f14");c.fillStyle=g;c.fillRect(dx,dy,size,size)}
 c.filter="none";
 c.filter=veteran?"saturate(.28) brightness(1.15)":["none","brightness(.88) saturate(.92)","brightness(1.08) saturate(.76)"][a.hairTone];
 drawModularAvatarLayer(c,hair,a.hair,dx+size*.09,dy-size*.18,size*.82);c.filter="none";
 c.restore();
 if(Number(age)>=32){c.save();c.strokeStyle=Number(age)>=38?"rgba(74,42,33,.64)":"rgba(91,51,40,.36)";c.lineWidth=Math.max(.55,size/150);c.lineCap="round";[[31,48,41,48],[59,48,69,48]].forEach(q=>{c.beginPath();c.moveTo(x+q[0]*size/100,y+q[1]*size/100);c.quadraticCurveTo(x+(q[0]+5)*size/100,y+(q[1]-2)*size/100,x+q[2]*size/100,y+q[3]*size/100);c.stroke()});c.restore()}
}
function preloadPlayerAvatarSprites(){
 return Promise.all(Object.values(MODULAR_AVATAR_ASSETS).map(src=>modularAvatarAsset(src).promise));
}
// V8 complete-character portraits: every player owns one illustrated identity
// that stays recognizable throughout the entire career.
const V8_CHARACTER_COUNT=64;
function v8CharacterIndex(avatarSeed){
 const direct=/^V8-(\d{2})$/.exec(String(avatarSeed||""));
 return direct?Math.max(0,Math.min(V8_CHARACTER_COUNT-1,Number(direct[1])-1)):hash(String(avatarSeed||"BL-PLAYER"))%V8_CHARACTER_COUNT;
}
function v8AvatarSrc(avatarSeed){return `./assets/players/player-${String(v8CharacterIndex(avatarSeed)+1).padStart(2,"0")}.webp`}
function playerAvatarSVG(avatarSeed,pos="PG",age=16,label="球員頭像"){
 const safe=String(label||"球員頭像").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 return `<span class="avatarComposite v8CompletePortrait" role="img" aria-label="${safe}"><span class="v8PortraitFallback" aria-hidden="true">🏀</span><img src="${v8AvatarSrc(avatarSeed,age)}" alt="" draggable="false" onerror="this.style.display='none'"></span>`;
}
const v8AvatarImageCache=new Map();
function v8AvatarImage(avatarSeed,age,playerName=""){
 const src=String(playerName||"").trim()==="陳偉振"?"./chenweichen.jpeg":v8AvatarSrc(avatarSeed,age);if(v8AvatarImageCache.has(src))return v8AvatarImageCache.get(src);
 const img=new Image(),record={img,ready:false,promise:null};img.decoding="async";
 record.promise=new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;record.ready=!!img.naturalWidth;resolve(record)};img.addEventListener("load",finish,{once:true});img.addEventListener("error",finish,{once:true});setTimeout(finish,5000)});img.src=src;v8AvatarImageCache.set(src,record);return record;
}
function drawPlayerAvatarCanvas(c,x,y,size,avatarSeed,pos="PG",age=16,playerName=""){
 const record=v8AvatarImage(avatarSeed,age,playerName);c.save();c.beginPath();c.rect(x,y,size,size);c.clip();c.fillStyle="#0b151c";c.fillRect(x,y,size,size);if(record.ready&&record.img.naturalWidth)c.drawImage(record.img,x,y,size,size);c.restore();
}
function preloadPlayerAvatarSprites(){return p?v8AvatarImage(p.avatarSeed,p.age,p.name).promise:Promise.resolve()}
function selectedAvatarSeed(){return `V8-${String(chosenAvatarIndex+1).padStart(2,"0")}`}
function renderAvatarPicker(){
 const preview=document.getElementById("avatarSetupPreview");if(preview)preview.innerHTML=playerAvatarSVG(selectedAvatarSeed(),chosenPos,17,"目前選擇的球員外觀");
 const grid=document.getElementById("avatarPickerGrid");if(grid)grid.innerHTML=Array.from({length:V8_CHARACTER_COUNT},(_,i)=>`<button type="button" class="avatarPick ${i===chosenAvatarIndex?"on":""}" onclick="selectAvatarCharacter(${i})" aria-label="選擇人物 ${i+1}"><img src="./assets/players/player-${String(i+1).padStart(2,"0")}.webp" alt=""></button>`).join("");
}
function openAvatarPicker(){renderAvatarPicker();document.getElementById("avatarPicker")?.classList.remove("hidden")}
function closeAvatarPicker(){document.getElementById("avatarPicker")?.classList.add("hidden")}
function selectAvatarCharacter(index){chosenAvatarIndex=Math.max(0,Math.min(V8_CHARACTER_COUNT-1,Number(index)||0));renderAvatarPicker()}
function cleanSeedInput(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)}
function setupSeedValue(){return cleanSeedInput(document.getElementById("seed")?.value||"")}
function setSetupSeedValue(value){
 const el=document.getElementById("seed");if(!el)return "";
 el.value=cleanSeedInput(value);normalizeSeedInput();return el.value;
}
function normalizeSeedInput(){
 const el=document.getElementById("seed"),err=document.getElementById("seedError");if(!el)return false;
 const cleaned=cleanSeedInput(el.value);if(el.value!==cleaned)el.value=cleaned;
 if(weeklySetupActive&&!weeklySetupApplying&&cleaned!==weeklyChallengeProfile().seed)exitWeeklyChallenge(false);
 const valid=/^[A-Z0-9]{8}$/.test(cleaned);
 el.classList.toggle("invalid",cleaned.length>0&&!valid);
 if(err)err.textContent=cleaned.length>0&&!valid?`還需要 ${8-cleaned.length} 碼；Seed 必須是 8 碼英文字母或數字。`:"";
 return valid;
}
function newSeed(){
 if(weeklySetupActive)return;
 const previous=setupSeedValue();
 let next=proceduralSeed();
 while(next===previous)next=proceduralSeed();
 setSetupSeedValue(next);
}
function refreshSetupBody(reset=false){
 const cfg=bodyRangeFor();
 if(reset){chosenHeight=cfg.defaultHeight;chosenWingspan=chosenHeight+cfg.defaultReach}
 chosenHeight=clampNumber(chosenHeight,cfg.height[0],cfg.height[1]);
 chosenWingspan=clampNumber(chosenWingspan,chosenHeight+cfg.reach[0],chosenHeight+cfg.reach[1]);
 const height=document.getElementById("heightInput"),wingspan=document.getElementById("wingspanInput");
 if(height){height.min=cfg.height[0];height.max=cfg.height[1];height.value=chosenHeight;height.disabled=weeklySetupActive}
 if(wingspan){wingspan.min=chosenHeight+cfg.reach[0];wingspan.max=chosenHeight+cfg.reach[1];wingspan.value=chosenWingspan;wingspan.disabled=weeklySetupActive}
 document.querySelectorAll("[data-body-step]").forEach(button=>{button.disabled=weeklySetupActive});
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 set("heightValue",`${chosenHeight} cm`);set("heightMin",`${cfg.height[0]} cm`);set("heightMax",`${cfg.height[1]} cm`);
 set("wingspanValue",`${chosenWingspan} cm`);set("wingspanMin",`${chosenHeight+cfg.reach[0]} cm`);set("wingspanMax",`${chosenHeight+cfg.reach[1]} cm`);
 set("bodyImpact",bodyImpactText(chosenPos,chosenHeight,chosenWingspan));
}
function updateSetupHeight(value){
 if(weeklySetupActive)return;
 const reach=chosenWingspan-chosenHeight;chosenHeight=Number(value);chosenWingspan=chosenHeight+reach;refreshSetupBody(false);
}
function updateSetupWingspan(value){if(weeklySetupActive)return;chosenWingspan=Number(value);refreshSetupBody(false)}
function adjustSetupHeight(delta){updateSetupHeight(chosenHeight+Number(delta||0))}
function adjustSetupWingspan(delta){updateSetupWingspan(chosenWingspan+Number(delta||0))}
function selectSetupPosition(pos){
 if(weeklySetupActive||!POSITIONS.includes(pos))return;chosenPos=pos;renderPos();refreshSetupBody(true);
}
function initializeCharacterBuilder(){
 const birthplace=document.getElementById("birthplaceInput");
 if(birthplace)renderBirthplaceChoices();
 refreshSetupBody(true);
 renderAvatarPicker();
}
function selectBirthplace(value){
 if(value!=="RANDOM"&&!TAIWAN_BIRTHPLACES.includes(value))return;
 chosenBirthplace=value;renderBirthplaceChoices();
}
function renderBirthplaceChoices(){
 const birthplace=document.getElementById("birthplaceInput");if(!birthplace)return;
 const rows=["RANDOM",...TAIWAN_BIRTHPLACES];
 birthplace.innerHTML=rows.map(x=>`<button type="button" class="birthplaceChip ${chosenBirthplace===x?"on":""}" aria-pressed="${chosenBirthplace===x}" onclick="selectBirthplace('${x}')">${x==="RANDOM"?"隨機":x}</button>`).join("");
}
function renderPos(){
 const names={PG:"控球後衛",SG:"得分後衛",SF:"小前鋒",PF:"大前鋒",C:"中鋒"};
 document.getElementById("posgrid").innerHTML=POSITIONS.map(x=>`<button type="button" class="pos ${x===chosenPos?"on":""}" aria-pressed="${x===chosenPos}" ${weeklySetupActive?"disabled":""} onclick="selectSetupPosition('${x}')"><b>${x}</b><small>${names[x]}</small></button>`).join("");
}
function weeklyChallengeProfile(date=new Date()){
 const utc=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
 const day=utc.getUTCDay()||7;utc.setUTCDate(utc.getUTCDate()+4-day);
 const yearStart=new Date(Date.UTC(utc.getUTCFullYear(),0,1));
 const week=Math.ceil((((utc-yearStart)/86400000)+1)/7),id=`${utc.getUTCFullYear()}W${String(week).padStart(2,"0")}`;
 const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",base=hash(`BL-WEEKLY-${id}`);let seed="",x=base>>>0;
 for(let i=0;i<8;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;seed+=chars[x%chars.length]}
 const pos=POSITIONS[hash(`${id}-position`)%POSITIONS.length];
 const body=bodyRangeFor(pos),height=body.defaultHeight,wingspan=height+body.defaultReach;
 return {id,seed,pos,height,wingspan,label:`${utc.getUTCFullYear()} 第 ${week} 週`};
}
function renderWeeklyChallenge(){
 const row=weeklyChallengeProfile(),titleEl=document.getElementById("weeklyChallengeTitle"),meta=document.getElementById("weeklyChallengeMeta");
 if(titleEl)titleEl.textContent=`第 ${Number(row.id.slice(-2))} 週`;
 if(meta)meta.textContent=`${row.pos}・${row.height}cm｜點擊套用`;
}
function applyWeeklyChallenge(){
 if(weeklySetupActive){exitWeeklyChallenge(true);return}
 const row=weeklyChallengeProfile();weeklySetupApplying=true;setSetupSeedValue(row.seed);chosenPos=row.pos;chosenHeight=row.height;chosenWingspan=row.wingspan;weeklySetupActive=true;weeklySetupApplying=false;
 setWeeklySetupLocked(true);renderPos();refreshSetupBody(false);
 const help=document.getElementById("seedHelp");if(help)help.textContent=`已鎖定 ${row.label}：${row.seed}／${row.pos}／${row.height} cm／臂展 ${row.wingspan} cm。再次點擊右上按鈕可退出挑戰。`;
 const meta=document.getElementById("weeklyChallengeMeta");if(meta)meta.textContent=`✓ ${row.pos}｜已鎖定・再按退出`;
}
function setWeeklySetupLocked(locked){
 document.getElementById("setup")?.classList.toggle("weeklyLocked",locked);document.getElementById("weeklyChallenge")?.classList.toggle("applied",locked);
 document.getElementById("seed")&&(document.getElementById("seed").readOnly=locked);document.getElementById("seedRerollBtn")&&(document.getElementById("seedRerollBtn").disabled=locked);document.getElementById("heightInput")&&(document.getElementById("heightInput").disabled=locked);document.getElementById("wingspanInput")&&(document.getElementById("wingspanInput").disabled=locked);
}
function exitWeeklyChallenge(showNotice=true){
 weeklySetupActive=false;weeklySetupApplying=false;setWeeklySetupLocked(false);renderPos();refreshSetupBody(false);renderWeeklyChallenge();
 const help=document.getElementById("seedHelp");if(help&&showNotice)help.textContent="已退出本週挑戰。現在可以重新選擇 Seed、位置與身材。";
}
renderPos();newSeed();initializeCharacterBuilder();renderWeeklyChallenge();
