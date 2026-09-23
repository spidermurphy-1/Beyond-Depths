/**
 * Beyond Depths - System Logic (Multiplayer & Secure)
 */

// --- FIREBASE SETUP ---
// INSTRUÇÕES: Crie um projeto no Firebase (https://console.firebase.google.com/),
// habilite o Firestore Database e o Authentication (Email/Senha).
// Em seguida, cole as configurações geradas abaixo:
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
let unsubscribeSnapshot = null;

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

// --- DATA STRUCTURES ---
const ARMOR_DB = {
    none: { name: "Sem Armadura", desc: "Trajes comuns. Sem modificadores.", mods: { df: 0, dlust: 0, agi: 0, sed: 0, mis: 0 } },
    heavy: { name: "Armadura Pesada", desc: "Alta DF, +Defesa LUST, -AGI, -SED.", mods: { df: 10, dlust: 5, agi: -2, sed: -2, mis: 0 } },
    light: { name: "Armadura Leve", desc: "Moderada DF, +AGI, leve +Defesa LUST.", mods: { df: 5, dlust: 2, agi: 2, sed: 0, mis: 0 } },
    seduction: { name: "Vestimenta Ousada", desc: "Alta Sedução e Misticismo, penalidade severa em Defesas.", mods: { df: -5, dlust: -5, agi: 0, sed: 5, mis: 2 } },
};

function getArmorStats(type) {
    if (ARMOR_DB[type]) return ARMOR_DB[type];
    
    if (type.startsWith('mixed_')) {
        const types = type.split('_')[1];
        let a1, a2;
        if (types === 'hl') { a1 = ARMOR_DB.heavy; a2 = ARMOR_DB.light; }
        if (types === 'hs') { a1 = ARMOR_DB.heavy; a2 = ARMOR_DB.seduction; }
        if (types === 'ls') { a1 = ARMOR_DB.light; a2 = ARMOR_DB.seduction; }
        
        if (a1 && a2) {
            return {
                name: `Híbrida (${a1.name.split(' ')[1]} + ${a2.name.split(' ')[1] || 'Sedução'})`,
                desc: "50% dos modificadores de ambas as categorias.",
                mods: {
                    df: Math.round((a1.mods.df + a2.mods.df) / 2),
                    dlust: Math.round((a1.mods.dlust + a2.mods.dlust) / 2),
                    agi: Math.round((a1.mods.agi + a2.mods.agi) / 2),
                    sed: Math.round((a1.mods.sed + a2.mods.sed) / 2),
                    mis: Math.round((a1.mods.mis + a2.mods.mis) / 2)
                }
            };
        }
    }
    return ARMOR_DB.none;
}

// --- STATE ---
let characters = [];
let activeCharId = null;

function generateId() {
    return 'char_' + Math.random().toString(36).substr(2, 9);
}

// --- DB SYNC LOGIC ---
function saveCharToDB(char) {
    if (db && currentUser) {
        char.ownerId = currentUser.uid;
        db.collection('characters').doc(char.id).set(char)
            .catch(err => console.error("Erro ao salvar:", err));
    } else {
        // Fallback LocalStorage
        const idx = characters.findIndex(c => c.id === char.id);
        if (idx > -1) characters[idx] = char;
        else characters.push(char);
        localStorage.setItem('bd_characters', JSON.stringify(characters));
        renderSidebar();
        renderDashboard();
    }
}

function deleteCharFromDB(charId) {
    if (db && currentUser) {
        db.collection('characters').doc(charId).delete();
    } else {
        characters = characters.filter(c => c.id !== charId);
        localStorage.setItem('bd_characters', JSON.stringify(characters));
        renderSidebar();
        renderDashboard();
    }
}

function loadData() {
    activeCharId = localStorage.getItem('bd_active');
    
    if (db) {
        // Firebase Auth e Snapshot Listeners
        auth.onAuthStateChanged(user => {
            currentUser = user;
            updateAuthUI();
            
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            
            if (user) {
                // Sincronização em tempo real do servidor
                unsubscribeSnapshot = db.collection('characters').onSnapshot(snapshot => {
                    characters = [];
                    snapshot.forEach(doc => characters.push(doc.data()));
                    if (activeCharId && !characters.find(c => c.id === activeCharId)) {
                        activeCharId = null;
                    }
                    renderSidebar();
                    renderDashboard();
                });
            } else {
                characters = [];
                activeCharId = null;
                renderSidebar();
                renderDashboard();
            }
        });
    } else {
        // Fallback LocalStorage
        const data = localStorage.getItem('bd_characters');
        if (data) characters = JSON.parse(data);
        if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = null;
        updateAuthUI();
        renderSidebar();
        renderDashboard();
    }
}

function canEdit(char) {
    if (!db) return true; // Modo local permite tudo
    if (!char || !currentUser) return false;
    return char.ownerId === currentUser.uid;
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
    if (!db) {
        elAuthPanel.innerHTML = '<span class="text-xs text-green-400">Modo Local Offline (Sem Firebase)</span>';
        return;
    }
    
    if (currentUser) {
        btnShowLogin.classList.add('hidden');
        elUserInfo.classList.remove('hidden');
        const displayName = currentUser.email ? currentUser.email.replace('@beyonddepths.local', '') : `Desconhecido`;
        elUserEmail.innerText = escapeHTML(displayName);
    } else {
        btnShowLogin.classList.remove('hidden');
        elUserInfo.classList.add('hidden');
    }
}

if(btnShowLogin) {
    btnShowLogin.addEventListener('click', () => {
        formLogin.reset();
        modalLogin.showModal();
    });
}

if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(auth) auth.signOut();
    });
}

document.getElementById('btn-login-cancel').addEventListener('click', () => modalLogin.close());
document.getElementById('btn-login-submit').addEventListener('click', (e) => {
    e.preventDefault();
    if(!formLogin.checkValidity()) {
        formLogin.reportValidity();
        return;
    }
    const username = document.getElementById('inp-username').value.trim();
    const pwd = document.getElementById('inp-password').value;
    const dummyEmail = `${username.toLowerCase()}@beyonddepths.local`;
    
    auth.signInWithEmailAndPassword(dummyEmail, pwd)
        .then(() => modalLogin.close())
        .catch(err => {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                auth.createUserWithEmailAndPassword(dummyEmail, pwd)
                    .then(() => modalLogin.close())
                    .catch(e => alert("Erro ao criar conta: " + e.message));
            } else {
                alert("Erro ao logar: " + err.message);
            }
        });
});

// --- UI LOGIC ---

// Elements
const elSidebarList = document.getElementById('character-list');
const elDashContainer = document.getElementById('dashboard-container');
const elNoChar = document.getElementById('no-char-selected');

// Modal Character
const modalChar = document.getElementById('modal-character');
const formChar = document.getElementById('form-character');
let editingCharId = null;

document.getElementById('btn-new-char').addEventListener('click', () => {
    if (db && !currentUser) return alert("Faça login para criar uma ficha no servidor.");
    
    editingCharId = null;
    document.getElementById('modal-title').innerText = "Nova Ficha";
    formChar.reset();
    document.getElementById('armor-desc-hint').innerText = "Modificadores base serão calculados automaticamente.";
    modalChar.showModal();
});

document.getElementById('btn-modal-cancel').addEventListener('click', () => modalChar.close());

document.getElementById('inp-armor').addEventListener('change', (e) => {
    const stats = getArmorStats(e.target.value);
    document.getElementById('armor-desc-hint').innerText = stats.desc;
});

document.getElementById('btn-modal-save').addEventListener('click', (e) => {
    e.preventDefault();
    if(!formChar.checkValidity()) {
        formChar.reportValidity();
        return;
    }

    const armorObj = {
        base: document.getElementById('inp-armor').value,
        name: document.getElementById('inp-armor-name').value,
        desc: document.getElementById('inp-armor-desc').value,
        mods: {
            df: parseInt(document.getElementById('inp-armor-df').value) || 0,
            dlust: parseInt(document.getElementById('inp-armor-dlust').value) || 0,
            agi: parseInt(document.getElementById('inp-armor-agi').value) || 0,
            sed: parseInt(document.getElementById('inp-armor-sed').value) || 0,
            mis: parseInt(document.getElementById('inp-armor-mis').value) || 0
        }
    };

    const newCharData = {
        name: document.getElementById('inp-name').value,
        class: document.getElementById('inp-class').value,
        avatarUrl: document.getElementById('inp-avatar').value,
        skills: document.getElementById('inp-skills').value,
        conditions: document.getElementById('inp-conditions').value,
        attr: { 
            vigor: parseInt(document.getElementById('inp-vigor').value) || 0,
            str: parseInt(document.getElementById('inp-str').value) || 0,
            agi: parseInt(document.getElementById('inp-agi').value) || 0,
            sed: parseInt(document.getElementById('inp-sed').value) || 0,
            mis: parseInt(document.getElementById('inp-mis').value) || 0,
            will: parseInt(document.getElementById('inp-will').value) || 0
        },
        armor: armorObj
    };

    if (editingCharId) {
        const char = characters.find(c => c.id === editingCharId);
        if(char && canEdit(char)) {
            Object.assign(char, newCharData);
            saveCharToDB(char);
        } else {
            alert("Sem permissão para editar esta ficha.");
        }
    } else {
        newCharData.id = generateId();
        newCharData.hp = 100;
        newCharData.stamina = 100;
        newCharData.lust = 0;
        
        // Push local imediato para UX rápida (se fallback local)
        if(!db) characters.push(newCharData);
        
        activeCharId = newCharData.id;
        localStorage.setItem('bd_active', activeCharId);
        
        saveCharToDB(newCharData);
    }
    
    modalChar.close();
});

// Render Sidebar
function renderSidebar() {
    elSidebarList.innerHTML = '';
    if (characters.length === 0) {
        elSidebarList.innerHTML = '<div class="text-center text-sm text-gray-500 mt-10">Nenhuma ficha encontrada.</div>';
        return;
    }

    characters.forEach(char => {
        const isAct = char.id === activeCharId;
        const div = document.createElement('div');
        div.className = `p-3 rounded cursor-pointer transition flex items-center justify-between border ${isAct ? 'bg-gold/10 border-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'glass-card border-transparent hover:border-white/10'}`;
        
        // SECURITY: Usando escapeHTML
        div.innerHTML = `
            <div class="flex-1" onclick="selectChar('${escapeHTML(char.id)}')">
                <div class="font-bold text-sm ${isAct ? 'text-gold' : 'text-gray-200'}">${escapeHTML(char.name)}</div>
                <div class="text-xs text-gray-400">${escapeHTML(char.class)} - Nv 1</div>
            </div>
            ${isAct ? '<i class="fa-solid fa-chevron-right text-gold text-xs"></i>' : ''}
        `;
        elSidebarList.appendChild(div);
    });
}

window.selectChar = function(id) {
    activeCharId = id;
    localStorage.setItem('bd_active', id);
    renderSidebar();
    renderDashboard();
}

// Render Dashboard
function getActiveChar() {
    return characters.find(c => c.id === activeCharId);
}

function renderDashboard() {
    const char = getActiveChar();
    if (!char) {
        elDashContainer.classList.add('hidden');
        elNoChar.classList.remove('hidden');
        return;
    }

    elDashContainer.classList.remove('hidden');
    elNoChar.classList.add('hidden');

    // SECURITY: Usando escapeHTML
    document.getElementById('dash-name').innerHTML = escapeHTML(char.name);
    document.getElementById('dash-class').innerHTML = escapeHTML(char.class);
    
    // Avatar
    const elAvatar = document.getElementById('dash-avatar');
    // Sanitização simples de URL: garantir que seja http ou https (evita javascript:)
    if (char.avatarUrl && char.avatarUrl.startsWith('http')) {
        elAvatar.src = char.avatarUrl; // src escapa naturalmente no DOM, mas filter evita JS url.
        elAvatar.classList.remove('hidden');
    } else {
        elAvatar.classList.add('hidden');
    }
    
    // Skills and Conditions
    document.getElementById('dash-skills').innerHTML = escapeHTML(char.skills) || "Nenhuma habilidade registrada.";
    document.getElementById('dash-conditions').innerHTML = escapeHTML(char.conditions) || "Nenhuma condição ativa.";

    updateBars();
    renderAttributes();
    
    // Controls Visibility
    const canEditChar = canEdit(char);
    const actionButtons = document.querySelectorAll('.action-btn');
    const editBtns = document.getElementById('dash-edit-btns');
    
    actionButtons.forEach(btn => btn.disabled = !canEditChar);
    
    // Edit/Delete buttons logic
    document.getElementById('btn-edit-char').onclick = () => {
        if(!canEditChar) return alert("Sem permissão.");
        editingCharId = char.id;
        document.getElementById('modal-title').innerText = "Editar Ficha";
        document.getElementById('inp-name').value = char.name;
        document.getElementById('inp-class').value = char.class;
        document.getElementById('inp-avatar').value = char.avatarUrl || "";
        document.getElementById('inp-skills').value = char.skills || "";
        document.getElementById('inp-conditions').value = char.conditions || "";
        
        document.getElementById('inp-vigor').value = char.attr.vigor;
        document.getElementById('inp-str').value = char.attr.str;
        document.getElementById('inp-agi').value = char.attr.agi;
        document.getElementById('inp-sed').value = char.attr.sed;
        document.getElementById('inp-mis').value = char.attr.mis;
        document.getElementById('inp-will').value = char.attr.will;
        
        // Armor Migration Support
        const armor = typeof char.armor === 'string' ? { base: char.armor, mods: {} } : (char.armor || { base: 'none', mods: {} });
        
        document.getElementById('inp-armor').value = armor.base;
        document.getElementById('inp-armor-name').value = armor.name || "";
        document.getElementById('inp-armor-desc').value = armor.desc || "";
        document.getElementById('inp-armor-df').value = armor.mods?.df || 0;
        document.getElementById('inp-armor-dlust').value = armor.mods?.dlust || 0;
        document.getElementById('inp-armor-agi').value = armor.mods?.agi || 0;
        document.getElementById('inp-armor-sed').value = armor.mods?.sed || 0;
        document.getElementById('inp-armor-mis').value = armor.mods?.mis || 0;
        
        const stats = getArmorStats(armor.base);
        document.getElementById('armor-desc-hint').innerText = stats.desc;
        modalChar.showModal();
    };

    document.getElementById('btn-delete-char').onclick = () => {
        if(!canEditChar) return alert("Sem permissão.");
        if(confirm(`Tem certeza que deseja apagar ${char.name}?`)) {
            activeCharId = null;
            localStorage.removeItem('bd_active');
            deleteCharFromDB(char.id);
        }
    };
    
    document.getElementById('btn-export-char').onclick = () => exportChar(char);
}

function updateBars() {
    const char = getActiveChar();
    if (!char) return;

    const hp = Math.max(0, Math.min(100, char.hp));
    document.getElementById('val-hp').innerText = hp;
    document.getElementById('bar-hp').style.width = hp + '%';

    const st = Math.max(0, Math.min(100, char.stamina));
    document.getElementById('val-stamina').innerText = st;
    document.getElementById('bar-stamina').style.width = st + '%';

    const lu = Math.max(0, Math.min(100, char.lust));
    document.getElementById('val-lust').innerText = lu;
    const barLust = document.getElementById('bar-lust');
    barLust.style.width = lu + '%';
    
    if (lu >= 100) barLust.classList.add('mind-break');
    else barLust.classList.remove('mind-break');

    const ecstasyLimiar = 25 + char.attr.vigor;
    document.getElementById('dash-ecstasy-threshold').innerText = ecstasyLimiar + '%';
    
    let ecstasyStage = Math.floor(lu / ecstasyLimiar);
    if(ecstasyStage < 0) ecstasyStage = 0;
    
    document.getElementById('lust-stage').innerText = `Estágio ${ecstasyStage} (${lu}%)`;

    const badge = document.getElementById('dash-condition');
    if (lu >= 100) {
        badge.className = 'badge badge-lust';
        badge.innerHTML = 'Mind Break';
    } else if (hp <= 0) {
        badge.className = 'badge badge-danger';
        badge.innerHTML = 'Inconsciente';
    } else if (st <= 0) {
        badge.className = 'badge badge-warning';
        badge.innerHTML = 'Caído';
    } else if (ecstasyStage > 0) {
        badge.className = 'badge badge-lust';
        badge.innerHTML = `Êxtase (Nível ${ecstasyStage})`;
    } else {
        badge.className = 'badge badge-normal';
        badge.innerHTML = 'Normal';
    }
}

function renderAttributes() {
    const char = getActiveChar();
    
    const armorObj = typeof char.armor === 'string' ? { base: char.armor, mods: {} } : (char.armor || { base: 'none', mods: {} });
    const baseStats = getArmorStats(armorObj.base);
    
    const finalMods = {
        df: (baseStats.mods.df || 0) + (armorObj.mods?.df || 0),
        dlust: (baseStats.mods.dlust || 0) + (armorObj.mods?.dlust || 0),
        agi: (baseStats.mods.agi || 0) + (armorObj.mods?.agi || 0),
        sed: (baseStats.mods.sed || 0) + (armorObj.mods?.sed || 0),
        mis: (baseStats.mods.mis || 0) + (armorObj.mods?.mis || 0),
    };

    const mkRow = (name, base, mod, icon) => {
        let finalVal = base + (mod || 0);
        let modStr = '';
        if (mod > 0) modStr = `<span class="text-green-400 text-xs">(+${mod})</span>`;
        if (mod < 0) modStr = `<span class="text-red-400 text-xs">(${mod})</span>`;
        
        return `<div class="flex justify-between items-center py-1 border-b border-white/5">
            <span class="text-gray-400"><i class="fa-solid fa-${icon} w-5"></i> ${name}</span>
            <span class="font-semibold text-lg text-white">${finalVal} ${modStr}</span>
        </div>`;
    };

    document.getElementById('dash-attributes').innerHTML = `
        ${mkRow('Vigor', char.attr.vigor, 0, 'heart-pulse')}
        ${mkRow('Força', char.attr.str, 0, 'dumbbell')}
        ${mkRow('Agilidade', char.attr.agi, finalMods.agi, 'person-running')}
        ${mkRow('Sedução', char.attr.sed, finalMods.sed, 'face-kiss-wink-heart')}
        ${mkRow('Misticismo', char.attr.mis, finalMods.mis, 'wand-magic-sparkles')}
        ${mkRow('Vontade', char.attr.will, 0, 'brain')}
    `;

    document.getElementById('dash-armor-name').innerHTML = escapeHTML(armorObj.name) || baseStats.name;
    document.getElementById('dash-armor-type').innerHTML = armorObj.name ? `Base: ${baseStats.name}` : (baseStats.name === "Sem Armadura" ? "Trajes Comuns" : "Equipado");
    
    const armorDetailsPanel = document.getElementById('dash-armor-details-panel');
    const armorDescText = document.getElementById('dash-armor-desc');
    if (armorObj.desc) {
        armorDescText.innerHTML = escapeHTML(armorObj.desc);
        armorDetailsPanel.classList.remove('hidden');
    } else {
        armorDetailsPanel.classList.add('hidden');
    }

    let modHtml = '';
    if(finalMods.df) modHtml += `<li class="${finalMods.df > 0 ? 'text-green-400' : 'text-red-400'}">Defesa Física: ${finalMods.df > 0 ? '+'+finalMods.df : finalMods.df}</li>`;
    if(finalMods.dlust) modHtml += `<li class="${finalMods.dlust > 0 ? 'text-green-400' : 'text-red-400'}">Defesa Lust: ${finalMods.dlust > 0 ? '+'+finalMods.dlust : finalMods.dlust}</li>`;
    if(finalMods.agi) modHtml += `<li class="${finalMods.agi > 0 ? 'text-green-400' : 'text-red-400'}">Agilidade: ${finalMods.agi > 0 ? '+'+finalMods.agi : finalMods.agi}</li>`;
    if(finalMods.sed) modHtml += `<li class="${finalMods.sed > 0 ? 'text-green-400' : 'text-red-400'}">Sedução: ${finalMods.sed > 0 ? '+'+finalMods.sed : finalMods.sed}</li>`;
    if(finalMods.mis) modHtml += `<li class="${finalMods.mis > 0 ? 'text-green-400' : 'text-red-400'}">Misticismo: ${finalMods.mis > 0 ? '+'+finalMods.mis : finalMods.mis}</li>`;
    
    if(modHtml === '') modHtml = '<li class="text-gray-500">Nenhum modificador</li>';
    
    // Seguro pois modHtml é gerado puramente por números internamente
    document.getElementById('dash-armor-mods').innerHTML = modHtml;
}

// --- QUICK ACTIONS ---
window.adjustStat = function(stat, amount) {
    const char = getActiveChar();
    if(!char) return;
    if(!canEdit(char)) return alert("Sem permissão.");
    
    char[stat] += amount;
    if(char[stat] > 100) char[stat] = 100;
    if(char[stat] < 0) char[stat] = 0;
    
    saveCharToDB(char);
}

window.applyDamage = () => adjustStat('hp', -15);
window.rest = () => adjustStat('stamina', 30);
window.relieve = () => adjustStat('lust', -20);

// --- IMPORT / EXPORT ---
document.getElementById('btn-import-char').addEventListener('click', () => {
    if (db && !currentUser) return alert("Faça login para importar uma ficha no servidor.");
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.name && data.attr) {
                data.id = generateId(); 
                saveCharToDB(data);
                activeCharId = data.id;
                localStorage.setItem('bd_active', activeCharId);
                alert(`Ficha de ${escapeHTML(data.name)} importada com sucesso!`);
            } else {
                alert("Arquivo JSON inválido.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo.");
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

function exportChar(char) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(char, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `bd_${char.name.toLowerCase().replace(/\s+/g, '_')}.json`);
    dlAnchorElem.click();
}

// INIT
loadData();
