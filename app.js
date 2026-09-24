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
const ARMOR_DB = {
    none: { name: "Sem Armadura", desc: "Trajes comuns.", mods: { df: 0, dlust: 0, agi: 0, sed: 0, mis: 0 } },
    heavy: { name: "Armadura Pesada", desc: "Alta DF, +DLUST, -AGI, -SED.", mods: { df: 10, dlust: 5, agi: -2, sed: -2, mis: 0 } },
    light: { name: "Armadura Leve", desc: "Moderada DF, +AGI.", mods: { df: 5, dlust: 2, agi: 2, sed: 0, mis: 0 } },
    seduction: { name: "Sedução", desc: "Alta SED/MIS, penalidade Defesas.", mods: { df: -5, dlust: -5, agi: 0, sed: 5, mis: 2 } },
    mixed_hl: { name: "Híbrida: Pesada+Leve", desc: "Balanceado", mods: { df: 8, dlust: 4, agi: 0, sed: -1, mis: 0 } },
    mixed_hs: { name: "Híbrida: Pesada+Sedução", desc: "Mistura", mods: { df: 2, dlust: 0, agi: -1, sed: 1, mis: 1 } },
    mixed_ls: { name: "Híbrida: Leve+Sedução", desc: "Ágil", mods: { df: 0, dlust: -1, agi: 1, sed: 2, mis: 1 } }
};

function getArmorBaseStats(type) {
    return ARMOR_DB[type] || ARMOR_DB.none;
}

const CONDITIONS_DB = {
    "sangrando": { name: "Sangrando", desc: "Perde 5 HP por turno (Narrativo). -2 DF.", mods: { df: -2 } },
    "fragil_fisico": { name: "Frágil (Físico)", desc: "Max HP reduzido em 20%.", mods: { hp_mult: 0.8 }, classOnly: "Sacerdote" },
    "fragil_sexual": { name: "Frágil (Sexual)", desc: "Limiar de Êxtase travado em 20.", mods: { ecstasy_set: 20 }, classOnly: "Sacerdote" },
    "exausto": { name: "Exausto", desc: "Max Stamina reduzida em 50%.", mods: { st_mult: 0.5 } },
    "lento": { name: "Lento", desc: "Esquiva final sofre -5.", mods: { esq: -5 } },
    "enfeiticado": { name: "Enfeitiçado", desc: "Defesa de Lust é zerada.", mods: { dlust_set: 0 } }
};

const PERK_COSTS = [0, 1, 2, 3, 5, 9];
    const PERKS_DB = {
    "sed": {
        "name": "Sedução",
        "icon": "fa-heart",
        "perks": {
            "Atributos Exuberantes (Seios/Físico)": [
                "+1 em testes de persuasão corporal. Contato físico aplica 1 Dano LUST (Sem teste).",
                "O formato do seu corpo distrai: inimigos em 2m têm -1 de Iniciativa.",
                "Agarrões aplicam Vantagem para Sedução e reduzem a Defesa LUST do alvo em -2."
            ],
            "Molejo e Quadris": [
                "Ataques sofridos pelas costas rolam com Desvantagem para o atacante.",
                "Montaria Sensível: Ganha Vantagem para testes de agarrar/imobilizar usando as pernas.",
                "Ação - Rebolar (Área 5m): Inimigos fazem teste (VON vs SED) ou perdem a Ação Principal."
            ],
            "Feromônios Viciantes": [
                "Inimigos a 2m sofrem 1 Dano LUST passivo no início do turno deles.",
                "Penetração/Ação Oral ganha +1d4 de Dano LUST e cura você em 1d4 de Stamina.",
                "Se o alvo gozar/sofrer Mind Break a 5m de você, recupere 3d6 de HP."
            ]
        }
    },
    "for": {
        "name": "Força",
        "icon": "fa-dumbbell",
        "perks": {
            "Pegada Firme": [
                "Agarrões causam 1d4 de Dano LUST extra por turno em áreas sensíveis.",
                "Pode usar Ação Menor para forçar o alvo imobilizado a receber toque (+SED em Dano LUST).",
                "Aumenta limite de peso e permite carregar/suspender parceiros sem penalidade."
            ],
            "Resistência Bruta": [
                "Ao sofrer Dano Físico, você pode gastar 5 Stamina para reduzir o dano em 1d4.",
                "Resistir a imobilizações ou posições indesejadas rola com Vantagem.",
                "Dano Corpo-a-Corpo (Físico) ganha +FOR no dano."
            ],
            "Submissão Forçada": [
                "Quando imobiliza alguém, o alvo perde 2 de Defesa LUST instantaneamente.",
                "Ganha Vantagem em testes de FOR vs AGI para iniciar atos sexuais.",
                "Alvos penetrados à força por você perdem -5 de Stamina por turno."
            ]
        }
    },
    "agi": {
        "name": "Agilidade",
        "icon": "fa-person-running",
        "perks": {
            "Flexibilidade Extrema": [
                "Consegue escapar de amarras e agarrões rolando com Vantagem.",
                "Pode usar posições exóticas: garante +2 de Dano LUST em ações corporais.",
                "Ao esquivar de um ataque, pode gastar Reação para aplicar Toque Sensível no atacante."
            ],
            "Reflexos Eróticos": [
                "Adiciona +AGI na Defesa contra ataques corpo-a-corpo.",
                "Movimentação sexual não gera Ataque de Oportunidade.",
                "Pode usar uma Ação Menor para realizar masturbação/oral rápido num alvo agarrado."
            ],
            "Acrobata Sensual": [
                "Ganha +AGI em testes de Sedução durante danças ou movimentos rítmicos.",
                "Ao sofrer dano LUST, passe num teste de AGI (CD 15) para reduzir o dano pela metade.",
                "Uma vez por combate, troque de lugar com o alvo no meio de um ato."
            ]
        }
    },
    "con": {
        "name": "Constituição",
        "icon": "fa-shield-heart",
        "perks": {
            "Vigor Inesgotável": [
                "Adiciona +10 na Stamina Máxima.",
                "Descansos rápidos curam o dobro de HP e Stamina.",
                "Chegar a 0 Stamina não causa Exaustão imediata (suporta +1 rodada no ápice)."
            ],
            "Corpo Sensível e Resistente": [
                "+1 de Defesa contra Ataques Físicos.",
                "Vantagem contra Venenos, Doenças e Fadiga Exaustiva.",
                "Ao final de atos intensos, ganha um buff temporário de +1 FOR e +1 AGI ao invés de cansaço."
            ],
            "Absorção e Prazer": [
                "Dano físico contundente pode ser resistido com Vantagem usando CON.",
                "Ganha +CON como bônus em testes para resistir ao seu próprio orgasmo precoce.",
                "Converter Dor em Stamina: Dano físico intenso recupera 1d4 de Stamina."
            ]
        }
    },
    "mis": {
        "name": "Misticismo",
        "icon": "fa-wand-magic-sparkles",
        "perks": {
            "Magia Carnal": [
                "Feitiços aplicam +MIS em Dano LUST secundário.",
                "Magias de cura restauram +1d4 HP se aplicadas através de fluidos ou beijo.",
                "Pode conjurar magias usando LUST ao invés de Stamina (1 LUST = 2 Stamina)."
            ],
            "Aura Sensível": [
                "Inimigos a 3m têm Desvantagem para resistir às suas ilusões.",
                "Feitiços de Sedução Mágica ganham +2 na Classe de Dificuldade (CD).",
                "Atacar você corpo-a-corpo rola com Desvantagem se o atacante tiver LUST > 50%."
            ],
            "Laço Místico": [
                "Pode conectar-se a 1 aliado. Vocês compartilham as barras de Stamina.",
                "Danos (HP ou LUST) do aliado podem ser absorvidos por você.",
                "Orgasmos Mágicos: Seu orgasmo cura 2d6 HP para todos os aliados conectados."
            ]
        }
    },
    "von": {
        "name": "Vontade",
        "icon": "fa-brain",
        "perks": {
            "Mente Blindada": [
                "+1 de Defesa Base contra ataques Mágicos e Mentais.",
                "Vantagem em testes para resistir ao status Mind Break.",
                "Qualquer Dano LUST que você sofra é reduzido em 2 pontos."
            ],
            "Masoquismo / Êxtase Curativo": [
                "Ao receber Dano Físico, você acumula metade do dano como Energia Sexual.",
                "Rola com Vantagem contra intimidação, dor ou medo.",
                "Conversão de Dano (Regra): Se receber 10 ou mais de Dano LUST em um só turno, cura 1d8 do seu HP e previne Mind Break."
            ],
            "Controle de Êxtase": [
                "Seu limite Máximo de LUST aumenta em +20.",
                "Ignora penalidades de Confusão por LUST passando num teste (CD 12+VON).",
                "Pode gastar sua Energia Sexual para buffar ataques (cada ponto = +1d6 Dano LUST)."
            ]
        }
    }
};

const CLASS_TEMPLATES = {
    "Sacerdote": {
        class: "Sacerdote",
        attrMods: { mis: 3, von: 2 },
        baseStats: { hp: 90, st: 90, en: 50, lust: 120, ecstasy: 20 },
        conditions: ["fragil_fisico", "fragil_sexual"],
        skillsToCreate: [
            { name: "Mente Consagrada", type: "Passiva", cost: "Passivo", test: "-", effect: "+5 na Defesa de Lust. Sempre que realiza ação de alívio, reduz 10 LUST do aliado mais afetado.", classRestricted: "Sacerdote" },
            { name: "Rito de Expulsão", type: "Mágica", cost: "Cooldown 3", test: "Misticismo vs DF", effect: "Requer fluidos. Aliado: Cura 15+Misticismo. Inimigo: Converte LUST em Energia Sexual (Max 3x Misticismo).", classRestricted: "Sacerdote" }
        ]
    },
    "Curandeiro": {
        class: "Curandeiro",
        attrMods: { mis: 3, sed: 2 },
        baseStats: { hp: 80, st: 90, en: 55, lust: 130, ecstasy: 25 },
        conditions: [],
        skillsToCreate: [
            { name: "Corpo Curativo", type: "Mágica", cost: "Cooldown 3", test: "-", effect: "Cura 1d8 no toque ou 2d8 penetrando.", classRestricted: "Curandeiro" },
            { name: "Confecção de Poções de Cura", type: "Habilidade", cost: "3 min", test: "-", effect: "Requer masturbação/orgasmo. Faz 2 poções pequenas (1d8 HP) ou 1 grande (2d6 HP) de sêmen.", classRestricted: "Curandeiro" },
            { name: "Fraqueza: Canalização Íntima", type: "Passiva", cost: "Passivo", test: "-", effect: "Cura requer contato íntimo ininterrupto. Não pode conjurar feitiços durante a cura. Para cada 2 HP curado, recebe 1 LUST. Inimigos que beberem sêmen curam 2d3 HP.", classRestricted: "Curandeiro" }
        ]
    },
    "Oferenda": {
        class: "Oferenda",
        attrMods: { con: 3, von: 2 },
        baseStats: { hp: 120, st: 75, en: 50, lust: 135, ecstasy: 25 },
        conditions: [],
        skillsToCreate: [
            { name: "Marionete", type: "Passiva", cost: "Passivo", test: "-", effect: "Sempre sob Bondage. Patrono escolhe descanso: Edging, Submissão (obriga Foca em mim!, -10% LUST/VON para a skill), ou Vínculo (Dobro HP Base, Dano sofrido=LUST).", classRestricted: "Oferenda" },
            { name: "Foca em mim!", type: "Ativa", cost: "1 Ação", test: "Vontade CD 14", effect: "Corpo vulnerável torna-se irresistível. Obriga o alvo a focar a Oferenda como objetivo principal.", classRestricted: "Oferenda" },
            { name: "Fraqueza: Corpo e Mente Cativa", type: "Passiva", cost: "Passivo", test: "-", effect: "Amarras alteram conforme o patrono. Impossível livrar-se. Sem aliados no combate, rende-se imediatamente.", classRestricted: "Oferenda" }
        ]
    }
};

// --- STATE ---
let characters = [];
let monsters = [];
let combatState = { round: 1, combatants: [] };
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
        db.collection(collection).doc(id).delete();
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
        updatePerksMath();
        document.getElementById('modal-character').showModal();
    } else if (currentTab === 'monsters') {
        editingMonsterId = null;
        document.getElementById('form-monster').reset();
        document.getElementById('modal-monster').showModal();
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
    
    const obj = {
        id: generateId(),
        name: document.getElementById('inp-g-armor-name').value,
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
    
    const obj = {
        id: generateId(),
        name: document.getElementById('inp-g-skill-name').value,
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
    
    document.querySelectorAll('.inp-skill-slot').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione Habilidade...</option>';
        const seenNames = new Set();
        
        globalSkills.forEach(s => {
            const isOwner = (s.ownerId === targetOwner) || isMaster();
            const matchesClass = !s.classRestricted || classNameVal.includes(s.classRestricted.toLowerCase());
            
            if (isOwner && matchesClass && !seenNames.has(s.name)) {
                seenNames.add(s.name);
                select.innerHTML += `<option value="${s.id}" ${s.id === currentVal ? 'selected' : ''}>${escapeHTML(s.name)}</option>`;
            }
        });
    });
}

function enforceClassConditions() {
    const classNameVal = document.getElementById('inp-class').value.toLowerCase();
    let mandatoryConds = [];
    Object.keys(CLASS_TEMPLATES).forEach(k => {
        if (classNameVal.includes(k.toLowerCase())) {
            mandatoryConds = mandatoryConds.concat(CLASS_TEMPLATES[k].conditions || []);
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

function getClassBonusSum() {
    const className = document.getElementById('inp-class').value.trim();
    const tplKey = Object.keys(CLASS_TEMPLATES).find(k => k.toLowerCase() === className.toLowerCase());
    let sum = 0;
    if (tplKey) {
        const mods = CLASS_TEMPLATES[tplKey].attrMods || {};
        Object.values(mods).forEach(v => sum += v);
    }
    return sum;
}

function updatePointsCounter() {
    const attrs = [
        parseInt(document.getElementById('inp-con').value) || 0,
        parseInt(document.getElementById('inp-for').value) || 0,
        parseInt(document.getElementById('inp-vig').value) || 0,
        parseInt(document.getElementById('inp-agi').value) || 0,
        parseInt(document.getElementById('inp-von').value) || 0,
        parseInt(document.getElementById('inp-sed').value) || 0,
        parseInt(document.getElementById('inp-mis').value) || 0
    ];
    
    let isOver5 = false;
    for (let v of attrs) {
        if (v > 5) isOver5 = true;
    }

    const total = attrs.reduce((a, b) => a + b, 0);
    const limit = 8 + getClassBonusSum();
    
    const counterEl = document.getElementById('points-counter');
    counterEl.innerText = total;
    
    const limitEl = document.getElementById('points-limit-display');
    if (limitEl) limitEl.innerText = limit;

    if(total !== limit || isOver5) counterEl.className = 'text-red-500 font-bold';
    else counterEl.className = 'text-white';
    
    updatePerksMath(); // Refresh perk limits
    return { total, limit, isOver5 };
}

document.querySelectorAll('.inp-attr-group input').forEach(inp => {
    inp.addEventListener('input', updatePointsCounter);
});

document.getElementById('btn-add-skill-slot').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2 items-center';
    div.innerHTML = `
        <select class="input-dark flex-1 inp-skill-slot" onchange="this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"></select>
        <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
        <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    document.getElementById('skills-select-list').appendChild(div);
    updateSkillSelectOptions();
});

const inpTemplate = document.getElementById('inp-template');
if (inpTemplate) {
    inpTemplate.addEventListener('change', async (e) => {
        const tpl = CLASS_TEMPLATES[e.target.value];
        if (tpl) {
            document.getElementById('inp-class').value = tpl.class;
            Object.keys(tpl.attrMods).forEach(attrKey => {
                const el = document.getElementById(`inp-${attrKey}`);
                if (el) el.value = parseInt(el.value || 0) + tpl.attrMods[attrKey];
            });
            
            enforceClassConditions();
            updatePointsCounter();
            
            // Auto-create and attach skills
            for(let sk of tpl.skillsToCreate) {
                let existingSk = globalSkills.find(s => s.name === sk.name && (currentUser ? s.ownerId === currentUser.uid : true));
                if (!existingSk) {
                    existingSk = { id: generateId(), ...sk };
                    await saveToDB('global_skills', existingSk, globalSkills, 'bd_skills');
                }
                
                // Add slot only if not already in list
                let alreadyInList = false;
                document.querySelectorAll('.inp-skill-slot').forEach(select => {
                    if (select.value === existingSk.id) alreadyInList = true;
                });

                if (!alreadyInList) {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2 mb-2 items-center';
                    div.innerHTML = `
                        <select class="input-dark flex-1 inp-skill-slot" onchange="this.nextElementSibling.onclick = () => openViewModal('skill', this.value)"><option value="${existingSk.id}" selected></option></select>
                        <button type="button" class="btn-icon text-blue-400 px-2" onclick="openViewModal('skill', this.previousElementSibling.value)" title="Ver Detalhes"><i class="fa-solid fa-circle-info"></i></button>
                        <button type="button" class="btn-icon text-red-400 px-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
                    `;
                    document.getElementById('skills-select-list').appendChild(div);
                }
            }
            enforceClassConditions(); // To re-render options correctly with newly added skill
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
            return alert(`Você deve distribuir exatamente todos os pontos de atributo! O total deve ser ${pts.limit} (8 Base + Bônus de Classe).`);
        }
        if (pts.isOver5) {
            switchCharTab('base');
            return alert("Nenhum atributo individual pode ser maior que 5!");
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
        return CLASS_TEMPLATES[tplKey].baseStats;
    }
    if (className.toLowerCase().includes('sacerdote')) {
        return { hp: 90, st: 90, en: 50, lust: 120, ecstasy: 20 };
    }
    return { hp: 10, st: 10, en: 35, lust: 100, ecstasy: 25 };
}

function getCharModifiers(char) {
    const armor = getCharArmor(char);
    const baseArmorStats = armor ? getArmorBaseStats(armor.base) : getArmorBaseStats('none');
    
    let mods = { df: 0, dlust: 0, agi: 0, sed: 0, mis: 0, hp_mult: 1, st_mult: 1, esq: 0, dlust_set: null, ecstasy_set: null };
    
    // Sum Armor
    mods.df += (baseArmorStats.mods.df || 0) + (armor?.mods?.df || 0);
    mods.dlust += (baseArmorStats.mods.dlust || 0) + (armor?.mods?.dlust || 0);
    mods.agi += (baseArmorStats.mods.agi || 0) + (armor?.mods?.agi || 0);
    mods.sed += (baseArmorStats.mods.sed || 0) + (armor?.mods?.sed || 0);
    mods.mis += (baseArmorStats.mods.mis || 0) + (armor?.mods?.mis || 0);
    
    // Class Passives
    if (char.class && char.class.toLowerCase().includes('sacerdote')) {
        mods.dlust += 5; // Mente Consagrada
    }
    
    // Apply Conditions
    char.activeConditionIds.forEach(cid => {
        const c = CONDITIONS_DB[cid];
        if (c && c.mods) {
            if (c.mods.df) mods.df += c.mods.df;
            if (c.mods.dlust) mods.dlust += c.mods.dlust;
            if (c.mods.agi) mods.agi += c.mods.agi;
            if (c.mods.esq) mods.esq += c.mods.esq;
            if (c.mods.hp_mult) mods.hp_mult *= c.mods.hp_mult;
            if (c.mods.st_mult) mods.st_mult *= c.mods.st_mult;
            if (c.mods.dlust_set !== undefined) mods.dlust_set = c.mods.dlust_set;
            if (c.mods.ecstasy_set !== undefined) mods.ecstasy_set = c.mods.ecstasy_set;
        }
    });
    
    return mods;
}

function renderDashboard() {
    const char = getActiveChar();
    const dash = document.getElementById('dashboard-container');
    const noChar = document.getElementById('no-char-selected');
    if (!char) { dash.classList.add('hidden'); noChar.classList.remove('hidden'); return; }

    dash.classList.remove('hidden'); noChar.classList.add('hidden');
    document.getElementById('dash-name').innerHTML = escapeHTML(char.name);
    document.getElementById('dash-class').innerHTML = escapeHTML(char.class);
    
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
    
    // Combat Actions Table
    const tBody = document.getElementById('dash-actions-table');
    if (tBody) {
        tBody.innerHTML = '';
        const sed = char.attr.sed || 0;
        const force = char.attr.for || 0;
        const agi = char.attr.agi || 0;
        const mis = char.attr.mis || 0;
    
    const actions = [
        { name: "Ataque Desarmado/Físico", effect: `1d8 + ${force} HP`, cost: "1 Ação" },
        { name: "Penetração Intensa (ERPG)", effect: `1d8 + ${sed} LUST`, cost: "15 Stamina" },
        { name: "Oral / Toques Sensíveis", effect: `1d6 + ${Math.max(sed, agi)} LUST`, cost: "10 Stamina" },
        { name: "Provocação Mística", effect: `1d4 + ${mis} LUST à distância`, cost: "5 Stamina" },
        { name: "Esquiva / Fuga", effect: `Teste de Agilidade + ${agi}`, cost: "Reação ou Movimento" }
    ];
    
    actions.forEach(act => {
        tBody.innerHTML += `
            <tr class="hover:bg-gold/5 transition-colors">
                <td class="py-2 pr-2 font-bold text-gray-300">${act.name}</td>
                <td class="py-2 pr-2 text-purple-400 font-bold">${act.effect}</td>
                <td class="py-2 text-gray-400 text-xs">${act.cost}</td>
            </tr>
        `;
    });
    }
    
    // Skills Grid
    const gridSkills = document.getElementById('dash-skills-grid');
    gridSkills.innerHTML = '';
    const mySkills = (char.equippedSkillIds || []).map(id => globalSkills.find(s => s.id === id)).filter(Boolean);
    
    if (mySkills.length > 0) {
        mySkills.forEach(sk => {
            const card = document.createElement('div');
            card.className = "border border-gold/20 bg-black/30 rounded p-3 text-sm";
            card.innerHTML = `
                <div class="font-bold text-gold mb-1 border-b border-gold/10 pb-1">${escapeHTML(sk.name)}</div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
                    <div><span class="font-bold">Tipo:</span> ${escapeHTML(sk.type)}</div>
                    <div><span class="font-bold">Custo:</span> ${escapeHTML(sk.cost)}</div>
                    <div class="col-span-2"><span class="font-bold">Teste:</span> ${escapeHTML(sk.test)}</div>
                </div>
                <div class="text-gray-300 italic text-xs">${escapeHTML(sk.effect)}</div>
            `;
            gridSkills.appendChild(card);
        });
    } else {
        gridSkills.innerHTML = '<div class="text-sm text-gray-400">Nenhuma habilidade anexada.</div>';
    }

    updateBars(char, mods);
    renderAttributesAndDerivedStats(char, mods);
    
    const canEditChar = canEdit(char);
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = !canEditChar);
    
    // Render Perks
    const dashPerks = document.getElementById('dash-perks');
    dashPerks.innerHTML = '';
    let hasAnyPerk = false;
    if (char.perks) {
        Object.keys(char.perks).forEach(attr => {
            const perksObj = char.perks[attr];
            Object.keys(perksObj).forEach(pName => {
                if (perksObj[pName] > 0) {
                    hasAnyPerk = true;
                    dashPerks.innerHTML += `<div class="bg-black/30 p-2 rounded border-l-2 border-gold/50 mb-1">
                        <div class="flex justify-between items-center"><span class="font-bold text-gray-200">${escapeHTML(pName)}</span><span class="text-xs text-gold">Nv ${perksObj[pName]}</span></div>
                        <div class="text-[10px] text-gray-400 mt-1">${PERKS_DB[attr].perks[pName] ? escapeHTML(PERKS_DB[attr].perks[pName][perksObj[pName]-1]) : 'Vantagem órfã.'}</div>
                    </div>`;
                }
            });
        });
    }
    if (!hasAnyPerk) dashPerks.innerHTML = '<div class="text-gray-500 text-sm">Nenhuma vantagem adquirida.</div>';

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
                <select class="input-dark flex-1 inp-skill-slot"><option value="${sId}" selected></option></select>
                <button type="button" class="btn-icon text-red-400" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
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
    const totalEsq = (char.attr.agi * 3) + mods.agi + mods.esq;

    document.getElementById('dash-df').innerText = totalDF;
    document.getElementById('dash-dl').innerText = totalDL;
    document.getElementById('dash-esq').innerText = totalEsq;

    const mkRow = (name, base, mod, icon) => {
        let finalVal = base + (mod || 0);
        let modStr = mod > 0 ? `<span class="text-green-400 text-xs">(+${mod})</span>` : (mod < 0 ? `<span class="text-red-400 text-xs">(${mod})</span>` : '');
        return `<div class="flex justify-between items-center py-1 border-b border-white/5">
            <span class="text-gray-400"><i class="fa-solid fa-${icon} w-5"></i> ${name}</span>
            <span class="font-semibold text-lg text-white">${finalVal} ${modStr}</span>
        </div>`;
    };

    document.getElementById('dash-attributes').innerHTML = `
        ${mkRow('Constituição', char.attr.con, 0, 'shield-heart')}
        ${mkRow('Força', char.attr.for, 0, 'dumbbell')}
        ${mkRow('Vigor', char.attr.vig, 0, 'heart-pulse')}
        ${mkRow('Agilidade', char.attr.agi, mods.agi, 'person-running')}
        ${mkRow('Vontade', char.attr.von, 0, 'brain')}
        ${mkRow('Sedução', char.attr.sed, mods.sed, 'face-kiss-wink-heart')}
        ${mkRow('Misticismo', char.attr.mis, mods.mis, 'wand-magic-sparkles')}
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
        const maxPV = Math.max(0, attrs[attrKey] * 3);
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
                        
                        if(lvl === 3) {
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
    if(lvl > 3) lvl = 3;
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
document.getElementById('form-monster').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isMaster()) return alert("Sem permissão. Apenas o Mestre pode criar monstros.");
    
    const newMonster = {
        id: editingMonsterId || generateId(),
        ownerId: currentUser ? currentUser.uid : null,
        name: document.getElementById('inp-monster-name').value,
        avatar: document.getElementById('inp-monster-avatar').value,
        hp: parseInt(document.getElementById('inp-monster-hp').value) || 50,
        stamina: parseInt(document.getElementById('inp-monster-st').value) || 50,
        lust: parseInt(document.getElementById('inp-monster-lust').value) || 100,
        ini: parseInt(document.getElementById('inp-monster-ini').value) || 10,
        desc: document.getElementById('inp-monster-desc').value,
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
    document.getElementById('inp-monster-desc').value = m.desc || '';
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
        opt.value = 'char_' + c.id;
        opt.innerText = c.name;
        optGroupChars.appendChild(opt);
    });
    
    const optGroupMonsters = document.createElement('optgroup');
    optGroupMonsters.label = 'Monstros';
    monsters.forEach(m => {
        const opt = document.createElement('option');
        opt.value = 'monster_' + m.id;
        opt.innerText = m.name;
        optGroupMonsters.appendChild(opt);
    });
    
    sel.appendChild(optGroupChars);
    sel.appendChild(optGroupMonsters);
    
    document.getElementById('inp-combat-ini').value = '';
    document.getElementById('modal-combat-add').showModal();
};

document.getElementById('btn-combat-confirm').onclick = () => {
    const val = document.getElementById('inp-combat-select').value;
    if(!val) return;
    
    const type = val.split('_')[0];
    const id = val.split('_')[1];
    
    let source = null;
    if (type === 'char') source = characters.find(c => c.id === id);
    if (type === 'monster') source = monsters.find(m => m.id === id);
    
    if(!source) return;
    
    const iniVal = document.getElementById('inp-combat-ini').value;
    let roll = parseInt(iniVal);
    if (isNaN(roll)) {
    const isMon = type === 'monster';
    const baseIni = isMon ? (source.ini || 10) : (source.attr?.agi || 0);
    roll = baseIni + Math.floor(Math.random() * 20) + 1;
    }
    
    const cStats = isMon ? null : getClassStats(source.class);
    const mods = isMon ? null : getCharModifiers(source);
    
    let mhp = isMon ? source.hp : Math.max(1, Math.floor((cStats.hp + (source.attr.con * 10)) * mods.hp_mult));
    let mst = isMon ? source.stamina : Math.max(1, Math.floor((cStats.st + (source.attr.vig * 5)) * mods.st_mult));
    let mlu = isMon ? source.lust : cStats.lust;
    
    const combatant = {
        cid: generateId(),
        refId: source.id,
        isMonster: isMon,
        name: source.name,
        avatar: source.avatar || '',
        ini: roll,
        hp: source.hp,
        maxHp: mhp,
        stamina: source.stamina,
        maxSt: mst,
        lust: source.lust,
        maxLust: mlu
    };
    
    combatState.combatants.push(combatant);
    sortCombatants();
    document.getElementById('modal-combat-add').close();
    renderRPG();
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
    
    c[stat] += delta;
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
}

window.removeCombatant = function(cid) {
    combatState.combatants = combatState.combatants.filter(c => c.cid !== cid);
    renderRPG();
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
        { cat: "Físico", name: "Soco / Chute", effect: `1d4 + ${force} HP`, cost: "1 Ação", desc: "Ataque desarmado rápido. Teste de FOR ou AGI vs Defesa." },
        { cat: "Físico", name: "Ataque com Arma", effect: `Dano da Arma + ${force} HP`, cost: "1 Ação", desc: "Usa uma arma corpo a corpo. Teste de FOR ou AGI vs Defesa." },
        { cat: "Físico", name: "Agarrão Bruto", effect: `Imobiliza + 1 Dano HP/LUST`, cost: "1 Ação", desc: "Teste Oposto: FOR vs FOR/AGI. Se sucesso, alvo fica imobilizado." },
        { cat: "ERPG", name: "Toque Sensível", effect: `1d4 + ${sed} LUST`, cost: "Ação Bônus", desc: "Tocar áreas erógenas por cima da roupa ou rapidamente. Teste: AGI vs AGI (se alvo resistir)." },
        { cat: "ERPG", name: "Beijo Intenso", effect: `1d6 + ${Math.max(sed, mis)} LUST`, cost: "1 Ação", desc: "Beijo de língua profundo. Alvo precisa estar agarrado ou consentir. Teste: SED vs VON." },
        { cat: "ERPG", name: "Sexo Oral / Masturbação", effect: `1d8 + ${sed} LUST`, cost: "1 Ação", desc: "Estimulação direta. Alvo deve estar desprotegido. Teste: AGI vs AGI." },
        { cat: "ERPG", name: "Penetração Frontal", effect: `2d6 + ${sed} LUST`, cost: "20 Stamina", desc: "Requer submissão ou consentimento. Aplica LUST contínuo todo turno se mantido." },
        { cat: "ERPG", name: "Penetração Forçada", effect: `1d8 + ${Math.max(force, sed)} LUST`, cost: "30 Stamina", desc: "Penetração contra resistência. Teste Oposto de FOR vs AGI/FOR a cada turno." },
        { cat: "ERPG", name: "Montaria / Cavalgada", effect: `2d6 + ${agi} LUST`, cost: "20 Stamina", desc: "Usa a Agilidade para ditar o ritmo em cima do alvo. Causa grande impacto LUST no parceiro." },
        { cat: "Suporte", name: "Provocação Verbal", effect: `1d4 + ${sed} LUST`, cost: "Ação Livre", desc: "Sussurros ou gemidos a até 5m. Teste: SED vs VON. Se falhar, inimigo foca em você." },
        { cat: "Defesa", name: "Esquiva Ágil", effect: `Vantagem na Defesa`, cost: "Reação", desc: "Quando atacado, rola 1d20+AGI extra para tentar superar o ataque do inimigo." },
        { cat: "Defesa", name: "Resistência de Constituição", effect: `-1d4 Dano HP`, cost: "Reação + 5 Stamina", desc: "Enrijece o corpo para absorver um golpe contundente (apenas Dano Físico)." },
        { cat: "Defesa", name: "Blindagem Mental", effect: `Resiste LUST`, cost: "Reação + 10 Stamina", desc: "Usa Misticismo ou Vontade para criar barreira mental, rolando com Vantagem contra Testes de Sedução." }
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

