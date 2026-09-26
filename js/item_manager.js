// Item Manager for Weapons and Accessories
window.globalWeapons = [];
window.globalAccessories = [];

// Listeners will be attached in app.js or here
window.initItemListeners = function(db) {
    if(!db) return;
    db.collection('global_weapons').onSnapshot(snap => {
        window.globalWeapons = snap.docs.map(doc => doc.data());
        if(window.currentTab === 'weapons') window.renderSidebar();
    });
    db.collection('global_accessories').onSnapshot(snap => {
        window.globalAccessories = snap.docs.map(doc => doc.data());
        if(window.currentTab === 'accessories') window.renderSidebar();
    });
};

window.saveGlobalWeapon = function() {
    if (!window.currentUser && window.db) return alert("Faça login.");
    
    const nameVal = document.getElementById('inp-w-name').value.trim();
    if (!nameVal) return alert("Nome obrigatório");
    
    const obj = {
        id: 'w_' + Date.now(),
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
    if (!window.currentUser && window.db) return alert("Faça login.");
    
    const nameVal = document.getElementById('inp-acc-name').value.trim();
    if (!nameVal) return alert("Nome obrigatório");
    
    const obj = {
        id: 'acc_' + Date.now(),
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
        protectedZones: [] // Accessories usually don't have protected zones, but they could
    };
    
    window.saveToDB('global_accessories', obj, window.globalAccessories, 'bd_accessories');
    document.getElementById('modal-accessory').close();
};

// Item ownership transfer
window.transferItemOwnership = function(collectionName, itemId, newOwnerId) {
    const arr = collectionName === 'global_weapons' ? window.globalWeapons : 
                collectionName === 'global_accessories' ? window.globalAccessories : 
                window.globalArmors;
                
    const item = arr.find(i => i.id === itemId);
    if (!item) return;
    
    item.ownerId = newOwnerId;
    window.saveToDB(collectionName, item, arr, 'bd_' + collectionName.split('_')[1]);
};
