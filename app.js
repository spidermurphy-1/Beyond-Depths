/*
 * Beyond Depths - System Logic (Multiplayer & Secure)
 * VTT Architecture: Global Armors, Skills & Conditions
 */

// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyA9vgfJ_fF0hmIZ95uytdW5ggZgpfm4WlI",
    authDomain: "beyon-depths.firebaseapp.com",
    projectId: "beyon-depths",
    storageBucket: "beyon-depths.firebasestorage.app",
    messagingSenderId: "605571730206",
    appId: "1:605571730206:web:3b371ce0dc4c0a7ce4d70f",
    measurementId: "G-RDPYZWNMD0"
};

let db = null;
let auth = null;
let currentUser = null;
let unsubscribeChars = null;
let unsubscribeArmors = null;
let unsubscribeSkills = null;

if (firebaseConfig.apiKey) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    } catch(e) {
        console.warn("Erro ao iniciar Firebase. Modo local ativado.");
    }
}

// --- SECURITY (ANTI-XSS) ---
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// --- DATA STRUCTURES (GLOBALS) ---

function getArmorBaseStats(type) {
    return ARMOR_DB[type] || ARMOR_DB.none;
}

// --- STATE ---
let characters = [];
let monsters = [];
let combatState = JSON.parse(localStorage.getItem('bd_combat_state')) || { round: 1, combatants: [] };
let globalArmors = [];
let globalSkills = [];
let activeCharId = null;
let currentTab = 'chars'; // chars, armors, skills, monsters, rpg
let unsubscribeMonsters = null;

function generateId() { return 'id_' + Math.random().toString(36).substr(2, 9); }

function migrateChar(char) {
    if (!char.attr) char.attr = {};
    if (char.attr.con === undefined) {
        char.attr.for = char.attr.str || 0;
        char.attr.con = char.attr.for;
        char.attr.vig = char.attr.vigor || 0;
        char.attr.agi = char.attr.agi || 0;
        char.attr.sed = char.attr.sed || 0;
        char.attr.mis = char.attr.mis || 0;
        char.attr.von = char.attr.will || 0;
    }
    if (char.energy === undefined) char.energy = 35;
    
    // Auto-heal NaN corruptions from previous bug
    if(isNaN(char.hp) || char.hp === null) char.hp = 999;
    if(isNaN(char.stamina) || char.stamina === null) char.stamina = 999;
    if(isNaN(char.lust) || char.lust === null) char.lust = 999;
    
    // Arrays for relations
    if (!char.equippedArmorId) char.equippedArmorId = "";
    if (!char.equippedSkillIds) char.equippedSkillIds = [];
    if (!char.activeConditionIds) char.activeConditionIds = [];
    if (!char.logs) char.logs = [];
    if (char.isUnlockedPoints === undefined) char.isUnlockedPoints = false;
    if (!char.perks) char.perks = {};
    
    return char;
}

// --- DB SYNC LOGIC ---
function saveToDB(collection, item, localArray, storageKey) {
    const idx = localArray.findIndex(x => x.id === item.id);
    if (idx > -1) localArray[idx] = item;
    else localArray.push(item);

    if (db && currentUser) {
        item.ownerId = currentUser.uid;
        db.collection(collection).doc(item.id).set(item).catch(e => console.error("Erro:", e));
    } else {
        localStorage.setItem(storageKey, JSON.stringify(localArray));
    }
    
    renderSidebar();
    if(collection === 'characters') renderDashboard();
}

function deleteFromDB(collection, id, localArray, storageKey) {
    if (db && currentUser) {
        db.collection(collection).doc(id).delete().then(() => {
            if(collection === 'characters') { renderSidebar(); renderDashboard(); }
        }).catch(err => {
            console.error("Erro ao deletar: ", err);
            alert("Erro ao excluir. Sem permissão ou erro de rede.");
        });
        
        // Optimistic UI update for immediate feedback
        if (collection === 'characters') {
            renderSidebar();
            renderDashboard();
        }
    } else {
        const arr = localArray.filter(x => x.id !== id);
        if (collection === 'characters') characters = arr;
        if (collection === 'monsters') monsters = arr;
        if (collection === 'global_armors') globalArmors = arr;
        if (collection === 'global_skills') globalSkills = arr;
        localStorage.setItem(storageKey, JSON.stringify(arr));
        renderSidebar();
        if(collection === 'characters') renderDashboard();
    }
}

function loadData() {
    activeCharId = localStorage.getItem('bd_active');
    
    if (db) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI();
            if (unsubscribeChars) { unsubscribeChars(); unsubscribeArmors(); unsubscribeSkills(); }
            
            if (user) {
                unsubscribeChars = db.collection('characters').onSnapshot(snap => {
                    characters = snap.docs.map(doc => migrateChar(doc.data()));
                    if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = null;
                    if(currentTab === 'chars') renderSidebar();
                    renderDashboard();
                });
                unsubscribeArmors = db.collection('global_armors').onSnapshot(snap => {
                    globalArmors = snap.docs.map(doc => doc.data());
                    if(currentTab === 'armors') renderSidebar();
                    renderDashboard();
                });
                unsubscribeSkills = db.collection('global_skills').onSnapshot(snap => {
                    globalSkills = snap.docs.map(doc => doc.data());
                    if(currentTab === 'skills') renderSidebar();
                    renderDashboard();
                });
                unsubscribeMonsters = db.collection('monsters').onSnapshot(snap => {
                    monsters = snap.docs.map(doc => doc.data());
                    if(currentTab === 'monsters') renderSidebar();
                    if(currentTab === 'rpg') renderRPG();
                });
            } else {
                characters = []; monsters = []; globalArmors = []; globalSkills = []; activeCharId = null;
                renderSidebar(); renderDashboard();
            }
        });
    } else {
        const dc = localStorage.getItem('bd_characters');
        if (dc) characters = JSON.parse(dc).map(migrateChar);
        const da = localStorage.getItem('bd_armors');
        if (da) globalArmors = JSON.parse(da);
        const ds = localStorage.getItem('bd_skills');
        if (ds) globalSkills = JSON.parse(ds);
        const dm = localStorage.getItem('bd_monsters');
        if (dm) monsters = JSON.parse(dm);
        
        if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = null;
        updateAuthUI(); renderSidebar(); renderDashboard(); renderRPG();
    }
}

function canEdit(item) {
    if (!db) return true;
    if (!currentUser) return false;
    if (isMaster()) return true;
    if (!item) return true;
    return item.ownerId === currentUser.uid;
}

function isMaster() {
    if (!db) return true;
    if (!currentUser || !currentUser.email) return false;
    return currentUser.email.startsWith('admin@') || currentUser.email.startsWith('mestre@');
}

function addLog(char, msg, type = 'info') {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    char.logs.push({ text: msg, type: type, time: time });
    if(char.logs.length > 50) char.logs.shift(); // Keep last 50 logs max
}

// --- AUTH UI ---
const elAuthPanel = document.getElementById('auth-panel');
const btnShowLogin = document.getElementById('btn-show-login');
const elUserInfo = document.getElementById('user-info');
const elUserEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const modalLogin = document.getElementById('modal-login');
const formLogin = document.getElementById('form-login');

function updateAuthUI() {
    if (!db) { elAuthPanel.innerHTML = '<span class="text-xs text-green-400">Modo Local (Sem BD)</span>'; return; }
    if (currentUser) {
        btnShowLogin.classList.add('hidden'); elUserInfo.classList.remove('hidden');
        elUserEmail.innerText = escapeHTML(currentUser.email.replace('@beyonddepths.local', ''));
    } else {
        btnShowLogin.classList.remove('hidden'); elUserInfo.classList.add('hidden');
    }
    
    if (isMaster()) {
        document.getElementById('btn-master-damage')?.classList.remove('hidden');
    } else {
        document.getElementById('btn-master-damage')?.classList.add('hidden');
    }
}

if(btnShowLogin) btnShowLogin.addEventListener('click', () => { formLogin.reset(); modalLogin.showModal(); });
if(btnLogout) btnLogout.addEventListener('click', () => { if(auth) auth.signOut(); });

document.getElementById('btn-login-cancel').addEventListener('click', () => modalLogin.close());
document.getElementById('btn-login-submit').addEventListener('click', (e) => {
    e.preventDefault();
    if(!formLogin.checkValidity()) { formLogin.reportValidity(); return; }
    const email = `${document.getElementById('inp-username').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@beyonddepths.com`;
    const pwd = document.getElementById('inp-password').value;
    
    auth.signInWithEmailAndPassword(email, pwd)
        .then(() => modalLogin.close())
        .catch(err => {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                auth.createUserWithEmailAndPassword(email, pwd).then(() => modalLogin.close()).catch(e => alert(e.message));
            } else alert(err.message);
        });
});

// --- SIDEBAR TABS ---
document.getElementById('tab-chars').onclick = () => { currentTab = 'chars'; updateTabsUI(); renderSidebar(); }
document.getElementById('tab-monsters').onclick = () => { currentTab = 'monsters'; updateTabsUI(); renderSidebar(); }
document.getElementById('tab-rpg').onclick = () => { currentTab = 'rpg'; updateTabsUI(); renderSidebar(); renderRPG(); }
document.getElementById('tab-armors').onclick = () => { currentTab = 'armors'; updateTabsUI(); renderSidebar(); }
document.getElementById('tab-skills').onclick = () => { currentTab = 'skills'; updateTabsUI(); renderSidebar(); }

function updateTabsUI() {
    ['chars','monsters','rpg','armors','skills'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (!el) return;
        if (t === currentTab) {
            if (t === 'rpg') {
                el.classList.add('text-purple-300', 'bg-purple-900/30');
                el.classList.remove('text-purple-400', 'bg-purple-900/10');
            } else {
                el.classList.add('bg-gold/10', 'text-gold', 'font-bold');
                el.classList.remove('text-gray-400');
            }
        } else {
            if (t === 'rpg') {
                el.classList.add('text-purple-400', 'bg-purple-900/10');
                el.classList.remove('text-purple-300', 'bg-purple-900/30');
            } else {
                el.classList.add('text-gray-400');
                el.classList.remove('bg-gold/10', 'text-gold', 'font-bold');
            }
        }
    });

    const btnNew = document.getElementById('btn-new-item');
    const btnImp = document.getElementById('btn-import-char');
    if(currentTab === 'rpg') {
        btnNew.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Add Mesa';
        btnNew.classList.replace('btn-gold', 'bg-purple-600');
        btnNew.classList.add('text-white', 'hover:bg-purple-500');
        btnImp.classList.add('hidden');
    } else {
        btnNew.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Novo';
        btnNew.classList.replace('bg-purple-600', 'btn-gold');
        btnNew.classList.remove('text-white', 'hover:bg-purple-500');
        btnImp.classList.remove('hidden');
    }

    if (currentTab === 'rpg') {
        document.getElementById('dashboard-container').classList.add('hidden');
        document.getElementById('no-char-selected').classList.add('hidden');
        document.getElementById('rpg-dashboard-container').classList.remove('hidden');
    } else {
        document.getElementById('rpg-dashboard-container').classList.add('hidden');
        renderDashboard();
    }
}

document.getElementById('btn-new-item').addEventListener('click', () => {
    if (db && !currentUser) return alert("Faça login para criar conteúdo.");
    if (currentTab === 'chars') {
        editingCharId = null;
        document.getElementById('modal-title').innerText = "Nova Ficha";
        document.getElementById('form-character').reset();
        draftPerks = {};
        switchCharTab('base');
        populateCharModalSelects();
        enforceClassConditions();
        document.getElementById('skills-select-list').innerHTML = ''; // reset dynamic slots
        updatePointsCounter();
        document.getElementById('modal-character').showModal();
    } else if (currentTab === 'monsters') {
        openNewMonsterModal();
    } else if (currentTab === 'rpg') {
        document.getElementById('btn-combat-add').click();
    } else if (currentTab === 'armors') {
        document.getElementById('form-armor').reset();
        document.getElementById('modal-armor').showModal();
    } else if (currentTab === 'skills') {
        document.getElementById('form-skill').reset();
        document.getElementById('modal-skill').showModal();
    }
});

function renderSidebar() {
    const listEl = document.getElementById('sidebar-list');
    listEl.innerHTML = '';
    
    let arr = [];
    if (currentTab === 'chars') {
        arr = characters;
    } else if (currentTab === 'monsters') {
        arr = monsters;
    } else if (currentTab === 'rpg') {
        listEl.innerHTML = '<div class="text-center text-sm text-purple-400 mt-10">Tracker ativo.</div>';
        return;
    } else if (currentTab === 'armors') {
        arr = globalArmors;
    } else if (currentTab === 'skills') {
        arr = globalSkills.filter(s => isMaster() || (currentUser && s.ownerId === currentUser.uid));
    }
    
    if (arr.length === 0) {
        listEl.innerHTML = '<div class="text-center text-sm text-gray-500 mt-10">Nenhum item encontrado.</div>';
        return;
    }
    
    arr.forEach(item => {
        const isAct = (currentTab === 'chars' && item.id === activeCharId);
        const div = document.createElement('div');
        div.className = `p-3 rounded transition flex items-center justify-between border ${isAct ? 'bg-gold/10 border-gold' : 'glass-card border-transparent'}`;
        
        if (currentTab === 'chars') {
            div.classList.add('cursor-pointer');
            div.onclick = () => { activeCharId = item.id; localStorage.setItem('bd_active', item.id); renderSidebar(); renderDashboard(); };
            div.innerHTML = `
                <div class="flex-1">
                    <div class="font-bold text-sm ${isAct ? 'text-gold' : 'text-gray-200'}">${escapeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">${escapeHTML(item.class)}</div>
                </div>
            `;
        } else if (currentTab === 'monsters') {
            div.innerHTML = `
                <div class="flex-1 cursor-pointer" onclick="openEditMonster('${item.id}')">
                    <div class="font-bold text-sm text-gray-200">${escapeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">HP: ${item.hp} | LUST: ${item.lust}</div>
                </div>
                ${canEdit(item) ? `<button onclick="deleteFromDB('monsters', '${item.id}', monsters, 'bd_monsters')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>` : ''}
            `;
        } else {
            const sub = currentTab === 'armors' ? `DF: +${item.mods.df}` : `Tipo: ${item.type}`;
            div.innerHTML = `
                <div class="flex-1 cursor-pointer" onclick="openViewModal('${currentTab === 'armors' ? 'armor' : 'skill'}', '${item.id}')">
                    <div class="font-bold text-sm text-gray-200">${escapeHTML(item.name)}</div>
                    <div class="text-xs text-gray-400">${escapeHTML(sub)}</div>
                </div>
                ${canEdit(item) ? `<button onclick="deleteFromDB('${currentTab === 'armors' ? 'global_armors' : 'global_skills'}', '${item.id}', ${currentTab === 'armors' ? 'globalArmors' : 'globalSkills'}, 'bd_${currentTab}')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>` : ''}
            `;
        }
        listEl.appendChild(div);
    });
}

// --- GLOBAL MODALS LOGIC ---
document.getElementById('btn-save-g-armor').addEventListener('click', (e) => {
    e.preventDefault();
    const form = document.getElementById('form-armor');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    const nameVal = document.getElementById('inp-g-armor-name').value.trim();
    
    if (globalArmors.some(a => a.name.toLowerCase() === nameVal.toLowerCase())) {
        alert("Já existe uma armadura cadastrada com esse nome!");
        return;
    }

    const obj = {
        id: generateId(),
        name: nameVal,
        base: document.getElementById('inp-g-armor-base').value,
        desc: document.getElementById('inp-g-armor-desc').value,
        mods: {
            df: parseInt(document.getElementById('inp-g-armor-df').value) || 0,
            dlust: parseInt(document.getElementById('inp-g-armor-dlust').value) || 0,
            agi: parseInt(document.getElementById('inp-g-armor-agi').value) || 0,
            sed: parseInt(document.getElementById('inp-g-armor-sed').value) || 0,
            mis: parseInt(document.getElementById('inp-g-armor-mis').value) || 0
        }
    };
    saveToDB('global_armors', obj, globalArmors, 'bd_armors');
    document.getElementById('modal-armor').close();
});

document.getElementById('btn-save-g-skill').addEventListener('click', (e) => {
    e.preventDefault();
    const form = document.getElementById('form-skill');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    const nameVal = document.getElementById('inp-g-skill-name').value.trim();
    
    if (globalSkills.some(s => s.name.toLowerCase() === nameVal.toLowerCase())) {
        alert("Já existe uma habilidade cadastrada com esse nome!");
        return;
    }
    
    const obj = {
        id: generateId(),
        name: nameVal,
        type: document.getElementById('inp-g-skill-type').value,
        cost: document.getElementById('inp-g-skill-cost').value,
        test: document.getElementById('inp-g-skill-test').value,
        effect: document.getElementById('inp-g-skill-effect').value
    };
    saveToDB('global_skills', obj, globalSkills, 'bd_skills');
    document.getElementById('modal-skill').close();
});

window.openViewModal = function(type, id) {
    if (!id) return;
    const titleEl = document.getElementById('modal-view-title');
    const contentEl = document.getElementById('modal-view-content');
    
    if (type === 'skill') {
        const sk = globalSkills.find(s => s.id === id);
        if (!sk) return;
        titleEl.innerHTML = `<i class="fa-solid fa-star text-gold mr-2"></i>${escapeHTML(sk.name)}`;
        contentEl.innerHTML = `
            <div class="grid grid-cols-2 gap-x-2 gap-y-2 mb-4">
                <div><span class="font-bold text-gray-400 uppercase text-xs">Tipo:</span><br>${escapeHTML(sk.type)}</div>
                <div><span class="font-bold text-gray-400 uppercase text-xs">Custo:</span><br>${escapeHTML(sk.cost)}</div>
                <div class="col-span-2"><span class="font-bold text-gray-400 uppercase text-xs">Teste:</span><br>${escapeHTML(sk.test)}</div>
            </div>
            <div>
                <span class="font-bold text-gray-400 uppercase text-xs">Efeito:</span><br>
                <div class="mt-1 p-3 bg-black/40 border-l-2 border-gold rounded text-gray-300 italic whitespace-pre-wrap leading-relaxed">${escapeHTML(sk.effect)}</div>
            </div>
        `;
    } else if (type === 'armor') {
        const ar = globalArmors.find(a => a.id === id);
        if (!ar) return;
        const b = getArmorBaseStats(ar.base);
        titleEl.innerHTML = `<i class="fa-solid fa-shield-halved text-gold mr-2"></i>${escapeHTML(ar.name)}`;
        contentEl.innerHTML = `
            <div class="grid grid-cols-2 gap-x-2 gap-y-2 mb-4">
                <div><span class="font-bold text-gray-400 uppercase text-xs">Tipo:</span><br>${escapeHTML(ar.type)}</div>
                <div><span class="font-bold text-gray-400 uppercase text-xs">Base:</span><br>${escapeHTML(b.name)}</div>
            </div>
            <div class="mb-4">
                <span class="font-bold text-gray-400 uppercase text-xs">Modificadores:</span><br>
                <ul class="list-disc list-inside mt-1 space-y-1 text-gray-300">
                    <li><span class="text-green-400">DF:</span> +${ar.mods.df}</li>
                    ${ar.mods.hp ? `<li><span class="text-red-400">HP:</span> +${Math.round((ar.mods.hp-1)*100)}%</li>` : ''}
                    ${ar.mods.st ? `<li><span class="text-blue-400">Vigor:</span> +${Math.round((ar.mods.st-1)*100)}%</li>` : ''}
                    ${ar.mods.pen ? `<li><span class="text-red-500">Penalidade Furtividade:</span> +${ar.mods.pen} CD</li>` : ''}
                </ul>
            </div>
            ${ar.desc ? `<div><span class="font-bold text-gray-400 uppercase text-xs">Descrição:</span><br><div class="mt-1 text-gray-300 italic whitespace-pre-wrap leading-relaxed">${escapeHTML(ar.desc)}</div></div>` : ''}
        `;
    }
    
    document.getElementById('modal-view').showModal();
};

// --- CHARACTER MODAL LOGIC ---
let editingCharId = null;

function populateCharModalSelects() {
    const selArmor = document.getElementById('inp-armor-select');
    selArmor.innerHTML = '<option value="">Sem Armadura</option>';
    globalArmors.forEach(a => {
        selArmor.innerHTML += `<option value="${a.id}">${escapeHTML(a.name)} (Base: ${getArmorBaseStats(a.base).name})</option>`;
    });
}

function updateSkillSelectOptions() {
    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    const targetOwner = editingCharId ? characters.find(c => c.id === editingCharId)?.ownerId : (currentUser ? currentUser.uid : null);
    
    const allSelects = Array.from(document.querySelectorAll('.inp-skill-slot'));
    const selectedIds = allSelects.map(sel => sel.value).filter(val => val !== "");
    
    allSelects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione Habilidade...</option>';
        const seenNames = new Set();
        
        globalSkills.forEach(s => {
            const isClassSkill = !!s.classRestricted;
            const isOwner = (s.ownerId === targetOwner) || isMaster() || isClassSkill;
            const matchesClass = !s.classRestricted || classNameVal.includes(s.classRestricted.toLowerCase());
            
            if (isOwner && matchesClass && !seenNames.has(s.name)) {
                seenNames.add(s.name);
                const isSelectedElsewhere = selectedIds.includes(s.id) && s.id !== currentVal;
                const disabledAttr = isSelectedElsewhere ? 'disabled' : '';
                select.innerHTML += `<option value="${s.id}" ${s.id === currentVal ? 'selected' : ''} ${disabledAttr}>${escapeHTML(s.name)}${isSelectedElsewhere ? ' (Já anexada)' : ''}</option>`;
            }
        });
    });
}

function enforceClassConditions() {
    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    let mandatoryConds = [];
    Object.keys(CLASS_TEMPLATES).forEach(k => {
        if (classNameVal.includes(k.toLowerCase())) {
            const tpl = CLASS_TEMPLATES[k];
            mandatoryConds = mandatoryConds.concat(tpl.conditions || []);
            
            if (tpl.skillsToCreate) {
                for(let sk of tpl.skillsToCreate) {
                    let existingSk = globalSkills.find(s => s.name === sk.name && s.classRestricted === sk.classRestricted);
                    if (!existingSk) {
                        existingSk = { id: generateId(), ...sk };
                        saveToDB('global_skills', existingSk, globalSkills, 'bd_skills');
                    }
                    
                    let alreadyInList = false;
                    document.querySelectorAll('.inp-skill-slot').forEach(select => {
                        if (select.value === existingSk.id) alreadyInList = true;
                    });
    
                    if (!alreadyInList) {
                        const div = document.createElement('div');
                        div.className = 'flex gap-2 mb-2 items-center';
                        div.innerHTML = `
                            <select class="input-dark flex-1 inp-skill-slot" onchange="updateSkillSelectOptions(); this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"><option value="${existingSk.id}" selected></option></select>
                            <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
                            <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove(); updateSkillSelectOptions();"><i class="fa-solid fa-xmark"></i></button>
                        `;
                        document.getElementById('skills-select-list').appendChild(div);
                    }
                }
            }
        }
    });

    const condList = document.getElementById('conditions-list');
    const existingChecked = Array.from(document.querySelectorAll('.inp-cond-check')).filter(c => c.checked).map(c => c.value);
    condList.innerHTML = '';
    
    Object.keys(CONDITIONS_DB).forEach(k => {
        const c = CONDITIONS_DB[k];
        
        // Hide classOnly condition if class doesn't match
        if (c.classOnly && !classNameVal.includes(c.classOnly.toLowerCase())) return;
        
        const isMandatory = mandatoryConds.includes(k);
        const isChecked = isMandatory || existingChecked.includes(k);
        
        const extraClass = isMandatory ? 'opacity-70 cursor-not-allowed border border-red-500/50' : '';
        const titleAttr = isMandatory ? 'title="Condição obrigatória da Classe"' : '';
        const disabledAttr = isMandatory ? 'disabled' : '';
        const checkedAttr = isChecked ? 'checked' : '';
        
        condList.innerHTML += `<label class="flex items-center gap-2 bg-black/30 p-1 rounded ${extraClass}" ${titleAttr}>
            <input type="checkbox" value="${k}" class="inp-cond-check" ${checkedAttr} ${disabledAttr}> 
            <span>${escapeHTML(c.name)}</span>
        </label>`;
    });

    updateSkillSelectOptions();
}

document.getElementById('inp-class').addEventListener('input', enforceClassConditions);

function updatePointsCounter() {
    const className = document.getElementById('inp-class').value.trim();
    const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === className.toLowerCase());
    const baseMods = tplKey && CLASS_TEMPLATES[tplKey].attrMods ? CLASS_TEMPLATES[tplKey].attrMods : {};
    
    const attrKeys = ['con', 'for', 'vig', 'agi', 'von', 'sed', 'mis'];
    const attrs = attrKeys.map(k => parseInt(document.getElementById(`inp-${k}`).value) || 0);
    
    let isInvalidDistribution = false;
    let overLimitStr = "";
    let totalDistributed = 0;
    
    attrs.forEach((v, idx) => {
        const k = attrKeys[idx];
        const base = baseMods[k] || 0;
        const distributed = v - base;
        
        totalDistributed += distributed;
        
        if (distributed > 3) {
            isInvalidDistribution = true;
            overLimitStr = " (Máx +3/atrb)";
        }
        if (distributed < 0) {
            isInvalidDistribution = true;
            overLimitStr = " (Abaixo base)";
        }
    });

    const limit = 8;
    
    const counterEl = document.getElementById('points-counter');
    counterEl.innerText = totalDistributed;
    
    const limitEl = document.getElementById('points-limit-display');
    if (limitEl) limitEl.innerText = limit + overLimitStr;

    if(totalDistributed !== limit || isInvalidDistribution) {
        counterEl.className = 'text-red-500 font-bold';
        if (limitEl) limitEl.className = 'text-red-500 text-xs';
    } else {
        counterEl.className = 'text-white';
        if (limitEl) limitEl.className = '';
    }
    
    updatePerksMath();
    return { total: totalDistributed, limit, isInvalidDistribution };
}

document.querySelectorAll('.inp-attr-group input').forEach(inp => {
    inp.addEventListener('input', updatePointsCounter);
});

document.getElementById('btn-add-skill-slot').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2 items-center';
    div.innerHTML = `
        <select class="input-dark flex-1 inp-skill-slot" onchange="updateSkillSelectOptions(); this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"></select>
        <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
        <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove(); updateSkillSelectOptions();"><i class="fa-solid fa-xmark"></i></button>
    `;
    document.getElementById('skills-select-list').appendChild(div);
    updateSkillSelectOptions();
});

const inpTemplate = document.getElementById('inp-template');
if (inpTemplate) {
    inpTemplate.addEventListener('change', async (e) => {
        const tplName = e.target.value;
        const tpl = CLASS_TEMPLATES[tplName];
        if (tpl) {
            document.getElementById('inp-class').value = tplName;
            
            // Reset all attributes to 0 before applying base stats
            const attrKeys = ['con', 'for', 'vig', 'agi', 'von', 'sed', 'mis'];
            attrKeys.forEach(k => {
                const el = document.getElementById(`inp-${k}`);
                if (el) el.value = 0;
            });

            // Apply base mods
            if (tpl.attrMods) {
                Object.keys(tpl.attrMods).forEach(attrKey => {
                    const el = document.getElementById(`inp-${attrKey}`);
                    if (el) el.value = tpl.attrMods[attrKey];
                });
            }
            
            enforceClassConditions();
            updatePointsCounter();
            e.target.value = '';
        }
    });
}

document.getElementById('btn-modal-cancel').addEventListener('click', () => document.getElementById('modal-character').close());
document.getElementById('btn-modal-save').addEventListener('click', (e) => {
    e.preventDefault();
    const form = document.getElementById('form-character');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    let isUnlocked = document.getElementById('inp-unlock-points').checked;
    if (editingCharId) {
        const existingChar = characters.find(c => c.id === editingCharId);
        if (existingChar && existingChar.isUnlockedPoints) isUnlocked = true;
    }
    
    const pts = updatePointsCounter();
    const isMasterOverride = isMaster() && isUnlocked;
    
    if (!isMasterOverride) {
        if (pts.total !== pts.limit) {
            switchCharTab('base');
            return alert(`Você deve distribuir exatamente todos os ${pts.limit} pontos de atributo! (Distribuiu: ${pts.total})`);
        }
        if (pts.isInvalidDistribution) {
            switchCharTab('base');
            return alert("Distribuição inválida: você não pode adicionar mais de +3 pontos em um único atributo (ou reduzir os atributos base da classe).");
        }
    }
    
    const perkStatus = updatePerksMath();
    if (!isMasterOverride) {
        if (!perkStatus.allValid) {
            switchCharTab('perks');
            return alert("Você gastou mais Pontos de Vantagem (PV) do que seus Atributos Base permitem! Reduza suas Vantagens ou aumente o Atributo.");
        }
        if (!perkStatus.allSpent) {
            switchCharTab('perks');
            return alert("Você possui Pontos de Vantagem (PV) não gastos! É obrigatório distribuir todos os seus pontos nas vantagens antes de salvar a ficha.");
        }
    }

    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    let armorId = document.getElementById('inp-armor-select').value;
    
    // Class restrictions
    if (classNameVal.includes('sacerdote') && armorId) {
        const armor = globalArmors.find(a => a.id === armorId);
        if (armor && (armor.base === 'heavy' || armor.base.startsWith('mixed_h'))) {
            alert("Sacerdotes não podem equipar armaduras pesadas. Armadura desequipada.");
            armorId = "";
        }
    }

    const selSkills = Array.from(document.querySelectorAll('.inp-skill-slot')).map(s => s.value).filter(v => v !== "");
    const selConds = Array.from(document.querySelectorAll('.inp-cond-check')).filter(c => c.checked).map(c => c.value);

    const newCharData = {
        name: document.getElementById('inp-name').value,
        race: document.getElementById('inp-race')?.value || '',
        class: document.getElementById('inp-class').value,
        gender: document.getElementById('inp-gender')?.value || '',
        orientation: document.getElementById('inp-orientation')?.value || '',
        avatarUrl: document.getElementById('inp-avatar').value,
        equippedArmorId: armorId,
        equippedSkillIds: selSkills,
        activeConditionIds: selConds,
        isUnlockedPoints: isUnlocked,
        perks: JSON.parse(JSON.stringify(draftPerks)),
        attr: { 
            con: parseInt(document.getElementById('inp-con').value) || 0,
            for: parseInt(document.getElementById('inp-for').value) || 0,
            vig: parseInt(document.getElementById('inp-vig').value) || 0,
            agi: parseInt(document.getElementById('inp-agi').value) || 0,
            von: parseInt(document.getElementById('inp-von').value) || 0,
            sed: parseInt(document.getElementById('inp-sed').value) || 0,
            mis: parseInt(document.getElementById('inp-mis').value) || 0
        }
    };

    if (editingCharId) {
        const char = characters.find(c => c.id === editingCharId);
        if(char && canEdit(char)) {
            const hasAttrChange = JSON.stringify(char.attr) !== JSON.stringify(newCharData.attr);
            Object.assign(char, newCharData);
            if (hasAttrChange) addLog(char, "Atributos Base foram modificados na ficha.", "info");
            saveToDB('characters', char, characters, 'bd_characters');
        }
    } else {
        newCharData.id = generateId();
        newCharData.logs = [];
        const cStats = getClassStats(classNameVal);
        newCharData.hp = Math.max(1, cStats.hp + (newCharData.attr.con * 10));
        newCharData.stamina = Math.max(1, cStats.st + (newCharData.attr.vig * 5));
        newCharData.lust = 0;
        newCharData.energy = cStats.en;
        
        activeCharId = newCharData.id;
        localStorage.setItem('bd_active', activeCharId);
        saveToDB('characters', newCharData, characters, 'bd_characters');
    }
    document.getElementById('modal-character').close();
});

// --- DASHBOARD RENDER ---
function getActiveChar() { return characters.find(c => c.id === activeCharId); }

function getCharArmor(char) {
    if (!char.equippedArmorId) return null;
    return globalArmors.find(a => a.id === char.equippedArmorId) || null;
}

function getClassStats(className) {
    if(!className) return { hp: 10, st: 10, en: 35, lust: 100, ecstasy: 25 };
    const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === className.toLowerCase());
    if (tplKey && CLASS_TEMPLATES[tplKey].baseStats) {
        const st = CLASS_TEMPLATES[tplKey].baseStats;
        return { hp: st.hp, st: st.st, en: st.en, lust: st.lust, ecstasy: st.ecstasy || 25 };
    }
    if (className.toLowerCase().includes('sacerdote')) {
        return { hp: 90, st: 90, en: 50, lust: 120, ecstasy: 20 };
    }
    return { hp: 10, st: 10, en: 35, lust: 100, ecstasy: 25 };
}

function getCharModifiers(char) {
    const armor = getCharArmor(char);
    const baseArmorStats = armor ? getArmorBaseStats(armor.base) : getArmorBaseStats('none');
    
    let mods = { df: 0, dlust: 0, agi: 0, sed: 0, mis: 0, hp_mult: 1, st_mult: 1, esq: 0, dlust_set: null, ecstasy_set: null, danFis: 0, danLust: 0, danMag: 0, danDist: 0, danFurt: 0 };
    let bk = { hp: [], st: [], en: [], lust: [], df: [], dlust: [], esq: [], danFis: [], danLust: [], agi: [], sed: [], mis: [], con: [], for: [], vig: [], von: [] };
    
    // Sum Armor
    if (baseArmorStats.mods.df || armor?.mods?.df) {
        let v = (baseArmorStats.mods.df || 0) + (armor?.mods?.df || 0);
        mods.df += v;
        bk.df.push({label: 'Armadura', val: v});
    }
    if (baseArmorStats.mods.dlust || armor?.mods?.dlust) {
        let v = (baseArmorStats.mods.dlust || 0) + (armor?.mods?.dlust || 0);
        mods.dlust += v;
        bk.dlust.push({label: 'Armadura', val: v});
    }
    if (baseArmorStats.mods.agi || armor?.mods?.agi) {
        let v = (baseArmorStats.mods.agi || 0) + (armor?.mods?.agi || 0);
        mods.agi += v;
        bk.agi.push({label: 'Armadura', val: v});
    }
    if (baseArmorStats.mods.sed || armor?.mods?.sed) {
        let v = (baseArmorStats.mods.sed || 0) + (armor?.mods?.sed || 0);
        mods.sed += v;
        bk.sed.push({label: 'Armadura', val: v});
    }
    if (baseArmorStats.mods.mis || armor?.mods?.mis) {
        let v = (baseArmorStats.mods.mis || 0) + (armor?.mods?.mis || 0);
        mods.mis += v;
        bk.mis.push({label: 'Armadura', val: v});
    }
    
    // Class Passives
    if (char.class && char.class.toLowerCase().includes('sacerdote')) {
        mods.dlust += 5; // Mente Consagrada
        bk.dlust.push({label: 'Mente Consagrada', val: 5});
    }
    
    // Apply Conditions
    char.activeConditionIds.forEach(cid => {
        const c = CONDITIONS_DB[cid];
        if (c && c.mods) {
            if (c.mods.df) { mods.df += c.mods.df; bk.df.push({label: c.name, val: c.mods.df}); }
            if (c.mods.dlust) { mods.dlust += c.mods.dlust; bk.dlust.push({label: c.name, val: c.mods.dlust}); }
            if (c.mods.agi) { mods.agi += c.mods.agi; bk.agi.push({label: c.name, val: c.mods.agi}); }
            if (c.mods.esq) { mods.esq += c.mods.esq; bk.esq.push({label: c.name, val: c.mods.esq}); }
            if (c.mods.hp_mult) { mods.hp_mult *= c.mods.hp_mult; bk.hp.push({label: c.name, val: 'x'+c.mods.hp_mult}); }
            if (c.mods.st_mult) { mods.st_mult *= c.mods.st_mult; bk.st.push({label: c.name, val: 'x'+c.mods.st_mult}); }
            if (c.mods.dlust_set !== undefined) { mods.dlust_set = c.mods.dlust_set; bk.dlust.push({label: c.name, val: '=' + c.mods.dlust_set}); }
            if (c.mods.ecstasy_set !== undefined) { mods.ecstasy_set = c.mods.ecstasy_set; }
        }
    });

    // Extract Perks values
    const perkRegex = /\+([0-9]+(?:d[0-9]+)?)/;
    if (char.perks) {
        for (const attr in char.perks) {
            for (const pName in char.perks[attr]) {
                let lvl = char.perks[attr][pName];
                if (lvl > 0 && PERKS_DB[attr].perks[pName]) {
                    let desc = PERKS_DB[attr].perks[pName][lvl - 1];
                    let match = desc.match(perkRegex);
                    let val = match ? match[1] : null;
                    if (val) {
                        if (desc.includes('Dano Físico') || desc.includes('Dano') && attr === 'for') { mods.danFis += (val.includes('d') ? 0 : parseInt(val)); bk.danFis.push({label: pName, val: '+'+val}); }
                        if (desc.includes('Dano LUST') || desc.includes('Dano LUST')) { mods.danLust += (val.includes('d') ? 0 : parseInt(val)); bk.danLust.push({label: pName, val: '+'+val}); }
                        if (desc.includes('Defesa Fís')) { mods.df += (val.includes('d') ? 0 : parseInt(val)); bk.df.push({label: pName, val: '+'+val}); }
                        if (desc.includes('Defesa LUST')) { mods.dlust += (val.includes('d') ? 0 : parseInt(val)); bk.dlust.push({label: pName, val: '+'+val}); }
                        if (desc.includes('Stamina máxima')) { bk.st.push({label: pName, val: '+'+val}); }
                    }
                }
            }
        }
    }
    
    mods.breakdown = bk;
    return mods;
}

function openPerkModal(attrKey) {
    const char = getActiveChar();
    if (!char || !char.perks || !char.perks[attrKey]) return;
    
    const db = PERKS_DB[attrKey];
    document.getElementById('modal-vp-title').innerHTML = `<i class="fa-solid ${db.icon}"></i> Vantagens: ${db.name}`;
    
    let html = '';
    const myPerks = char.perks[attrKey];
    let hasAny = false;
    
    for (const pName in myPerks) {
        let lvl = myPerks[pName];
        if (lvl > 0) {
            hasAny = true;
            let desc = db.perks[pName][lvl - 1];
            html += `<div class="bg-black/30 border border-gold/10 p-3 rounded text-sm">
                <div class="text-gold font-bold mb-1">${pName} <span class="text-gray-400 font-normal ml-2">Nível ${lvl}</span></div>
                <div class="text-gray-300">${desc}</div>
            </div>`;
        }
    }
    
    if (!hasAny) html = '<div class="text-gray-400 text-center py-4">Nenhuma vantagem adquirida neste atributo.</div>';
    
    document.getElementById('modal-vp-content').innerHTML = html;
    document.getElementById('modal-view-perks').showModal();
}

function renderDashboard() {
    const char = getActiveChar();
    const dash = document.getElementById('dashboard-container');
    const noChar = document.getElementById('no-char-selected');
    if (!char) { dash.classList.add('hidden'); noChar.classList.remove('hidden'); return; }

    dash.classList.remove('hidden'); noChar.classList.add('hidden');
    document.getElementById('dash-name').innerHTML = escapeHTML(char.name);
    document.getElementById('dash-class').innerHTML = escapeHTML((char.race ? char.race + " • " : "") + char.class);
    
    const goEl = document.getElementById('dash-gender-orientation');
    let goText = [];
    if(char.gender) goText.push(char.gender);
    if(char.orientation) goText.push(char.orientation);
    if(goText.length > 0) {
        goEl.innerHTML = goText.map(escapeHTML).join(' • ');
        goEl.classList.remove('hidden');
    } else {
        goEl.classList.add('hidden');
    }
    
    if (char.avatarUrl && char.avatarUrl.startsWith('http')) {
        document.getElementById('dash-avatar').src = char.avatarUrl;
        document.getElementById('dash-avatar').classList.remove('hidden');
    } else document.getElementById('dash-avatar').classList.add('hidden');

    const mods = getCharModifiers(char);

    // Conditions Text
    const condList = char.activeConditionIds.map(id => CONDITIONS_DB[id]?.name).filter(Boolean);
    document.getElementById('dash-conditions').innerHTML = condList.length > 0 ? condList.join('<br>') : "Nenhuma condição ativa.";
    
    // Skills Grid
    const gridSkills = document.getElementById('dash-skills-grid');
    gridSkills.innerHTML = '';
    
    // Race Skills & Weaknesses
    if (char.race && RACE_TEMPLATES[char.race]) {
        const raceTpl = RACE_TEMPLATES[char.race];
        if (raceTpl.skills) {
            raceTpl.skills.forEach(sk => {
                const card = document.createElement('div');
                card.className = "border border-gray-400/40 bg-black/40 rounded p-3 text-sm";
                card.innerHTML = `
                    <div class="font-bold text-gray-300 mb-1 border-b border-gray-400/20 pb-1"><i class="fa-solid fa-dna mr-1"></i> ${escapeHTML(sk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">${escapeHTML(char.race)}</span></div>
                    <div class="text-xs text-gray-400 mb-2"><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type)}</div>
                    <div class="text-gray-300 italic text-xs">${escapeHTML(sk.desc)}</div>
                `;
                gridSkills.appendChild(card);
            });
        }
        if (raceTpl.weaknesses) {
            raceTpl.weaknesses.forEach(wk => {
                const card = document.createElement('div');
                card.className = "border border-red-500/30 bg-black/40 rounded p-3 text-sm";
                card.innerHTML = `
                    <div class="font-bold text-red-400 mb-1 border-b border-red-500/20 pb-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${escapeHTML(wk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">FRAQUEZA DA RAÇA</span></div>
                    <div class="text-gray-300 italic text-xs">${escapeHTML(wk.desc)}</div>
                `;
                gridSkills.appendChild(card);
            });
        }
    }

    // Class Skills & Weaknesses
    if (char.class) {
        const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === char.class.toLowerCase());
        if (tplKey && CLASS_TEMPLATES[tplKey]) {
            const classTpl = CLASS_TEMPLATES[tplKey];
            if (classTpl.skills) {
                classTpl.skills.forEach(sk => {
                    const card = document.createElement('div');
                    card.className = "border border-blue-400/30 bg-black/40 rounded p-3 text-sm";
                    card.innerHTML = `
                        <div class="font-bold text-blue-300 mb-1 border-b border-blue-400/20 pb-1"><i class="fa-solid fa-book-journal-whills mr-1"></i> ${escapeHTML(sk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">${escapeHTML(char.class)}</span></div>
                        <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
                            <div><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type || '-')}</div>
                            <div><span class="font-bold">Custo:</span> ${escapeHTML(sk.cost || '-')}</div>
                            <div class="col-span-2"><span class="font-bold">Teste:</span> ${escapeHTML(sk.test || '-')}</div>
                        </div>
                        <div class="text-gray-300 italic text-xs">${escapeHTML(sk.desc)}</div>
                    `;
                    gridSkills.appendChild(card);
                });
            }
            if (classTpl.weaknesses) {
                classTpl.weaknesses.forEach(wk => {
                    const card = document.createElement('div');
                    card.className = "border border-red-500/30 bg-black/40 rounded p-3 text-sm";
                    card.innerHTML = `
                        <div class="font-bold text-red-400 mb-1 border-b border-red-500/20 pb-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${escapeHTML(wk.name)} <span class="text-[10px] text-gray-500 float-right uppercase">FRAQUEZA DA CLASSE</span></div>
                        <div class="text-gray-300 italic text-xs">${escapeHTML(wk.desc)}</div>
                    `;
                    gridSkills.appendChild(card);
                });
            }
        }
    }

    // Global Skills
    const mySkills = (char.equippedSkillIds || []).map(id => globalSkills.find(s => s.id === id)).filter(Boolean);
    if (mySkills.length > 0) {
        mySkills.forEach(sk => {
            const card = document.createElement('div');
            card.className = "border border-gold/20 bg-black/30 rounded p-3 text-sm";
            card.innerHTML = `
                <div class="font-bold text-gold mb-1 border-b border-gold/10 pb-1"><i class="fa-solid fa-star mr-1 text-xs"></i> ${escapeHTML(sk.name)}</div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
                    <div><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type || '-')}</div>
                    <div><span class="font-bold">Custo:</span> ${escapeHTML(sk.cost || '-')}</div>
                    <div class="col-span-2"><span class="font-bold">Teste:</span> ${escapeHTML(sk.test || '-')}</div>
                </div>
                <div class="text-gray-300 italic text-xs">${escapeHTML(sk.effect)}</div>
            `;
            gridSkills.appendChild(card);
        });
    }

    if (gridSkills.children.length === 0) {
        gridSkills.innerHTML = '<div class="text-sm text-gray-400">Nenhuma habilidade associada ao personagem.</div>';
    }

    updateBars(char, mods);
    renderAttributesAndDerivedStats(char, mods);
    
    const canEditChar = canEdit(char);
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = !canEditChar);

    // Render Logs
    const dashLogs = document.getElementById('dash-logs');
    dashLogs.innerHTML = '';
    if (char.logs && char.logs.length > 0) {
        // Reverse so newest is on top or bottom? Chronological is bottom, newest top is easier for scrolling
        const reversed = [...char.logs].reverse();
        reversed.forEach(lg => {
            const el = document.createElement('div');
            el.className = "border-l-2 pl-2 py-1 border-white/10";
            let color = 'text-gray-300';
            if (lg.type === 'increase') color = 'text-red-400 font-bold'; // Por solicitação, vermelho para aumentos
            else if (lg.type === 'decrease') color = 'text-yellow-400';
            el.innerHTML = `<span class="text-gray-500 mr-2">[${lg.time}]</span> <span class="${color}">${escapeHTML(lg.text)}</span>`;
            dashLogs.appendChild(el);
        });
    } else {
        dashLogs.innerHTML = '<div class="text-gray-500 text-center py-4">Nenhum registro encontrado.</div>';
    }

    document.getElementById('btn-edit-char').onclick = () => {
        if(!canEditChar) return alert("Sem permissão.");
        editingCharId = char.id;
        document.getElementById('modal-title').innerText = "Editar Ficha";
        document.getElementById('inp-name').value = char.name;
        const rEl = document.getElementById('inp-race'); if(rEl) rEl.value = char.race || '';
        document.getElementById('inp-class').value = char.class;
        const gEl = document.getElementById('inp-gender'); if(gEl) gEl.value = char.gender || '';
        const oEl = document.getElementById('inp-orientation'); if(oEl) oEl.value = char.orientation || '';
        document.getElementById('inp-avatar').value = char.avatarUrl || "";
        
        draftPerks = char.perks ? JSON.parse(JSON.stringify(char.perks)) : {};
        switchCharTab('base');
        
        populateCharModalSelects();
        
        // Master UI
        const mop = document.getElementById('master-options-panel');
        const chkUnlock = document.getElementById('inp-unlock-points');
        if (isMaster()) {
            mop.classList.remove('hidden');
            chkUnlock.checked = char.isUnlockedPoints || false;
        } else {
            mop.classList.add('hidden');
            chkUnlock.checked = char.isUnlockedPoints || false;
        }

        // Restore conditions
        // Temporary set a fake element property so enforceClassConditions can capture it
        const condList = document.getElementById('conditions-list');
        condList.innerHTML = '';
        char.activeConditionIds.forEach(id => {
            condList.innerHTML += `<input type="checkbox" class="inp-cond-check" value="${id}" checked>`;
        });
        
        // Restore skills
        const slotsContainer = document.getElementById('skills-select-list');
        slotsContainer.innerHTML = '';
        char.equippedSkillIds.forEach(sId => {
            const div = document.createElement('div');
            div.className = 'flex gap-2 mb-2';
            div.innerHTML = `
                <select class="input-dark flex-1 inp-skill-slot" onchange="updateSkillSelectOptions(); this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"><option value="${sId}" selected></option></select>
                <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
                <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove(); updateSkillSelectOptions();"><i class="fa-solid fa-xmark"></i></button>
            `;
            slotsContainer.appendChild(div);
        });

        enforceClassConditions(); // Applies condition visibility and loads select options
        
        document.getElementById('inp-armor-select').value = char.equippedArmorId || "";
        
        document.getElementById('inp-con').value = char.attr.con;
        document.getElementById('inp-for').value = char.attr.for;
        document.getElementById('inp-vig').value = char.attr.vig;
        document.getElementById('inp-agi').value = char.attr.agi;
        document.getElementById('inp-von').value = char.attr.von;
        document.getElementById('inp-sed').value = char.attr.sed;
        document.getElementById('inp-mis').value = char.attr.mis;
        
        updatePointsCounter();
        document.getElementById('modal-character').showModal();
    };

    document.getElementById('btn-delete-char').onclick = () => {
        if(!canEditChar) return alert("Sem permissão.");
        if(confirm(`Tem certeza que deseja apagar ${char.name}?`)) {
            activeCharId = null; localStorage.removeItem('bd_active');
            deleteFromDB('characters', char.id, characters, 'bd_characters');
        }
    };
}

function updateBars(char, mods) {
    const cStats = getClassStats(char.class);
    
    // Apply Condition Multipliers
    let maxHp = Math.max(1, Math.floor((cStats.hp + (char.attr.con * 10)) * mods.hp_mult));
    let maxSt = Math.max(1, Math.floor((cStats.st + (char.attr.vig * 5)) * mods.st_mult));
    const maxEn = cStats.en;
    const maxLu = cStats.lust;
    
    const hp = Math.max(0, Math.min(maxHp, char.hp));
    document.getElementById('val-hp').innerText = hp; document.getElementById('max-hp').innerText = maxHp;
    document.getElementById('bar-hp').style.width = (hp / maxHp * 100) + '%';

    const st = Math.max(0, Math.min(maxSt, char.stamina));
    document.getElementById('val-stamina').innerText = st; document.getElementById('max-stamina').innerText = maxSt;
    document.getElementById('bar-stamina').style.width = (st / maxSt * 100) + '%';

    const en = Math.max(0, Math.min(maxEn, char.energy));
    document.getElementById('val-energy').innerText = en; document.getElementById('max-energy').innerText = maxEn;
    document.getElementById('bar-energy').style.width = (en / maxEn * 100) + '%';
    
    if (document.getElementById('chk-convert-lust')) {
        document.getElementById('chk-convert-lust').checked = !!char.autoConvertLust;
    }

    const lu = Math.max(0, Math.min(maxLu, char.lust));
    document.getElementById('val-lust').innerText = lu;
    document.getElementById('max-lust').innerText = maxLu;
    const barLust = document.getElementById('bar-lust');
    barLust.style.width = (lu / maxLu * 100) + '%';
    if (lu >= maxLu) barLust.classList.add('mind-break');
    else barLust.classList.remove('mind-break');

    let ecstasyLimiar = mods.ecstasy_set !== null ? mods.ecstasy_set : (cStats.ecstasy + char.attr.vig);
    document.getElementById('dash-ecstasy-threshold').innerText = ecstasyLimiar;
    
    let ecstasyStage = Math.floor(lu / ecstasyLimiar);
    if(ecstasyStage < 0) ecstasyStage = 0;
    document.getElementById('lust-stage').innerText = `Estágio ${ecstasyStage} (${lu} / ${maxLu})`;

    const badge = document.getElementById('dash-condition');
    if (lu >= maxLu) { badge.className = 'badge badge-lust'; badge.innerHTML = 'Mind Break'; }
    else if (hp <= 0) { badge.className = 'badge badge-danger'; badge.innerHTML = 'Inconsciente'; }
    else if (st <= 0) { badge.className = 'badge badge-warning'; badge.innerHTML = 'Caído'; }
    else if (ecstasyStage > 0) { badge.className = 'badge badge-lust'; badge.innerHTML = `Êxtase (Nível ${ecstasyStage})`; }
    else { badge.className = 'badge badge-normal'; badge.innerHTML = 'Normal'; }
}

function renderAttributesAndDerivedStats(char, mods) {
    const totalDF = char.attr.con + mods.df;
    const totalDL = mods.dlust_set !== null ? mods.dlust_set : (char.attr.von + mods.dlust);
    
    const totalAgi = char.attr.agi + mods.agi;
    const baseEsq = 8 + mods.esq;
    const minDodge = totalAgi > 0 ? 2 : 0;
    const maxDodge = totalAgi > 0 ? 2 * totalAgi : 0;
    const totalEsq = minDodge === maxDodge ? (baseEsq + minDodge) : `${baseEsq + minDodge}-${baseEsq + maxDodge}`;
    const totalDanFis = 5 + (char.attr.for) + mods.danFis;
    const totalDanLust = 5 + (char.attr.sed) + mods.danLust;

    document.getElementById('dash-df').innerText = totalDF;
    document.getElementById('dash-dl').innerText = totalDL;
    document.getElementById('dash-esq').innerText = totalEsq;
    if(document.getElementById('dash-danfis')) document.getElementById('dash-danfis').innerText = totalDanFis;
    if(document.getElementById('dash-danlust')) document.getElementById('dash-danlust').innerText = totalDanLust;

    // Build tooltips helper
    const buildTT = (baseLabel, baseVal, bks) => {
        let h = `<div class='border-b border-white/20 pb-1 mb-1 font-bold'>${baseLabel}: ${baseVal}</div>`;
        if (bks && bks.length > 0) {
            bks.forEach(b => h += `<div class='flex justify-between'><span>${b.label}:</span> <span class='text-gold'>${b.val}</span></div>`);
        } else {
            h += `<div class='text-gray-500 italic'>Sem modificadores</div>`;
        }
        return h;
    };

    if(document.getElementById('tt-df')) document.getElementById('tt-df').innerHTML = buildTT('Base (CON)', char.attr.con, mods.breakdown.df);
    if(document.getElementById('tt-dl')) document.getElementById('tt-dl').innerHTML = buildTT('Base (VON)', char.attr.von, mods.breakdown.dlust);
    if(document.getElementById('tt-esq')) document.getElementById('tt-esq').innerHTML = buildTT('Base (8 + 2dAGI)', `8${totalAgi > 0 ? ` + (2 a ${maxDodge})` : ''}`, mods.breakdown.esq);
    if(document.getElementById('tt-danfis')) document.getElementById('tt-danfis').innerHTML = buildTT('Base (5 + FOR)', 5 + char.attr.for, mods.breakdown.danFis);
    if(document.getElementById('tt-danlust')) document.getElementById('tt-danlust').innerHTML = buildTT('Base (5 + SED)', 5 + char.attr.sed, mods.breakdown.danLust);

    // HP, ST, Lust, Magia tooltips
    const baseStats = getClassStats(char.class);
    if(document.getElementById('tt-hp')) document.getElementById('tt-hp').innerHTML = buildTT('Base', baseStats.hp, mods.breakdown.hp);
    if(document.getElementById('tt-st')) document.getElementById('tt-st').innerHTML = buildTT('Base', baseStats.st, mods.breakdown.st);
    if(document.getElementById('tt-lust')) document.getElementById('tt-lust').innerHTML = buildTT('Base', baseStats.lust, mods.breakdown.lust);
    if(document.getElementById('tt-energy')) document.getElementById('tt-energy').innerHTML = buildTT('Base', baseStats.en, mods.breakdown.en);

    const mkRow = (name, key, base, mod, icon) => {
        let finalVal = base + (mod || 0);
        let modStr = mod > 0 ? `<span class="text-green-400 text-xs">(+${mod})</span>` : (mod < 0 ? `<span class="text-red-400 text-xs">(${mod})</span>` : '');
        let bks = mods.breakdown[key] || [];
        let ttHtml = buildTT('Base', base, bks);
        
        return `<div class="group relative flex justify-between items-center py-1.5 border-b border-white/5 cursor-pointer hover:bg-white/5 px-2 -mx-2 rounded transition" onclick="openPerkModal('${key}')">
            <span class="text-gray-400"><i class="fa-solid fa-${icon} w-5"></i> ${name}</span>
            <span class="font-semibold text-lg text-white">${finalVal} ${modStr}</span>
            <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300 shadow-xl">
                ${ttHtml}
                <div class="mt-2 text-center text-[10px] text-gold/60 border-t border-gold/10 pt-1">Clique para ver vantagens</div>
            </div>
        </div>`;
    };

    document.getElementById('dash-attributes').innerHTML = `
        ${mkRow('Constituição', 'con', char.attr.con, 0, 'shield-heart')}
        ${mkRow('Força', 'for', char.attr.for, 0, 'dumbbell')}
        ${mkRow('Vigor', 'vig', char.attr.vig, 0, 'heart-pulse')}
        ${mkRow('Agilidade', 'agi', char.attr.agi, mods.agi, 'person-running')}
        ${mkRow('Vontade', 'von', char.attr.von, 0, 'brain')}
        ${mkRow('Sedução', 'sed', char.attr.sed, mods.sed, 'face-kiss-wink-heart')}
        ${mkRow('Misticismo', 'mis', char.attr.mis, mods.mis, 'wand-magic-sparkles')}
    `;

    const armor = getCharArmor(char);
    if (armor) {
        document.getElementById('dash-armor-name').innerHTML = escapeHTML(armor.name);
        document.getElementById('dash-armor-type').innerHTML = `Base: ${getArmorBaseStats(armor.base).name}`;
        document.getElementById('dash-armor-desc').innerHTML = escapeHTML(armor.desc || "Sem efeitos especiais.");
        document.getElementById('dash-armor-details-panel').classList.remove('hidden');
        
        let modHtml = '';
        const aMod = armor.mods || {};
        if(aMod.df) modHtml += `<li class="${aMod.df > 0 ? 'text-green-400' : 'text-red-400'}">Defesa Física Extra: ${aMod.df > 0 ? '+'+aMod.df : aMod.df}</li>`;
        if(aMod.dlust) modHtml += `<li class="${aMod.dlust > 0 ? 'text-green-400' : 'text-red-400'}">Defesa Lust Extra: ${aMod.dlust > 0 ? '+'+aMod.dlust : aMod.dlust}</li>`;
        if(aMod.agi) modHtml += `<li class="${aMod.agi > 0 ? 'text-green-400' : 'text-red-400'}">Agilidade Extra: ${aMod.agi > 0 ? '+'+aMod.agi : aMod.agi}</li>`;
        if(aMod.sed) modHtml += `<li class="${aMod.sed > 0 ? 'text-green-400' : 'text-red-400'}">Sedução Extra: ${aMod.sed > 0 ? '+'+aMod.sed : aMod.sed}</li>`;
        if(aMod.mis) modHtml += `<li class="${aMod.mis > 0 ? 'text-green-400' : 'text-red-400'}">Misticismo Extra: ${aMod.mis > 0 ? '+'+aMod.mis : aMod.mis}</li>`;
        if(modHtml === '') modHtml = '<li class="text-gray-500">Apenas mods da base</li>';
        document.getElementById('dash-armor-mods').innerHTML = modHtml;
    } else {
        document.getElementById('dash-armor-name').innerHTML = "Sem Armadura";
        document.getElementById('dash-armor-type').innerHTML = "Trajes Comuns";
        document.getElementById('dash-armor-details-panel').classList.add('hidden');
        document.getElementById('dash-armor-mods').innerHTML = '<li class="text-gray-500">Nenhum bônus</li>';
    }
}

// --- QUICK ACTIONS ---
window.adjustStat = function(stat, amount) {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    const oldVal = char[stat];
    char[stat] += amount;
    
    const mods = getCharModifiers(char);
    const cStats = getClassStats(char.class);
    
    if (stat === 'lust') {
        const mx = cStats.lust;
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'hp') {
        const mx = Math.max(1, Math.floor((cStats.hp + (char.attr.con * 10)) * mods.hp_mult));
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'stamina') {
        const mx = Math.max(1, Math.floor((cStats.st + (char.attr.vig * 5)) * mods.st_mult));
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'energy') {
        const mx = cStats.en;
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    }

    if (char[stat] !== oldVal) {
        const statName = stat.toUpperCase();
        if (char[stat] > oldVal) {
            addLog(char, `${statName} aumentado: ${oldVal} -> ${char[stat]}`, "increase");
        } else {
            addLog(char, `${statName} diminuído: ${oldVal} -> ${char[stat]}`, "decrease");
        }
    }

    saveToDB('characters', char, characters, 'bd_characters');
}

window.toggleLustConversion = function() {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    char.autoConvertLust = document.getElementById('chk-convert-lust').checked;
    saveToDB('characters', char, characters, 'bd_characters');
};

window.manualTransmuteLust = function() {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    const cost = 2;
    if (char.lust < cost) {
        return alert("Lust insuficiente para transmutar! Você precisa de pelo menos 2 Lust.");
    }
    
    char.lust -= cost;
    char.energy = (char.energy || 0) + 1;
    
    const cStats = getClassStats(char.class);
    if(char.energy > cStats.en) char.energy = cStats.en;
    if(char.lust < 0) char.lust = 0;
    
    addLog(char, `Transmutação Ativa: Consumiu ${cost} Lust para recuperar 1 Magia.`, "info");
    saveToDB('characters', char, characters, 'bd_characters');
};

window.applyDamage = () => adjustStat('hp', -15);
window.rest = () => adjustStat('stamina', 30);
window.relieve = () => adjustStat('lust', -20);

// --- PERKS SYSTEM ---
let draftPerks = {};

function initPerksUI() {
    const container = document.getElementById('perks-container');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(PERKS_DB).forEach(attrKey => {
        const attrData = PERKS_DB[attrKey];
        
        const block = document.createElement('div');
        block.className = 'border border-gold/20 rounded bg-black/40 mb-3';
        block.innerHTML = `
            <div class="p-3 flex justify-between items-center cursor-pointer bg-gold/10 hover:bg-gold/20 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div class="font-cinzel text-gold font-bold"><i class="fa-solid ${attrData.icon} mr-2"></i>${attrData.name}</div>
                <div class="text-xs text-gray-300 font-mono">PV: <span id="pv-used-${attrKey}">0</span> / <span id="pv-max-${attrKey}">0</span></div>
            </div>
            <div class="p-3 hidden space-y-3" id="perks-list-${attrKey}">
                ${Object.keys(attrData.perks).length === 0 ? '<div class="text-xs text-gray-500 italic text-center">Vantagens em desenvolvimento pelo Game Designer...</div>' : ''}
            </div>
        `;
        container.appendChild(block);

        const list = document.getElementById(`perks-list-${attrKey}`);
        Object.keys(attrData.perks).forEach(pName => {
            const row = document.createElement('div');
            row.className = 'p-3 bg-gray-900 rounded-lg border border-gray-700 shadow-sm flex flex-col gap-2 transition-all opacity-60 grayscale-[50%]';
            row.id = `pcard-${attrKey}-${btoa(pName).replace(/=/g, '')}`;
            row.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <span class="font-bold text-sm text-gold leading-tight drop-shadow-md flex-1">${escapeHTML(pName)}</span>
                    <div class="flex items-center bg-black/60 rounded border border-gray-800 shrink-0">
                        <button type="button" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-white/10 transition-colors" onclick="adjustPerk('${attrKey}', '${pName.replace(/'/g, "\\'")}', -1)"><i class="fa-solid fa-minus text-xs"></i></button>
                        <span class="font-mono text-xs w-6 text-center text-white font-bold" id="plvl-${attrKey}-${btoa(pName).replace(/=/g, '')}">0</span>
                        <button type="button" class="w-8 h-8 flex items-center justify-center text-green-400 hover:bg-white/10 transition-colors" onclick="adjustPerk('${attrKey}', '${pName.replace(/'/g, "\\'")}', 1)"><i class="fa-solid fa-plus text-xs"></i></button>
                    </div>
                </div>
                <div class="text-[11px] md:text-xs text-gray-500 italic bg-black/40 p-2 rounded border-l-2 border-gray-700 transition-colors min-h-[36px]" id="pdesc-${attrKey}-${btoa(pName).replace(/=/g, '')}">Nenhum ponto investido. Toque em (+) para revelar.</div>
            `;
            list.appendChild(row);
        });
    });
}

function updatePerksMath() {
    const attrs = {
        con: parseInt(document.getElementById('inp-con').value) || 0,
        for: parseInt(document.getElementById('inp-for').value) || 0,
        vig: parseInt(document.getElementById('inp-vig').value) || 0,
        agi: parseInt(document.getElementById('inp-agi').value) || 0,
        von: parseInt(document.getElementById('inp-von').value) || 0,
        sed: parseInt(document.getElementById('inp-sed').value) || 0,
        mis: parseInt(document.getElementById('inp-mis').value) || 0
    };

    let allValid = true;
    let allSpent = true;

    Object.keys(PERKS_DB).forEach(attrKey => {
        const maxPV = Math.max(0, attrs[attrKey] * 2);
        let usedPV = 0;
        
        // Reset Visuals
        Object.keys(PERKS_DB[attrKey].perks).forEach(pName => {
            const safeName = btoa(pName).replace(/=/g, '');
            const lvlEl = document.getElementById(`plvl-${attrKey}-${safeName}`);
            const descEl = document.getElementById(`pdesc-${attrKey}-${safeName}`);
            const cardEl = document.getElementById(`pcard-${attrKey}-${safeName}`);
            
            if (lvlEl) { lvlEl.innerText = `0`; }
            if (descEl) { 
                descEl.innerText = 'Nenhum ponto investido. Toque em (+) para revelar os poderes.'; 
                descEl.className = 'text-[11px] md:text-xs text-gray-500 italic bg-black/40 p-2 rounded border-l-2 border-gray-700 transition-colors min-h-[36px]';
            }
            if (cardEl) {
                cardEl.className = 'p-3 bg-gray-900 rounded-lg border border-gray-700 shadow-sm flex flex-col gap-2 transition-all opacity-60 grayscale-[50%]';
            }
        });

        if (draftPerks[attrKey]) {
            Object.keys(draftPerks[attrKey]).forEach(pName => {
                const lvl = draftPerks[attrKey][pName];
                if (lvl > 0) {
                    usedPV += PERK_COSTS[lvl];
                    const safeName = btoa(pName).replace(/=/g, '');
                    const lvlEl = document.getElementById(`plvl-${attrKey}-${safeName}`);
                    const descEl = document.getElementById(`pdesc-${attrKey}-${safeName}`);
                    const cardEl = document.getElementById(`pcard-${attrKey}-${safeName}`);
                    
                    if (lvlEl && descEl && cardEl && PERKS_DB[attrKey].perks[pName]) {
                        lvlEl.innerText = `${lvl}`;
                        descEl.innerText = PERKS_DB[attrKey].perks[pName][lvl-1];
                        
                        cardEl.className = 'p-3 bg-gray-800 rounded-lg border border-gold/40 shadow-[0_0_10px_rgba(218,165,32,0.1)] flex flex-col gap-2 transition-all';
                        descEl.className = 'text-[11px] md:text-xs text-gray-200 bg-black/60 p-2 rounded border-l-2 border-purple-500 transition-colors min-h-[36px] font-medium leading-relaxed';
                        
                        if(lvl === 7) {
                            cardEl.classList.add('border-purple-500', 'shadow-[0_0_15px_rgba(168,85,247,0.3)]');
                            descEl.classList.add('text-purple-300', 'font-bold');
                        }
                    }
                }
            });
        }
        
        const usedEl = document.getElementById(`pv-used-${attrKey}`);
        const maxEl = document.getElementById(`pv-max-${attrKey}`);
        if(usedEl && maxEl) {
            usedEl.innerText = usedPV;
            maxEl.innerText = maxPV;
            if(usedPV > maxPV) {
                usedEl.className = 'text-red-500 font-bold';
                allValid = false;
            } else {
                usedEl.className = 'text-white';
            }
            if(usedPV < maxPV) {
                allSpent = false;
            }
        }
    });
    
    return { allValid, allSpent };
}

window.adjustPerk = function(attrKey, perkName, delta) {
    if(!draftPerks[attrKey]) draftPerks[attrKey] = {};
    let lvl = draftPerks[attrKey][perkName] || 0;
    lvl += delta;
    if(lvl < 0) lvl = 0;
    if(lvl > 7) lvl = 7;
    draftPerks[attrKey][perkName] = lvl;
    updatePerksMath();
}

window.switchCharTab = function(tab) {
    document.getElementById('char-tab-base').classList.add('hidden');
    document.getElementById('char-tab-perks').classList.add('hidden');
    document.getElementById('btn-tab-base').className = 'px-3 py-1 text-sm border-b-2 border-transparent text-gray-400 hover:text-white';
    document.getElementById('btn-tab-perks').className = 'px-3 py-1 text-sm border-b-2 border-transparent text-gray-400 hover:text-white';
    
    if (tab === 'base') {
        document.getElementById('char-tab-base').classList.remove('hidden');
        document.getElementById('btn-tab-base').className = 'px-3 py-1 text-sm border-b-2 border-gold text-white';
    } else {
        document.getElementById('char-tab-perks').classList.remove('hidden');
        document.getElementById('btn-tab-perks').className = 'px-3 py-1 text-sm border-b-2 border-gold text-white';
        updatePerksMath();
    }
}

// --- MONSTER LOGIC ---
window.openNewMonsterModal = function() {
    editingMonsterId = null;
    document.getElementById('form-monster').reset();
    document.querySelectorAll('#monster-modifiers-table tbody tr').forEach(row => {
        row.querySelector('.mod-vuln').value = '';
        row.querySelector('.mod-red').value = '';
        row.querySelector('.mod-def').value = '';
    });
    document.getElementById('modal-monster').showModal();
}

document.getElementById('form-monster').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isMaster()) return alert("Sem permissão. Apenas o Mestre pode criar monstros.");
    
    const nameVal = document.getElementById('inp-monster-name').value.trim();
    
    if (!editingMonsterId && monsters.some(m => m.name.toLowerCase() === nameVal.toLowerCase())) {
        alert("Já existe um monstro cadastrado com esse nome!");
        return;
    }
    
    const mods = {};
    document.querySelectorAll('#monster-modifiers-table tbody tr').forEach(row => {
        const dmgType = row.getAttribute('data-dmg');
        if (dmgType) {
            mods[dmgType] = {
                vuln: parseInt(row.querySelector('.mod-vuln').value) || 0,
                red: parseInt(row.querySelector('.mod-red').value) || 0,
                def: parseInt(row.querySelector('.mod-def').value) || 0
            };
        }
    });
    
    const newMonster = {
        id: editingMonsterId || generateId(),
        ownerId: currentUser ? currentUser.uid : null,
        name: nameVal,
        avatar: document.getElementById('inp-monster-avatar').value,
        hp: parseInt(document.getElementById('inp-monster-hp').value) || 50,
        stamina: parseInt(document.getElementById('inp-monster-st').value) || 50,
        lust: parseInt(document.getElementById('inp-monster-lust').value) || 100,
        ini: parseInt(document.getElementById('inp-monster-ini').value) || 10,
        con: parseInt(document.getElementById('inp-monster-con').value) || 5,
        von: parseInt(document.getElementById('inp-monster-von').value) || 5,
        desc: document.getElementById('inp-monster-desc').value,
        modifiers: mods,
        isMonster: true
    };
    
    if (editingMonsterId) {
        const m = monsters.find(x => x.id === editingMonsterId);
        if (m) Object.assign(m, newMonster);
    } else {
        monsters.push(newMonster);
    }
    
    saveToDB('monsters', editingMonsterId ? monsters.find(x => x.id === editingMonsterId) : newMonster, monsters, 'bd_monsters');
    document.getElementById('modal-monster').close();
    renderSidebar();
});

window.openEditMonster = function(id) {
    const m = monsters.find(x => x.id === id);
    if (!m) return;
    editingMonsterId = id;
    document.getElementById('inp-monster-name').value = m.name;
    document.getElementById('inp-monster-avatar').value = m.avatar || '';
    document.getElementById('inp-monster-hp').value = m.hp;
    document.getElementById('inp-monster-st').value = m.stamina;
    document.getElementById('inp-monster-lust').value = m.lust;
    document.getElementById('inp-monster-ini').value = m.ini || 10;
    document.getElementById('inp-monster-con').value = m.con || 5;
    document.getElementById('inp-monster-von').value = m.von || 5;
    document.getElementById('inp-monster-desc').value = m.desc || '';
    
    document.querySelectorAll('#monster-modifiers-table tbody tr').forEach(row => {
        const dmgType = row.getAttribute('data-dmg');
        const mdata = m.modifiers && m.modifiers[dmgType] ? m.modifiers[dmgType] : {vuln:0, red:0, def:0};
        row.querySelector('.mod-vuln').value = mdata.vuln || '';
        row.querySelector('.mod-red').value = mdata.red || '';
        row.querySelector('.mod-def').value = mdata.def || '';
    });
    
    document.getElementById('modal-monster').showModal();
};

// --- RPG TRACKER LOGIC ---
document.getElementById('btn-combat-add').onclick = () => {
    const sel = document.getElementById('inp-combat-select');
    sel.innerHTML = '<option value="">-- Selecione --</option>';
    
    const optGroupChars = document.createElement('optgroup');
    optGroupChars.label = 'Personagens';
    characters.forEach(c => {
        const opt = document.createElement('option');
        opt.value = 'char|' + c.id;
        opt.innerText = c.name;
        optGroupChars.appendChild(opt);
    });
    
    const optGroupMonsters = document.createElement('optgroup');
    optGroupMonsters.label = 'Monstros';
    monsters.forEach(m => {
        const opt = document.createElement('option');
        opt.value = 'monster|' + m.id;
        opt.innerText = m.name;
        optGroupMonsters.appendChild(opt);
    });
    
    sel.appendChild(optGroupChars);
    sel.appendChild(optGroupMonsters);
    
    document.getElementById('inp-combat-ini').value = '';
    document.getElementById('modal-combat-add').showModal();
};

document.getElementById('btn-combat-confirm').onclick = () => {
    try {
        const val = document.getElementById('inp-combat-select').value;
        if(!val) return;
        
        const type = val.split('|')[0];
        const id = val.split('|')[1];
        
        let source = null;
        if (type === 'char') source = characters.find(c => c.id === id);
        if (type === 'monster') source = monsters.find(m => m.id === id);
        
        if(!source) return;
        
        const iniVal = document.getElementById('inp-combat-ini').value;
        let roll = parseInt(iniVal);
        const isMon = type === 'monster';
        
        if (isNaN(roll)) {
            const baseIni = isMon ? (source.ini || 10) : (source.attr?.agi || 0);
            roll = baseIni + Math.floor(Math.random() * 20) + 1;
        }
        
        const cStats = isMon ? null : getClassStats(source.class);
        const mods = isMon ? null : getCharModifiers(source);
        
        const attr = source.attr || { con: 0, vig: 0, agi: 0 };
        let mhp = isMon ? source.hp : Math.max(1, Math.floor((cStats.hp + (attr.con * 10)) * mods.hp_mult));
        let mst = isMon ? source.stamina : Math.max(1, Math.floor((cStats.st + (attr.vig * 5)) * mods.st_mult));
        let mlu = isMon ? source.lust : cStats.lust;
        
        const combatant = {
            cid: generateId(),
            refId: source.id,
            isMonster: isMon,
            name: source.name,
            avatar: isMon ? (source.avatar || '') : (source.avatarUrl || ''),
            ini: roll,
            hp: source.hp,
            maxHp: mhp,
            stamina: source.stamina,
            maxSt: mst,
            lust: source.lust || 0,
            maxLust: mlu
        };
        
        combatState.combatants.push(combatant);
        sortCombatants();
        document.getElementById('modal-combat-add').close();
        renderRPG();
    } catch (err) {
        alert("Erro no botão Adicionar: " + err.message + "\nStack: " + err.stack);
        console.error(err);
    }
};

document.getElementById('btn-combat-next').onclick = () => {
    if(combatState.combatants.length === 0) return;
    const first = combatState.combatants.shift();
    combatState.combatants.push(first);
    combatState.round++;
    renderRPG();
};

document.getElementById('btn-combat-clear').onclick = () => {
    if(confirm("Deseja encerrar o combate e limpar a mesa?")) {
        combatState.combatants = [];
        combatState.round = 1;
        renderRPG();
    }
};

function sortCombatants() {
    combatState.combatants.sort((a, b) => b.ini - a.ini);
}

window.adjustCombatStat = function(cid, stat, delta) {
    const c = combatState.combatants.find(x => x.cid === cid);
    if(!c) return;
    
    // Auto-heal NaN corruptions from previous bug
    if(isNaN(c[stat]) || c[stat] === null) {
        if(stat === 'hp') c[stat] = c.maxHp || 100;
        else if(stat === 'stamina') c[stat] = c.maxSt || 100;
        else if(stat === 'lust') c[stat] = c.maxLust || 100;
        else c[stat] = 0;
    }

    c[stat] += delta;
    
    // Fallback if delta was somehow NaN
    if(isNaN(c[stat])) {
        if(stat === 'hp') c[stat] = c.maxHp || 100;
        else if(stat === 'stamina') c[stat] = c.maxSt || 100;
        else if(stat === 'lust') c[stat] = c.maxLust || 100;
        else c[stat] = 0;
    }

    if(c[stat] < 0) c[stat] = 0;
    
    if(stat === 'hp' && c[stat] > c.maxHp) c[stat] = c.maxHp;
    if(stat === 'stamina' && c[stat] > c.maxSt) c[stat] = c.maxSt;
    if(stat === 'lust' && c[stat] > c.maxLust) c[stat] = c.maxLust;
    
    let ref = null;
    let col = '';
    let arr = null;
    let storageKey = '';
    
    if (c.isMonster) {
        ref = monsters.find(m => m.id === c.refId);
        col = 'monsters'; arr = monsters; storageKey = 'bd_monsters';
    } else {
        ref = characters.find(ch => ch.id === c.refId);
        col = 'characters'; arr = characters; storageKey = 'bd_characters';
    }
    
    if (ref && canEdit(ref)) {
        ref[stat] = c[stat];
        saveToDB(col, ref, arr, storageKey);
    }
    
    renderRPG();
};

function renderRPG() {
    document.getElementById('rpg-round-counter').innerText = Math.floor((combatState.round - 1) / Math.max(1, combatState.combatants.length)) + 1;
    
    const listEl = document.getElementById('combat-tracker-list');
    listEl.innerHTML = '';
    
    if(combatState.combatants.length === 0) {
        listEl.innerHTML = '<div class="text-center text-gray-500 py-10 glass-panel rounded-lg">Nenhum combatente na mesa. Adicione personagens ou monstros para começar.</div>';
        return;
    }
    
    combatState.combatants.forEach((c, idx) => {
        const isTurn = idx === 0;
        const div = document.createElement('div');
        div.className = `glass-panel p-4 rounded-lg flex flex-col md:flex-row items-center gap-4 border-2 transition-all ${isTurn ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-transparent opacity-80'}`;
        
        div.innerHTML = `
            <div class="flex items-center gap-4 min-w-[200px]">
                <div class="font-bold text-xl text-purple-400 w-8 text-center">${c.ini}</div>
                ${c.avatar ? `<img src="${escapeHTML(c.avatar)}" class="w-12 h-12 rounded-full border border-gold object-cover">` : `<div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gold"><i class="fa-solid ${c.isMonster ? 'fa-ghost' : 'fa-user'}"></i></div>`}
                <div>
                    <div class="font-bold text-white">${escapeHTML(c.name)}</div>
                    <div class="text-xs text-gray-400">${c.isMonster ? 'Monstro' : 'Personagem'}</div>
                </div>
            </div>
            
            <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
                <!-- HP -->
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between text-xs font-bold text-gray-300">
                        <span>HP</span><span>${c.hp} / ${c.maxHp}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button class="btn-icon bg-red-900/50 text-red-300 px-2 py-1 rounded hover:bg-red-900" onclick="adjustCombatStat('${c.cid}', 'hp', -5)">-5</button>
                        <button class="btn-icon bg-red-900/50 text-red-300 px-2 py-1 rounded hover:bg-red-900" onclick="adjustCombatStat('${c.cid}', 'hp', -1)">-1</button>
                        <div class="flex-1 h-3 bg-gray-800 rounded overflow-hidden shadow-inner relative">
                            <div class="h-full bg-red-500 transition-all duration-300" style="width: ${(c.hp/c.maxHp)*100}%"></div>
                        </div>
                        <button class="btn-icon bg-green-900/50 text-green-300 px-2 py-1 rounded hover:bg-green-900" onclick="adjustCombatStat('${c.cid}', 'hp', 1)">+1</button>
                        <button class="btn-icon bg-green-900/50 text-green-300 px-2 py-1 rounded hover:bg-green-900" onclick="adjustCombatStat('${c.cid}', 'hp', 5)">+5</button>
                    </div>
                </div>
                
                <!-- Stamina -->
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between text-xs font-bold text-gray-300">
                        <span>Stamina</span><span>${c.stamina} / ${c.maxSt}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button class="btn-icon bg-blue-900/50 text-blue-300 px-2 py-1 rounded hover:bg-blue-900" onclick="adjustCombatStat('${c.cid}', 'stamina', -5)">-5</button>
                        <button class="btn-icon bg-blue-900/50 text-blue-300 px-2 py-1 rounded hover:bg-blue-900" onclick="adjustCombatStat('${c.cid}', 'stamina', -1)">-1</button>
                        <div class="flex-1 h-3 bg-gray-800 rounded overflow-hidden shadow-inner relative">
                            <div class="h-full bg-blue-400 transition-all duration-300" style="width: ${(c.stamina/c.maxSt)*100}%"></div>
                        </div>
                        <button class="btn-icon bg-blue-900/50 text-blue-300 px-2 py-1 rounded hover:bg-blue-900" onclick="adjustCombatStat('${c.cid}', 'stamina', 1)">+1</button>
                        <button class="btn-icon bg-blue-900/50 text-blue-300 px-2 py-1 rounded hover:bg-blue-900" onclick="adjustCombatStat('${c.cid}', 'stamina', 5)">+5</button>
                    </div>
                </div>
                
                <!-- Lust -->
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between text-xs font-bold text-gray-300">
                        <span>Lust</span><span>${c.lust} / ${c.maxLust}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button class="btn-icon bg-pink-900/50 text-pink-300 px-2 py-1 rounded hover:bg-pink-900" onclick="adjustCombatStat('${c.cid}', 'lust', -5)">-5</button>
                        <button class="btn-icon bg-pink-900/50 text-pink-300 px-2 py-1 rounded hover:bg-pink-900" onclick="adjustCombatStat('${c.cid}', 'lust', -1)">-1</button>
                        <div class="flex-1 h-3 bg-gray-800 rounded overflow-hidden shadow-inner relative">
                            <div class="h-full bg-pink-500 transition-all duration-300" style="width: ${(c.lust/c.maxLust)*100}%"></div>
                        </div>
                        <button class="btn-icon bg-pink-900/50 text-pink-300 px-2 py-1 rounded hover:bg-pink-900" onclick="adjustCombatStat('${c.cid}', 'lust', 1)">+1</button>
                        <button class="btn-icon bg-pink-900/50 text-pink-300 px-2 py-1 rounded hover:bg-pink-900" onclick="adjustCombatStat('${c.cid}', 'lust', 5)">+5</button>
                    </div>
                </div>
            </div>
            <button class="text-gray-500 hover:text-red-400 ml-0 md:ml-4" onclick="removeCombatant('${c.cid}')" title="Remover"><i class="fa-solid fa-xmark"></i></button>
        `;
        listEl.appendChild(div);
    });
    
    // Auto-save on every render
    localStorage.setItem('bd_combat_state', JSON.stringify(combatState));
}

window.removeCombatant = function(cid) {
    combatState.combatants = combatState.combatants.filter(c => c.cid !== cid);
    renderRPG();
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
};

window.openExtendedActionsModal = function() {
    const char = getActiveChar();
    if (!char) return;
    
    document.getElementById('extended-actions-char-name').innerText = char.name;
    const tbody = document.getElementById('extended-actions-table');
    tbody.innerHTML = '';
    
    const sed = char.attr.sed || 0;
    const force = char.attr.for || 0;
    const agi = char.attr.agi || 0;
    const mis = char.attr.mis || 0;
    const con = char.attr.con || 0;
    
    // We can add logic to check for specific perks if needed (e.g. char.perks?.sed?.["Pegada Firme"])
    
    const actions = [
        // FÍSICO (10)
        { cat: "Físico", name: "Soco Simples / Chute Rápido", effect: `1d4 + ${force} HP`, cost: "1 Ação", desc: "Ataque desarmado rápido. Teste de FOR ou AGI vs Defesa." },
        { cat: "Físico", name: "Golpe Pesado", effect: `1d8 + ${force} HP`, cost: "1 Ação + 10 Stamina", desc: "Golpe focado em força bruta. Causa -1 na rolagem de acerto, mas rola dano maior. Teste FOR vs Def." },
        { cat: "Físico", name: "Ataque com Arma Corpo-a-Corpo", effect: `Dano da Arma + ${force} HP`, cost: "1 Ação", desc: "Ataque padrão com qualquer arma de mão. Teste FOR ou AGI vs Def." },
        { cat: "Físico", name: "Agarrão Bruto", effect: `Imobiliza + 1 Dano HP/LUST`, cost: "1 Ação", desc: "Teste Oposto: FOR vs FOR/AGI. Se sucesso, alvo fica imobilizado. Impede movimentos e esquivas." },
        { cat: "Físico", name: "Arremesso de Corpo", effect: `2d4 + ${force} HP`, cost: "1 Ação", desc: "Requer que o alvo esteja Agarrado. Joga o alvo no chão (Derrubado). Teste FOR vs CON." },
        { cat: "Físico", name: "Encontrão / Investida", effect: `1d6 + ${force} HP`, cost: "1 Ação + Movimento", desc: "Corre e bate no alvo. Pode derrubá-lo se a diferença no teste (FOR vs FOR) for maior que 5." },
        { cat: "Físico", name: "Desarmar", effect: `Alvo solta a arma`, cost: "1 Ação + 5 Stamina", desc: "Teste Oposto AGI/FOR vs FOR do alvo. Alvo deixa cair a arma ou item da mão." },
        { cat: "Físico", name: "Golpe Baixo / Chute nas Partes", effect: `1d4 + ${force} HP`, cost: "1 Ação", desc: "Causa fraqueza por 1 turno se acertar (Vantagem nos seus próximos ataques). AGI vs AGI." },
        { cat: "Físico", name: "Ataque Furtivo", effect: `1d10 + ${agi} HP`, cost: "1 Ação", desc: "Exige que o alvo não tenha te visto. Teste de AGI furtiva. Dano alto e bônus de acerto (+2)." },
        { cat: "Físico", name: "Sufocamento", effect: `Perde 10 Stamina/turno`, cost: "Ação de Manter", desc: "Requer alvo Agarrado. Corta o fôlego. Se Stamina zerar, alvo desmaia. Teste FOR vs CON contínuo." },

        // ERPG (10)
        { cat: "ERPG", name: "Toque Sensível / Carícia Furtiva", effect: `1d4 + ${sed} LUST`, cost: "Ação Bônus", desc: "Tocar áreas erógenas por cima da roupa ou de relance. Teste: AGI vs AGI (se alvo resistir)." },
        { cat: "ERPG", name: "Apalpar com Força / Amasso", effect: `1d6 + ${Math.max(sed, force)} LUST`, cost: "1 Ação", desc: "Exige contato corpo-a-corpo. Pode ser feito à força. Teste: FOR vs AGI/FOR." },
        { cat: "ERPG", name: "Beijo Intenso / Francês", effect: `1d6 + ${Math.max(sed, mis)} LUST`, cost: "1 Ação", desc: "Beijo profundo. Alvo precisa estar agarrado ou consentir. Teste Oposto: SED vs VON." },
        { cat: "ERPG", name: "Sexo Oral / Masturbação", effect: `1d8 + ${sed} LUST`, cost: "1 Ação", desc: "Estimulação direta das partes íntimas. Alvo deve estar desprotegido. Teste SED vs VON." },
        { cat: "ERPG", name: "Penetração Frontal", effect: `2d6 + ${sed} LUST`, cost: "20 Stamina (Início)", desc: "Requer alvo submisso, imobilizado ou consentindo. Mantém 1d6+SED passivamente todo turno." },
        { cat: "ERPG", name: "Penetração Forçada", effect: `1d8 + ${Math.max(force, sed)} LUST`, cost: "30 Stamina", desc: "Penetração agressiva. Teste Oposto: FOR vs AGI/FOR a cada turno para manter." },
        { cat: "ERPG", name: "Montaria / Cavalgada", effect: `2d6 + ${agi} LUST`, cost: "15 Stamina", desc: "Usa Agilidade para ditar o ritmo no parceiro deitado/sentado. O alvo quase não tem defesa (VON)." },
        { cat: "ERPG", name: "Fricção Corporal / Esfregação", effect: `1d4 + ${sed} LUST`, cost: "Ação de Movimento", desc: "Roçar o corpo de forma sugestiva ao passar ou lutar. Não gasta sua ação principal de ataque." },
        { cat: "ERPG", name: "Estimulação com Brinquedos/Itens", effect: `1d10 + ${sed} LUST`, cost: "1 Ação", desc: "Uso de chicotes, vibradores ou tentáculos menores (Itens). Teste SED vs VON ou AGI." },
        { cat: "ERPG", name: "Clímax Forçado", effect: `Mind Break (Imobiliza)`, cost: "Full Turn", desc: "Se o alvo chegar ao LUST máximo, você pode gastar 1 turno inteiro para finalizá-lo em orgasmo e derrubá-lo." },

        // DEFESA (10)
        { cat: "Defesa", name: "Esquiva Ágil", effect: `Vantagem na Defesa Fís.`, cost: "Reação", desc: "Quando atacado, rola 1d20+AGI extra contra o ataque inimigo. Ignora dano se superar." },
        { cat: "Defesa", name: "Bloqueio Bruto", effect: `Metade do Dano`, cost: "Reação + 5 Stamina", desc: "Usa os braços ou escudo. Teste FOR. Se falhar, leva dano cheio; se passar, metade." },
        { cat: "Defesa", name: "Resistência de Constituição", effect: `-1d6 Dano HP`, cost: "Reação + 10 Stamina", desc: "Enrijece os músculos ao receber golpe inevitável. Reduz ativamente o dano de HP resultante." },
        { cat: "Defesa", name: "Fuga / Desvencilhar", effect: `Solta do Agarrão`, cost: "1 Ação", desc: "Teste Oposto: AGI/FOR vs FOR do inimigo que te segura. Se sucesso, você fica livre." },
        { cat: "Defesa", name: "Recuo Rápido", effect: `Ganha 3m distância`, cost: "Reação a Fim de Turno", desc: "Pula para trás após ser atacado (independente de acertarem ou não)." },
        { cat: "Defesa", name: "Aparar (Parry)", effect: `Anula + Contra-Ataque`, cost: "Reação + 15 Stamina", desc: "Exige arma. Teste AGI vs Acerto inimigo. Se você vencer por +5 de dif., ataca de volta de graça." },
        { cat: "Defesa", name: "Blindagem Mental", effect: `Vant. contra SED/Mística`, cost: "Reação + 10 Stamina", desc: "Foca a mente. Rola 2d20 e pega o melhor para resistir à provocação ou controle." },
        { cat: "Defesa", name: "Morder os Lábios (Resistir LUST)", effect: `-1d4 LUST recebido`, cost: "Passivo (Quando sofre LUST)", desc: "Teste de CON ou VON (Dif 15). Se passar, reduz a excitação recebida pela dor." },
        { cat: "Defesa", name: "Proteger Aliado", effect: `Recebe o ataque por ele`, cost: "Reação + Movimento", desc: "Você entra na frente de um aliado até 3m de distância e sofre todo o dano/efeito no lugar dele." },
        { cat: "Defesa", name: "Postura Defensiva", effect: `+2 Defesa Global`, cost: "1 Ação", desc: "Você não ataca neste turno, mas inimigos têm Desvantagem para te acertar corpo-a-corpo." },

        // SUPORTE / OUTROS (10)
        { cat: "Suporte", name: "Provocação Verbal", effect: `1d4 + ${sed} LUST`, cost: "Ação Bônus", desc: "Sussurros, gemidos ou insultos eróticos. Teste: SED vs VON (até 5m)." },
        { cat: "Suporte", name: "Ajudar Aliado", effect: `Vantagem para Aliado`, cost: "1 Ação", desc: "Prejudica a defesa de um inimigo para que um aliado tenha Vantagem no próximo ataque." },
        { cat: "Suporte", name: "Usar Poção/Item Rápido", effect: `Varia do Item`, cost: "Ação Bônus", desc: "Tomar uma poção ou passar um item para um aliado próximo." },
        { cat: "Suporte", name: "Amedrontar (Intimidação)", effect: `Alvo com Desvantagem`, cost: "1 Ação", desc: "Grito ou postura ameaçadora. Teste FOR vs VON. Inimigo atacará com debuff." },
        { cat: "Suporte", name: "Inspecionar Ponto Fraco", effect: `Descobre Fraquezas`, cost: "1 Ação", desc: "Teste de Misticismo ou Vontade. Mestre revela atributos ou pontos fracos do monstro." },
        { cat: "Suporte", name: "Inspirar", effect: `+1d4 no Teste do Aliado`, cost: "Ação Bônus + 10 Stamina", desc: "Palavras de coragem (ou gemidos encorajadores). Aliado pode somar 1d4 num teste neste turno." },
        { cat: "Suporte", name: "Concentração Mística", effect: `Recupera 10 Stamina`, cost: "1 Ação", desc: "Foca a mente e respira, ignorando dor leve e se recuperando. Requer Teste de VON." },
        { cat: "Suporte", name: "Imobilizar de Forma Erótica", effect: `Ambos Imóveis (LUST em ambos)`, cost: "1 Ação", desc: "Amarra ou prende o alvo de um jeito estimulante. Alvo sofre penalidade na Defesa e recebe LUST passivo." },
        { cat: "Suporte", name: "Seduzir (Ação Longa)", effect: `Muda postura inimiga`, cost: "Full Turn", desc: "Para de atacar e tenta encantar um NPC ou Monstro hostil. Requer série de Testes de SED." },
        { cat: "Suporte", name: "Fingir Desmaio / Rendição", effect: `Inimigos te ignoram`, cost: "Reação / Ação Bônus", desc: "Deita-se e parece inofensivo. Inimigos que não são muito inteligentes focarão em outros alvos." }
    ];
    
    actions.forEach(act => {
        let catColor = act.cat === 'Físico' ? 'text-red-400' : act.cat === 'ERPG' ? 'text-pink-400' : act.cat === 'Defesa' ? 'text-blue-400' : 'text-green-400';
        tbody.innerHTML += `
            <tr class="hover:bg-gold/10 transition-colors border-b border-gold/5">
                <td class="py-3 pr-2 align-top">
                    <div class="font-bold text-gray-200">${act.name}</div>
                    <div class="text-[10px] ${catColor} uppercase mt-1 tracking-wider">${act.cat}</div>
                </td>
                <td class="py-3 pr-2 text-purple-300 font-bold align-top">${act.effect}</td>
                <td class="py-3 pr-2 text-gray-400 text-xs align-top">${act.cost}</td>
                <td class="py-3 text-gray-400 text-xs align-top leading-relaxed">${act.desc}</td>
            </tr>
        `;
    });
    
    document.getElementById('modal-extended-actions').showModal();
};

// INIT
initPerksUI();
loadData();

// --- SISTEMA DE DANO DO MESTRE ---

window.updateMasterDamageUI = function() {
    // 1. Custom input visibility
    const aSelect = document.getElementById('inp-dmg-attack');
    const c = document.getElementById('inp-dmg-custom');
    if(aSelect.value.includes('+') || aSelect.value.includes('Arma') || aSelect.value === 'custom') {
        c.classList.remove('hidden');
        c.placeholder = aSelect.value === 'custom' ? 'Digite o Dano (Ex: 10 ou 2d6)' : 'Apenas o valor puro do dado (Ex: 6)';
    } else {
        c.classList.add('hidden');
    }
    
};

document.getElementById('btn-master-damage').addEventListener('click', () => {
    const tSelect = document.getElementById('inp-dmg-target');
    const aSelectAttr = document.getElementById('inp-dmg-attacker');
    tSelect.innerHTML = '';
    aSelectAttr.innerHTML = '<option value="">Nenhum / Ambiente</option>';
    
    combatState.combatants.forEach(c => {
        const optT = document.createElement('option');
        optT.value = c.cid;
        optT.innerText = c.name + (c.isMonster ? ' (Monstro)' : ' (Personagem)');
        tSelect.appendChild(optT);
        
        const optA = document.createElement('option');
        optA.value = c.cid;
        optA.innerText = c.name + (c.isMonster ? ' (Monstro)' : ' (Personagem)');
        aSelectAttr.appendChild(optA);
    });
    
    // Auto-select first target if available
    if(combatState.combatants.length > 0) tSelect.value = combatState.combatants[0].cid;
    
    // Removed wrapper-dmg-zone references
    const aSelect = document.getElementById('inp-dmg-attack');
    aSelect.innerHTML = `
        <optgroup label="Genéricos (Cálculo Automático)">
            <option value="1d4">Ataque Leve / Fricção (1d4)</option>
            <option value="1d6">Ataque Médio / Magia (1d6)</option>
            <option value="1d8">Ataque Pesado (1d8)</option>
            <option value="1d10">Magia Forte (1d10)</option>
            <option value="2d6">Golpe Brutal (2d6)</option>
        </optgroup>
        <optgroup label="Ações Físicas (Mestre joga os dados e insere)">
            <option value="1d4 + FOR">Soco Simples / Chute Rápido (1d4 + FOR)</option>
            <option value="1d8 + FOR">Golpe Pesado (1d8 + FOR)</option>
            <option value="Dano da Arma + FOR">Arma Corpo-a-Corpo (Arma + FOR)</option>
            <option value="Dano da Arma + AGI">Arma à Distância / Arco (Arma + AGI)</option>
            <option value="2d4 + FOR">Arremesso de Corpo (2d4 + FOR)</option>
            <option value="1d6 + FOR">Encontrão / Investida (1d6 + FOR)</option>
            <option value="1d4 + FOR">Golpe Baixo (1d4 + FOR)</option>
            <option value="1d10 + AGI">Ataque Furtivo / Adaga (1d10 + AGI)</option>
        </optgroup>
        <optgroup label="Ataques Mágicos (Mestre joga os dados e insere)">
            <option value="1d6 + MIS">Raio Mágico Básico (1d6 + MIS)</option>
            <option value="2d6 + MIS">Bola de Fogo / Explosão (2d6 + MIS)</option>
            <option value="1d8 + MIS">Magia Guiada (1d8 + MIS)</option>
            <option value="1d10 + MIS">Magia Pesada / Ritual (1d10 + MIS)</option>
            <option value="1d4 + MIS">Ataque Mágico Furtivo (1d4 + MIS)</option>
        </optgroup>
        <optgroup label="Ações ERPG (Mestre joga os dados e insere)">
            <option value="1d4 + SED">Toque Sensível (1d4 + SED)</option>
            <option value="1d6 + MAX(SED, FOR)">Apalpar com Força (1d6 + SED/FOR)</option>
            <option value="1d6 + MAX(SED, MIS)">Beijo Intenso (1d6 + SED/MIS)</option>
            <option value="1d8 + SED">Sexo Oral / Masturbação (1d8 + SED)</option>
            <option value="2d6 + SED">Penetração Frontal (2d6 + SED)</option>
            <option value="1d8 + MAX(FOR, SED)">Penetração Forçada (1d8 + FOR/SED)</option>
            <option value="2d6 + AGI">Montaria / Cavalgada (2d6 + AGI)</option>
            <option value="1d10 + SED">Brinquedos/Itens (1d10 + SED)</option>
            <option value="1d4 + SED">Provocação Verbal (1d4 + SED)</option>
        </optgroup>
        <optgroup label="Personalizado">
            <option value="custom" selected>Ataque Livre / Customizado</option>
        </optgroup>
    `;
    
    document.getElementById('inp-dmg-custom').classList.remove('hidden');
    document.getElementById('inp-dmg-custom').placeholder = "Digite o Dano (Ex: 10 ou 2d6)";
    document.getElementById('inp-dmg-custom').value = '';
    
    updateMasterDamageUI();
    document.getElementById('modal-apply-damage').showModal();
});

window.getAttackTags = function(attackName) {
    let tags = [];
    if(!attackName) return tags;
    let n = attackName.toLowerCase();
    
    if (n.includes("soco") || n.includes("chute") || n.includes("fricção") || n.includes("arma") || n.includes("pesado") || n.includes("brutal")) tags.push("Punhos / Artes Marciais", "Armas Colossais / Machado e Montante", "Pés/Pernas", "Braços");
    if (n.includes("arremesso") || n.includes("encontrão")) tags.push("Braços", "Pegada/Mãos");
    if (n.includes("furtivo") || n.includes("adaga")) tags.push("Mãos/Dedos");
    
    if (n.includes("raio") || n.includes("magia") || n.includes("ritual")) tags.push("Bruxaria / Maldições", "Artes Proibidas");
    if (n.includes("fogo") || n.includes("explosão")) tags.push("Pirotecnia", "Bruxaria / Maldições");
    
    if (n.includes("toque") || n.includes("apalpar") || n.includes("masturbação")) tags.push("Mãos/Dedos", "Pegada/Mãos");
    if (n.includes("beijo") || n.includes("oral") || n.includes("verbal")) tags.push("Lábios/Fala", "Fluidos Excitantes");
    if (n.includes("penetração") || n.includes("cavalgada") || n.includes("montaria") || n.includes("fricção")) tags.push("Dotação / Membro", "Quadril/Glúteos");
    if (n.includes("brinquedos") || n.includes("amarras")) tags.push("Bondage / Amarras", "Mãos/Dedos");
    
    return tags;
};

window.parsePerkBuffs = function(char, dmgType, isAttacker, attackTags = []) {
    let buff = { flat: 0, pct: 0, diceCount: 0, diceFaces: 0, notes: [] };
    if(!char || !char.perks) return buff;

    const parseText = (text, perkName) => {
        if (!text) return;
        
        let applicable = false;
        let isLust = text.toLowerCase().includes('lust');
        let isMag = text.toLowerCase().includes('mágic') || text.toLowerCase().includes('magic');
        let isDef = text.toLowerCase().includes('defesa') || text.toLowerCase().includes('reduz') || text.toLowerCase().includes('resist');
        
        if (isAttacker && isDef) return; // Attackers don't get defense buffs on attack
        if (!isAttacker && text.toLowerCase().includes('dano') && !isDef) return; // Defenders don't get attack buffs

        if (isLust && dmgType !== 'LUST') return;
        if (isMag && dmgType !== 'MAG') return;
        
        if (isAttacker) {
            // Apply strict tag validation for Attackers so we don't apply boob damage on punches.
            if (attackTags.length > 0 && !attackTags.includes(perkName)) {
                // Passives like Presence or Pheromones are always active.
                if (!perkName.includes('Feromônios') && !perkName.includes('Presença')) return;
            }

            let mPct = text.match(/Dano.*?(\+|-)\s*(\d+)%/i);
            if (mPct) { buff.pct += parseInt(mPct[1] + mPct[2]); buff.notes.push(`${perkName} (${mPct[1]}${mPct[2]}%)`); applicable = true; }
            
            let mDice = text.match(/Dano.*?(\+|-)\s*(\d+)d(\d+)/i);
            if (mDice) { buff.diceCount += parseInt(mDice[2]); buff.diceFaces += parseInt(mDice[3]); buff.notes.push(`${perkName} (${mDice[1]}${mDice[2]}d${mDice[3]})`); applicable = true; }
            else {
                let mFlat = text.match(/Dano.*?(\+|-)\s*(\d+)(?!\w|d|%)/i);
                if (mFlat) { buff.flat += parseInt(mFlat[1] + mFlat[2]); buff.notes.push(`${perkName} (${mFlat[1]}${mFlat[2]})`); applicable = true; }
            }
        } else {
            let mPct1 = text.match(/Reduz.*?(\+|-)?\s*(\d+)%/i) || text.match(/Resist.*?(\+|-)?\s*(\d+)%/i);
            let mPct2 = text.match(/Dano.*?-\s*(\d+)%/i);
            
            if (mPct1) { buff.pct -= parseInt(mPct1[2] || 0); buff.notes.push(`${perkName} (-${mPct1[2] || 0}% Dano)`); applicable = true; }
            else if (mPct2) { buff.pct -= parseInt(mPct2[1] || 0); buff.notes.push(`${perkName} (-${mPct2[1] || 0}% Dano)`); applicable = true; }
            
            let mFlat1 = text.match(/Defesa.*?(\+|-)\s*(\d+)/i);
            let mFlat2 = text.match(/Dano.*?-\s*(\d+)(?!\w|d|%)/i);
            
            if (mFlat1) { buff.flat += parseInt((mFlat1[1] || '+') + (mFlat1[2] || 0)); buff.notes.push(`${perkName} (Defesa ${mFlat1[1] || '+'}${mFlat1[2] || 0})`); applicable = true; }
            else if (mFlat2) { buff.flat += parseInt(mFlat2[1] || 0); buff.notes.push(`${perkName} (Defesa +${mFlat2[1] || 0})`); applicable = true; }
        }
    };

    Object.keys(char.perks).forEach(attr => {
        if (!PERKS_DB[attr]) return;
        Object.keys(char.perks[attr]).forEach(pName => {
            let lvl = char.perks[attr][pName];
            if (lvl > 0) {
                const perkDef = PERKS_DB[attr].perks[pName];
                if (!perkDef) return; 
                
                const pText = perkDef[lvl - 1];
                if (!pText) return;
                
                parseText(pText, pName);
            }
        });
    });
    
    return buff;
};

window.rollDiceExpr = function(expr) {
    if(!expr || typeof expr !== 'string') return 0;
    
    // Replace attributes like MAX(SED, FOR) with max values
    expr = expr.replace(/MAX\(([^,]+),\s*([^)]+)\)/gi, (match, p1, p2) => {
        let v1 = parseInt(p1) || 0;
        let v2 = parseInt(p2) || 0;
        return Math.max(v1, v2).toString();
    });
    
    let parts = expr.toLowerCase().replace(/-/g, '+-').split('+').map(s => s.trim()).filter(s => s);
    let total = 0;
    
    for(let p of parts) {
        const match = p.match(/^(-?)(\d+)d(\d+)$/);
        if(match) {
            let sign = match[1] === '-' ? -1 : 1;
            let count = parseInt(match[2]);
            let faces = parseInt(match[3]);
            let subtotal = 0;
            for(let i=0; i<count; i++) subtotal += Math.floor(Math.random() * faces) + 1;
            total += (subtotal * sign);
        } else {
            let val = parseInt(p);
            if(!isNaN(val)) total += val;
        }
    }
    return total;
};

document.getElementById('btn-dmg-confirm').addEventListener('click', () => {
    try {
        const targetCid = document.getElementById('inp-dmg-target').value;
        const target = combatState.combatants.find(c => c.cid === targetCid);
        if(!target) {
            alert("Alvo não encontrado!");
            return;
        }

        let baseAttackStr = document.getElementById('inp-dmg-attack').value;
        let expr = baseAttackStr;
        const customInp = document.getElementById('inp-dmg-custom');
        
        if(!customInp.classList.contains('hidden')) {
            let typedVal = customInp.value.trim();
            if(typedVal !== '') {
                if (baseAttackStr === 'custom') {
                    expr = typedVal;
                } else {
                    let plusIdx = baseAttackStr.indexOf('+');
                    if (plusIdx !== -1) {
                        expr = typedVal + ' ' + baseAttackStr.substring(plusIdx);
                    } else {
                        expr = typedVal;
                    }
                }
            } else {
                alert("Por favor, digite o dano final rolado no campo customizado!");
                return;
            }
        }

        const attackerCid = document.getElementById('inp-dmg-attacker').value;
        const attacker = combatState.combatants.find(c => c.cid === attackerCid);
        let attackerChar = null;

        if(attacker && !attacker.isMonster) {
            attackerChar = characters.find(c => c.id === attacker.refId);
            if(attackerChar) {
                const a = attackerChar.attr || {};
                expr = expr.replace(/FOR/gi, a.for || 0)
                           .replace(/AGI/gi, a.agi || 0)
                           .replace(/SED/gi, a.sed || 0)
                           .replace(/MIS/gi, a.mis || 0)
                           .replace(/CON/gi, a.con || 0)
                           .replace(/VIG/gi, a.vig || 0)
                           .replace(/VON/gi, a.von || 0);

                expr = expr.replace(/MAX\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (m, p1, p2) => Math.max(parseInt(p1), parseInt(p2)));
                expr = expr.replace(/MIN\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (m, p1, p2) => Math.min(parseInt(p1), parseInt(p2)));
                expr = expr.replace(/(\d+)\s*\/\s*(\d+)/g, (m, p1, p2) => Math.max(parseInt(p1), parseInt(p2)));
            }
        }

        const dmgType = document.getElementById('inp-dmg-type').value;
        const cond = document.getElementById('inp-dmg-cond').value;
        const mod = parseInt(document.getElementById('inp-dmg-mod').value) || 0;

        let r1 = rollDiceExpr(expr);
        let r2 = rollDiceExpr(expr);
        let baseDano = r1;

        if(cond === 'vantagem') baseDano = Math.max(r1, r2);
        else if(cond === 'desvantagem') baseDano = Math.min(r1, r2);

        // --- AUTOMATED PERKS SYSTEM ---
        const attackSelect = document.getElementById('inp-dmg-attack'); 
        const attackName = attackSelect.options[attackSelect.selectedIndex].text; 
        const attackTags = getAttackTags(attackName);
        let atkBuffs = parsePerkBuffs(attackerChar, dmgType, true, attackTags);

        let defChar = target.isMonster ? null : characters.find(c => c.id === target.refId);
        let defBuffs = parsePerkBuffs(defChar, dmgType, false, []);

        // Apply Attacker Buffs
        baseDano += atkBuffs.flat;
        let extraDiceTotal = 0;
        for(let i=0; i<atkBuffs.diceCount; i++) extraDiceTotal += Math.floor(Math.random() * atkBuffs.diceFaces) + 1;
        baseDano += extraDiceTotal;
        baseDano = Math.floor(baseDano * (1 + (atkBuffs.pct / 100)));

        let logNotes = [];
        if(atkBuffs.notes.length > 0) logNotes.push(`Buffs de Ataque: ${atkBuffs.notes.join(', ')}`);
        if(defBuffs.notes.length > 0) logNotes.push(`Defesas Especiais: ${defBuffs.notes.join(', ')}`);

        let defesaTotal = defBuffs.flat;
        let raceTpl = "";
        let classTpl = "";

        if(!target.isMonster) {
            if(defChar) {
                const pMods = getCharModifiers(defChar);
                if(dmgType === 'HP' || dmgType === 'MAG') defesaTotal += Math.floor(pMods.con * 1);
                if(dmgType === 'LUST') defesaTotal += Math.floor(pMods.von * 1);

                if (defBuffs.pct !== 0) {
                    let block = Math.floor(baseDano * (Math.abs(defBuffs.pct) / 100));
                    if (defBuffs.pct < 0) {
                        defesaTotal += block;
                        logNotes.push(`Vantagens Defensivas (${Math.abs(defBuffs.pct)}%) bloquearam ${block}`);
                    } else {
                        defesaTotal -= block;
                        logNotes.push(`Vulnerabilidade (${defBuffs.pct}%) tomou +${block}`);
                    }
                }

                raceTpl = defChar.race || "";
                classTpl = defChar.class || "";
            }
        } else {
            const mObj = monsters.find(m => m.id === target.refId);
            if(mObj) {
                if(dmgType === 'HP' || dmgType === 'MAG' || ['FOGO', 'GELO', 'ELETRICO', 'VENENO'].includes(dmgType)) defesaTotal += Math.floor((mObj.con || 5) * 1);
                if(dmgType === 'LUST') defesaTotal = Math.floor((mObj.von || 5) * 1);

                if(mObj.modifiers && mObj.modifiers[dmgType]) {
                    const modData = mObj.modifiers[dmgType];
                    if(modData.def) {
                        defesaTotal += modData.def;
                        logNotes.push(`Defesa Extra: ${modData.def > 0 ? '+' : ''}${modData.def}`);
                    }
                    if(modData.red > 0) {
                        const percent = modData.red / 100;
                        const dmgReduced = Math.floor((baseDano + mod) * percent);
                        defesaTotal += dmgReduced;
                        logNotes.push(`Redução (-${modData.red}% Dano)`);
                    }
                    if(modData.vuln > 0) {
                        const percent = modData.vuln / 100;
                        const dmgExtra = Math.floor((baseDano + mod) * percent);
                        defesaTotal -= dmgExtra;
                        logNotes.push(`Vulnerabilidade (+${modData.vuln}% Dano)`);
                    }
                }
            }
        }

        if(raceTpl === 'Humano' && dmgType === 'LUST') {
            defesaTotal -= 3;
            if(defesaTotal < 0) defesaTotal = 0;
            logNotes.push("[Defesa do Alvo] Carne Ordinária (Humano: -3 Def. Lust)");
        }

        if (isNaN(defesaTotal) || defesaTotal === null) defesaTotal = 0;
        
        let danoTotal = baseDano + mod - defesaTotal;
        if (isNaN(danoTotal) || danoTotal === null) danoTotal = 0;
        if(danoTotal < 0) danoTotal = 0;

        if(classTpl === 'Artífice' && dmgType === 'MAG') {
            danoTotal = Math.floor(danoTotal * 1.10);
            logNotes.push("[Fraqueza do Alvo] Descrente (Artífice: +10% Dano Recebido Mágico)");
        }

        if(dmgType === 'LUST') {
            adjustCombatStat(targetCid, 'lust', danoTotal);
            
            // Auto-conversão de Lust para Magia
            const targetChar = !target.isMonster ? characters.find(c => c.id === target.refId) : null;
            if(targetChar && targetChar.autoConvertLust && danoTotal >= 2) {
                const energyGain = Math.floor(danoTotal / 2);
                targetChar.energy = (targetChar.energy || 0) + energyGain;
                const tStats = getClassStats(targetChar.class);
                if(targetChar.energy > tStats.en) targetChar.energy = tStats.en;
                saveToDB('characters', targetChar, characters, 'bd_characters');
                logNotes.push(`Conversão Automática: +${energyGain} Magia gerada pelo golpe.`);
            }
        } else {
            adjustCombatStat(targetCid, 'hp', -danoTotal);
        }

        let attackerStaminaCost = Math.floor(Math.random() * 7) + 2;
        let targetStaminaCost = Math.floor(Math.random() * 7) + 2;

        if (attackerCid) adjustCombatStat(attackerCid, 'stamina', -attackerStaminaCost);
        adjustCombatStat(targetCid, 'stamina', -targetStaminaCost);

        const logMsg = `Mestre aplicou ${danoTotal} de Dano [${dmgType}] em ${target.name}. (Dano Bruto: ${baseDano+mod} [Rolado: ${baseDano}, Mod: ${mod}] - Defesa: ${defesaTotal}). Notas: ${logNotes.join(', ')} | Stamina Gasta: Atacante -${attackerStaminaCost}, Alvo -${targetStaminaCost}`;

        if(!target.isMonster) {
            const pChar = characters.find(c => c.id === target.refId);
            if(pChar) {
                addLog(pChar, logMsg, 'info');
                saveToDB('characters', pChar, characters, 'bd_characters');
            }
        }

        document.getElementById('modal-apply-damage').close();
        
        // Force UI refresh just in case
        renderRPG();

        alert(`Resultado:\nDano Base Rolado: ${baseDano}\nModificador: ${mod}\nDefesa do Alvo: ${defesaTotal}\n\nDano Final Recebido: ${danoTotal} ${danoTotal === 0 ? '(NENHUM DANO APLICADO!)' : ''}\n\nNotas do Sistema: ${logNotes.join(', ') || 'Nenhuma'}`);

    } catch(err) {
        alert("CRITICAL ERROR: " + err.message + "\n" + err.stack);
        console.error(err);
    }
});
