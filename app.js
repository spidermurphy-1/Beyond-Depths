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

const PERK_COSTS = [0, 1, 2, 3, 5, 9, 14, 20];
    const PERKS_DB = {
    "sed": {
        "name": "Sedução",
        "icon": "fa-heart",
        "perks": {
            "Dotação / Membro": [
                "1: Tamanho notável. Dano LUST em penetração +1.",
                "2: Volume que distrai por baixo das roupas. Dano LUST +1d2.",
                "3: Formato e espessura perfeitamente estimulantes. Dano LUST +1d3.",
                "4: Penetração Profunda: Libera Habilidade de causar Atordoamento ao penetrar. Dano LUST +1d4.",
                "5: Inesgotável e pulsante, não perde a rigidez por dor. Dano LUST +2d2.",
                "6: Proporções monstruosas que distendem a razão do alvo. Dano LUST +2d3.",
                "7: O pilar absoluto do prazer. Destrói a sanidade (Mind Break) rapidamente. Dano LUST +3d4, Testes +3."
            ],
            "Peitos/Peitoral": [
                "1: Seu busto chama atenção. Dano de LUST +1",
                "2: O balanço hipnotiza. Dano de LUST +1d2",
                "3: O toque neles excita. Dano de LUST +1d3",
                "4: Deslumbramento: Inimigos têm -1 em Testes contra você. Dano LUST +1d4",
                "5: Tamanho e maciez surreais. Dano de LUST +2d2, Testes +2",
                "6: Sufocamento macio. Pode usar os peitos para atacar. Dano +2d3",
                "7: Fartura divina. Dano de LUST +3d4, Testes +3"
            ],
            "Quadril/Glúteos": [
                "1: Quadril largo e convidativo. Defesa LUST +1",
                "2: Movimentos sinuosos. Defesa LUST +1, Dano +1d2",
                "3: Uma retaguarda invejável. Defesa LUST +1, Dano +1d3",
                "4: Hipnose Pélvica: Inimigos corpo-a-corpo perdem 1 Ação de Movimento. Dano +1d4",
                "5: Difícil tirar os olhos. Defesa LUST +2, Dano +2d2",
                "6: Cada passo é uma provocação de área. Dano +2d3",
                "7: Proporções absolutas, domina ambientes. Defesa LUST +3, Dano +3d4"
            ],
            "Lábios/Fala": [
                "1: Lábios atraentes. Dano LUST +1",
                "2: Sussurros excitantes. Dano LUST +1d2",
                "3: Gemidos que afetam a mente. Dano LUST +1d3",
                "4: Voz de Súcubo/Íncubo: Libera a habilidade 'Comando Verbal'. Dano LUST +1d4",
                "5: Promessas vulgares. Dano LUST +2d2, Testes +2",
                "6: Apenas ouvir sua voz excita inimigos próximos. Dano LUST +2d3",
                "7: Um simples sussurro quebra mentes. Dano LUST +3d4, Testes +3"
            ],
            "Mãos/Dedos": [
                "1: Toque sensível. Dano LUST +1",
                "2: Dedos ágeis. Dano LUST +1d2",
                "3: Carícias exatas. Dano LUST +1d3",
                "4: Ponto G: Ganha Vantagem em qualquer teste de masturbação. Dano LUST +1d4",
                "5: Mãos profanas que ignoram defesas. Dano LUST +2d2, Testes +2",
                "6: Massagens que derretem resistências. Dano LUST +2d3",
                "7: Dominância completa pelos dedos. Dano LUST +3d4, Testes +3"
            ],
            "Pés/Pernas": [
                "1: Pés bonitos e bem cuidados. Dano LUST +1",
                "2: Fetiche moderado. Dano LUST +1d2",
                "3: Toque provocante por baixo da mesa. Dano LUST +1d3",
                "4: Pisada Humilhante: Pode imobilizar alvos usando os pés (+1d4 LUST).",
                "5: Capaz de levar ao delírio sem usar as mãos. Dano LUST +2d2",
                "6: Adoração. Inimigos ajoelhados sofrem Desvantagem contra você. Dano LUST +2d3",
                "7: Um passo em cima e o alvo já implora. Dano LUST +3d4, Testes +3"
            ],
            "Fluidos Excitantes": [
                "1: Sabor agradável. Dano LUST +1 em beijos/oral",
                "2: Cheiro viciante. Dano LUST +1d2",
                "3: Secreções volumosas. Dano LUST +1d3",
                "4: Afrodísiaco: Beber seus fluidos cura 1d6 HP de aliados. Dano LUST +1d4",
                "5: Contato com a pele inimiga queima de tesão. Dano LUST +2d2",
                "6: Inundação. Ambientes ficam escorregadios e inebriantes. Dano LUST +2d3",
                "7: Néctar Divino: Vicia instantaneamente. Dano LUST +3d4, Testes +3"
            ],
            "Bondage / Amarras": [
                "1: Conhecimento de nós. Dano LUST +1 com cordas",
                "2: Amarras rápidas. Dano LUST +1d2",
                "3: Shibari doloroso/prazeroso. Dano LUST +1d3",
                "4: Especialista: Libera a habilidade 'Imobilização Erótica'. Dano LUST +1d4",
                "5: Deixa os alvos expostos (reduz Defesa LUST deles). Dano LUST +2d2",
                "6: Amarras apertam sozinhas a cada turno. Dano LUST +2d3",
                "7: Prisão Intransponível de teias/cordas. Dano LUST +3d4, Testes +3"
            ],
            "Feromônios": [
                "1: Cheiro leve e atrativo. Dano LUST +1 passivo",
                "2: Causa distração. Dano LUST +1d2",
                "3: Nubla a razão de alvos próximos. Dano LUST +1d3",
                "4: Cio Induzido: Força Teste de VON nos inimigos ou ficam Excitados. Dano +1d4",
                "5: Exala um odor que enfraquece homens/mulheres. Dano LUST +2d2",
                "6: Inimigos no alcance sentem calor intenso constante. Dano LUST +2d3",
                "7: Nuvem Dominadora. O ar ao seu redor derrete a sanidade. Dano +3d4, Testes +3"
            ]
        }
    },
    "for": {
        "name": "Força",
        "icon": "fa-dumbbell",
        "perks": {
            "Armas Colossais / Machado e Montante": [
                "1: Balanço pesado. Dano Físico Pesado +1.",
                "2: Quebra escudos de madeira. Dano Físico Pesado +1d2.",
                "3: Força contundente. Dano Físico Pesado +1d3.",
                "4: Trespasse (Cleave): Se matar um alvo, o dano restante passa para um inimigo adjacente.",
                "5: Golpes arremessam inimigos leves. Dano Físico Pesado +2d2.",
                "6: Cada golpe estilhaça o solo (Dano em pequena área). Dano Físico Pesado +2d3.",
                "7: Um furacão de puro aço pesado. Dano Físico Pesado +3d4, Testes +3"
            ],
            "Punhos / Artes Marciais": [
                "1: Punhos calejados. Dano Físico +1 em socos.",
                "2: Postura de luta. Dano Físico +1d2.",
                "3: Socos precisos em pontos fracos. Dano Físico +1d3.",
                "4: Quebra-Guarda: Libera Habilidade de ignorar a armadura do alvo por 1 turno. Dano +1d4",
                "5: Sequência de golpes relâmpago. Dano Físico +2d2.",
                "6: Golpes causam sangramento ou concussões graves. Dano Físico +2d3.",
                "7: Mestria Absoluta. Mãos letais que atravessam carne e aço. Dano Físico +3d4, Testes +3"
            ],
            "Braços": [
                "1: Braços definidos. Dano Físico +1",
                "2: Bíceps duros. Dano Físico +1d2",
                "3: Capaz de levantar parceiros com facilidade. Dano Físico +1d3",
                "4: Golpe Atordoante: Libera a habilidade de causar Stun (Atordoar). Dano Fís +1d4",
                "5: Quase quebra ossos. Dano Físico +2d2, Testes +2",
                "6: Domina alvos na força bruta. Dano Físico +2d3",
                "7: Músculos surreais, ninguém escapa de um abraço. Dano Físico +3d4, Testes +3"
            ],
            "Pegada/Mãos": [
                "1: Aperto firme. Redução Dano +1",
                "2: Mãos pesadas. Redução Dano +1d2",
                "3: Difícil de soltar. Redução Dano +1d3",
                "4: Mãos Esmagadoras: Vantagem absoluta em testes de Agarrar. Redução Dano +1d4",
                "5: Quebra itens facilmente. Redução Dano +2d2, Testes +2",
                "6: Aperto sufocante, paralisa nervos. Redução Dano +2d3",
                "7: Onde você agarra, você domina por completo. Redução Dano +2d4, Testes +3"
            ],
            "Costas / Ombros": [
                "1: Postura forte. Redução Dano +1",
                "2: Suporta peso morto nas costas. Redução Dano +1d2",
                "3: Empurrão violento. Dano Físico +1d3",
                "4: Ombrada: Libera habilidade de Investida (Knockback). Redução +1d4",
                "5: Músculos absorvem impacto como rocha. Redução Dano +2d2",
                "6: Impossível de ser derrubado. Redução Dano +2d3",
                "7: Parede humana inabalável. Redução Dano +2d4, Testes +3"
            ],
            "Esmagamento Corporal": [
                "1: Peso bem distribuído. Dano Físico +1 em agarrões",
                "2: Chaves de corpo dolorosas. Dano Físico +1d2",
                "3: Estrangulamento. Dano Físico +1d3",
                "4: Abraço de Urso: Libera habilidade de esmagar órgãos/stamina. Dano +1d4",
                "5: Restringe o ar do oponente. Dano Físico +2d2",
                "6: Ossos rangem com sua proximidade. Dano Físico +2d3",
                "7: Esmagamento letal ou humilhante absoluto. Dano Físico +3d4, Testes +3"
            ],
            "Arremesso / Impacto": [
                "1: Joga coisas com força. Dano Físico +1",
                "2: Pode jogar pequenos inimigos. Dano Físico +1d2",
                "3: Arremessa armas com letalidade. Dano Físico +1d3",
                "4: Catapulta: Libera habilidade de arremessar aliados/inimigos a 10m. Dano +1d4",
                "5: Impactos quebram paredes. Dano Físico +2d2",
                "6: Joga monstros pesados para o alto. Dano Físico +2d3",
                "7: Meteoros humanos. Dano Físico +3d4, Testes +3"
            ],
            "Imobilização Bruta": [
                "1: Sabe usar o peso. Testes +1 para imobilizar",
                "2: Trava articulações. Dano Físico +1d2 continuado",
                "3: Imobiliza com uma mão só. Dano Físico +1d3 continuado",
                "4: Submissão Forçada: Imobilização zera a esquiva do alvo. Dano +1d4",
                "5: Pode imobilizar dois alvos de uma vez. Dano Físico +2d2",
                "6: Alvos imobilizados perdem stamina rapidamente. Dano Físico +2d3",
                "7: Cadeia Humana. Ninguém escapa sob seu corpo. Dano +3d4, Testes +3"
            ]
        }
    },
    "agi": {
        "name": "Agilidade",
        "icon": "fa-person-running",
        "perks": {
            "Visão de Águia / Arquearia": [
                "1: Mira firme. Dano Físico à distância +1.",
                "2: Olhos afiados. Dano à distância +1d2 e ignora meia-cobertura.",
                "3: Tiros rápidos. Dano à distância +1d3.",
                "4: Tiro Preciso: Libera Habilidade de mirar em pontos vitais (Dobra chance de Acerto Crítico).",
                "5: Disparos atravessam alvos macios. Dano à distância +2d2.",
                "6: Acerta o alvo de olhos vendados pelo som. Dano à distância +2d3.",
                "7: Chuva de flechas/balas indefensável. Dano à distância +3d4, Testes de Mira +3"
            ],
            "Lâminas Curtas / Combate Veloz": [
                "1: Precisão letal com adagas/facas. Dano Físico +1.",
                "2: Cortes rápidos. Dano Físico +1d2.",
                "3: Finta e Estocada. Dano Físico +1d3.",
                "4: Sangramento: Acertos críticos causam perda de 1d4 HP contínua.",
                "5: Ataca e recua sem gerar ataque de oportunidade. Dano Físico +2d2.",
                "6: Mil cortes. Golpes quebram a defesa e armadura do alvo. Dano +2d3.",
                "7: Tempestade de aço invisível. Dano Físico +3d4, Testes +3"
            ],
            "Armadilhas / Emboscada": [
                "1: Sabe criar nós e armadilhas simples. Testes Furtivos +1.",
                "2: Venenos rápidos nas lâminas. Dano de Emboscada +1d2.",
                "3: Posição perfeita. Dano de Emboscada +1d3.",
                "4: Fio de Tropeço: Libera armadilhas no meio do combate que causam Knockdown.",
                "5: Prepara explosivos leves ou dardos peçonhentos. Dano Emboscada +2d2.",
                "6: Inimigos que ativam sua armadilha ficam Desarmados/Atordoados.",
                "7: Predador invisível. O campo minado perfeito. Dano Armadilha/Emboscada +3d4, Testes +3"
            ],
            "Pernas de Velocidade": [
                "1: Passos rápidos. +1m de deslocamento livre.",
                "2: Fôlego de corredor. Pode fugir de embates com Vantagem.",
                "3: Agilidade pura. Ignora penalidade de terreno ao se mover.",
                "4: Velocista: Libera a habilidade de usar 2 Ações de Movimento no turno.",
                "5: Passos como o vento. +2 Defesa contra projéteis se moveu neste turno.",
                "6: Quase teleporte visual de tão rápido. +2 Iniciativa.",
                "7: Aceleração insana. Move-se antes de qualquer um reagir. +3 Iniciativa, Defesa +3"
            ],
            "Furtividade Absoluta / Sombras": [
                "1: Sabe onde pisar. +1 Teste Furtividade.",
                "2: Respiração silenciada. +1d2 Dano Furtivo.",
                "3: Oculta-se em qualquer sombra leve. +1d3 Dano Furtivo.",
                "4: Camuflagem: Libera Habilidade de ficar invisível a olho nu por 1 turno.",
                "5: Bate-carteiras mestre e assassino silencioso. +2d2 Dano Furtivo.",
                "6: Nem o faro de monstros te acha. +2d3 Dano Furtivo.",
                "7: Um fantasma de sangue. Dano Furtivo letal imediato. +3d4, Testes +3"
            ],
            "Flexibilidade": [
                "1: Corpo flexível. Defesa +1",
                "2: Alcance em posições exóticas. Defesa +1",
                "3: Escapa fácil de amarras. Defesa +2",
                "4: Contorcionismo: Libera Vantagem para escapar de QUALQUER agarre. Defesa +2, Testes +1",
                "5: Dobra o corpo em ângulos impossíveis. Defesa +3, Testes +2",
                "6: Praticamente água. Defesa +3",
                "7: Uma aberração ginástica, inagarrável. Defesa +3, Testes +3, Dano LUST +2d3"
            ],
            "Pernas / Acrobacia": [
                "1: Pernas ágeis. Dano +1",
                "2: Chutes rápidos. Dano +1d2",
                "3: Saltos altos. Dano +1d3",
                "4: Parkour: Ignora terreno difícil e ganha +1 Ação de Movimento. Dano +1d4",
                "5: Montaria rápida. Dano +2d2",
                "6: Movimentos impossíveis de prever. Dano +2d3",
                "7: Causa dano ou escapa antes de ser notado. Dano +3d4, Testes +3"
            ],
            "Reflexos / Esquiva": [
                "1: Reações rápidas. Defesa +1",
                "2: Esquiva graciosa. Defesa +1, Dano contra-ataque +1d2",
                "3: Prevê movimentos básicos. Defesa +2",
                "4: Tempo de Bala: Libera Esquiva Perfeita (anula 1 ataque por combate). Defesa +2",
                "5: Desvia de projéteis com facilidade. Defesa +3",
                "6: Oponentes frequentemente se atacam tentando te acertar. Defesa +3",
                "7: Intocável. Dança pelo campo de batalha rindo. Defesa +3, Testes +3"
            ],
            "Mãos Leves / Furtividade": [
                "1: Passos silenciosos. Testes +1 em furtividade",
                "2: Rouba pequenos itens. Dano extra furtivo +1d2",
                "3: Despe oponentes sem eles notarem. Dano furtivo +1d3",
                "4: Sombras: Ficar parado no escuro te torna quase invisível. Dano Furtivo +1d4",
                "5: Desata nós cegos em segundos. Dano Furtivo +2d2",
                "6: Apalpa ou rouba no meio de combate despercebido. Dano furtivo +2d3",
                "7: Um fantasma tátil. Dano Furtivo +3d4, Testes +3"
            ],
            "Ritmo de Cavalgada": [
                "1: Bom controle pélvico. Dano LUST +1",
                "2: Mantém o parceiro no limite. Dano LUST +1d2",
                "3: Dita o ritmo sem se cansar. Dano LUST +1d3",
                "4: Sentada Precisa: Libera habilidade que causa dano Massivo em alvos deitados. Dano +1d4",
                "5: Movimento blur de tão rápido. Dano LUST +2d2",
                "6: Extrai fluidos/alma do parceiro pela fricção. Dano LUST +2d3",
                "7: O ápice do prazer sobre o alvo, controle total. Dano LUST +3d4, Testes +3"
            ],
            "Fuga de Amarras": [
                "1: Pulso fino. +1 em Testes de Fuga.",
                "2: Desloca o ombro voluntariamente para sair de amarras. +2 Testes de Fuga.",
                "3: Pele escorregadia facilita escapar. Defesa LUST +2",
                "4: Mestre do Escape: Escapar de cordas gasta apenas Ação de Movimento.",
                "5: Usa as amarras soltas contra o inimigo. Defesa +3",
                "6: Imune a imobilizações não-mágicas de inimigos do mesmo tamanho.",
                "7: Escapa até de prisões mágicas de restrição corpórea. Defesa +3, Testes +3"
            ]
        }
    },
    "con": {
        "name": "Constituição",
        "icon": "fa-shield-heart",
        "perks": {
            "Muralha Viva / Uso de Escudo": [
                "1: Postura defensiva firme. Defesa Física +1.",
                "2: Sabe usar escudos. Redução Dano +1d2 se portando escudo.",
                "3: Protege os flancos. Defesa Física +2.",
                "4: Cobertura Aliada: Libera habilidade de receber o dano no lugar de um aliado adjacente.",
                "5: Ignora 50% de dano de fogo/gelo ao se cobrir. Defesa Física +3.",
                "6: Golpes fracos rebatem em você sem causar dano. Redução Dano +2d3.",
                "7: Fortaleza Ambulante absoluta. Defesa +3, Testes de Bloqueio +3, Redução +2d4"
            ],
            "Abdômen / Core": [
                "1: Barriga firme. Redução de Dano Físico +1",
                "2: Tanquinho. Redução de Dano Físico +1d2",
                "3: Aguenta golpes limpos. Redução de Dano Físico +1d3",
                "4: Núcleo de Ferro: Imunidade a Knockdown (Derrubado). Redução +1d4",
                "5: Ignora dor moderada. Redução de Dano Físico +2d2",
                "6: Costas largas, barriga de aço. Redução de Dano Físico +2d3",
                "7: Corpo como uma muralha, quase indestrutível. Redução de Dano Físico +2d4, Testes +3"
            ],
            "Coxas": [
                "1: Pernas grossas. Dano LUST +1",
                "2: Esmaga rostos leves. Dano LUST +1d2",
                "3: Alvo não escapa de montarias. Dano LUST +1d3",
                "4: Chave de Coxa: Libera a habilidade de sufocar pelo pescoço usando as pernas. Dano +1d4",
                "5: Fetiche mortal, pressão absurda. Dano LUST +2d2",
                "6: Quebra melancias e mentes. Dano LUST +2d3",
                "7: Aperto definitivo entre as pernas. Ninguém escapa. Dano LUST +3d4, Testes +3"
            ],
            "Pele Sensível / Sedosa": [
                "1: Pele sensível e lisa. Defesa LUST +1",
                "2: Suor levemente perfumado. Defesa LUST +1",
                "3: Maciez absurda ao toque. Defesa LUST +2",
                "4: Masoquismo: Converte Dano Físico sofrido em +1 LUST Dano nos seus ataques. Defesa +2",
                "5: Lubrificação natural extrema, inagarrável. Defesa LUST +3",
                "6: Desliza em qualquer fricção. Imune a danos por atrito. Defesa LUST +3",
                "7: Intocável por dor. Contato direto gera apenas prazer puro. Defesa LUST +3, Testes +3"
            ],
            "Venenos / Drogas": [
                "1: Resistência leve a drogas. Redução de Dano Químico/LUST +1",
                "2: Fígado resistente. Redução de Dano Químico/LUST +1d2",
                "3: Imune a efeitos alucinógenos menores. Redução Químico +1d3",
                "4: Sangue Doce: Monstros que te morderem perdem 1 Ação por prazer. Redução +1d4",
                "5: Resiste a doses cavalares de afrodisíacos. Redução +2d2",
                "6: Drogas sexuais só funcionam se você permitir. Redução +2d3",
                "7: Metabolismo que purifica toxinas supremas. Redução Dano +2d4, Testes +3"
            ],
            "Tolerância a Dor": [
                "1: Aguenta tapas duros. Redução Dano Físico +1",
                "2: Sorri sangrando. Redução Dano Físico +1d2",
                "3: Ignora cortes superficiais. Redução Dano Físico +1d3",
                "4: Adrenalina: Quando com HP menor que 50%, ganha Vantagem em Dano. Redução +1d4",
                "5: Continua lutando com ossos quebrados. Redução Dano Físico +2d2",
                "6: Choques e chicotes causam zero recuo. Redução Dano Físico +2d3",
                "7: Um Juggernaut de dor absorvida. Redução Dano Físico +2d4, Testes +3"
            ],
            "Vigor Reprodutivo": [
                "1: Alta capacidade reprodutiva. +10 de LUST Máximo.",
                "2: Glândulas ativas. Recupera +5 LUST ao dormir.",
                "3: Pode procriar/gerar fluidos em quantias anormais sem cansar.",
                "4: Máquina: Orgasmos não te deixam atordoado e não causam Mind Break Nível 1.",
                "5: Gera litros de fluidos. Absorver seus fluidos cura 1d6 Stamina do parceiro.",
                "6: Nunca fica exausto por descargas reprodutivas. Testes LUST +2",
                "7: Fonte eterna de prazer. Seu corpo nutre e submete qualquer um. Redução LUST +2d4"
            ]
        }
    },
    "von": {
        "name": "Vontade",
        "icon": "fa-brain",
        "perks": {
            "Provocação de Batalha (Aggro)": [
                "1: Gritos imponentes. +1 em Testes de Intimidação.",
                "2: Postura ameaçadora. Dano intimidador +1d2.",
                "3: Insulta as mães dos inimigos. Atrai foco facilmente.",
                "4: Chamado pro Duelo (Taunt): Força o inimigo a te focar por 2 turnos ou sofrer Desvantagem.",
                "5: Inimigos têm -2 de Defesa se não baterem em você. Defesa Física +2.",
                "6: Ao ser atacado corpo-a-corpo, você causa 1d4 de Dano LUST/Mental no atacante.",
                "7: O senhor do campo de batalha, todos te atacam cegamente. Defesa +3, Testes +3"
            ],
            "Resistência a Provocações": [
                "1: Difícil de irritar ou seduzir. Defesa LUST +1",
                "2: Mente calma perante xingamentos. Defesa LUST +1d2",
                "3: Ignora investidas eróticas. Defesa LUST +1d3",
                "4: Estoicismo: Imune à Condição 'Provocado/Taunt'. Defesa LUST +1d4",
                "5: Frio como gelo. Defesa LUST +2d2",
                "6: Desligamento emocional a vontade. Defesa LUST +2d3",
                "7: Mente de Titã, inquebrável por palavras. Defesa LUST +3d4, Testes +3"
            ],
            "Resistência a Ilusões": [
                "1: Percebe ilusões fracas. Testes de VON +1",
                "2: Foco aguçado para detalhes falsos. Testes de VON +2",
                "3: Enxerga além de fumaças hipnóticas. Testes de VON +3",
                "4: Visão Verdadeira: Ignora magias de invisibilidade ou clones. Redução LUST Mágico +1d4",
                "5: Dissipa encantos menores no toque. Redução LUST Mágico +2d2",
                "6: Destrói ilusões apenas ignorando-as. Redução LUST Mágico +2d3",
                "7: Fortalezas Mentais anulam completamente magias ilusórias. Redução LUST Mágico +3d4"
            ],
            "Êxtase de Cura": [
                "1: Prazer curativo. Ao sofrer Dano LUST, recupera HP igual a 5% desse valor.",
                "2: Transmutação de Dor: Converte 10% do Dano LUST sofrido em HP.",
                "3: Regeneração Nervosa: Converte 15% do Dano LUST sofrido em HP.",
                "4: Resiliência Luxuriosa: Converte 20% do Dano LUST em HP. Libera a cura de aliados por toque.",
                "5: Absorção Extática: Converte 25% do Dano LUST em HP.",
                "6: Corpo Viciado: Converte 30% do Dano LUST em HP. Testes de Vontade +2",
                "7: Orgasmos Revigorantes: Converte 40% do Dano LUST em HP e orgasmos curam 20 HP extra."
            ],
            "Presença Dominadora": [
                "1: Postura imponente. Dano LUST psicológico +1",
                "2: Olhares que julgam e excitam. Dano LUST +1d2",
                "3: Ajoelham perante sua voz. Dano LUST +1d3",
                "4: Aura do Rei/Rainha: Libera habilidade 'Comando de Submissão'. Dano LUST +1d4",
                "5: Alvos sentem medo misturado com tesão. Dano LUST +2d2",
                "6: Sua presença exige respeito absoluto, paralisando fracos. Dano LUST +2d3",
                "7: Comandos se tornam leis absolutas na mente do alvo. Dano LUST +3d4, Testes +3"
            ],
            "Submissão Focada": [
                "1: Calmo ao ser dominado. +1 em Testes quando imobilizado.",
                "2: Claridade na corda. +2 na Defesa Fís/Lust se estiver amarrado.",
                "3: Sofre menos dano real de golpes. Redução +1d3 em atos BDSM.",
                "4: Força do Submisso: Se estiver amarrado/dominado, ganha Vantagem em ações de apoio.",
                "5: Adoração profunda pelo Mestre te blinda. Redução LUST +2d2",
                "6: Refúgio Mental: Ignora dano psicológico enquanto obedece a uma ordem. Redução +2d3",
                "7: Imunidade a traumas em masoquismo. Prospera na dor ordenada. Redução +2d4, Testes +3"
            ],
            "Bloqueio de Trauma": [
                "1: Resiliência mental. Ignora debuffs emocionais leves (Tristeza).",
                "2: Mente compartimentada. Ignora 1 penalidade mental por combate.",
                "3: Adia até 10 pontos de Dano LUST para o final do combate.",
                "4: Despertar: 1x por combate, ao cair a 0 HP, volta com 1 HP e ganha +1 em Testes.",
                "5: Coração Frio: Imunidade total a Pânico, Medo ou Choque.",
                "6: Ignora penalidades de dor extrema por membros feridos.",
                "7: Mente acima do corpo. Continua lutando mesmo despedaçado. Testes +3"
            ]
        }
    },
    "vig": {
        "name": "Vigor",
        "icon": "fa-battery-full",
        "perks": {
            "Fôlego": [
                "1: Fôlego extra. +10 de Stamina máxima.",
                "2: Conserva energia. Habilidades custam -2 Stamina (mínimo 1).",
                "3: Recuperação ágil. Regenera 5 Stamina extra por turno ao não atacar.",
                "4: Segundo Fôlego: Libera Habilidade de curar 50% da Stamina 1x por combate.",
                "5: Fôlego de atleta de elite. Recupera +10 Stamina por turno. Testes +1",
                "6: Sexo vigoroso contínuo. Imune à condição 'Asfixiado'.",
                "7: Energia infinita em atos sexuais. Nunca perde a ação por cansaço. Dano LUST +3d4"
            ],
            "Metabolismo Regenerativo": [
                "1: Cura leve. Regenera 1 HP por turno passivamente.",
                "2: Sono eficiente. Descansos curtos recuperam 50% mais Stamina.",
                "3: Nutrição ativa. Consumir fluidos ou poções recupera +1d4 Stamina extra.",
                "4: Fator de Cura: Regenera 1d4 HP passivamente a cada turno no combate.",
                "5: Cicatrização instantânea de cortes pequenos. Ignora dano de Sangramento leve.",
                "6: Ignora efeitos venenosos que reduzam regeneração. Testes +2",
                "7: Regeneração total imediata após descanso curto. Testes +3, Redução Dano +2d4"
            ],
            "Orgasmos Múltiplos": [
                "1: Resistente. Ignora a penalidade de Iniciativa/Ação do 1º orgasmo.",
                "2: Reduz em -2 o Dano LUST sofrido no turno logo após gozar.",
                "3: Permite até 3 orgasmos antes de sofrer Mind Break nível 1.",
                "4: Catarse Contínua: Cada orgasmo buffa o seu próximo ataque de LUST em +1d4.",
                "5: Gozos não esgotam mais sua Stamina.",
                "6: O prazer se retroalimenta gerando +10 Stamina a cada clímax.",
                "7: Cascata de Clímax paralisante. Orgasmar causa 3d4 Dano LUST em área."
            ],
            "Imparável": [
                "1: Ignora dores nas juntas. +1 em testes Físicos ao estar com HP menor que 50%.",
                "2: Ignora penalidades de movimentação por terreno difícil.",
                "3: Resiste à exaustão. Ignora penalidades de Exaustão Nível 1.",
                "4: Motor a Diesel: Zero Stamina não impede de atacar (custa HP no lugar).",
                "5: Quebra barreiras pelo cansaço. Ataques pesados rolam com Vantagem sob fadiga.",
                "6: Nunca recebe Desvantagem em jogadas por estar cansado.",
                "7: Máquina de carne eterna. Imune a exaustão total. Testes +3"
            ],
            "Coração Quente": [
                "1: Sangue quente. Defesa contra danos de Gelo/Químico +1.",
                "2: O sangue ferve rápido. Converte a primeira rodada de excitação em +2 Stamina.",
                "3: Pressão suporta extremos. Testes +1 para manter a consciência ao desmaiar.",
                "4: Adrenalina Erótica: Ganha Vantagem se estiver com mais LUST que HP atual.",
                "5: Aquece o corpo a níveis de dar queimaduras sensoriais de prazer a quem tocar.",
                "6: O coração purifica o corpo de toxinas afrodisíacas. Testes +2",
                "7: Tambores de guerra no peito. Imune a paradas cardíacas ou sustos letais. Redução Dano +2d4"
            ],
            "Desespero Vital": [
                "1: Fica agressivo ferido. Dano +1 (HP < 50%)",
                "2: Mais rápido sob pressão. Dano +1d2 (HP < 50%)",
                "3: Bate mais forte quase morto. Dano +1d3 (HP < 30%)",
                "4: Último Suspiro: Dano aumenta em +2d4 quando o HP estiver menor que 20%.",
                "5: A Dor vira fúria cega. Ignora metade da Defesa Física inimiga na exaustão.",
                "6: Ataques suicidas e violentos. Dano +2d3 e Vantagem garantida se HP < 10%.",
                "7: Fera encurralada. Dano +3d4 e imune a Knockdown. Testes +3 quando ferido"
            ]
        }
    },
    "mis": {
        "name": "Misticismo",
        "icon": "fa-book-journal-whills",
        "perks": {
            "Senso Predatório / Magia Rastreadora": [
                "1: Visão no escuro básica. Percepção Mágica +1.",
                "2: Faro mágico leve. Testes Investigação +2.",
                "3: Consegue ver pegadas térmicas/mágicas recentes.",
                "4: Sentido Aranha Arcana: Nunca é pego de surpresa (Anula turno de Emboscada inimiga).",
                "5: Lê as intenções hostis e marca um alvo (O alvo perde 2 de Defesa passiva).",
                "6: Vê perfeitamente através de paredes finas e escuridão mágica.",
                "7: Radar vivo. Sentidos ilimitados num raio de 50m. Testes +3 absolutos"
            ],
            "Magia Branca / Cura Divina": [
                "1: Conhece primeiros socorros mágicos. Cura +1 HP extra.",
                "2: Suas magias de cura fecham feridas na hora. Cura +1d2 HP extra.",
                "3: Purifica venenos de baixo nível no toque. Cura +1d3 HP extra.",
                "4: Canalização de Luz: Libera Feitiço de Cura em Área para aliados.",
                "5: Ressuscitação primária (Traz alguém estabilizado instantaneamente).",
                "6: Apenas estar perto de você recupera 1d6 HP passivo dos aliados por turno.",
                "7: Salvação Milagrosa. Traz os quase mortos de volta a vida nova. Testes de Cura +3"
            ],
            "Magia Destrutiva (Elemental/Arcana)": [
                "1: Pequenas chamas/raios saem dos dedos. Dano Mágico Físico +1.",
                "2: Pode incendiar, congelar ou eletrocutar alvos. Dano Mágico +1d2.",
                "3: Magia molda o campo de batalha. Dano Mágico +1d3.",
                "4: Sobrecarga: Libera Feitiço de Área Destrutiva (Custo HP/Stamina). Dano +1d4",
                "5: Ignora resistências elementais comuns. Dano Mágico +2d2.",
                "6: Destruição concentrada que vaporiza armaduras. Dano Mágico +2d3.",
                "7: Uma ogiva arcana ambulante. Dano Mágico Físico +3d4, Testes +3"
            ],
            "Aura": [
                "1: Presença leve que esfria/aquece o ar. Dano Mágico +1",
                "2: Aura brilhante intimida fracos. Dano Mágico +1d2",
                "3: Assusta pequenos monstros ou atrai curiosos. Dano Mágico +1d3",
                "4: Intimidação Arcana: Libera Habilidade de Área para afugentar (Teste de VON). Dano +1d4",
                "5: O ar pesa perto de você gerando tontura. Dano Mágico +2d2",
                "6: Magia escorre pelo seu corpo em chispas visíveis. Dano Mágico +2d3",
                "7: Aura divina/demoníaca constante. Dano Mágico +3d4, Testes +3"
            ],
            "Controle de Energia": [
                "1: Manipulação básica de barreiras. Defesa Mágica +1",
                "2: Escudos finos ao redor do corpo contra magias menores. Defesa Mágica +1d2",
                "3: Absorve pequenos feitiços inofensivos. Defesa Mágica +1d3",
                "4: Desviar Magia: Libera habilidade de rebater magias de volta pro lançador. Defesa +1d4",
                "5: Reflete ataques mentais passivamente (causa dano ao agressor). Defesa Mágica +2d2",
                "6: Molda energia mágica bruta facilmente para bloquear golpes. Defesa Mágica +2d3",
                "7: Mestre do Fluxo (anula ataques diretos com Testes). Defesa Mágica +3d4, Redução Mág +2d4"
            ],
            "Hipnose / Transe": [
                "1: Olhar cativante. Dano Mágico LUST +1 em contato visual.",
                "2: Voz que ecoa levemente na mente. Dano Mágico LUST +1d2",
                "3: Pêndulos ou padrões prendem a visão de alvos simples. Dano +1d3",
                "4: Comandos Mentais: Libera habilidade para dar ordens de 1 palavra. Dano LUST +1d4",
                "5: Induz sonolência erótica em inimigos fracos. Dano LUST +2d2",
                "6: Reprograma fetiches básicos do alvo com sucesso longo. Dano LUST +2d3",
                "7: Dominação Cerebral Completa. Torna o alvo um servo obediente. Dano LUST +3d4"
            ],
            "Sensibilidade Mágica": [
                "1: Sente armadilhas mágicas próximas (+1 Teste Investigação).",
                "2: Capta emoções intensas de pessoas próximas (Ex: Medo, Tesão).",
                "3: Lê assinaturas mágicas e fraquezas de monstros de longe.",
                "4: Visão da Alma: Revela vulnerabilidades elementais e segredos do alvo. Testes +1",
                "5: Enxerga correntes de mana ocultas através de paredes. Testes +2",
                "6: Nunca é surpreendido por invocações ou magias teleportadas. Testes +2",
                "7: Onisciência Arcana local. Conecta-se à rede do ambiente. Testes +3"
            ],
            "Feitiçaria Sensual": [
                "1: Encanta roupas finas para escorregarem do corpo. Dano LUST Mágico +1",
                "2: Cria mãos ou apêndices fantasmagóricos menores. Dano LUST +1d2",
                "3: Aquece o sangue do alvo à distância. Dano LUST +1d3",
                "4: Conjurar Luxúria: Magia de invocação de tentáculos/fantasmas (Imobiliza). Dano +1d4",
                "5: Feitiços de dano causam gemidos e prazer como efeito colateral. Dano LUST +2d2",
                "6: Magias de lentidão/controle induzem ao cio imediato. Dano LUST +2d3",
                "7: Manifestação viva da devassidão mágica. Dano LUST +3d4, Testes +3"
            ],
            "Pactos / Vínculos": [
                "1: Acordos Místicos: Ganha Vantagem ao propor acordos de sangue.",
                "2: Vínculo Sensorial: Tocar alguém compartilha buffs fracos.",
                "3: Telepatia de curta distância com servos ou mestres.",
                "4: Selo Protetor: Libera Habilidade de marcar parceiro para dividir o dano sofrido pela metade.",
                "5: Compartilha automaticamente cura de poções com o alvo marcado.",
                "6: Evocar Parceiro: Pode teleportar um alvo marcado para perto de si.",
                "7: Vínculo de Alma. A vida de ambos está atrelada, buffando ambos massivamente. Testes +3"
            ]
        }
    }
};



const CLASS_TEMPLATES = {
    "Necromante": {
        baseStats: { hp: 70, st: 50, lust: 120, en: 90 },
        attrMods: { mis: 3, von: 2 },
        skills: [
            {
                name: "Coleta de Almas",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Ao derrotar ou participar da derrota de um inimigo, a sua alma ficará a mercê do Necromante para ser coletada. Ao fazer isso, ele pode utilizar este mesmo inimigo derrotado para compor o seu próprio Exército Morto-Vivo, preservando suas características e habilidades. (Invocar essa criatura gasta a mesma quantidade de stamina que a mesma possuía em energia sexual)."
            },
            {
                name: "Exército Morto-Vivo",
                type: "Ativa",
                cost: "Variável (Magia)",
                test: "Misticismo",
                desc: "Invoca 1 a 3 mortos-vivos para lutarem em seu lugar. O gasto em Energia Sexual é proporcional ao tipo e quantidade.\nOs mortos-vivos possuem 50% dos status do necromante e turno próprio. Podem ser usados para Ações de Alívio, permitindo ao Necromante compartilhar as sensações e benefícios."
            }
        ],
        weaknesses: [
            {
                name: "Dependência",
                desc: "Fraco sem seu exército. Requer posição recuada. Não pode usar armaduras pesadas e recebe +20% de toda fonte de dano físico."
            },
            {
                name: "Tempo de Espera",
                desc: "Criaturas invocadas demoram 1 turno para saírem da terra e ficarem prontas para combate."
            }
        ]
    },
    "Caçador": {
        baseStats: { hp: 110, st: 110, lust: 120, en: 35 },
        attrMods: { for: 3, con: 2 },
        skills: [
            {
                name: "Munição Adaptável",
                type: "Ativa",
                cost: "2 Energia Sexual (Opcional)",
                test: "Força",
                desc: "Pode utilizar munição tradicional (2d8 de dano físico) ou Munição de Energia Sexual (dano direto na LUST). Se em contato próximo, o dano na LUST passa de 2d8 para 3d6. Tipo de munição deve ser selecionado antes do disparo."
            },
            {
                name: "Camuflagem do Predador",
                type: "Ativa",
                cost: "-",
                test: "Agilidade",
                desc: "Fica camuflado por 2 turnos. Recebe +2 em testes de furtividade e rastreamento. O efeito acaba ao realizar ataque direto. (Cooldown: 4 turnos)"
            }
        ],
        weaknesses: [
            {
                name: "Ambiente Aberto",
                desc: "Em áreas completamente abertas, não recebe o benefício da Camuflagem e sofre -2 em furtividade."
            },
            {
                name: "Combate Mental",
                desc: "Treinamento puramente físico. Recebe -2 em testes de resistência mental (manipulação, confusão, etc)."
            }
        ]
    },

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
        updatePointsCounter();
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
        const tpl = CLASS_TEMPLATES[e.target.value];
        if (tpl) {
            document.getElementById('inp-class').value = tpl.class;
            Object.keys(tpl.attrMods).forEach(attrKey => {
                const el = document.getElementById(`inp-${attrKey}`);
                if (el) el.value = parseInt(el.value || 0) + tpl.attrMods[attrKey];
            });
            
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
    const totalEsq = 8 + (char.attr.agi) + mods.agi + mods.esq;
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
    if(document.getElementById('tt-esq')) document.getElementById('tt-esq').innerHTML = buildTT('Base (8 + AGI)', 8 + char.attr.agi, mods.breakdown.esq);
    if(document.getElementById('tt-danfis')) document.getElementById('tt-danfis').innerHTML = buildTT('Base (5 + FOR)', 5 + char.attr.for, mods.breakdown.danFis);
    if(document.getElementById('tt-danlust')) document.getElementById('tt-danlust').innerHTML = buildTT('Base (5 + SED)', 5 + char.attr.sed, mods.breakdown.danLust);

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
    const isMon = type === 'monster';
    
    if (isNaN(roll)) {
        const baseIni = isMon ? (source.ini || 10) : (source.attr?.agi || 0);
        roll = baseIni + Math.floor(Math.random() * 20) + 1;
    }
    
    const cStats = isMon ? null : getClassBaseStats(source.class);
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

