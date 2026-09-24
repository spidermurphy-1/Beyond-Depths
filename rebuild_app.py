import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update getCharModifiers to include breakdown
get_mods = """function getCharModifiers(char) {
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
}"""
content = re.sub(r'function getCharModifiers\(char\) \{.*?(?=function renderDashboard\(\) \{)', get_mods + '\n\n', content, flags=re.DOTALL)

# 2. Add openPerkModal
open_modal = """
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
"""
content = content.replace('function renderDashboard() {', open_modal + '\nfunction renderDashboard() {')


# 3. Update mkRow and Tooltips in renderAttributesAndDerivedStats
render_derived = """function renderAttributesAndDerivedStats(char, mods) {
    const totalDF = char.attr.con + mods.df;
    const totalDL = mods.dlust_set !== null ? mods.dlust_set : (char.attr.von + mods.dlust);
    const totalEsq = (char.attr.agi * 3) + mods.agi + mods.esq;
    const totalDanFis = (char.attr.for) + mods.danFis;
    const totalDanLust = (char.attr.sed) + mods.danLust;

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
    if(document.getElementById('tt-esq')) document.getElementById('tt-esq').innerHTML = buildTT('Base (AGI x3)', char.attr.agi * 3, mods.breakdown.esq);
    if(document.getElementById('tt-danfis')) document.getElementById('tt-danfis').innerHTML = buildTT('Base (FOR)', char.attr.for, mods.breakdown.danFis);
    if(document.getElementById('tt-danlust')) document.getElementById('tt-danlust').innerHTML = buildTT('Base (SED)', char.attr.sed, mods.breakdown.danLust);

    // HP, ST, Lust, Magia tooltips
    const baseStats = getClassBaseStats(char.class);
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
"""
content = re.sub(r'function renderAttributesAndDerivedStats\(char, mods\) \{.*?(?=    const armor = getCharArmor\(char\);)', render_derived + '\n', content, flags=re.DOTALL)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
