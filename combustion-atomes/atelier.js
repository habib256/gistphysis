'use strict';
const $ = id => document.getElementById(id);
const formulas = {C:'C', O2:'O₂', CH4:'CH₄', CO2:'CO₂', H2O:'H₂O', C4H10:'C₄H₁₀'};
const shapes = {C:['C'], O2:['O','O'], CH4:['C','H','H','H','H'], CO2:['O','C','O'], H2O:['H','O','H']};
const instructions = {
  carbone:['Assembler le dioxyde de carbone','Choisis un jeton, puis touche le modèle de CO₂ pour y placer cet atome. Utilise tous les jetons.'],
  methane:['Faire brûler le méthane','Lors de la combustion complète du méthane, il se forme du dioxyde de carbone et de l’eau. Construis ces molécules. Ajuste la quantité de dioxygène pour utiliser tous les atomes.'],
  enquete:['Examiner la proposition de Lina','Choisis un élément et compte ses atomes de chaque côté de la flèche. Trouve celui dont les nombres diffèrent, puis corrige la quantité de dioxygène.'],
  butane:['Les cartes de la combustion complète du butane','Deux molécules de butane réagissent. Choisis le nombre de cartes O₂, CO₂ et H₂O. Une carte représente une molécule entière. Compare les nombres d’atomes.']
};
let mode, oxygen, selected, counts, current, formed, history, solved, inspected, diagnosed;
function atom(symbol,empty=false){
  return '<span class="atom '+symbol+(empty?' empty':'')+'">'+symbol+'</span>';
}
function model(key,placed=shapes[key]){
  const atoms = placed.slice();
  return '<span class="model '+key+'" aria-label="'+formulas[key]+'">'+shapes[key].map(s=>{
    const i=atoms.indexOf(s);
    if(i>=0) atoms.splice(i,1);
    return atom(s,i<0);
  }).join('')+'</span>';
}
function reset(){
  mode=$('challenge').value;
  oxygen=mode==='butane'?0:1;
  selected=null; counts={CO2:0,H2O:0}; current={CO2:[],H2O:[]};
  formed=[]; history=[]; solved=false; inspected=''; diagnosed=false;
  $('title').textContent=instructions[mode][0]; $('guide').textContent=instructions[mode][1];
  render(); say('');
}
function say(message){$('feedback').textContent=message;}
function stock(){
  const supply={C:1,O:oxygen*2,H:mode==='methane'?4:0};
  for(const step of history) supply[step.symbol]--;
  return supply;
}
function counter(key,value,limit,minimum=0){
  return '<span class="count"><button data-step="-1" data-key="'+key+'" aria-label="Retirer une molécule de '+formulas[key]+'" '+(value<=minimum?'disabled':'')+'>−</button><output>'+value+'</output><button '+(key==='O2'?'id="oxygen-plus" ':'')+'data-step="1" data-key="'+key+'" aria-label="Ajouter une molécule de '+formulas[key]+'" '+(value>=limit?'disabled':'')+'>+</button></span>';
}
function board(){
  const fuel=mode==='methane'?'CH4':'C';
  const supply=stock();
  const pool=Object.keys(supply).flatMap(symbol=>Array.from({length:supply[symbol]},(_,i)=>
    '<button data-atom="'+symbol+'" data-index="'+i+'" aria-pressed="'+(selected?.symbol===symbol&&selected.i===i)+'" aria-label="Choisir un atome '+symbol+'">'+atom(symbol)+'</button>')).join('');
  const targets=(mode==='methane'?['CO2','H2O']:['CO2']).map(key=>
    '<button class="target" data-product="'+key+'" aria-label="Placer dans '+formulas[key]+'">'+model(key,current[key])+formulas[key]+'</button>').join('');
  return '<div class="cols"><section class="panel"><h3>Avant · réactifs</h3><div class="models">'+model(fuel)+' + '+Array.from({length:oxygen},()=>model('O2')).join(' ')+'</div>'+
    (mode==='methane'?'Molécules O₂ '+counter('O2',oxygen,4,1):'Carbone et dioxygène')+'</section>'+
    '<section class="panel"><h3>Après · produits</h3>Jetons à placer<div class="pool">'+(pool||'Tous les jetons sont placés.')+'</div>'+
    (!solved?'<div>Modèles à remplir</div>'+targets:'')+
    '<div class="models">'+formed.map(k=>'<span class="formed" data-formed="'+k+'">'+model(k)+'</span>').join('')+'</div>'+
    (history.length&&!solved?'<button id="undo">Annuler le dernier jeton</button>':'')+'</section></div>';
}
function equation(){
  if(!solved) return '';
  if(mode==='carbone') return 'C + O₂ → CO₂';
  if(mode==='butane') return '2 C₄H₁₀ + 13 O₂ → 8 CO₂ + 10 H₂O';
  return 'CH₄ + 2 O₂ → CO₂ + '+(mode==='methane'?'<button id="water-count" aria-label="Montrer les deux molécules d’eau">2</button>':'2')+' H₂O';
}
function investigation(){
  return '<section class="panel"><h3>Proposition à examiner</h3><p>CH₄ + '+(oxygen===1?'':oxygen+' ')+'O₂ → CO₂ + 2 H₂O</p><div class="models">'+model('CH4')+' + '+Array.from({length:oxygen},()=>model('O2')).join(' ')+' → '+model('CO2')+' + '+model('H2O')+' '+model('H2O')+'</div><div class="row">Élément à compter '+['C','H','O'].map(s=>'<button data-inspect="'+s+'" aria-pressed="'+(inspected===s)+'">'+s+'</button>').join('')+'</div>'+
    (inspected&&!diagnosed?'<div class="row"><strong>Atomes '+inspected+'</strong><label>Avant <input id="before" type="number" inputmode="numeric" min="0" max="20"></label><label>Après <input id="after" type="number" inputmode="numeric" min="0" max="20"></label><button id="compare">Comparer</button></div>':'')+
    (diagnosed?'Molécules O₂ '+counter('O2',oxygen,4,1):'')+'</section>';
}
function cards(){
  return '<div class="cols"><section class="panel"><h3>Avant · réactifs</h3><p>2 × C₄H₁₀</p><div>O₂ '+counter('O2',oxygen,20)+'</div><p>Atomes : C × 8 · H × 20 · O × '+2*oxygen+'</p></section><section class="panel"><h3>Après · produits</h3>'+Object.keys(counts).map(k=>'<div>'+formulas[k]+' '+counter(k,counts[k],20)+'</div>').join('')+'<p>Atomes : C × '+counts.CO2+' · H × '+2*counts.H2O+' · O × '+(2*counts.CO2+counts.H2O)+'</p></section></div>';
}
function render(){
  $('work').innerHTML=mode==='enquete'?investigation():mode==='butane'?cards():board();
  $('equation').innerHTML=equation();
  if(solved) $('work').querySelectorAll('button').forEach(b=>b.disabled=true);
  $('check').disabled=solved;
}
function check(){
  let hint='';
  if(mode==='enquete'){
    if(!diagnosed) hint='Compare les trois éléments pour repérer le désaccord.';
    else if(oxygen!==2) hint='Compte les atomes O dans les réactifs puis dans les produits.';
  }else if(mode==='butane'){
    if(counts.CO2!==8) hint='Suis les huit atomes de carbone du butane.';
    else if(counts.H2O!==10) hint='Compare les nombres d’atomes H.';
    else if(2*oxygen!==2*counts.CO2+counts.H2O) hint='Compare les nombres d’atomes O.';
  }else if(Object.values(stock()).some(n=>n>0)||Object.values(current).some(a=>a.length)){
    hint='Il reste des atomes à placer ou des molécules à terminer.';
    if(mode==='methane') hint+=' Compare le stock d’oxygène aux places disponibles.';
  }
  solved=!hint;
  render(); say(hint||(mode==='methane'?'Bilan vérifié. Touche le 2 devant H₂O dans l’équation.':'Bilan vérifié. Explique comment tu as retrouvé chaque atome.'));
}
function place(key){
  if(!selected) return say('Choisis d’abord un jeton à placer.');
  const symbol=selected.symbol;
  if(current[key].filter(s=>s===symbol).length>=shapes[key].filter(s=>s===symbol).length) return say('Ce modèle n’a pas de place libre pour cet élément.');
  history.push({key,symbol}); current[key].push(symbol); selected=null;
  if(current[key].length===shapes[key].length){formed.push(key);current[key]=[];}
  render(); say('Atome placé.');
}
$('work').addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||solved) return;
  const data=button.dataset;
  if(data.atom){
    selected={symbol:data.atom,i:Number(data.index)};
    $('work').querySelectorAll('[data-atom]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    say('Jeton '+data.atom+' choisi. Touche son modèle de destination.');
  }else if(data.product) place(data.product);
  else if(button.id==='undo'){
    const {key}=history.pop();
    if(!current[key].length){formed.splice(formed.lastIndexOf(key),1);current[key]=history.filter(s=>s.key===key).map(s=>s.symbol).slice(-(shapes[key].length-1));}
    else current[key].pop();
    selected=null; render(); say('Jeton remis dans la réserve.');
  }else if(data.inspect){
    inspected=data.inspect;
    render();say(diagnosed?'Ajuste le nombre de molécules O₂.':'Compte les atomes '+inspected+' avant et après.');
    if(!diagnosed) $('before').focus();
  }else if(button.id==='compare'){
    const before={C:1,H:4,O:2*oxygen}, after={C:1,H:4,O:4};
    if($('before').valueAsNumber!==before[inspected]) return say('Recompte les atomes '+inspected+' dans les réactifs.');
    if($('after').valueAsNumber!==after[inspected]) return say('Recompte les atomes '+inspected+' dans les produits.');
    if(before[inspected]===after[inspected]) return say('Le compte est juste. Cherche maintenant un élément dont les nombres diffèrent.');
    diagnosed=true;render();say('Tes comptes diffèrent. Ajuste le nombre de molécules O₂.');
  }else if(data.step){
    const step=Number(data.step);
    if(data.key==='O2'){
      if(mode==='methane'&&step<0&&stock().O<2) return say('Annule d’abord des placements pour libérer deux atomes O.');
      oxygen+=step;
    }else counts[data.key]+=step;
    selected=null;render(); say('');
    const next=$('work').querySelector('[data-key="'+data.key+'"][data-step="'+step+'"]');
    if(next&&!next.disabled) next.focus();
  }
});
$('equation').addEventListener('click',e=>{
  if(e.target.id!=='water-count') return;
  document.querySelectorAll('[data-formed="H2O"]').forEach(el=>el.classList.add('lit'));
  say('Le coefficient 2 compte deux molécules d’eau entières.');
});
$('challenge').addEventListener('change',reset); $('reset').addEventListener('click',reset); $('check').addEventListener('click',check);reset();
