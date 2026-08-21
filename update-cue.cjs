const fs = require('fs');
const vm = require('vm');

const filePath = 'web/assets/index-DxMkb3Np.js';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add mutations
const cueHookTarget = 'ye=()=>r.invalidateQueries({queryKey:["cleaning-sectors"]}),';
const cueHookReplace = 'ye=()=>r.invalidateQueries({queryKey:["cleaning-sectors"]}),updateCleanSecMut=oe({mutationFn:Q=>t.updateCleaningSector(Q.id,{name:Q.name}),onSuccess:()=>{ye();n("Secteur mis à jour","success")},onError:()=>n("Erreur lors de la mise à jour","error")}),updateCleanSubSecMut=oe({mutationFn:Q=>t.updateCleaningEquipment(Q.id,{name:Q.name}),onSuccess:()=>{ye();n("Sous-secteur mis à jour","success")},onError:()=>n("Erreur lors de la mise à jour","error")}),updateCleanEquipMut=oe({mutationFn:Q=>t.updateCleaningEquipment(Q.id,{name:Q.name}),onSuccess:()=>{ye();n("Équipement mis à jour","success")},onError:()=>n("Erreur lors de la mise à jour","error")}),';

if (code.includes(cueHookTarget)) {
  code = code.replace(cueHookTarget, cueHookReplace);
  console.log('Added mutations to Cue!');
}

// 2. Sector Edit
const sectorDeleteTarget = '!Q.isSystemZone&&i.jsxs("button",{onClick:Ce=>{Ce.stopPropagation(),Z({type:"sector",id:Q.id,name:Q.name})},className:"text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition",children:["🗑️ ",e("common.delete")]})';
const sectorDeleteReplace = 'i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("button",{onClick:Ce=>{Ce.stopPropagation();const name=prompt("Nouveau nom du secteur :",Q.name);if(name&&name.trim()&&name.trim()!==Q.name)updateCleanSecMut.mutate({id:Q.id,name:name.trim()})},className:"text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition",children:"✏️ Modifier"}),!Q.isSystemZone&&i.jsxs("button",{onClick:Ce=>{Ce.stopPropagation(),Z({type:"sector",id:Q.id,name:Q.name})},className:"text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition",children:["🗑️ ",e("common.delete")]})]})';

if (code.includes(sectorDeleteTarget)) {
  code = code.replace(sectorDeleteTarget, sectorDeleteReplace);
  console.log('Updated Sector delete to include Edit!');
}

// 3. Sub-sector Edit
const subsectorDeleteTarget = 'i.jsx("button",{onClick:pt=>{pt.stopPropagation(),Z({type:"subsector",id:Ce.id,name:Ce.name})},className:"text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition",children:e("common.delete")})';
const subsectorDeleteReplace = 'i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("button",{onClick:pt=>{pt.stopPropagation();const name=prompt("Nouveau nom du sous-secteur :",Ce.name);if(name&&name.trim()&&name.trim()!==Ce.name)updateCleanSubSecMut.mutate({id:Ce.id,name:name.trim()})},className:"text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition",children:"✏️ Modifier"}),i.jsx("button",{onClick:pt=>{pt.stopPropagation(),Z({type:"subsector",id:Ce.id,name:Ce.name})},className:"text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition",children:e("common.delete")})]})';

if (code.includes(subsectorDeleteTarget)) {
  code = code.replace(subsectorDeleteTarget, subsectorDeleteReplace);
  console.log('Updated Sub-sector delete to include Edit!');
}

// 4. Equipment Edit
const equipDeleteTarget = 'i.jsx("button",{onClick:tt=>{tt.stopPropagation(),Z({type:"equipment",id:pt.id,name:pt.name})},className:"text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition",children:e("common.delete")})';
const equipDeleteReplace = 'i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("button",{onClick:tt=>{tt.stopPropagation();const name=prompt("Nouveau nom de l\'équipement :",pt.name);if(name&&name.trim()&&name.trim()!==pt.name)updateCleanEquipMut.mutate({id:pt.id,name:name.trim()})},className:"text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition",children:"✏️ Modifier"}),i.jsx("button",{onClick:tt=>{tt.stopPropagation(),Z({type:"equipment",id:pt.id,name:pt.name})},className:"text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition",children:e("common.delete")})]})';

if (code.includes(equipDeleteTarget)) {
  code = code.replace(equipDeleteTarget, equipDeleteReplace);
  console.log('Updated Equipment delete to include Edit!');
}

try {
  new vm.Script(code);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('index-DxMkb3Np.js is 100% syntactically valid and updated!');
} catch (e) {
  console.error('Syntax Error:', e.message);
}
