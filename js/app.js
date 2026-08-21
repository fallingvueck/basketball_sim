(function initGameInteractionClasses(){
 const gameEl=document.getElementById("game");
 const choicesEl=document.getElementById("choices");
 const nextEl=document.getElementById("next");
 if(!gameEl||!choicesEl||!nextEl)return;
 const sync=()=>{
   gameEl.classList.toggle("hasChoices",choicesEl.childNodes.length>0);
   gameEl.classList.toggle("hasNext",!nextEl.classList.contains("hidden"));
 };
 if(globalThis.MutationObserver){
   new MutationObserver(sync).observe(choicesEl,{childList:true,subtree:true});
   new MutationObserver(sync).observe(nextEl,{attributes:true,attributeFilter:["class"]});
 }
 sync();
})();
