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
    "fragil_sexual": { name: "Frágil (Sexual)", desc: "Limiar de Êxtase travado em 20.", mods: { ecstasy_set: 20 }, classOnly: "Sacerdote" },
    "exausto": { name: "Exausto", desc: "Max Stamina reduzida em 50%.", mods: { st_mult: 0.5 } },
    "lento": { name: "Lento", desc: "Esquiva final sofre -5.", mods: { esq: -5 } },
    "enfeiticado": { name: "Enfeitiçado", desc: "Defesa de Lust é zerada.", mods: { dlust_set: 0 } }
};

const PERK_COSTS = [0, 1, 2, 3, 5, 9];
    const PERKS_DB = {
        sed: {
            name: "Sedução",
            icon: "fa-heart",
            perks: {
                "Seios Grandes": [
                    "Peitos pesados e fartos. **Sistema: +1 em rolagens de Persuasão Visual.**",
                    "Formato perfeito e macio. **Sistema: O toque inflige +2 Dano LUST instintivo. (Sem teste, contato direto).**",
                    "Mamilos sempre duros. **Sistema: Inimigos corpo a corpo sofrem -1 de Iniciativa (Requer falha em Teste de Resistência: VON vs SED do usuário).**",
                    "Sufocamento de peitos. **Sistema: Agarrões causam Dano LUST passivo e reduzem a Defesa LUST em -2 (Teste para Escapar: FOR/AGI vs FOR do usuário).**",
                    "Transe do Despir. **Sistema: Ação completa. Alvos (raio 5m) rolam Teste Oposto (VON vs SED do usuário) ou perdem o turno atordoados de tesão.**"
                ],
                "Bunda e Quadris Largos": [
                    "Bunda grande. **Sistema: Ataques inimigos por trás sofrem Desvantagem (rola 2d20, pega o menor).**",
                    "Molejo provocante. **Sistema: +1 em Sedução; quem estiver na sua retaguarda sofre 1 Dano LUST passivo no turno dele.**",
                    "Montaria de Coxas. **Sistema: Vantagem (Teste: FOR/AGI vs AGI) para Imobilizar. Alvo imobilizado toma Dano LUST contínuo.**",
                    "Carne absorvente. **Sistema: Dano Físico nas costas reduzido em 1; converte em 1 Dano LUST em Área (Teste: VON vs SED para ignorar LUST).**",
                    "Onda de Rebolado. **Sistema: Ação em Área. Todos no raio visual fazem Teste Oposto (VON vs SED) ou ficam 'Atordoados por LUST' (1 turno).**"
                ],
                "Sexo Dominante": [
                    "Cheiro quente. **Sistema: Inimigo entrar em raio de 2m sofre 1 Dano LUST ambiente (Teste Oposto: VON vs SED anula).**",
                    "Sensibilidade extrema. **Sistema: +2 Provocação (Taunt LUST). Apanhar aumenta seu dano LUST no turno seguinte.**",
                    "Penetração Implacável. **Sistema: Acertar submissão/penetração ignora 50% da Defesa LUST do alvo (Teste Oposto: FOR/AGI vs FOR).**",
                    "Vampirismo Seminal. **Sistema: Se o alvo sofrer Mind Break perto de você, absorve a energia curando seu HP em 3d6.**",
                    "A Primeira Metida. **Sistema: Acertar um ataque LUST crítico aplica Mind Break instantâneo (Teste Oposto: VON vs SED com Desvantagem do alvo para evitar).**"
                ],
                "Cheiro Viciante": [
                    "Suor sedutor. **Sistema: NPCs neutros rolam Teste Oposto (VON vs SED) ou ganham status 'Amigável'. +1 Interações.**",
                    "Feromônio confuso. **Sistema: Inimigos a 2m de distância rolam todos os testes de Vontade com Desvantagem.**",
                    "Névoa de Tesão. **Sistema: Passiva (+2 Dano LUST Área). Inimigos no raio perdem 1 de Acerto (Teste Oposto: VON vs SED resiste).**",
                    "Aura Pesada. **Sistema: Inimigos engajados com você perdem 25% da Resistência LUST Base (Teste Oposto: VON vs SED para negar).**",
                    "Frenesi Bestial. **Sistema: LUST em área (Teste Oposto: VON vs SED). Se falhar, NPCs e Monstros atacam uns aos outros dominados.**"
                ],
                "Beijo que Drena": [
                    "Lábios úmidos. **Sistema: Beijar impõe estado 'Obediente' a lacaios fora de combate (Teste Oposto: VON vs SED).**",
                    "Beijo Confuso. **Sistema: Alvo beijado após agarrão perde 1 Turno (Stun Mental) (Teste Oposto: VON vs SED para resistir).**",
                    "Sucção de Energia. **Sistema: Beijo forçado (Ataque LUST) drena passivamente 10 pontos de Stamina do alvo.**",
                    "Beijo do Vampiro. **Sistema: O beijo rouba 2d8 HP do alvo curando você diretamente.**",
                    "Prisão Emocional. **Sistema: Após beijar, o inimigo sofre -5 em todos os ataques se o alvo não for você (Teste Oposto: VON vs SED para quebrar a prisão).**"
                ],
                "Olhar Dominador": [
                    "Olhos cheios de desejo. **Sistema: +2 direto na Habilidade de Sedução à distância.**",
                    "Contato Travador. **Sistema: Olhar direto em NPCs reduz a Iniciativa deles em -2 (Requer Falha em Teste: VON vs SED).**",
                    "Queima LUST ocular. **Sistema: Pode causar 1d4 de Dano LUST no alvo com Ação Bônus (Teste Oposto: VON vs SED resiste metade).**",
                    "Olhar Transpassante. **Sistema: Mirar ativamente (Ação) corta a Defesa Mágica LUST do oponente pela metade.**",
                    "Ajoelhar. **Sistema: (Ação) Força Teste Oposto (VON vs SED). Falha faz o inimigo largar armas e implorar no chão.**"
                ],
                "Voz Sensual": [
                    "Voz rouca. **Sistema: Garante Vantagem em testes (SED) para mentir ou pedir favores a NPCs.**",
                    "Sussurro. **Sistema: Oferece +1 de Bônus em testes cruzados de Agarrão/Submissão se sussurrar na orelha.**",
                    "Palavras Sujas. **Sistema: Permite usar Ataques de LUST à distância (Raio de 10m) rolando SED vs VON.**",
                    "Gemido Alto. **Sistema: Cancelamento (Ação). Anula buffs mentais ou Fúria em 5m (Teste Oposto: VON vs SED do alvo para manter os buffs).**",
                    "Canção da Sereia. **Sistema: Paralisa todos os inimigos (raio 15m) que falharem no Teste (VON vs SED). Passam o turno babando.**"
                ],
                "Sem Vergonha Nenhuma": [
                    "Mente suja orgulhosa. **Sistema: Ignora penalidades de armadura rasgada e debuffs mentais de 'Desconforto'.**",
                    "Pele Orgulhosa. **Sistema: Estar nu/semi-nu garante +1 de Defesa LUST base.**",
                    "Nudez Absoluta Tática. **Sistema: Estar nu garante +3 Rolagem Base para interações Sociais e Corpo-a-Corpo baseadas em SED.**",
                    "Masoquismo Ascendente. **Sistema: Receber Dano LUST concede um Bônus temporário de +1 Dano Físico para si mesmo.**",
                    "Indomável e Nu. **Sistema: Barra LUST cheia não te dá Mind Break; ativa invulnerabilidade mental (Imune a LUST) e dobra sua Força.**"
                ],
                "Fluidos Viciantes": [
                    "Sabor doce. **Sistema: Qualquer fluido seu atua como item consumível; aliados curam +2 HP ao ingerir.**",
                    "Soro do sangue/suor. **Sistema: Cura ativa recebida/dada envolvendo seus fluidos é ampliada (+5 HP extra).**",
                    "Néctar de Controle. **Sistema: NPCs que ingerirem seu fluido rolam resistências contra você com Desvantagem (VON).**",
                    "Fluido Purificador. **Sistema: Fazer sexo/submissão anula imediatamente status de Veneno ou Doenças no parceiro.**",
                    "Banho Sagrado Súcubo. **Sistema: Sexo molhado torna o aliado Imune a ataques LUST inimigos por 24 horas.**"
                ],
                "Pau Enorme": [
                    "Volume visual. **Sistema: Ganha +1 bônus direto em rolagens conjuntas de Sedução e Intimidação.**",
                    "Intimidar LUST. **Sistema: Expor (Ação Bônus) causa +2 Dano LUST visual (Teste Oposto: VON vs SED anula).**",
                    "Arma Contundente. **Sistema: Pode usar como arma física concedendo +1 de Dano Desarmado.**",
                    "Aprisionamento Interno. **Sistema: Acertar submissão paralisa ativamente o parceiro por 1 Turno cravado (Teste: VON vs SED para agir com desvantagem).**",
                    "Monstruosidade Implacável. **Sistema: Ignora imunidade racial/tamanho contra monstros colossais em ataques LUST.**"
                ],
                "Língua Extensível": [
                    "Língua fina. **Sistema: Concede Vantagem (AGI) para destrancar ferrolhos ou nós usando a boca.**",
                    "Alcance de 30cm. **Sistema: Pode aplicar golpes de Dano LUST (Ação Bônus) a média distância.**",
                    "Músculo Adicional. **Sistema: Bônus de +2 em testes Opostos Físicos (FOR) de Imobilização se focados em zonas erógenas.**",
                    "Língua como chicote. **Sistema: Alcance de 1 Metro. Permite Ataques de Oportunidade LUST (SED vs VON) contra quem recuar.**",
                    "Língua Preênsil. **Sistema: Funciona como Terceiro Braço. Permite manipular itens pesados ou desarmar inimigos a distância.**"
                ],
                "Buceta Hiperflexível": [
                    "Adaptação tática. **Sistema: Imune a qualquer forma de Dano Físico letal oriundo de empalamento/penetração na região.**",
                    "Controle de pressão. **Sistema: Adiciona +1 Dano LUST direto e passivo em golpes de Sexo ou Submissão.**",
                    "Parede Rugosa. **Sistema: Qualquer dano LUST causado a um penetrador é ampliado passivamente em 50%.**",
                    "Buraco Negro Carnal. **Sistema: Funciona como inventário oculto e inesgotável para armas leves e relíquias.**",
                    "Recipiente Sagrado. **Sistema: Permite guardar líquidos vitais e Poções Mágicas dentro sem que estraguem.**"
                ],
                "Pele de Látex": [
                    "Textura lisa brilhante. **Sistema: Ganha +1 Defesa Física natural contra arranhões e lâminas fracas.**",
                    "Borracha Humana. **Sistema: Vantagem (+3) em Testes Opostos de Acrobacia e Escape de apertos (AGI vs FOR).**",
                    "Fricção Zero. **Sistema: Inimigos têm penalidade passiva de -1 para acertar socos em você (deslizam).**",
                    "Pele Grudenta de Sucção. **Sistema: Se o inimigo rolar Falha Crítica atacando você, a mão dele fica travada (Teste Físico: FOR vs AGI para soltar).**",
                    "Corpo Brinquedo. **Sistema: Sofrer ataques físicos corpo-a-corpo devolve 1 ponto de Cura de LUST residual.**"
                ],
                "Dedos Longos e Flexíveis": [
                    "Alcance extra leve. **Sistema: Ganha +1 passivo em testes de Prestidigitação (AGI) ou roubo furtivo.**",
                    "Articulação Dupla. **Sistema: Permite re-rolar 1 falha diária em teste manual para escape de algemas.**",
                    "Dedos de Ouro. **Sistema: Aplica +2 de Dano LUST absoluto extra em golpes de submissão erótica contínua.**",
                    "Mãos independentes. **Sistema: Permite sacar e usar dois itens (ex: 2 poções) usando apenas 1 Ação.**",
                    "Esticador de 25cm. **Sistema: Permite alcance cego de mecanismos e dano LUST interno extremo (Ignora 50% da Defesa LUST nestes ataques).**"
                ],
                "Pés Ágeis e Sensuais": [
                    "Pés com força braçal. **Sistema: Ganha +1 Equilíbrio (Vantagem passiva para resistir a Empurrões de FOR).**",
                    "Dedos de Mão do Pé. **Sistema: Vantagem em Prestidigitação usando as pernas, permitindo roubar embaixo da mesa sem usar as mãos.**",
                    "Footjob Profissional. **Sistema: Permite causar Dano LUST (1 Ação Bônus) usando os pés enquanto ataca normalmente com armas nas mãos.**",
                    "Pisada Esmagadora. **Sistema: Vantagem em Testes de Dominação/Controle (FOR) contra inimigos atordoados/caídos no chão.**",
                    "Sentido Tremor Tátil. **Sistema: Nunca é pego desprevenido; percebe furtividade no piso concedendo +1 Iniciativa passiva.**"
                ],
                "Quadris Largos": [
                    "Centro de gravidade. **Sistema: Resistência: +1 passivo contra testes inimigos de te empurrar ou derrubar.**",
                    "Montaria de Chumbo. **Sistema: Se Imobilizar por cima, o inimigo sofre -2 na Força bruta pra tentar escapar.**",
                    "Pelve Blindada. **Sistema: Imune a acertos críticos vindos de pancadas e facadas diretamente no torso/quadril.**",
                    "Rotação da Morte LUST. **Sistema: Bônus garantido de 2x Dano em qualquer rolagem natu    con: {
        name: "Constituição", icon: "fa-shield-heart",
        perks: {
            "Couro Resistente": [
                "Pele grossa rústica. **Sistema: Reduz permanentemente 1 Dano Físico recebido (Armadura Natural).**",
                "Couraça adaptável. **Sistema: Redução base de Dano Físico aumentada para 3 absolutos.**",
                "Fechamento capilar. **Sistema: Imunidade a status de Sangramento nível 1 e 2 (feridas rápidas).**",
                "Armadura Viva. **Sistema: Dobra a defesa corporal contra Perfurações (flechas e estocadas têm dano reduzido à metade).**",
                "Corpo de Aço. **Sistema: Lâminas comuns têm 25% de chance de quebrar ao te atingirem com um Crítico (ignorando Dano).**"
            ],
            "Tolerância à Dor": [
                "Nervos mortos leves. **Sistema: Passivo; rola Vantagem em testes de Vontade contra efeitos de dor mental.**",
                "Euforia na Dor. **Sistema: Penalidades mundanas por ter baixado HP só ativam quando chegar a 10% da vida total.**",
                "Sádico de Combate. **Sistema: Completamente imune à Paralisia ou Atordoamento oriundo de ataques físicos críticos.**",
                "Adrenalina Escarlate. **Sistema: Ao tomar um Crítico inimigo, ganha passivamente +2 de Dano Físico no próximo turno seu.**",
                "Máquina Mortal. **Sistema: Se HP zerar, não desmaia/morre; ganha 3 Turnos perfeitos para agir antes do coma absoluto.**"
            ],
            "Sistema Imunológico Implacável": [
                "Digestão Bruta. **Sistema: Vantagem suprema em testes para resistir a Náusea e Veneno injetado.**",
                "Anticorpos de guerra. **Sistema: Imunidade passiva a todas as Doenças/Vírus de contágio comum mundano.**",
                "Sangue Ácido. **Sistema: Corta o tempo ativo de 'Envenenamento Severo' e as rolagens de toxinas brutais pela exata metade.**",
                "Cura Sanguínea Antitóxica. **Sistema: Seu sangue atua como item (Ação) que cura Veneno e debuffs mortais de aliados próximos.**",
                "Muralha Biológica Absoluta. **Sistema: 100% Imune a Doenças mágicas, infestações parasitárias e Maldições biológicas sombrias.**"
            ],
            "Sangue Fervente (Regeneração)": [
                "Sangue rápido. **Sistema: Descansos curtos (Short Rests) curam 50% mais a sua barra de HP que a regra habitual.**",
                "Latente passiva. **Sistema: Fora de Batalha (Exploração), você cura passivamente 1 HP permanente a cada 10 Minutos no jogo.**",
                "Pulsante em combate. **Sistema: No início do seu turno, recupera HP exato equivalente ao seu Modificador de Constituição (CON).**",
                "Costura Rápida. **Sistema: Estanca automaticamente a condição Hemorragia Massiva instantâneo no turno 1, sem rolar nem gastar Ação.**",
                "Regeneração de Titã. **Sistema: Reconecta e conserta Magicamente Membros do corpo amputados (braços/pernas) usando a ação inteira.**"
            ],
            "Densidade Óssea": [
                "Massa pesada. **Sistema: Ganha +1 bônus fixo nos testes contra tentativas inimigas de Deslocamento ou Empurrões (Knockbacks).**",
                "Caixa torácica reforçada. **Sistema: Imunidade passiva a quebra-ossos; (Armas Contundentes perdem o bônus de Dano Crítico em você).**",
                "Esqueleto Encouraçado. **Sistema: Bater em você quebra a mão alheia. Socos Desarmados inimigos dão 1 Dano recíproco a quem bateu.**",
                "Imóvel em Quedas. **Sistema: Nunca recebe Dano por de Queda Vertical Absurda (Livre para até 15 metros caindo de pé seco).**",
                "Estrutura Calificada. **Sistema: Absolutamente Imune ao 'Dano Contundente' global ou mecânica de Esmagamento debaixo de Rochas pesadas.**"
            ],
            "Termorregulação Perfeita": [
                "Nega incômodos. **Sistema: Ignora todo Debuff rasteiro de clima extremo (Desertos ou Neve) sem exigir roupas térmicas ativas.**",
                "Resistência de Pele. **Sistema: Ganha Resistência Passiva (Dano total Cortado na metade) contra todos ataques de Fogo e Gelo comum.**",
                "Metabolismo Estável. **Sistema: Imune à condição 'Fadiga por Clima'. Nunca perde Stamina por rodar mecânica ambiental de calor extremo.**",
                "Absorção Elementar. **Sistema: Ser atingido por feitiços rasteiros/iniciais de Fogo ou Gelo cura Vida HP no lugar de machucar.**",
                "Isolamento Titânico Absoluto. **Sistema: 100% Imunidade a tomar 'Dano de Fogo' letal. Nega chamas místicas e nevascas.**"
            ],
            "Estômago de Ogro": [
                "Mastigação Bruta. **Sistema: Pode ingerir e se curar com carniça/lixo como se fossem Ração farta nos testes de Descanso do acampamento.**",
                "Processamento dobrado. **Sistema: Toda Poção Menor de HP/Stamina tem 100% de lucro final em você, recebendo o dobro bruto recuperado.**",
                "Corrupção Alimentar Aceita. **Sistema: Ingerir venenos propositais curam seus outros debuffs internos da ficha em vez de dano tóxico natural.**",
                "Fome Carniceira. **Sistema: (Ação Principal) Devorar cadáveres orgânicos caídos na arena aplica bônus massivo de +20 HP temporário puro.**",
                "Fornalha Gástrica Magica. **Sistema: Engolir miúdos de Chefes confere um Status temporário do Monstro morto (FOR ou AGI) na sua ficha.**"
            ],
            "Firmeza de Montanha": [
                "Base plantada grossa. **Sistema: Impossível sofrer ataques de condição 'Surpresa' furtivos corpo-a-corpo e não cai por tropeço normal.**",
                "Duelo de força corporal. **Sistema: Rolagem de +2 base fixo absoluto para ignorar resistências em Rasteiras ou Disputas de Agarrão Mistas.**",
                "Enraizamento do chão. **Sistema: Imunidade completa a Knockback vindo de Forças Vivas com Tamanho 'Médio' ou inferior; não se move frouxo.**",
                "Rebote Cinético. **Sistema: O oponente fraco ou mago que tentar dar empurrão recebe de rebote 1d4 de Dano Contundente da sua densidade imóvel.**",
                "Gravidade Puxada. **Sistema: Cancela e imuniza todas mecânicas colossais ambientais de Telecinese Inimiga e Levitações forçadas do terreno.**"
            ],
            "Vitalidade Descomunal": [
                "Sangue encorpado e grosso. **Sistema: Modificador de Multiplicação: +10% de acréscimo final calculado no seu HP Máximo Base.**",
                "Coração espesso e violento. **Sistema: O Bônus sobe para +20% HP Máximo total da ficha ignorando os tetos capados das classes brutas.**",
                "Veias transbordantes de fúria viva. **Sistema: O Modificador atinge +30% HP Máximo, transformando você num poço massivo e robusto biológico.**",
                "Reservatório Vivo de Gárgula de Titânio. **Sistema: Aplica +50% no HP Máximo total absoluto e ganha peso bruto para rolar empurrões macabros.**",
                "Coração de Titã Magico. **Sistema: Ressurreição Fenix: Uma vez em campanha se decapitado/morto em batalha ele auto-revive você com 50% HP imediato.**"
            ],
            "Estase Carnal": [
                "Genética Letárgica. **Sistema: A longevidade da vida do personagem ignora os efeitos visuais comuns mecânicos de rolagem da velhice senil.**",
                "Pulmões Controlados. **Sistema: Confere x3 no multiplicador de Fôlego mecânico debaixo d'água antes de iniciar as rolagens do Dano de asfixia cego.**",
                "Hibernação Metálica. **Sistema: Consegue sobreviver por muitas semanas sem água/comida zerando os limites de sobrevivência adormecendo.**",
                "Controle Hemorrágico Tático. **Sistema: (Ação Livre) Prende qualquer Veneno letal ativo em apenas 1 membro anulando a dispersão e morte letal final.**",
                "Imortalidade Biológica Escrita. **Sistema: Completamente 100% Imune à maldição arcana final de Roubo de Idade e a mecânicas temporais puras senis.**"
            ],
            "Escudo Físico Reativo": [
                "Músculos reflexos. **Sistema: +1 de CA (Classe de Armadura) contra golpes furtivos surpresa.**",
                "Pele repulsiva. **Sistema: Quem ataca corpo-a-corpo falhando leva Desvantagem no próximo ataque.**",
                "Onda Muscular. **Sistema: Receber +30 de dano instantâneo empurra inimigos adjacentes 2m pra trás.**",
                "Casco da Tartaruga. **Sistema: Ação Bônus (Desistir de andar): Dobra sua Defesa Física passiva no turno.**",
                "Abalo Refletor. **Sistema: Ignora a defesa alheia: Todo dano físico recebido reflete 50% como Dano Verdadeiro de volta.**"
            ],
            "Glândulas Adaptativas": [
                "Suor ácido. **Sistema: Ganha +2 em testes para escapar de amarras de corda mundanas.**",
                "Suor Sombrio. **Sistema: Inimigos num raio de 2m têm desvantagem para lançar efeitos de Medo/LUST.**",
                "Película Deslizante. **Sistema: Imunidade passiva permanente contra a condição agarrado ou 'Grappled'.**",
                "Mutações Químicas. **Sistema: Oponentes que tomarem o seu Sangue/Suor sofrem o status Envenenamento e -2 Vontade.**",
                "Crisálida do Sono. **Sistema: Em MindBreak ou HP zero, vira um Ovo inquebrável por 24h e revive com HP max/LUST zero.**"
            ]
        }
    },
    vig: {
        name: "Vigor", icon: "fa-bolt",
        perks: {
            "Fôlego Inesgotável": [
                "Pulmões de ferro. **Sistema: Aumenta sua reserva máxima em +10 Stamina.**",
                "Músculos incansáveis. **Sistema: Aumento permanente de +20 Stamina Máxima.**",
                "Eficiência cardiovascular. **Sistema: Reduz em -1 o Custo de Stamina de golpes físicos.**",
                "Fornalha pulmonar. **Sistema: Ganha +50 Stamina Máxima. Imunidade à condição Exaustão.**",
                "Motor Perpétuo. **Sistema: Recupera passivamente 15 Stamina a cada turno.**"
            ],
            "Corredor Incansável": [
                "Pernas densas. **Sistema: Bônus permanente de +2m na Movimentação.**",
                "Passo Lamacento. **Sistema: Ignora custo extra de movimento em Terreno Difícil.**",
                "Adaptação de Carga. **Sistema: Ignora penalidades de movimentação impostas por Armaduras.**",
                "Investida Furiosa. **Sistema: Correr (Dash) agora custa apenas uma Ação Bônus.**",
                "Mobilidade Sombria. **Sistema: Movimentação em combate não aciona Ataques de Oportunidade.**"
            ],
            "Coração Resiliente": [
                "Adrenalina do corte. **Sistema: Recupera 5 Stamina imediata ao sofrer dano físico.**",
                "Euforia Violenta. **Sistema: Acertar ataque melee recupera 5 Stamina.**",
                "Sacrifício da Carne. **Sistema: Permite usar HP no lugar de Stamina (1 HP = 2 Stamina).**",
                "Coração em fúria. **Sistema: A regeneração natural de Stamina é dobrada permanentemente.**",
                "Imunidade Muscular. **Sistema: Zerar HP/Stamina não causa inconsciência imediata.**"
            ],
            "Repelir Êxtase": [
                "Controle sádico. **Sistema: Aumenta o seu Limiar Máximo de LUST em +5 pontos.**",
                "Treino contra luxúria. **Sistema: Aumenta o seu Limiar Máximo de LUST em +10 pontos.**",
                "Tolerância à Invasão. **Sistema: Aumenta o seu Limiar Máximo de LUST em +20 pontos.**",
                "Masoquismo Reativo. **Sistema: Passar de 50% de LUST concede Bônus de +2 em Rolagens Físicas.**",
                "Ascensão da Carne. **Sistema: LUST Cheio ativa um Transe Feroz letal sem Mind Break.**"
            ],
            "Adaptação Erótica": [
                "Alívio prático. **Sistema: Ação de 'Alívio Sexual' custa metade da Stamina em combate.**",
                "Maestria do corpo. **Sistema: Alívio Pessoal em combate não consome Ação Principal (apenas Bônus).**",
                "Vício funcional. **Sistema: A ação de Alívio recupera +15 Stamina instantânea.**",
                "Sadomasoquismo ofensivo. **Sistema: Se aliviar em combate aplica dano de LUST em área (CD 14 VON).**",
                "Clímax Tático. **Sistema: Atingir gozo zera todos os tempos de recarga (Cooldowns) da classe.**"
            ],
            "Tolerância Adrenalínica": [
                "Bloqueio de Tesão. **Sistema: Imune aos debuffs mecânicos do Estágio 1 de LUST.**",
                "Foco Inibidor Sanguinário. **Sistema: Anula completamente os debuffs do Estágio 2 de LUST.**",
                "Conversão Mística. **Sistema: O debuff do Estágio 3 passa a conceder +2 de Dano ao invés de penalidade.**",
                "Couraça de Nervos Rígidos. **Sistema: 100% Imune aos Espasmos Paralisantes e perda de turno LUST.**",
                "Mind Break Assassino. **Sistema: Sofrer Mind Break Ativa a Fúria, dobrando FOR sem controle por 3 turnos.**"
            ],
            "Capacidade Pulmonar": [
                "Superoxigenação. **Sistema: Dobra o limite de tempo segurando o fôlego sob o mar/gás.**",
                "Filtro mágico natural. **Sistema: Vantagem natural contra ataques que envolvam Veneno/Gás inalados.**",
                "Sobrevivência aquática. **Sistema: Ignora o Dano de Asfixia direto nas primeiras 5 rodadas submerso.**",
                "Caixa Respiratória. **Sistema: Fica completamente imune a sofrer 'Dano de Toxina Inalada'.**",
                "Pulmões de Titã. **Sistema: Passa a respirar normalmente debaixo d'água e em áreas vácuas mágicas.**"
            ],
            "Segundo Fôlego": [
                "Reserva emergencial. **Sistema: (Ação Bônus) Recupera 10 Stamina ativa em batalha 1x ao dia.**",
                "Dobro da Reserva. **Sistema: O Segundo Fôlego passa a recuperar 30 Stamina no combate.**",
                "Sangue pelo Vigor. **Sistema: Pode queimar HP Máximo para recuperar imediatamente toda a Stamina.**",
                "Onda de Choque de Energia. **Sistema: Acionar Segundo Fôlego joga Inimigos adjacentes 2m para trás.**",
                "Vigor Imortal Absoluto. **Sistema: A sua Stamina é incapaz de descer abaixo de 10 na barra mecânica.**"
            ],
            "Atleta Divino": [
                "Corpo flexível. **Sistema: Vantagem passiva (+ mod VIG) em todo Teste Acrobático e de Escalada.**",
                "Fibras elásticas. **Sistema: Multiplica a distância de qualquer rolagem de Salto longo por 3.**",
                "Máquina incansável. **Sistema: Não exige teste de Exaustão ao ficar múltiplas noites sem dormir.**",
                "Biorritmo Intocável. **Sistema: Imunidade ao status 'Lentidão' vindo de armadilhas ou Feitiços de Gelo.**",
                "Físico Inabalável. **Sistema: Feitiços e Monstros não conseguem drenar ou diminuir seus Atributos Físicos.**"
            ],
            "Aura de Energia": [
                "Inspiração Tropa. **Sistema: Concede +5 de Stamina (Max ST) passiva a aliados a 5m.**",
                "Corrente Mágica. **Sistema: Aumenta o buff para os aliados na aura a +10 Max ST.**",
                "Transferência de Pulso. **Sistema: Doa (Ação Bônus) metade da sua Stamina pra um aliado.**",
                "Comando de Fúria. **Sistema: Ao motivar 1 Aliado, sua próxima habilidade custa zero Stamina.**",
                "Cúpula Revigorante. **Sistema: Passivamente dobra a velocidade de Regen ST natural de todos no raio.**"
            ],
            "Blindagem Mental": [
                "Bloqueio de Tesão. **Sistema: Subtrai passivamente 10% do Dano LUST inimigo contra você.**",
                "Psiquê de Ferro. **Sistema: A redução contra qualquer Dano LUST no combate aumenta para 25%.**",
                "Sadismo convertido. **Sistema: Ataques Místicos LUST contra ti curam a sua Stamina num valor equivalente.**",
                "Impactos Telepáticos Convertidos. **Sistema: Qualquer magia telepática contra você também te cura HP.**",
                "Vigor Indomável. **Sistema: Inimigos estão impedidos magicamente de sugar ou roubar seu MP/Stamina.**"
            ],
            "Descanso Profundo": [
                "Transe pesado. **Sistema: Descansos curtos (1h) concedem a você a cura de Descansos Longos (8h).**",
                "Reparação Celular. **Sistema: Dormir remove a Condição 'Doença Menor' automaticamente.**",
                "Tática de Guerrilha. **Sistema: Bastam 15 minutos parado para curar todo o HP e Stamina na masmorra.**",
                "Sono Purgante. **Sistema: O descanso zera a corrupção oculta mental sombria que restou (Zera barra LUST).**",
                "Estase de Cristal. **Sistema: Torna-se Imune a ataques furtivos instakill e dano bônus enquanto estiver dormindo.**"
            ]
        }
    },
    for: {
        name: "Força", icon: "fa-dumbbell",
        perks: {
            "Golpes Esmagadores": [
                "Músculos rasgados. **Sistema: Adiciona +1 de Dano Fixo Corpo-a-Corpo (Melee).**",
                "Impactos maciços. **Sistema: Concede +3 de Dano Fixo (Melee).**",
                "Força de Aríete. **Sistema: Acertos empurram os alvos em 1 Metro (Knockback).**",
                "Ação 'Cleave'. **Sistema: Seu ataque físico atinge também alvos menores em 1 quadrado adjacente.**",
                "Estilhaçar Blindagem. **Sistema: Seus ataques corpo-a-corpo ignoram 50% da Armadura Física inimiga.**"
            ],
            "Agarre Titânico": [
                "Garrote corporal. **Sistema: Vantagem automática para rolar testes de Agarrões/Submissão.**",
                "Cadeado físico. **Sistema: O Inimigo possui Desvantagem para tentar escapar de seus agarrões.**",
                "Esmagar a Garganta. **Sistema: Oponente agarrado toma 1d4 de Dano Asfixiante direto no início do seu turno.**",
                "Quebra-Ossos. **Sistema: Crítico num agarrão aplica -2 em atributos físicos do alvo permanentemente.**",
                "Abraço Gigante. **Sistema: (Ação) O Agarrão em lacaios pequenos que falharem na resistência resulta em morte instantânea.**"
            ],
            "Músculos Fibrosos": [
                "Enrijecer. **Sistema: Vantagem em testes de resistência para evitar Rasteiras ou ser derrubado.**",
                "Redutor Contundente. **Sistema: Reduz em 2 todo Dano Contundente (Maças/Martelos) sofrido.**",
                "Densidade Tática. **Sistema: Monstros ou magias de tamanho médio não conseguem mover/jogar você pelo grid.**",
                "Rompedor de Ferrolhos. **Sistema: Quebra amarras e correntes automaticamente usando apenas 1 Ação Bônus.**",
                "Colosso Imóvel. **Sistema: Ganha Imunidade passiva total às condições 'Agarrado' ou 'Imobilizado'.**"
            ],
            "Quebra-Defesas": [
                "Oblitera Escudos. **Sistema: Seus ataques ignoram 1 Ponto direto de Redução de Dano Físico inimigo.**",
                "Aço Esmagado. **Sistema: Seus ataques desconsideram 3 Pontos de Defesa Física de Monstros Fortes.**",
                "Destruição de Base. **Sistema: Acertos críticos despedaçam escudos pequenos de madeira imediatamente.**",
                "Amassamento Tático. **Sistema: Críticos reduzem permanentemente a Defesa Base do inimigo em 1 ponto pro resto do combate.**",
                "Demolição Estrutural. **Sistema: Quebra instantaneamente qualquer Parede Mágica de Gelo/Terra usando Força Bruta.**"
            ],
            "Arremesso Brutal": [
                "Atirador Rústico. **Sistema: Pode usar Perícia Atletismo (FOR) para atacar jogando objetos pesados.**",
                "Boliche de Lacaio. **Sistema: (Ação) Permite arremessar inimigos pequenos ou cadáveres causando Dano em Área.**",
                "Catapulta Salvadora. **Sistema: Arremessa um Aliado pra fora de Zonas de Perigo Perigosas sem causar Dano a ele.**",
                "Chuva de Detritos. **Sistema: Jogar objetos massivos (pilares) causa o status 'Atordoado' em quem falhar na esquiva (Área 3m).**",
                "Impacto da Fera. **Sistema: Consegue rolar empurrões (Knockbacks) eficientes até contra Chefes Gigantes.**"
            ],
            "Força de Impacto": [
                "Peso Oculto. **Sistema: Inflige a condição 'Lentidão' nos Inimigos que bloquearem seus golpes pesados.**",
                "Concussão Bruta. **Sistema: Críticos aplicam a Condição 'Tonto', reduzindo a rolagem do Próximo Turno Inimigo.**",
                "Esmagamento Cerebral. **Sistema: Pancadas Desarmadas dão status de 'Atordoado' em Lacaios (perdem o turno).**",
                "Impacto de Terremoto. **Sistema: Golpear o chão converte um raio de 3m em 'Terreno Difícil'.**",
                "Barreira do Som. **Sistema: Ataques errados ainda causam Dano Sônico igual à metade da sua Força no alvo adjacente.**"
            ],
            "Violência Bruta": [
                "Oportunidade Predadora. **Sistema: +2 de Dano Fixo imediato em Oponentes sob efeito da condição 'Caído/Derrubado'.**",
                "Massacre da Carne. **Sistema: +5 de Dano Adicional ao atacar inimigos sob a condição 'Agarrado' ou Imobilizado.**",
                "Chute Bruto. **Sistema: Atacar oponentes 'Atordoados' garante Vantagem passiva nas rolagens de acerto.**",
                "Execução Sumária. **Sistema: O seu primeiro ataque contra um inimigo 'Rendido' multiplica o Dano Final por x2.**",
                "Grito do Açougueiro. **Sistema: Matar um inimigo força alvos ao redor a passarem num Teste de Vontade (VON) ou fugirão com Medo.**"
            ],
            "Tensão Muscular Mágica": [
                "Couraça Mágica. **Sistema: Em Duelos Arcanos, pode rolar FORÇA em vez de VONTADE contra Empurrão Telecinético.**",
                "Quebrar a Dor. **Sistema: Pode quebrar Prisões Arcanas invisíveis socando-as diretamente com a Perícia Atletismo.**",
                "Soco Arcano Dissipante. **Sistema: Golpes Desarmados aplicam +2 Dano Bônus Fixo ao atingir Invocações ou Elementais Mágicos.**",
                "Fornalha Mística. **Sistema: Segurar espadas envoltas em chamas ou venenos não causa Dano na sua empunhadura.**",
                "Rebote Titânico. **Sistema: (Ação de Reação) Permite socar feitiços de projétil rebatendo-os de volta para o Conjurador.**"
            ],
            "Saltador Colossal": [
                "Tremor das Pernas. **Sistema: Pode realizar saltos acrobáticos de +5m Verticais sem a necessidade de impulso de corrida.**",
                "Arremesso Aéreo. **Sistema: Cair de um Salto Longo em cima de inimigos permite jogar um Dado Extra de Dano da arma.**",
                "Asas Brutas. **Sistema: Salto Longo permite carregar 1 Aliado sem que isso diminua a distância total percorrida.**",
                "Queda Tectônica. **Sistema: A aterrissagem força Inimigos num raio de 3m a fazerem Resistência ou caem 'Derrubados'.**",
                "Meteoro de Titânio. **Sistema: Zera o Dano de Queda ao cair de penhascos e o reverte como Dano Esmagador 1-Hit-Kill contra o alvo atingido.**"
            ],
            "Carregador de Fardo": [
                "Costas de Touro. **Sistema: Armas classificadas como 'Pesadas' não diminuem passivamente sua Velocidade de Movimento.**",
                "Mula Divina. **Sistema: Dobra permanentemente sua capacidade de Carga/Inventário Racial sem qualquer Debuff.**",
                "Locomotiva Brutal. **Sistema: Arrastar lacaios imobilizados no grid passa a não gastar ou penalizar sua Movimentação.**",
                "Arrancada Gigante. **Sistema: Consegue empunhar Armas 'Duas Mãos' com apenas Uma Mão (Liberando a outra para Escudo/Livre).**",
                "Atlas Vivo. **Sistema: (Ação) Capaz de suportar Armadilhas de Esmagamento de Teto/Paredes Mágicas por tempo suficiente pro grupo fugir.**"
            ],
            "Machado Humano": [
                "Eixo Tático Perfeito. **Sistema: Passiva Acumulativa: Ganha +1 Dano Fixo por rodada caso ataque sem errar nenhum alvo.**",
                "Fúria Acumulativa. **Sistema: O bônus progressivo aumenta para +2 de Dano Fixo por cada nova rodada atacando oponentes.**",
                "Perfurar Artérias. **Sistema: Seu Dano Físico aplica o Status Automático de 'Sangramento Nível 1' em criaturas de carne e osso.**",
                "Limiar da Ferida Fatal. **Sistema: Causar Dano de Sangramento debuffa Curas Inimigas (-50% Heal Reduction) no inimigo.**",
                "Amputação Suprema. **Sistema: Um Sucesso Crítico permite que o Jogador decepe/estoure partes secundárias (Cauda, Asas) do alvo.**"
            ],
            "Impacto Sísmico": [
                "Micro-Tremores. **Sistema: Errar o Golpe desequilibra Alvos Menores próximos (-1 em testes de Acerto Inimigos no turno deles).**",
                "Pisão Sombrio. **Sistema: (Ação Bônus Menor) Pisada cria um abalo; Inimigos a 2m rolam Resistência ou recebem Knockdown.**",
                "Cobertura Terrena. **Sistema: Soco Mágico no chão sobe uma pedra temporária que concede Cobertura Média (+2 CA).**",
                "Tectônica de Fenda. **Sistema: Esmagar o Chão cria uma Fenda num alvo que causa Dano e o Status de 'Atordoado' (Pernas presas).**",
                "Doutrina do Terremoto. **Sistema: (Ação Suprema) Um único golpe direcionado oblitera Paredes Mágicas Fortificadas instantaneamente.**"
            ]
        }
    },
    agi: {
        name: "Agilidade", icon: "fa-person-running",
        perks: {
            "Reflexos Apurados": [
                "Percepção leve. Ganha +2 nos lances de Iniciativa.",
                "Reação de aranha. Ganha +5 Iniciativa, movendo-se no instante em que pensam em atacar.",
                "Mente acelerada. Impossível de ser pego de surpresa enquanto dorme ou de olhos vendados.",
                "Antecipação Tática. Uma vez por combate, troque seu lugar na ordem de turnos com um aliado.",
                "Flash Constante. Você é invariavelmente o primeiro a agir em qualquer combate."
            ],
            "Esquiva Acrobática": [
                "Ginga fluida de corpo que melhora em +1 a sua Esquiva base.",
                "Rolamentos diminuem ataques longos e te dão +3 de Esquiva natural.",
                "Olhos afiados focados, garantindo Vantagem natural para desviar de lanças e flechas.",
                "Contorcionista aéreo (+5 Esquiva base). Pode desviar de golpes no ar.",
                "Aparar do Vento. Esquiva perfeita não só evita o dano, mas faz o inimigo perder a arma."
            ],
            "Deslize Furtivo": [
                "Passos sutis; seu peso raramente emite ruídos mesmo sobre vidro quebrado.",
                "Camuflagem instintiva. Torna-se invisível a olho nu quando em sombras densas.",
                "Os pés ignoram o atrito natural, imune a armadilhas de placa de pressão.",
                "Aproximação Letal. Mover-se escondido consome apenas meia Ação no turno.",
                "Fantasma Assassino. Se não for visto, o primeiro ataque decupla o dano em pontos vitais."
            ],
            "Precisão Letal": [
                "Olhar calculista (Margem de Crítico aumentada em 1; acerta Crítico com 19/20).",
                "Punhaladas nos vasos aumentam a Margem Crítica em 2 (Acerta com 18+).",
                "Golpes perfeitamente aplicados. Críticos agora também cegam ou sangram pesado.",
                "Ponto fraco exposto. Seu Dano Crítico ignora 100% da Armadura Física do alvo.",
                "Ceifador Silencioso. Todo ataque Crítico contra entidades menores resulta em Abate Sumário."
            ],
            "Queda de Gato": [
                "Articulações elásticas cortam pela metade qualquer dano recebido por quedas livres.",
                "Quedas acidentais de até 20m tornam-se inofensivas.",
                "Mesmo empurrado ou atordoado no ar, você sempre pousa equilibrado e em pé.",
                "Pode abrir asas de pano largas ou planar suavemente manipulando as roupas.",
                "Aterrissagem Heróica. Ignora Dano de Queda terminal caindo do céu completamente ileso."
            ],
            "Escapar de Agarrões": [
                "Corpo escorregadio. Recebe bônus de +2 para escapar de imobilizações e agarrões LUST.",
                "Articulações deslocáveis. +5 Absoluto em testes para fugir de garras firmes.",
                "Escape Rápido. Tentar soltar-se vira uma Ação Bônus rápida em vez da Principal.",
                "O reflexo sujo do contorcionista deixa quem tentou te agarrar atordoado ao falhar.",
                "Ilusionista do Escape. Quando se solta, consegue roubar a arma e itens leves do alvo."
            ],
            "Ataque em Foco": [
                "Armas pequenas ganham letalidade sutil nos cortes rápidos (+1 Dano).",
                "Suas mãos são um borrão. Ganha a capacidade de um Ataque Extra fraco (Ação Bônus).",
                "Acelera os pulmões gastando Stamina para desferir um Terceiro Ataque na rodada.",
                "Aceleração Sanguínea. Cada ataque seguido no alvo acumula Bônus de Dano massivo.",
                "Vendaval Mortal. Gira como um pião e ataca todas as unidades em área adjacente."
            ],
            "Contra-Ataque Rápido": [
                "Abertura oportunista. Se um inimigo errar, você pode riscar de volta rapidamente.",
                "O revide se torna letal. O seu Contra-Ataque de reação dá o Dano integral forte.",
                "Velocidade de reação dupla. Pode contra-atacar e usar oportunidades 2x por turno inimigo.",
                "Aparar e Perfurar. Prevê a investida, apara e espeta a garganta no exato mesmo segundo.",
                "Contra-Ataque Fatal. O alvo revidado sofre sangramento severo e lentidão pelo golpe rápido."
            ],
            "Passo Fantasma": [
                "Correr pelo campo ofusca seus contornos, concedendo +1 Esquiva natural passiva.",
                "Mover-se em velocidade não aciona Ataques de Oportunidade contra você.",
                "Fase etérea passageira. Pode usar a corrida para atravessar 1 inimigo no grid sem bater.",
                "Corre livremente sobre superfícies verticais ou por cima da água mantendo impulso.",
                "Se esconder na escuridão teleporta seu corpo para outra área de breu no limite visual."
            ],
            "Mobilidade Extrema": [
                "O famoso Bater e Correr. Após bater, você desliza magicamente 2 metros para trás limpo.",
                "Pirueta elástica de recuo de até 5 metros automaticamente sem gerar reações inimigas.",
                "Impulso de Stamina. Gastar pontos extras permite recuos táticos insanos de longas distâncias.",
                "Passos borrados aplicam -2 na Chance de Acerto dos inimigos embaraçando a visão deles.",
                "Flashstep Múltiplo. Pode atacar três alvos espalhados em cantos opostos saltando entre eles."
            ],
            "Reação Ocular": [
                "Rastreia flechas a tempo de aparar projéteis leves no ar (50% de sucesso).",
                "Aparagem e desvio de flechas instintivo e absoluto (100% de sucesso).",
                "Domínio cinético nos punhos rebate a flecha desviada com exatidão mortal de volta.",
                "Reflexo Arcano. Pode bloquear balas e projéteis elementais fracos com precisão.",
                "Devolução do Caos. Gira feitiços e magias lendárias ofensivas refletindo de volta ao feitor."
            ],
            "Dança da Morte": [
                "Pés ágeis mesclam ritmos que atrapalham arqueiros inimigos e dão +1 Esquiva.",
                "A graciosidade do movimento empolga. Esquivar confere Buffs menores aos aliados perto.",
                "Ganha Bônus defensivos se cercado (Lutadores múltiplos ativam seus reflexos).",
                "Frenesi Ritmado. Gira abrindo a guarda: todos tentam te acertar e falham, quebrando postura.",
                "Manto da Esquiva Protetiva. No milissegundo de explosões mágicas, retira você e 1 aliado da zona fatal ilesos."
            ]
        }
    },
    von: {
        name: "Vontade", icon: "fa-brain",
        perks: {
            "Mente Inabalável": [
                "Postura de veterano. **Sistema: Rola testes com Vantagem contra habilidades de Intimidação.**",
                "Cérebro blindado. **Sistema: Bônus absoluto de +2 na Defesa Base contra Hipnose/Ilusão.**",
                "Claridade Racional. **Sistema: Imunidade total à Condição 'Amedrontado/Fobia' de Monstros.**",
                "Carisma Inverso. **Sistema: Completamente impermeável à feitiços de Encantamento e Sedução Arcanos.**",
                "Aura Mental Estilhaçadora. **Sistema: Inimigos que tentam ataques telepáticos sofrem Dano Psíquico de volta.**"
            ],
            "Estoicismo Carcerário": [
                "Acostumado à sujeira. **Sistema: +2 na Resistência (VON) contra acúmulo de LUST (Tesão).**",
                "Castidade Bruta. **Sistema: Aumenta o Bônus de Defesa contra LUST para +5 passivo.**",
                "Inversão do Papel. **Sistema: Corta pela metade a eficácia das Magias LUST inimigas.**",
                "Mente Dissociativa. **Sistema: No Estágio 3 de LUST, você não sofre os debuffs de paralisação e fadiga extremas.**",
                "Masoquismo Divino. **Sistema: Dano massivo de LUST curará o seu HP ao invés de causar Mind Break.**"
            ],
            "Clarividência": [
                "Intuição afiada. **Sistema: Inimigos rolam com Desvantagem testes de Furtividade e Enganação contra você.**",
                "Vê borrões nítidos. **Sistema: Magias Menores de Invisibilidade falham passivamente na sua presença.**",
                "Ilusões frágeis. **Sistema: Você não cai em ilusões geográficas de labirintos e miragens de feitiço.**",
                "Sentido Assassino. **Sistema: Imune a ataques críticos originados de flanqueamento e emboscadas furtivas.**",
                "Olho de Deus. **Sistema: Permite enxergar Dados Ocultos dos NPCs e Chefes (HP exato e Resistências Elementais).**"
            ],
            "Presença Imponente": [
                "Postura intimidadora. **Sistema: Bônus de +2 em rolagens sociais e intimidações.**",
                "Predador Nato. **Sistema: Ameaçar inimigos enfraquecidos inflige a Condição 'Abalado' neles.**",
                "Grito Sangrento. **Sistema: (Ação) Berro que aplica Lentidão e -1 Iniciativa aos oponentes num raio de 5m.**",
                "Aterrorizar Lacaios. **Sistema: Monstros menores fogem do combate ao você realizar Acertos Críticos neles.**",
                "Comando Soberano. **Sistema: Força inimigos normais a largarem suas armas caso falhem num teste contra sua VON.**"
            ],
            "Meditação Tática": [
                "Respira e foca. **Sistema: Gastar o turno para Meditar recupera passivamente Vida e Estamina (HP/ST).**",
                "Calmante Interior. **Sistema: Meditar em combate cessa Venenos fracos, Sangramentos ou Cegueira Menor.**",
                "Desprezo Divino. **Sistema: Ignora as penalidades (debuffs de atributos) derivadas de HP crítico no combate.**",
                "Transe de Batalha. **Sistema: Meditar purga (zera) a sua barra de LUST acumulada na masmorra.**",
                "Farol de Paz Santificada. **Sistema: Aura curativa em Meditação remove Debuffs Mentais de aliados num raio de 5m.**"
            ],
            "Foco Implacável": [
                "Coração Concentrado. **Sistema: Vantagem natural em Testes de Concentração para não perder magias invocadas.**",
                "Ignora Espasmos. **Sistema: Receber Danos de raspão (ataques leves físicos) nunca cancelam Rituais Arcanos Castados.**",
                "Controle Sensorial. **Sistema: Imune a Cegueira ou Surdez para efeitos de mirar magias à distância.**",
                "Máquina Mística. **Sistema: Ser alvo de Crítico em combate dobra (x2) o Dano ou Cura do seu próximo feitiço conjurado.**",
                "Transe Cadavérico. **Sistema: Atingir HP Zero permite finalizar as Invocações pendentes de Feitiço em Forma Espiritual deitado.**"
            ],
            "Disciplina Carnal": [
                "Mente Reprimida. **Sistema: Diminui a corrupção LUST em -2 pontos por rodada, sem necessitar de Alívio Sexual.**",
                "Afastar do Combate. **Sistema: Fugas táticas (Desengajar) retiram passivamente -5 pontos da barra de LUST.**",
                "Limiar Expansivo. **Sistema: Dobra a capacidade Total da barra de Limites de Prazer LUST da sua Ficha e Atributos de Sanidade.**",
                "Flagelo Purificador. **Sistema: (Ação Especial) Paga custo de HP em Cortes para curar passivamente Corrupções Mentais da Party Amiga.**",
                "Veto Moral Impiedoso. **Sistema: Se sofrer Mind Break final, ignora a Derrota Absoluta (Insta-Lose) e recobra 10% da consciência. (1x por Masmorra).**"
            ],
            "Barreira Psíquica": [
                "Reduz Dano Mental. **Sistema: Ignora 1 ponto fixo de Dano Arcânico advindo de Magias e Raios Telepáticos e Ocultos.**",
                "Escudo Mágico Espesso. **Sistema: Diminui 5 Pontos Absolutos de Dano Vindo de Explosões Fogo ou ataques de Projéteis Sombrios Inimigos na Ficha.**",
                "Projeta Escudo Foco. **Sistema: Confere Redução Mágica Elemental e Imunidades contra Pânico para Aliados adjacentes a você no seu Raio.**",
                "Ricochete Ocular Súcubo. **Sistema: Ataques Telepáticos Mentais dos Inimigos rebatem o Dano Psíquico da sua Mente Refletora contra eles Próprios de Retorno.**",
                "Mente de Diamante Lapidado. **Sistema: Completamente Inabalável: Imunidade a Magias Colossais de Possessão Mental ou Corrupção Alheia Oculta dos Falsos Deuses Arcanos Táticos.**"
            ],
            "Quebra-Amarras": [
                "Controle afrouxado. **Sistema: Magias inimigas de Enraizamento ('Root') tem duração reduzida pela metade.**",
                "Desdém mental. **Sistema: Efeitos inimigos Paralisantes na sua mente duram no máximo 1 único Turno.**",
                "Toque de Despertar. **Sistema: Usar a Ação de Tocar em um Aliado o desperta do Controle Mental inimigo de Magos e Súcubos na mesma hora da invocação.**",
                "Veto do Enfraquecimento. **Sistema: Imunidade a Feitiços de Preguiça, Enfraquecer Atributos Física ou Magias de Sono em Área dos Inimigos Táticos.**",
                "Supremacia Real Perante a Mentira. **Sistema: Cancela Automaticamente os Labirintos Sombrios Dimensionais Ilusórios Inimigos Revelando Cenário Original aos Aliados no Olhar e Presença Focada do Herói Magico.**"
            ],
            "Avatar da Mente": [
                "Empodera Conjurações. **Sistema: Adiciona Dano passivo equivalente ao Atributo Vontade nas Magias Divinas Disparadas.**",
                "Guerreiro Monge Oculto. **Sistema: Ataques Corpo-a-Corpo passam a Escalar Dano Bruto baseado em VONTADE (VON) em vez de FORÇA.**",
                "Canalização Divina. **Sistema: Converte 100% do Dano Físico de Espadas em Dano Mental Puro contra Armaduras e Golems.**",
                "Exorcismo Brutal. **Sistema: Golpes Físicos seus atingem Invocações Intangíveis e Fantasmas que possuem Imunidade Física.**",
                "Alma Projetada em Fúria. **Sistema: (Ação) Permite Lutar como Espírito Invulnerável fisicamente enquanto o corpo dorme seguro.**"
            ],
            "Vontade de Sobreviver": [
                "Recusa a morte de amigos. **Sistema: Se um aliado Cair Moribundo de HP Zero, você ganha +2 Dano Extra Imediato contra o Assassino Dele.**",
                "A Party no Limite. **Sistema: Se todos aliados caírem na luta: Dobra Seu Próprio HP Máximo regenerando a saúde como herói vingativo.**",
                "Senso de Dever Inumano. **Sistema: Chegar a 0 HP não lhe causa Nocaute/Desmaio; você permanece lutando gastando as Ações Normais.**",
                "Grito do Último Suspiro. **Sistema: Quando Aliado sofrer Letalidade, você gasta Reação para Cancelar a Morte deixando o Parceiro com 1HP.**",
                "Recusa a Morte Escrita. **Sistema: Cancela e Anula Passivamente os Ataques de Execução (InstaKill) recebidos, convertendo em Dano Normal.**"
            ],
            "Telecinese Latente": [
                "Balanço suave. **Sistema: Permite Atrair e Levitar Itens Leves à distância com a mente (sem gasto de movimento).**",
                "Atirar pedras e estilhaços. **Sistema: Ação Livre: Causa Dano Mágico de Longa Distância atirando os detritos/objetos do cenário.**",
                "Dedos da Mente. **Sistema: Reação Bônus: Interrompe a Concentração do Inimigo asfixiando-o telecineticamente.**",
                "Levitação Pessoal. **Sistema: Adquire Movimentação Voo. Imune a Terrenos Acidentados ou Buracos no Chão.**",
                "Destruição Telecinética. **Sistema: Ação Suprema: Empurra Muros e Objetos Massivos esmagando alvos no caminho (Dano em Área AoE).**"
            ]
        }
    },
    mis: {
        name: "Misticismo", icon: "fa-wand-magic-sparkles",
        perks: {
            "Afinidade Elemental": [
                "Magia Primal. **Sistema: Concede +1 base de Dano Mágico fixo em feitiços ofensivos.**",
                "Sintonia das chamas. **Sistema: +3 de Bônus direto a todos danos mágicos elementais.**",
                "Impacto residual. **Sistema: Seus feitiços de dano aplicam status de Queimadura/Congelamento no alvo.**",
                "Rasga consistência. **Sistema: O seu Dano Mágico ignora todas as resistências secundárias do alvo comum.**",
                "Purificador Supremo. **Sistema: Todo o seu Dano Elemental se converte em Dano Divino, ignorando imunidades.**"
            ],
            "Controle de Mana/Energia": [
                "Enxugar desperdício. **Sistema: Reduz em 1 o custo de Estamina/Mana de qualquer magia de nível médio.**",
                "Feitiços menores livres. **Sistema: Feitiços de Custo 1 se tornam Habilidades Grátis que não gastam ações ou mana.**",
                "Condensação de rituais. **Sistema: Corta pela metade o custo final de todas as Magias Pesadas.**",
                "Magia de Sangue. **Sistema: Permite usar HP próprio no lugar de Estamina/Mana para conjurar quando zerado.**",
                "Reservatório Arcano Infinito. **Sistema: (1x ao Dia) Ignora todos os limites e custos, conjurando uma Magia Lendária de graça.**"
            ],
            "Canalização Rápida": [
                "Acelera feitiços. **Sistema: Reduz o tempo de preparação de feitiços de múltiplos turnos em 1 turno inteiro.**",
                "Sinergia com runas. **Sistema: Permite mover-se e conjurar magias complexas simultaneamente (sem perda de esquiva).**",
                "Mãos independentes. **Sistema: Magias ofensivas ou defensivas menores se tornam Ação Bônus na rodada.**",
                "Dual-Cast Arcano. **Sistema: Permite conjurar duas magias distintas (ex: dano e cura) no mesmo turno.**",
                "Corte temporal absoluto. **Sistema: Transforma todos feitiços gigantes de preparação lenta em Casts Instantâneos.**"
            ],
            "Escudo Arcano": [
                "Condensação menor. **Sistema: Cria passivamente barreira que absorve os primeiros 10 pontos de dano recebido no combate.**",
                "Parede de Força prismática. **Sistema: Aumenta a proteção passiva do Escudo Arcano para absorver 30 HP.**",
                "Carapaça Empática. **Sistema: Inimigos que quebrarem sua Barreira recebem Dano Mental (LUST) imediato de retaliação.**",
                "Bomba Protetora Retaliatória. **Sistema: Quando a defesa se rompe, explode num leque de Dano em Área (AoE) massivo.**",
                "Aegis Cúpula de Prata. **Sistema: Barreira divina que absorve 1 único Golpe Final (Insta-Kill) ileso, trincando depois.**"
            ],
            "Raio Aumentado": [
                "Expansão Mística. **Sistema: Aumenta o tamanho de magias de alvo único para pegar alvos numa área de +5 Metros extra.**",
                "Artilharia Mágica. **Sistema: Amplia em +10 metros o alcance global da distância das magias sem penalidade de dano.**",
                "Cúpulas Dobradas. **Sistema: Qualquer Área de Efeito (AoE) criada por você tem o seu Raio Base exatamente dobrado.**",
                "Metralhadora Ramificada. **Sistema: Projéteis mágicos se ramificam passivamente para atingir múltiplos inimigos adjacentes do alvo.**",
                "Balística do Sniper Arcano. **Sistema: Magias de alvo atravessam obstáculos e o horizonte, com alcance ilimitado na masmorra.**"
            ],
            "Percepção Arcana": [
                "Terceiro Olho. **Sistema: Passiva ativada; percebe armadilhas arcanas e portões de ilusões secretos pelo mapa.**",
                "Visão da Aura. **Sistema: Identifica itens amaldiçoados e criaturas sob invisibilidade a olho nu.**",
                "Super-Computador Lógico. **Sistema: Ganha 1 Turno de Aviso informando qual o elemento que o inimigo conjurará.**",
                "Lê Segredos Rasteiros. **Sistema: Permite usar a Ação para Ler a Mente e puxar informações de um NPC/Lacaio à força.**",
                "Onisciência Completa. **Sistema: Seu olhar revela a planta completa da área, ignorando Furtividade e Invisibilidade da masmorra inteira.**"
            ],
            "Manipulação de Fluidos": [
                "Biologia Mágica. **Sistema: Poções e itens curativos ingeridos por você recebem +5 de HP curado adicional.**",
                "Transmutação alquímica. **Sistema: Transmuta poças tóxicas e água em Venenos Fatais ou Antídotos para o grupo.**",
                "Sanguessuga. **Sistema: Absorve HP direto de Oponentes Atordoados/Lentos causando Dano de Asfixia fluida.**",
                "Transferência de Vitalidade. **Sistema: Permite cortar o próprio pulso para doação de Atributos e Cura massiva a aliados caídos.**",
                "Lágrimas Purificadoras. **Sistema: Magias de cura extremas passam a anular Mutações Demoníacas e condições incuráveis.**"
            ],
            "Cura Amplificada": [
                "Estabilizador bruto. **Sistema: Todos os seus Feitiços de Cura ganham +10 de HP curado extra em qualquer aliado.**",
                "Rios vigorosos de luz. **Sistema: Aumenta em +20 HP bônus curativo passivo de qualquer Magia do tipo Cura.**",
                "Terapia Oculta Purificante. **Sistema: As suas curas limpam automaticamente Debuffs de LUST (Tesão) dos alvos atingidos.**",
                "Regeneração Celular Arcana. **Sistema: A Cura massiva regenera Membros Decepados e fraturas, burlando limitações da Carne.**",
                "Ressurreição da Luz Completa. **Sistema: Magias ou Habilidades finais de Cura podem Reviver Aliados do Estado de Morto ilesos.**"
            ],
            "Pacto de Sangue": [
                "Magia pelo Fio. **Sistema: Se não tiver mana, paga os feitiços consumindo HP Próprio em proporção de 1 para 1.**",
                "Conversão Mística Densa. **Sistema: Ofertar 1 HP com cortes sangrentos converte em 2 Energia/Stamina para a rodada.**",
                "Fúria Vingativa. **Sistema: Dobra o Alcance e Dano da sua Magia subsequente se tiver acabado de sofrer Dano Crítico.**",
                "Lifesteal Sanguinário. **Sistema: Passiva: Suas magias sombrias ou de sangue roubam HP da barra do Inimigo para você.**",
                "Parasitismo Oculto. **Sistema: Consegue drenar Vida de Lacaios imobilizados à força para pagar os custos das suas conjurações.**"
            ],
            "Absorção Mística": [
                "Esponja Mágica. **Sistema: Ser alvo de um feitiço inimigo (Mesmo tomando dano) recarrega +2 na sua barra de Energia/Stamina.**",
                "Devorador de Luxúria. **Sistema: Sofrer ataques Súcubos baseados em LUST não o afeta, e ainda regenera +5 na sua Energia Arcana.**",
                "Buraco Negro Reflexivo. **Sistema: Magias Elementares fracas (Até Custo 3) desaparecem e são anuladas sem causar dano em você.**",
                "Dreno Vampírico. **Sistema: Ação Bônus Corpo-a-corpo: Seca passivamente os recursos de Energia Mágica (Mana/Stamina) do alvo para sua reserva.**",
                "Engolidor do Caos Sideral. **Sistema: Pode usar Ação Reação Extrema para Engolir e Anular 1 Ataque Supremo Lendário/Nuclear de um Chefe.**"
            ],
            "Mestre Ritualístico": [
                "Rapidez Sombria. **Sistema: Reduz pela metade a quantidade de Turnos que feitiços de Área ou Rituais levam para se fixar.**",
                "Libertação Material. **Sistema: Conjurador pode soltar Magias Focadas e de Reagentes sem necessidade de pó, giz, ou grimório físico na mão.**",
                "Âncora Ambulante. **Sistema: Áreas Mágicas de proteção e efeitos não precisam ser fixas, elas passam a seguir o avatar.**",
                "Coro Macabro Único. **Sistema: Conjura magias Colossais feitas para 3 Pessoas, utilizando apenas 1 Ação solo e recursos próprios.**",
                "Falsificador de Leis. **Sistema: Permite criar Feitiços Híbridos com elementos impossíveis (Ex: Fogo que congela, Lava de raio).**"
            ],
            "Invocação Vinculante": [
                "Familiar Espião. **Sistema: Permite Invocar Criaturas menores que não lutam, mas mapeiam a masmorra e revelam o Grid.**",
                "Mensageiro Kamikaze. **Sistema: Familiares Invocados podem ser sacrificados numa Ação para explodir, causando Dano em Área no inimigo.**",
                "Invocação Sombria. **Sistema: Permite invocar Familiares de Classe Média (Lobos das Cinzas) para Atacar no seu Turno como Unidades Bônus.**",
                "Boi de Piranha Mental. **Sistema: O Seu Familiar absorve Ativamente todo Dano de LUST, Mind-Break e Condições focado em Você.**",
                "Pacto Colossal Avatar. **Sistema: Permite usar Ação Suprema para invocar uma Entidade Chefe Primária para destruir o Campo inteiramente sob seu controle.**"
            ]
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

    if(total > limit || isOver5) counterEl.className = 'text-red-500 font-bold';
    else counterEl.className = 'text-white';
    
    updatePerksMath(); // Refresh perk limits
    return { total, limit, isOver5 };
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
                    div.className = 'flex gap-2 mb-2';
                    div.innerHTML = `
                        <select class="input-dark flex-1 inp-skill-slot"><option value="${existingSk.id}" selected></option></select>
                        <button type="button" class="btn-icon text-red-400" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
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
        if (pts.total > pts.limit) {
            switchCharTab('base');
            return alert(`Você ultrapassou o limite de atributos! O máximo atual é ${pts.limit} (8 Base + Bônus de Classe).`);
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
                        
                        if(lvl === 5) {
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
