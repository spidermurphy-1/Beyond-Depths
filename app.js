/**
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
    "fragil_sexual": { name: "Frágil (Sexual)", desc: "Limiar de Êxtase travado em 20%.", mods: { ecstasy_set: 20 }, classOnly: "Sacerdote" },
    "exausto": { name: "Exausto", desc: "Max Stamina reduzida em 50%.", mods: { st_mult: 0.5 } },
    "lento": { name: "Lento", desc: "Esquiva final sofre -5.", mods: { esq: -5 } },
    "enfeiticado": { name: "Enfeitiçado", desc: "Defesa de Lust é zerada.", mods: { dlust_set: 0 } }
};

const PERK_COSTS = [0, 1, 2, 3, 5, 9];
const PERKS_DB = {
    sed: {
        name: "Sedução", icon: "fa-heart",
        perks: {
            "Volúpia Anatômica: Seios": ["Estético leve", "Formato perfeito (+1 distração)", "Volume gerador de LUST", "Dimensões hipertróficas (LUST passivo)", "Proporções extremas (Transe)"],
            "Volúpia Anatômica: Glúteos e Quadris": ["Curvas acentuadas", "Quadril hipnótico (+1 persuasão)", "Ataques de submissão com bônus SED", "Absorve impacto e amplifica LUST", "Proporções colossais inescapáveis"],
            "Magnificência Genital": ["Alteração estética e calor", "Tamanho/profundidade ideais (+2 provocação)", "Ignora dores, +50% LUST no parceiro", "Drena Energia/LUST pelo contato", "Alvos paralisados pelo êxtase"],
            "Feromônios Inebriantes": ["Perfume adocicado", "Impõe -1 VON corpo a corpo", "Névoa afrodisíaca (+2 LUST área)", "Densa: Alvos perdem 10% Resistência LUST", "Nuvem de Cio: Frenesi incontrolável"],
            "Beijo Sugador": ["Lábios instigantes", "Confusão mental por 1 turno", "Drena 10 Stamina", "Drena HP e Stamina", "Dreno de Alma: Maximiza LUST, debuff atributos"],
            "Olhar da Perdição": ["Olhos magnéticos", "Impõe Hesitação (atrasa iniciativa)", "Força dano de LUST visual", "Quebra DLUST do alvo pela metade", "Submissão Ocular telepática"],
            "Voz de Sereia": ["Timbre aveludado", "Vantagem (+1) imobilização sexual", "Excitação forçada (Dano LUST à distância)", "Anula buffs mentais/Fúria", "Cântico: Paralisa alvos em área"],
            "Toque Corruptor": ["Dedos indutores de calafrios", "Debuff leve de Agilidade no toque", "Golpes físicos causam 50% dano LUST", "Ignora 50% armadura para Despir", "Dissolve roupas e armaduras mundanas"],
            "Graça Felina": ["Movimentação elegante", "Esquiva usa SED (leves)", "Dança gera LUST passivo na área", "Imune penalidade de agarrão/submissão", "Intangível se provocar (ataques erram)"],
            "Imunidade à Vergonha": ["Exibicionismo leve", "Nudez parcial = +1 DLUST", "Nudez Total = +3 testes SED", "Ganha buffs ao atingir Limiar de Êxtase", "Avatar Luxúria: Força dobrada no Mind Break"],
            "Secreções Afetivas": ["Fluidos revigorantes", "Fluidos curam +5 HP ao aliado", "Fluido viciante (facilita comandos)", "Fluidos purificam venenos", "Névoa que protege área de Mind Break"],
            "Domínio do Vínculo": ["Empatia imediata após sexo", "Pode marcar alvo (sabe direção)", "Alvo marcado sofre LUST se te atacar", "Telepatia de Prazer", "Contrato Subserviência: Controle mental e HP share"]
        }
    },
    con: {
        name: "Constituição", icon: "fa-shield-heart",
        perks: {
            "Couro Resistente": ["Redução dano: 1", "Redução dano: 3", "Ignora sangramento e ataques rasantes", "Dobra redução de dano (Ativação 1 turno)", "Impenetrável (Anula ataques abaixo de limiar)"],
            "Tolerância à Dor": ["Ignora feridas superficiais", "Penalidades só em 30% de HP", "Imune tortura não-luxuriosa", "Adrenalina da Dor: Bônus FOR em Crítico", "Luta 3 turnos com 0 HP"],
            "Sistema Imunológico Implacável": ["Raramente adoece", "Vantagem contra doenças comuns", "Corta duração de venenos fortes pela metade", "Cura envenenamento aliados via doação de sangue", "Imunidade total (veneno/parasita/gravidez)"],
            "Sangue Fervente (Regeneração)": ["Feridas fecham rápido no descanso", "Recupera 1 HP/turno (passivo fora combate)", "Regeneração ativa (cura baseada no VIG)", "Cicatrização mágica (anula sangramento na hora)", "Recoloca membros decepados"],
            "Densidade Óssea": ["Ossos pesados", "Proteção extra contra impacto", "Ossos inquebráveis (+bônus ataque desarmado)", "Imune a quedas de 15 metros", "Imune a dano contundente e fratura"],
            "Termorregulação Perfeita": ["Não se incomoda com sol/neve", "Resistência Fogo/Gelo Nv1", "Sobrevive nú em extremos sem perder HP/Stamina", "Gelo/Fogo curam HP em vez de ferir", "Isolamento Absoluto a extremos e magias elementais"],
            "Estômago de Ogro": ["Come carne crua", "Comida cura o dobro", "Come lixo/poção corrompida pra curar", "Come materiais duros = cura massiva e buff", "Fornalha Gástrica: Absorve atributo do inimigo engolido"],
            "Firmeza de Montanha": ["Postura equilibrada", "Vantagem para evitar quedas/rasteiras", "Não pode ser movido por tamanho Médio/Grande", "Dano de recuo ao tentarem quebrar postura", "Gravidade Pessoal: Imune telecinese/knockback"],
            "Vitalidade Descomunal": ["+10% HP Máx", "+20% HP Máx", "+30% HP Máx e ganha cura passiva", "+50% HP Máx", "+100% HP Máx (Coração Dragão: revive com 50% HP)"],
            "Estase Carnal": ["Envelhece devagar", "Segura respiração 3x", "Hibernação profunda (sobrevive sem nada por semanas)", "Controle hemorrágico (isola veneno)", "Imortalidade biológica (não envelhece/maldições)"],
            "Escudo Físico Reativo": ["Músculos tencionam", "Atacante sofre desvantagem no próximo golpe", "Onda de choque derruba entorno se dano > 30", "Dobra CON base no turno abrindo mão do movimento", "Reflete 50% dano físico direto sem dados"],
            "Glândulas Adaptativas": ["Suor limpante", "Suor afasta monstros LUST fracos", "Expele gosma adesiva/escorregadia", "Fluidos anulam LUST do alvo que os ingere", "Casulo em 0 HP/MindBreak para recuperação 24h"]
        }
    },
    vig: {
        name: "Vigor", icon: "fa-bolt",
        perks: {
            "Fôlego Inesgotável": ["+10 Max Stamina", "+20 Max Stamina", "Custo de movimento cortado pela metade", "+50 Max Stamina", "Regen passiva massiva de Stamina/turno"],
            "Corredor Incansável": ["+2m Movimento base", "Atravessa terrenos difíceis normal", "Ignora penalidade de Carga/Armadura no mov", "Investida não custa ação", "Mobilidade teleportada em curtas distâncias"],
            "Coração Resiliente": ["Recupera 5 St ao sofrer Dano", "Recupera 10 St ao sofrer Dano", "Pode converter Stamina em HP 1x por combate", "Dobra regeneração base", "Imunidade a Exaustão máxima"],
            "Repelir Êxtase": ["+5 Limiar de Êxtase", "+10 Limiar de Êxtase", "+20 Limiar de Êxtase", "Ganha buff de FOR ao passar do Limiar", "Nunca sofre debuff por atingir Limiar"],
            "Adaptação Erótica": ["Ações de Alívio custam -5 St", "Ações de Alívio custam 0 St", "Ações de Alívio restauram St", "Causa dano LUST ao usar Alívio em si", "Êxtase restaura todos os seus recursos"],
            "Tolerância Adrenalínica": ["Ignora debuffs de Estágio 1 LUST", "Ignora debuffs de Estágio 2 LUST", "Converte debuff em buff temporário", "Imune a paralisia por dor/êxtase", "Atinge auge físico sob Mind Break"],
            "Capacidade Pulmonar": ["Prende respiração por 10min", "Imune a gases fracos", "Não precisa respirar por 1h", "Imune a nuvens venenosas densas", "Pulmões adaptativos (vácuo/água infinita)"],
            "Segundo Fôlego": ["Ao zerar St, recupera 10 (1x/dia)", "Recupera 30 (1x/dia)", "Pode gastar HP no lugar de St", "Zerar St emite onda de recuo", "Nunca cai abaixo de 10 Stamina passiva"],
            "Atleta Divino": ["Vantagem em Acrobacia", "Salto triplicado", "Pode lutar 2 dias sem dormir", "Imune a magias de Lentidão", "Físico Inabalável: Imune a dreno de atributo"],
            "Aura de Energia": ["Aliados ao redor +5 Max St", "Aliados +10 Max St", "Pode doar sua St pra aliados", "Aliados ignoram custo de 1 ação", "Cúpula Revigorante contínua"],
            "Blindagem Mental": ["Ataques LUST afetam -10% sua St", "-25% impacto LUST na St", "Dano LUST aumenta sua St", "Ataques psíquicos restauram sua St", "Imune a magias de dreno mental"],
            "Descanso Profundo": ["Dormir 2h equivale a 8h", "Dormir recupera debuffs permanentes", "Pode usar descansos curtos como longos", "Sonho curativo (Anula condições de LUST)", "Transe (Fica invulnerável enquanto dorme)"]
        }
    },
    for: {
        name: "Força", icon: "fa-dumbbell",
        perks: {
            "Golpes Esmagadores": ["+1 Dano Bruto (Corpo-a-Corpo)", "+3 Dano Bruto", "+5 Dano e Knockback", "Causa dano em área (Cleave)", "Golpes ignoram 50% das defesas físicas"],
            "Agarre Titânico": ["Vantagem para Iniciar Agarrão", "Alvo sofre desvantagem ao escapar", "Imobilizar causa asfixia (Dano turno)", "Quebra braços do alvo ao agarrar", "Esmagamento letal instantâneo em alvos fracos"],
            "Músculos Fibrosos": ["Vantagem contra Agarrões inimigos", "Dano de contusão reduzido em 2", "Inimigo pequeno não consegue te levantar", "Quebra cordas/algemas mágicas na força", "Imune a imobilização física mundana"],
            "Quebra-Defesas": ["Ignora 1 armadura", "Ignora 3 armadura", "Destrói escudos mundanos ao bater", "Golpes reduzem Defesa do alvo pra aliados", "Estilhaça armaduras lendárias com as mãos"],
            "Arremesso Brutal": ["Pode jogar objetos de 50kg a 10m", "Joga inimigos menores", "Arremessa aliados com segurança tática", "Arremessa pedregulhos pesados (+dano área)", "Joga inimigos colossais para trás"],
            "Força de Impacto": ["Armas causam lentidão", "Golpe causa tontura", "Golpes atordoam", "Acertos críticos quebram o chão (terreno difícil)", "Dano sônico (Golpes rompem a barreira do som)"],
            "Violência Bruta": ["+2 Dano em alvos caídos", "+5 Dano em alvos imobilizados", "Vantagem contra alvos agarrados", "Execução: 2x Dano contra alvo rendido", "Grito de Fúria ao matar aterroriza"],
            "Tensão Muscular Mágica": ["Pode usar FOR em vez de VON (resistir magia)", "Quebra prisões mágicas com FOR", "Golpes dissipam invocações arcanas fraca", "Pode segurar lâminas mágicas sem dano", "Punhos rebatem feitiços primários"],
            "Saltador Colossal": ["Pula 5m vertical", "Pula 10m e causa dano na queda", "Pode pular com 1 aliado gigante", "Queda sísmica atordoa", "Meteor Strike (Desce de órbitas causando catástrofe)"],
            "Carregador de Fardo": ["Inventário não sofre peso", "Pode andar com 1x mais peso", "Pode carregar aliados mortos/vivos sem debuff", "Pode lutar carregando grandes pedras como escudo", "Pode sustentar desabamentos inteiros nas costas"],
            "Machado Humano": ["Ganhe +1 Dano a cada rodada de combate", "+2 Dano/rodada", "+Dano aplica Sangramento pesado", "Limiar de Sangramento atinge ossos", "Cortar membros vira algo rotineiro"],
            "Impacto Sísmico": ["Soco no chão causa tremores", "Derruba alvos em raio curto", "Ergue paredes de terra ao socar chão", "Causa fissuras letais em área média", "Terremoto local dirigido a um alvo"]
        }
    },
    agi: {
        name: "Agilidade", icon: "fa-person-running",
        perks: {
            "Reflexos Apurados": ["+2 Iniciativa", "+5 Iniciativa", "Nunca é pego de surpresa", "Pode trocar lugar na iniciativa com aliado", "Sempre joga primeiro no combate"],
            "Esquiva Acrobática": ["+1 Esquiva base", "+3 Esquiva base", "Vantagem natural para esquivar projéteis", "+5 Esquiva e pode desviar no ar", "Esquiva perfeita garante quebra de postura inimiga"],
            "Deslize Furtivo": ["Movimento silencioso", "Invisível em sombras médias", "Não aciona armadilhas de pressão", "Mover escondido custa metade da ação", "Ataque furtivo ganha multiplicador massivo de dano"],
            "Precisão Letal": ["Margem de Crítico aumenta em 1", "Crítico aumenta em 2", "Críticos causam cegueira/sangramento", "Crítico ignora 100% armadura", "Acertos certeiros decaptam alvos não-elites"],
            "Queda de Gato": ["Reduz dano de queda pela metade", "Ignora danos de até 20m", "Sempre cai de pé e saca a arma", "Pode planar usando roupas largas", "Ignora dano de queda terminal (aterrissagem de herói)"],
            "Escapar de Agarrões": ["+2 teste de fuga", "+5 teste de fuga", "Pode fugir como ação bônus rápida", "Fugir deixa alvo desequilibrado", "Mestre Escape: Se solta e desarma/despe o alvo junto"],
            "Ataque em Foco": ["Armas ágeis dão +1 dano", "Ataque adicional fraco", "Pode gastar Stamina pra 3º ataque", "Ataques consecutivos dão stacking de dano", "Tempestade de Lâminas (Ataque em Área)"],
            "Contra-Ataque Rápido": ["Se inimigo errar, pode atacar com faca", "Contra-ataque dá dano normal", "Contra-ataque pode ser usado 2x por turno", "Pode aparar e revidar simultaneamente", "Contra-ataque fatal (Causa lentidão e sangramento)"],
            "Passo Fantasma": ["Corrida concede +1 ESQ", "Não causa ataques de oportunidade", "Pode passar por dentro do grid inimigo", "Pode correr na parede ou água", "Teleporte de sombras curtas"],
            "Mobilidade Extrema": ["Ataque + recuo de 2m", "Recuo de 5m", "Pode gastar estamina pra pular pra trás", "Movimentos são borrados (-2 chance inimigo acertar)", "Flashstep (Ataca múltiplos alvos movendo)"],
            "Reação Ocular": ["Apara flechas (50%)", "Apara flechas (100%)", "Rebate flecha no inimigo", "Rebate balas e magias projétil fracas", "Rebate feitiços de dano alto de volta pra origem"],
            "Dança da Morte": ["Dançar confunde visão inimiga", "Esquivar aumenta ESQ aliada", "Ficar cercado aumenta ESQ (+1 por ini)", "Ação de Dança força errar tudo nela", "Esquiva em área: Retira aliado da área da magia (Fogo/Gelo)"]
        }
    },
    von: {
        name: "Vontade", icon: "fa-brain",
        perks: {
            "Mente Inabalável": ["Vantagem resistir Intimidação", "+2 Defesa contra Mind Control", "Ignora medos/fobias mundanos", "Resiste a charme e domínio demoníaco", "Aura mental (Inimigo sofre choque psíquico se tentar invadir)"],
            "Estoicismo Carcerário": ["+2 Defesa LUST (DLUST)", "+5 DLUST", "Reduz pela metade o bônus de SED inimigo", "Ignora debuffs de Estágio 3 LUST", "Converte 50% de todo dano LUST em HP"],
            "Clarividência": ["Sente mentiras", "Vê através de magias de invisibilidade fracas", "Imune a Ilusões e Miragens", "Enxerga a intenção hostil ou carnal passivamente", "Olho de Deus (Vê aura, alinhamento e invulnerabilidades)"],
            "Presença Imponente": ["+2 Intimidação (INT)", "Inimigos de nível baixo hesitam", "Grito gela o sangue (-1 Iniciativa global)", "Imposição aterroriza forçando alvo a recuar", "Comando de Soberano (Força rendição de alvos fracos)"],
            "Meditação Tática": ["Respirar 1 turno recupera foco", "Ação de cura remove 1 debuff mental", "Pode ignorar debuff físico através da fé", "Meditando atinge regeneração psíquica alta", "Recupera companheiros num raio apenas pela sua paz"],
            "Foco Implacável": ["Magias não são interrompidas por Dano Leve", "Ignora dor para conjurar", "Pode conjurar cego ou surdo", "Se sofrer Crítico, Magia sai potencializada", "O corpo conjura mesmo desmaiado (Transe mágico)"],
            "Disciplina Carnal": ["Regenera passivamente -2 LUST/turno", "-5 LUST/turno", "Sexo forçado não causa Limiar imediato", "Pode purgar LUST gastando Stamina brutalmente", "Nega Mind Break por completo 1x por combate"],
            "Barreira Psíquica": ["Reduz 1 dano psíquico/magia", "Reduz 5 dano mágico", "Cria escudo bolha que protege aliados do medo", "Pode focar a barreira p/ rebater charme", "Mente Diamantina (Imune a corrupção de deuses)"],
            "Quebra-Amarras": ["Liberta-se de controle mental em 2 turnos", "Liberta-se em 1 turno", "Pode quebrar controle mental aliado tocando neles", "Imune passivo a magias de sono e feitiço de bruxa", "Desfaz ilusões de chefes/territórios apenas pela negação"],
            "Avatar da Mente": ["Ganha +1 Dano mágico p/ VON", "Dano desarmado usa VON", "Armas brilham com determinação (+Dano Divino/Mental)", "Pode atingir espíritos e fantasmas com socos puros", "Projeta corpo astral colossal"],
            "Vontade de Sobreviver": ["Se 1 aliado cair, ganha +2 Dano", "Se todos caírem, dobra HP", "Imune a desmaio se o objetivo não foi cumprido", "Concede Último Suspiro (revive o time c/ 1HP ao gritar)", "Recusa-se a morrer enquanto o chefão viver"],
            "Telecinese Latente": ["Levita itens 1kg", "Joga pedras na força da mente", "Enforca inimigos à distância", "Vôo psíquico temporário", "Massa Telecinética: Arremessa casas, esmaga armaduras."]
        }
    },
    mis: {
        name: "Misticismo", icon: "fa-wand-magic-sparkles",
        perks: {
            "Afinidade Elemental": ["+1 Dano (Magias Elementais)", "+3 Dano Magias", "Aplica Burn/Freeze de Nível 1", "Dano Mágico ignora resistências comuns", "Dano Puro Elemental: Destrói imunidade total"],
            "Controle de Mana/Energia": ["Reduz 1 Custo Energia", "Magias de Custo 1 viram Passivas", "Magias pesadas custam metade", "Gasto de energia acima do cap consome só HP leve", "Reservatório Infinito: 1x ao dia joga magia lendária de graça"],
            "Canalização Rápida": ["Magias de longo cast castam -1 turno", "Pode conjurar andando sem penalidade", "Pode conjurar como ação bônus", "Dual Cast (Duas magias nível baixo num turno)", "Magias cataclísmicas conjuradas instantaneamente"],
            "Escudo Arcano": ["Conjura escudo de 10HP", "Escudo 30 HP", "Escudo devolve LUST ao atacante", "Escudo quebra explodindo Dano em Área", "Aegis Absoluta (Invulnerabilidade a 1 golpe)"],
            "Raio Aumentado": ["Alcance mágico +5m", "Alcance +10m", "Magias em Área dobram o raio", "Magias tocam múltiplos alvos à escolha", "Sniper Arcano (Acerta de quilômetros de distância visual)"],
            "Percepção Arcana": ["Sente magias próximas", "Vê auras mágicas e itens ocultos", "Identifica tipo e elemento da magia antes dela bater", "Lê mentes fracas/pensamentos de superfície", "Onisciência Arcana: Enxerga tudo no território mágico"],
            "Manipulação de Fluidos": ["Cura extra +5 ao usar poções", "Transmuta água em vinho/veneno", "Extrai água do ar/inimigo para matar a sede", "Pode buffar aliado usando os próprios fluidos mágicos", "Mestre da Secreção Divina (Lágrimas revivem mortos)"],
            "Cura Amplificada": ["Feitiços de cura dão +10 HP", "+20 HP", "Curam LUST ao mesmo tempo que curam HP", "Podem recriar tendões rasgados", "Ressurreição Perfeita (Sem perda de nível/alma)"],
            "Pacto de Sangue": ["Pode gastar HP pra castar", "Troca 1 HP por 2 Energia", "O Dano Sofrido aumenta o Próximo feitiço", "Magias de Sangue dão Lifesteal (Roubo de Vida)", "Pacto com Entidade: Pode usar HP do inimigo controlado pra magias"],
            "Absorção Mística": ["Recebe Magia: Recupera 2 Energia", "Receber magias LUST recupera 5 Energia", "Absorve magias elementais fracas anulando dano", "Drena mana do inimigo ao tocá-lo", "Buraco Negro Arcano (Engole magias lendárias inimigas)"],
            "Mestre Ritualístico": ["Rituais levam metade do tempo", "Não precisa de círculos mágicos materiais", "Pode ancorar rituais grandes na própria alma", "Atua por 3 magos em feitiços de congregação", "Reescreve leis arcanas temporariamente (Troca elementos do mundo)"],
            "Invocação Vinculante": ["Pode invocar 1 Familiar pequeno", "Familiar pode entregar ataques/mensagens", "Invoca Demônios/Espíritos médios", "Familiar pode absorver LUST destinado a você", "Pacto de Sangue Colossal (Invoca Avatar Mítico controlável)"]
        }
    }
};

const CLASS_TEMPLATES = {
    "Sacerdote": {
        class: "Sacerdote",
        attrMods: { mis: 3, von: 2 },
        conditions: ["fragil_fisico", "fragil_sexual"],
        skillsToCreate: [
            { name: "Mente Consagrada", type: "Passiva", cost: "Passivo", test: "-", effect: "+5 na Defesa de Lust. Sempre que realiza ação de alívio, reduz 10 LUST do aliado mais afetado.", classRestricted: "Sacerdote" },
            { name: "Rito de Expulsão", type: "Mágica", cost: "Cooldown 3", test: "Misticismo vs DF", effect: "Requer fluidos. Aliado: Cura 15+Misticismo. Inimigo: Converte LUST em Energia Sexual (Max 3x Misticismo).", classRestricted: "Sacerdote" }
        ]
    }
};

// --- STATE ---
let characters = [];
let globalArmors = [];
let globalSkills = [];
let activeCharId = null;
let currentTab = 'chars'; // chars, armors, skills

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
    if (db && currentUser) {
        item.ownerId = currentUser.uid;
        db.collection(collection).doc(item.id).set(item).catch(e => console.error("Erro:", e));
    } else {
        const idx = localArray.findIndex(x => x.id === item.id);
        if (idx > -1) localArray[idx] = item;
        else localArray.push(item);
        localStorage.setItem(storageKey, JSON.stringify(localArray));
        renderSidebar();
        if(collection === 'characters') renderDashboard();
    }
}

function deleteFromDB(collection, id, localArray, storageKey) {
    if (db && currentUser) {
        db.collection(collection).doc(id).delete();
    } else {
        const arr = localArray.filter(x => x.id !== id);
        if (collection === 'characters') characters = arr;
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
            } else {
                characters = []; globalArmors = []; globalSkills = []; activeCharId = null;
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
        
        if (activeCharId && !characters.find(c => c.id === activeCharId)) activeCharId = null;
        updateAuthUI(); renderSidebar(); renderDashboard();
    }
}

function canEdit(item) {
    if (!db) return true;
    if (!item || !currentUser) return false;
    if (isMaster()) return true;
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
    const email = `${document.getElementById('inp-username').value.trim().toLowerCase()}@beyonddepths.local`;
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
document.getElementById('tab-armors').onclick = () => { currentTab = 'armors'; updateTabsUI(); renderSidebar(); }
document.getElementById('tab-skills').onclick = () => { currentTab = 'skills'; updateTabsUI(); renderSidebar(); }

function updateTabsUI() {
    ['chars','armors','skills'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if(t === currentTab) {
            el.className = `flex-1 py-3 bg-gold/10 text-gold font-bold transition`;
        } else {
            el.className = `flex-1 py-3 text-gray-400 hover:text-gold transition`;
        }
    });
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
        } else {
            const sub = currentTab === 'armors' ? `DF: +${item.mods.df}` : `Tipo: ${item.type}`;
            div.innerHTML = `
                <div class="flex-1">
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
        globalSkills.forEach(s => {
            const isOwner = (s.ownerId === targetOwner) || isMaster();
            const matchesClass = !s.classRestricted || classNameVal.includes(s.classRestricted.toLowerCase());
            
            if (isOwner && matchesClass) {
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

function updatePointsCounter() {
    const total = (parseInt(document.getElementById('inp-con').value) || 0) +
                  (parseInt(document.getElementById('inp-for').value) || 0) +
                  (parseInt(document.getElementById('inp-vig').value) || 0) +
                  (parseInt(document.getElementById('inp-agi').value) || 0) +
                  (parseInt(document.getElementById('inp-von').value) || 0) +
                  (parseInt(document.getElementById('inp-sed').value) || 0) +
                  (parseInt(document.getElementById('inp-mis').value) || 0);
    
    const counterEl = document.getElementById('points-counter');
    counterEl.innerText = total;
    if(total > 12) counterEl.className = 'text-red-500 font-bold';
    else counterEl.className = 'text-white';
    
    updatePerksMath(); // Refresh perk limits
    return total;
}

document.querySelectorAll('.inp-attr-group input').forEach(inp => {
    inp.addEventListener('input', updatePointsCounter);
});

document.getElementById('btn-add-skill-slot').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2';
    div.innerHTML = `
        <select class="input-dark flex-1 inp-skill-slot"></select>
        <button type="button" class="btn-icon text-red-400" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
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
            document.getElementById('inp-mis').value = parseInt(document.getElementById('inp-mis').value || 0) + (tpl.attrMods.mis || 0);
            document.getElementById('inp-von').value = parseInt(document.getElementById('inp-von').value || 0) + (tpl.attrMods.von || 0);
            
            enforceClassConditions();
            updatePointsCounter();
            
            // Auto-create and attach skills
            for(let sk of tpl.skillsToCreate) {
                const newSk = { id: generateId(), ...sk };
                await saveToDB('global_skills', newSk, globalSkills, 'bd_skills');
                
                // Add slot
                const div = document.createElement('div');
                div.className = 'flex gap-2 mb-2';
                div.innerHTML = `
                    <select class="input-dark flex-1 inp-skill-slot"><option value="${newSk.id}" selected></option></select>
                    <button type="button" class="btn-icon text-red-400" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
                `;
                document.getElementById('skills-select-list').appendChild(div);
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
    
    const totalPoints = updatePointsCounter();
    if (totalPoints > 12 && !isUnlocked && !isMaster()) {
        return alert("O limite para jogadores normais é de 12 pontos somados entre todos os atributos base.");
    }
    
    const isMasterOverride = isMaster() && isUnlocked;
    if (!updatePerksMath() && !isMasterOverride) {
        switchCharTab('perks');
        return alert("Você gastou mais Pontos de Vantagem (PV) do que seus Atributos Base permitem! Reduza suas Vantagens ou aumente o Atributo (se não estiver no limite).");
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
        const baseHp = classNameVal.includes('sacerdote') ? 90 : 10;
        const baseSt = classNameVal.includes('sacerdote') ? 90 : 10;
        newCharData.hp = Math.max(1, baseHp + (newCharData.attr.con * 10));
        newCharData.stamina = Math.max(1, baseSt + (newCharData.attr.vig * 5));
        newCharData.lust = 0;
        newCharData.energy = classNameVal.includes('sacerdote') ? 50 : 35;
        
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
    const isSacerdote = char.class && char.class.toLowerCase().includes('sacerdote');
    
    const baseHp = isSacerdote ? 90 : 10;
    const baseSt = isSacerdote ? 90 : 10;
    
    // Apply Condition Multipliers
    let maxHp = Math.max(1, Math.floor((baseHp + (char.attr.con * 10)) * mods.hp_mult));
    let maxSt = Math.max(1, Math.floor((baseSt + (char.attr.vig * 5)) * mods.st_mult));
    const maxEn = isSacerdote ? 50 : 35;
    const maxLu = isSacerdote ? 120 : 100;
    
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

    let ecstasyLimiar = mods.ecstasy_set !== null ? mods.ecstasy_set : ((isSacerdote ? 20 : 25) + char.attr.vig);
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
    const isSacerdote = char.class && char.class.toLowerCase().includes('sacerdote');
    
    if (stat === 'lust') {
        const mx = isSacerdote ? 120 : 100;
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'hp') {
        const mx = Math.max(1, Math.floor(((isSacerdote ? 90 : 10) + (char.attr.con * 10)) * mods.hp_mult));
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'stamina') {
        const mx = Math.max(1, Math.floor(((isSacerdote ? 90 : 10) + (char.attr.vig * 5)) * mods.st_mult));
        if(char[stat] > mx) char[stat] = mx;
        if(char[stat] < 0) char[stat] = 0;
    } else if (stat === 'energy') {
        const mx = isSacerdote ? 50 : 35;
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
            row.className = 'bg-black/60 p-2 rounded border border-white/5';
            row.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <div class="text-sm font-bold text-gray-200">${escapeHTML(pName)}</div>
                    <div class="flex items-center gap-2 bg-black/50 rounded px-2 py-1">
                        <button type="button" class="text-red-400 hover:text-red-300" onclick="adjustPerk('${attrKey}', '${pName.replace(/'/g, "\\'")}', -1)"><i class="fa-solid fa-minus"></i></button>
                        <span class="text-xs font-mono text-gold w-8 text-center" id="plvl-${attrKey}-${btoa(pName).replace(/=/g, '')}">Nv 0</span>
                        <button type="button" class="text-green-400 hover:text-green-300" onclick="adjustPerk('${attrKey}', '${pName.replace(/'/g, "\\'")}', 1)"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
                <div class="text-[10px] text-gray-400 min-h-[1.5rem]" id="pdesc-${attrKey}-${btoa(pName).replace(/=/g, '')}">Desativado.</div>
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

    Object.keys(PERKS_DB).forEach(attrKey => {
        const maxPV = Math.max(0, attrs[attrKey] * 3);
        let usedPV = 0;
        
        // Reset Visuals
        Object.keys(PERKS_DB[attrKey].perks).forEach(pName => {
            const safeName = btoa(pName).replace(/=/g, '');
            const lvlEl = document.getElementById(`plvl-${attrKey}-${safeName}`);
            const descEl = document.getElementById(`pdesc-${attrKey}-${safeName}`);
            if (lvlEl) { lvlEl.innerText = `Nv 0`; lvlEl.classList.remove('text-purple-400'); }
            if (descEl) descEl.innerText = 'Desativado.';
        });

        if (draftPerks[attrKey]) {
            Object.keys(draftPerks[attrKey]).forEach(pName => {
                const lvl = draftPerks[attrKey][pName];
                if (lvl > 0) {
                    usedPV += PERK_COSTS[lvl];
                    const safeName = btoa(pName).replace(/=/g, '');
                    const lvlEl = document.getElementById(`plvl-${attrKey}-${safeName}`);
                    const descEl = document.getElementById(`pdesc-${attrKey}-${safeName}`);
                    if (lvlEl && descEl && PERKS_DB[attrKey].perks[pName]) {
                        lvlEl.innerText = `Nv ${lvl}`;
                        descEl.innerText = PERKS_DB[attrKey].perks[pName][lvl-1];
                        if(lvl === 5) lvlEl.classList.add('text-purple-400');
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
        }
    });
    
    return allValid;
}

window.adjustPerk = function(attrKey, perkName, delta) {
    if(!draftPerks[attrKey]) draftPerks[attrKey] = {};
    let lvl = draftPerks[attrKey][perkName] || 0;
    lvl += delta;
    if(lvl < 0) lvl = 0;
    if(lvl > 5) lvl = 5;
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

// INIT
initPerksUI();
loadData();
