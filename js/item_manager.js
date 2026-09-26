// Beyond Depths - Weapons & Accessories data bridge
window.globalWeapons = Array.isArray(window.globalWeapons) ? window.globalWeapons : [];
window.globalAccessories = Array.isArray(window.globalAccessories) ? window.globalAccessories : [];

let itemWeaponsUnsub = null;
let itemAccessoriesUnsub = null;

function itemVisible(item) {
    const user = window.currentUser;
    if (!user) return false;
    const master = typeof window.isMaster === 'function' ? window.isMaster() : false;
    return master || item.ownerId === user.uid;
}

window.initItemListeners = function(dbInstance) {
    if (itemWeaponsUnsub) itemWeaponsUnsub();
    if (itemAccessoriesUnsub) itemAccessoriesUnsub();
    itemWeaponsUnsub = itemAccessoriesUnsub = null;

    if (!dbInstance || !window.currentUser) {
        try {
            const weapons = JSON.parse(localStorage.getItem('bd_weapons') || '[]');
            const accessories = JSON.parse(localStorage.getItem('bd_accessories') || '[]');
            window.globalWeapons = Array.isArray(weapons) ? weapons : [];
            window.globalAccessories = Array.isArray(accessories) ? accessories : [];
        } catch (_) {
            window.globalWeapons = [];
            window.globalAccessories = [];
        }
        if (typeof window.renderSidebar === 'function') window.renderSidebar();
        if (typeof window.renderDashboard === 'function') window.renderDashboard();
        return {};
    }

    itemWeaponsUnsub = dbInstance.collection('global_weapons').onSnapshot(
        snap => {
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            window.globalWeapons = docs.filter(itemVisible);
            if (typeof window.renderSidebar === 'function' && window.currentTab === 'weapons') window.renderSidebar();
            if (typeof window.renderDashboard === 'function') window.renderDashboard();
        },
        err => console.error('Erro ao carregar global_weapons:', err)
    );

    itemAccessoriesUnsub = dbInstance.collection('global_accessories').onSnapshot(
        snap => {
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            window.globalAccessories = docs.filter(itemVisible);
            if (typeof window.renderSidebar === 'function' && window.currentTab === 'accessories') window.renderSidebar();
            if (typeof window.renderDashboard === 'function') window.renderDashboard();
        },
        err => console.error('Erro ao carregar global_accessories:', err)
    );

    return { weapons: () => itemWeaponsUnsub && itemWeaponsUnsub(), accessories: () => itemAccessoriesUnsub && itemAccessoriesUnsub() };
};

window.saveGlobalWeapon = function() {
    if (!window.currentUser && window.db) return alert('Faça login.');

    const nameVal = document.getElementById('inp-w-name').value.trim();
    if (!nameVal) return alert('Nome obrigatório');
    
    if (window.globalWeapons && window.globalWeapons.some(w => w.name.toLowerCase() === nameVal.toLowerCase() && w.id !== window.editingWeaponId)) {
        alert("Já existe uma arma com esse nome.");
        return;
    }

    const obj = {
        id: window.editingWeaponId || 'w_' + Date.now(),
        name: nameVal,
        ownerId: window.currentUser ? window.currentUser.uid : 'local',
        type: 'weapon',
        category: document.getElementById('inp-w-category').value,
        reqAttr: document.getElementById('inp-w-req-attr')?.value || 'none',
        reqVal: parseInt(document.getElementById('inp-w-req-val')?.value) || 0,
        durability: parseInt(document.getElementById('inp-w-durability').value) || 100,
        maxDurability: parseInt(document.getElementById('inp-w-durability').value) || 100,
        diceCount: parseInt(document.getElementById('inp-w-dice-c').value) || 0,
        diceFaces: parseInt(document.getElementById('inp-w-dice-f').value) || 0,
        dmgMod: parseInt(document.getElementById('inp-w-dmg-mod').value) || 0,
        dmgType: document.getElementById('inp-w-dmg-type').value || 'HP',
        effectType: document.getElementById('inp-w-eff-type').value || 'none',
        effectPower: document.getElementById('inp-w-eff-power').value || '',
        effectDuration: parseInt(document.getElementById('inp-w-eff-dur').value) || 0,
        stCost: parseInt(document.getElementById('inp-w-st-cost').value) || 0,
        desc: document.getElementById('inp-w-desc').value || ''
    };

    window.saveToDB('global_weapons', obj, window.globalWeapons, 'bd_weapons');
    document.getElementById('modal-weapon').close();
};

window.saveGlobalAccessory = function() {
    if (!window.currentUser && window.db) return alert('Faça login.');

    const nameVal = document.getElementById('inp-acc-name').value.trim();
    if (!nameVal) return alert('Nome obrigatório');

    if (window.globalAccessories && window.globalAccessories.some(a => a.name.toLowerCase() === nameVal.toLowerCase() && a.id !== window.editingAccessoryId)) {
        alert("Já existe um acessório com esse nome.");
        return;
    }

    const obj = {
        id: window.editingAccessoryId || 'acc_' + Date.now(),
        name: nameVal,
        ownerId: window.currentUser ? window.currentUser.uid : 'local',
        type: 'accessory',
        category: document.getElementById('inp-acc-category').value,
        reqAttr: document.getElementById('inp-acc-req-attr')?.value || 'none',
        reqVal: parseInt(document.getElementById('inp-acc-req-val')?.value) || 0,
        mods: {
            df_hp: parseInt(document.getElementById('inp-acc-df-hp').value) || 0,
            df_hpmag: parseInt(document.getElementById('inp-acc-df-hpmag').value) || 0,
            df_mag: parseInt(document.getElementById('inp-acc-df-mag').value) || 0,
            df_lust: parseInt(document.getElementById('inp-acc-df-lust').value) || 0,
            df_lustmag: parseInt(document.getElementById('inp-acc-df-lustmag').value) || 0,
            agi: parseInt(document.getElementById('inp-acc-agi').value) || 0,
            sed: parseInt(document.getElementById('inp-acc-sed').value) || 0,
            mis: parseInt(document.getElementById('inp-acc-mis').value) || 0
        },
        effectType: document.getElementById('inp-acc-eff-type').value || 'none',
        effectPower: document.getElementById('inp-acc-eff-power').value || '',
        effectDuration: parseInt(document.getElementById('inp-acc-eff-dur').value) || 0,
        desc: document.getElementById('inp-acc-desc').value || '',
        protectedZones: []
    };

    window.saveToDB('global_accessories', obj, window.globalAccessories, 'bd_accessories');
    document.getElementById('modal-accessory').close();
};

window.transferItemOwnership = function(collectionName, itemId, newOwnerId) {
    const arr = collectionName === 'global_weapons' ? window.globalWeapons :
                collectionName === 'global_accessories' ? window.globalAccessories :
                window.globalArmors;
    const item = arr.find(i => i.id === itemId);
    if (!item) return;
    item.ownerId = newOwnerId;
    window.saveToDB(collectionName, item, arr, 'bd_' + collectionName.split('_')[1]);
};
