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
let highlighted;
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
  highlighted=null;
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
  return '<div class="cols"><section class="panel"><h3>Avant · réactifs</h3><div class="models">'+particles(fuel,1)+' + '+particles('O2',oxygen)+'</div>'+
    (mode==='methane'?'Molécules O₂ '+counter('O2',oxygen,4,1):'Carbone et dioxygène')+'</section>'+
    '<section class="panel"><h3>Après · produits</h3>Jetons à placer<div class="pool">'+(pool||'Tous les jetons sont placés.')+'</div>'+
    (!solved?'<div>Modèles à remplir</div>'+targets:'')+
    '<div class="models">'+formed.map(k=>particles(k,1,true)).join('')+'</div>'+
    (history.length&&!solved?'<button id="undo">Annuler le dernier jeton</button>':'')+'</section></div>';
}
const names={C:'de carbone',CH4:'de méthane',O2:'de dioxygène',CO2:'de dioxyde de carbone',H2O:'d’eau',C4H10:'de butane'};
function particles(key,count,product=false){
  return Array.from({length:count},()=>'<button type="button" class="particle" data-species="'+key+'" '+
    (product?'data-formed="'+key+'" ':'')+'aria-label="Repérer '+formulas[key]+' dans l’équation">'+
    (mode==='butane'?formulas[key]:model(key))+'</button>').join(' ');
}
function quantities(){
  const fuel=mode==='butane'?'C4H10':mode==='carbone'?'C':'CH4';
  const products=mode==='carbone'?['CO2']:['CO2','H2O'];
  function total(key){
    if(mode==='butane') return counts[key];
    if(mode==='enquete') return key==='H2O'?2:1;
    return formed.filter(k=>k===key).length;
  }
  return [[[fuel,mode==='butane'?2:1],['O2',oxygen]],products.map(k=>[k,total(k)])];
}
function term([key,n]){
  const coefficient=n===1?'':n||'?';
  return '<button type="button" data-term="'+key+'" aria-label="'+(n||'Nombre à déterminer')+' '+formulas[key]+'" aria-pressed="false">'+
    '<span class="coefficient" '+(key==='H2O'&&n===2?'id="water-count"':'')+'>'+coefficient+'</span>'+
    (coefficient?' ':'')+formulas[key]+'</button>';
}
function equation(){
  const [before,after]=quantities();
  const side=terms=>terms.map(term).join('<span class="op"> + </span>');
  return '<div class="side reactants"><small>Avant · réactifs consommés</small><div>'+side(before)+'</div></div>'+
    '<span class="arrow"> → </span><div class="side products"><small>Après · produits formés</small><div>'+side(after)+'</div></div>';
}
function highlight(key){
  highlighted=key;
  document.querySelectorAll('[data-term]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.term===key)));
  document.querySelectorAll('[data-species]').forEach(b=>{
    const active=b.dataset.species===key;
    b.classList.toggle('lit',active);
    b.setAttribute('aria-pressed',String(active));
  });
  if(!key){
    $('reading').textContent='Le coefficient devant une formule compte les particules représentées. Touche la formule pour les repérer.';
    return;
  }
  const [reactants,products]=quantities();
  const reactant=reactants.some(([k])=>k===key);
  const [,n]=(reactant?reactants:products).find(([k])=>k===key);
  if(!n){
    $('reading').textContent='? '+formulas[key]+' · Le nombre de molécules '+names[key]+' reste à déterminer.';
    return;
  }
  const noun=key==='C'?'atome':'molécule';
  const suffix=n>1?'s':'';
  $('reading').textContent=(n===1?'Le coefficient 1 est sous-entendu. ':'Le coefficient '+n+' compte ')+
    (n===1?'1':n)+' '+noun+suffix+' '+names[key]+(reactant?' avant la transformation.':' après la transformation.')+
    (key==='O2'?' Dans O₂, l’indice ₂ indique deux atomes O par molécule.':
     key==='H2O'?' Dans H₂O, l’indice ₂ indique deux atomes H par molécule.':'');
}
function investigation(){
  return '<div class="cols"><section class="panel"><h3>Avant · réactifs</h3><div class="models">'+particles('CH4',1)+' + '+particles('O2',oxygen)+'</div></section>'+
    '<section class="panel"><h3>Après · produits</h3><div class="models">'+particles('CO2',1)+' + '+particles('H2O',2)+'</div></section></div>'+
    '<section class="panel inquiry"><h3>Vérifier la proposition</h3><div class="row">Élément à compter '+['C','H','O'].map(s=>'<button data-inspect="'+s+'" aria-pressed="'+(inspected===s)+'">'+s+'</button>').join('')+'</div>'+
    (inspected&&!diagnosed?'<div class="row"><strong>Atomes '+inspected+'</strong><label>Avant <input id="before" type="number" inputmode="numeric" min="0" max="20"></label><label>Après <input id="after" type="number" inputmode="numeric" min="0" max="20"></label><button id="compare">Comparer</button></div>':'')+
    (diagnosed?'Molécules O₂ '+counter('O2',oxygen,4,1):'')+'</section>';
}
function cards(){
  const cardRow=(key,n)=>'<div class="card-row"><strong>'+formulas[key]+'</strong> '+counter(key,n,20)+'<div class="card-set">'+particles(key,n)+'</div></div>';
  return '<div class="cols"><section class="panel"><h3>Avant · réactifs</h3><div class="card-set">'+particles('C4H10',2)+'</div>'+
    cardRow('O2',oxygen)+'<p>Atomes : C × 8 · H × 20 · O × '+2*oxygen+'</p></section>'+
    '<section class="panel"><h3>Après · produits</h3>'+Object.keys(counts).map(k=>cardRow(k,counts[k])).join('')+'<p>Atomes : C × '+counts.CO2+' · H × '+2*counts.H2O+' · O × '+(2*counts.CO2+counts.H2O)+'</p></section></div>';
}
function render(){
  $('work').innerHTML=mode==='enquete'?investigation():mode==='butane'?cards():board();
  $('equation').innerHTML=equation();
  $('equation-title').textContent=solved?'Équation-bilan vérifiée':mode==='enquete'?'Équation proposée par Lina':'Équation-bilan à construire';
  highlight(highlighted);
  if(solved) $('work').querySelectorAll('button:not([data-species])').forEach(b=>b.disabled=true);
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
  if(current[key].length===shapes[key].length){
    formed.push(key);
    current[key]=[];
    highlighted=key;
  }
  render(); say('Atome placé.');
}
$('work').addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button) return;
  if(button.dataset.species) return highlight(button.dataset.species);
  if(solved) return;
  const data=button.dataset;
  if(data.atom){
    selected={symbol:data.atom,i:Number(data.index)};
    $('work').querySelectorAll('[data-atom]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    say('Jeton '+data.atom+' choisi. Touche son modèle de destination.');
  }else if(data.product) place(data.product);
  else if(button.id==='undo'){
    const {key}=history.pop();
    highlighted=key;
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
    highlighted=data.key;
    selected=null;render(); say('');
    const next=$('work').querySelector('[data-key="'+data.key+'"][data-step="'+step+'"]');
    if(next&&!next.disabled) next.focus();
  }
});
$('equation').addEventListener('click',e=>{
  const button=e.target.closest('[data-term]');
  if(button) highlight(button.dataset.term);
});
$('challenge').addEventListener('change',reset); $('reset').addEventListener('click',reset); $('check').addEventListener('click',check);reset();
