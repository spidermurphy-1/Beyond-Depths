// Status Effects Manager
window.ACTIVE_CONDITIONS_DEF = {
    'sangramento': { name: 'Sangramento', desc: 'Perde HP todo turno. Reduz eficácia de cura.', type: 'dot' },
    'envenenamento_fisico': { name: 'Envenenamento (Físico)', desc: 'Sofre dano físico por turno.', type: 'dot' },
    'envenenamento_magico': { name: 'Envenenamento (Mágico)', desc: 'Sofre dano mágico por turno.', type: 'dot' },
    'envenenamento_lust': { name: 'Veneno de Luxúria', desc: 'Ganha Lust por turno.', type: 'dot' },
    'excitacao': { name: 'Excitação Extrema', desc: 'Aumenta sensibilidade, recebe +dano LUST.', type: 'debuff' },
    'atordoado': { name: 'Atordoado', desc: 'Reduz AGI e Esquiva.', type: 'debuff' }
};

window.applyStatusEffect = function(targetChar, effectType, powerStr, duration) {
    if (!targetChar.statusEffects) targetChar.statusEffects = [];
    
    targetChar.statusEffects.push({
        id: 'eff_' + Date.now() + Math.floor(Math.random() * 1000),
        type: effectType,
        power: powerStr, // ex: "1d4", "10%", "5"
        duration: parseInt(duration) || 1,
        sourceName: window.ACTIVE_CONDITIONS_DEF[effectType]?.name || effectType
    });
    
    // Save to DB
    window.saveToDB('characters', targetChar, window.characters, 'bd_characters');
    window.renderDashboard();
};

window.removeStatusEffect = function(targetCharId, effectId) {
    const char = window.characters.find(c => c.id === targetCharId);
    if (!char || !char.statusEffects) return;
    
    char.statusEffects = char.statusEffects.filter(e => e.id !== effectId);
    window.saveToDB('characters', char, window.characters, 'bd_characters');
    window.renderDashboard();
};

window.tickStatusEffect = function(targetCharId, effectId) {
    const char = window.characters.find(c => c.id === targetCharId);
    if (!char || !char.statusEffects) return;
    
    const eff = char.statusEffects.find(e => e.id === effectId);
    if (eff) {
        eff.duration -= 1;
        if (eff.duration <= 0) {
            char.statusEffects = char.statusEffects.filter(e => e.id !== effectId);
        }
        window.saveToDB('characters', char, window.characters, 'bd_characters');
        window.renderDashboard();
    }
};

window.renderStatusEffectsUI = function(char) {
    const container = document.getElementById('char-status-effects');
    if (!container) return;
    
    if (!char.statusEffects || char.statusEffects.length === 0) {
        container.innerHTML = '<div class="text-xs text-gray-500 italic">Nenhuma condição ativa.</div>';
        return;
    }
    
    let html = '<div class="flex flex-wrap gap-2">';
    char.statusEffects.forEach(eff => {
        let color = eff.type.includes('lust') || eff.type === 'excitacao' ? 'bg-pink-900/40 border-pink-500 text-pink-300' : 
                    eff.type.includes('envenenamento') ? 'bg-green-900/40 border-green-500 text-green-300' :
                    eff.type === 'sangramento' ? 'bg-red-900/40 border-red-500 text-red-300' :
                    'bg-yellow-900/40 border-yellow-500 text-yellow-300';
                    
        html += `
            <div class="border rounded px-2 py-1 flex items-center gap-2 ${color}">
                <div class="text-xs font-bold">${eff.sourceName} <span class="font-normal opacity-80">(${eff.power}) - ${eff.duration} turnos</span></div>
                <div class="flex gap-1 ml-2">
                    <button class="text-white hover:text-gray-300 px-1 rounded bg-black/50" onclick="tickStatusEffect('${char.id}', '${eff.id}')" title="Passar 1 Turno"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button class="text-white hover:text-red-400 px-1 rounded bg-black/50" onclick="removeStatusEffect('${char.id}', '${eff.id}')" title="Remover"><i class="fa-solid fa-times"></i></button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};
