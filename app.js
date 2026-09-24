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
        sed: {
            name: "Sedução",
            icon: "fa-heart",
            perks: {
                "Seios Grandes": [
                    "Peitos fartos. Sistema: +1 em rolagens de Persuasão Visual.",
                    "Formato macio. Sistema: O toque inflige +2 Dano LUST instintivo. (Sem teste, contato direto).",
                    "Mamilos eretos. Sistema: Inimigos corpo a corpo sofrem -1 de Iniciativa (Requer falha em Teste de Resistência: VON vs SED do usuário).",
                    "Sufocamento de peitos. Sistema: Agarrões causam Dano LUST passivo e reduzem a Defesa LUST em -2 (Teste para Escapar: FOR/AGI vs FOR do usuário).",
                    "Transe. Sistema: Ação completa. Alvos (raio 5m) rolam Teste Oposto (VON vs SED do usuário) ou perdem o turno atordoados."
                ],
                "Bunda e Quadris Largos": [
                    "Bunda grande. Sistema: Ataques inimigos por trás sofrem Desvantagem (rola 2d20, pega o menor).",
                    "Molejo provocante. Sistema: +1 em Sedução; quem estiver na sua retaguarda sofre 1 Dano LUST passivo no turno dele.",
                    "Montaria de Coxas. Sistema: Vantagem (Teste: FOR/AGI vs AGI) para Imobilizar. Alvo imobilizado toma Dano LUST contínuo.",
                    "Carne absorvente. Sistema: Dano Físico nas costas reduzido em 1; converte em 1 Dano LUST em Área (Teste: VON vs SED para ignorar LUST).",
                    "Onda de Rebolado. Sistema: Ação em Área. Todos no raio visual fazem Teste Oposto (VON vs SED) ou ficam Atordoados por LUST (1 turno)."
                ],
                "Sexo Dominante": [
                    "Cheiro provocante. Sistema: Inimigo entrar em raio de 2m sofre 1 Dano LUST ambiente (Teste Oposto: VON vs SED anula).",
                    "Sensibilidade. Sistema: +2 Provocação (Taunt LUST). Apanhar aumenta seu dano LUST no turno seguinte.",
                    "Penetração Direta. Sistema: Acertar submissão/penetração ignora 50% da Defesa LUST do alvo (Teste Oposto: FOR/AGI vs FOR).",
                    "Vampirismo Seminal. Sistema: Se o alvo sofrer Mind Break perto de você, absorve a energia curando seu HP em 3d6.",
                    "Primeira Metida. Sistema: Acertar um ataque LUST crítico aplica Mind Break instantâneo (Teste Oposto: VON vs SED com Desvantagem do alvo para evitar)."
                ],
                "Cheiro Viciante": [
                    "Suor sedutor. Sistema: NPCs neutros rolam Teste Oposto (VON vs SED) ou ganham status 'Amigável'. +1 Interações.",
                    "Feromônio confuso. Sistema: Inimigos a 2m de distância rolam todos os testes de Vontade com Desvantagem.",
                    "Névoa de Tesão. Sistema: Passiva (+2 Dano LUST Área). Inimigos no raio perdem 1 de Acerto (Teste Oposto: VON vs SED resiste).",
                    "Aura Intensa. Sistema: Inimigos engajados com você perdem 25% da Resistência LUST Base (Teste Oposto: VON vs SED para negar).",
                    "Frenesi. Sistema: LUST em área (Teste Oposto: VON vs SED). Se falhar, NPCs e Monstros atacam uns aos outros."
                ],
                "Beijo que Drena": [
                    "Lábios úmidos. Sistema: Beijar impõe estado 'Obediente' a lacaios fora de combate (Teste Oposto: VON vs SED).",
                    "Beijo Confuso. Sistema: Alvo beijado após agarrão perde 1 Turno (Teste Oposto: VON vs SED para resistir).",
                    "Sucção de Energia. Sistema: Beijo forçado (Ataque LUST) drena passivamente 10 pontos de Stamina do alvo.",
                    "Beijo do Vampiro. Sistema: O beijo rouba 2d8 HP do alvo curando você diretamente.",
                    "Prisão Emocional. Sistema: Após beijar, o inimigo sofre -5 em todos os ataques se o alvo não for você (Teste Oposto: VON vs SED para quebrar)."
                ],
                "Olhar Dominador": [
                    "Olhos de desejo. Sistema: +2 direto na Habilidade de Sedução à distância.",
                    "Contato Travador. Sistema: Olhar direto em NPCs reduz a Iniciativa deles em -2 (Requer Falha em Teste: VON vs SED).",
                    "Provocação Ocular. Sistema: Pode causar 1d4 de Dano LUST no alvo com Ação Bônus (Teste Oposto: VON vs SED resiste metade).",
                    "Olhar Transpassante. Sistema: Mirar ativamente (Ação) corta a Defesa Mágica LUST do oponente pela metade.",
                    "Ajoelhar. Sistema: (Ação) Força Teste Oposto (VON vs SED). Falha faz o inimigo largar armas e implorar no chão."
                ],
                "Voz Sensual": [
                    "Voz rouca. Sistema: Garante Vantagem em testes (SED) para mentir ou pedir favores a NPCs.",
                    "Sussurro. Sistema: Oferece +1 de Bônus em testes cruzados de Agarrão/Submissão se sussurrar na orelha.",
                    "Palavras Provocantes. Sistema: Permite usar Ataques de LUST à distância (Raio de 10m) rolando SED vs VON.",
                    "Gemido Alto. Sistema: Cancelamento (Ação). Anula buffs mentais ou Fúria em 5m (Teste Oposto: VON vs SED do alvo para manter os buffs).",
                    "Canção da Sereia. Sistema: Paralisa todos os inimigos (raio 15m) que falharem no Teste (VON vs SED)."
                ],
                "Sem Vergonha": [
                    "Mente orgulhosa. Sistema: Ignora penalidades de armadura rasgada e debuffs mentais de 'Desconforto'.",
                    "Pele Exposta. Sistema: Estar nu/semi-nu garante +1 de Defesa LUST base.",
                    "Nudez Tática. Sistema: Estar nu garante +3 Rolagem Base para interações Sociais e Corpo-a-Corpo baseadas em SED.",
                    "Masoquismo. Sistema: Receber Dano LUST concede um Bônus temporário de +1 Dano Físico para si mesmo.",
                    "Resistência e Nudez. Sistema: Barra LUST cheia não te dá Mind Break; ativa imunidade mental (LUST) e dobra sua Força."
                ],
                "Fluidos Viciantes": [
                    "Sabor doce. Sistema: Qualquer fluido seu atua como item consumível; aliados curam +2 HP ao ingerir.",
                    "Soro do sangue/suor. Sistema: Cura ativa recebida/dada envolvendo seus fluidos é ampliada (+5 HP extra).",
                    "Néctar de Controle. Sistema: NPCs que ingerirem seu fluido rolam resistências contra você com Desvantagem (VON).",
                    "Fluido Purificador. Sistema: Fazer sexo/submissão anula imediatamente status de Veneno ou Doenças no parceiro.",
                    "Banho Purificador. Sistema: Sexo torna o aliado Imune a ataques LUST inimigos por 24 horas."
                ],
                "Pau Enorme": [
                    "Volume visual. Sistema: Ganha +1 bônus direto em rolagens conjuntas de Sedução e Intimidação.",
                    "Intimidar LUST. Sistema: Expor (Ação Bônus) causa +2 Dano LUST visual (Teste Oposto: VON vs SED anula).",
                    "Arma Contundente. Sistema: Pode usar como arma física concedendo +1 de Dano Desarmado.",
                    "Aprisionamento Interno. Sistema: Acertar submissão paralisa ativamente o parceiro por 1 Turno (Teste: VON vs SED para agir com desvantagem).",
                    "Ignora Resistência. Sistema: Ignora imunidade racial/tamanho em ataques LUST."
                ],
                "Língua Extensível": [
                    "Precisão Oral. Sistema: Concede Vantagem (AGI) para destrancar ferrolhos ou nós usando a boca.",
                    "Alcance Aumentado. Sistema: Pode aplicar golpes de Dano LUST (Ação Bônus) a média distância.",
                    "Músculo Adicional. Sistema: Bônus de +2 em testes Opostos Físicos (FOR) de Imobilização se focados em zonas erógenas.",
                    "Língua de chicote. Sistema: Alcance de 1 Metro. Permite Ataques de Oportunidade LUST (SED vs VON) contra quem recuar.",
                    "Língua Preênsil. Sistema: Funciona como Terceiro Braço. Permite manipular itens pesados ou desarmar inimigos a distância."
                ],
                "Buceta Hiperflexível": [
                    "Adaptação. Sistema: Imune a Dano Físico de empalamento/penetração na região.",
                    "Controle de pressão. Sistema: Adiciona +1 Dano LUST direto e passivo em golpes de Sexo ou Submissão.",
                    "Parede Rugosa. Sistema: Qualquer dano LUST causado a um penetrador é ampliado passivamente em 50%.",
                    "Espaço Interno. Sistema: Funciona como inventário oculto para armas leves e pequenos itens.",
                    "Recipiente Seguro. Sistema: Permite guardar líquidos vitais e Poções Mágicas dentro sem que estraguem."
                ],
                "Pele de Látex": [
                    "Textura lisa. Sistema: Ganha +1 Defesa Física natural contra arranhões e lâminas.",
                    "Flexibilidade Humana. Sistema: Vantagem (+3) em Testes Opostos de Acrobacia e Escape de apertos (AGI vs FOR).",
                    "Fricção Reduzida. Sistema: Inimigos têm penalidade passiva de -1 para acertar socos em você (deslizam).",
                    "Pele de Sucção. Sistema: Se o inimigo rolar Falha Crítica atacando você, a mão dele fica travada (Teste Físico: FOR vs AGI para soltar).",
                    "Corpo de Brinquedo. Sistema: Sofrer ataques físicos corpo-a-corpo devolve 1 ponto de Cura de LUST residual."
                ],
                "Dedos Longos e Flexíveis": [
                    "Alcance extra. Sistema: Ganha +1 passivo em testes de Prestidigitação (AGI) ou roubo furtivo.",
                    "Articulação Dupla. Sistema: Permite re-rolar 1 falha diária em teste manual para escape de algemas.",
                    "Habilidade Manual. Sistema: Aplica +2 de Dano LUST absoluto extra em golpes de submissão erótica contínua.",
                    "Mãos independentes. Sistema: Permite sacar e usar dois itens usando apenas 1 Ação.",
                    "Esticador. Sistema: Permite alcance cego de mecanismos e dano LUST interno (Ignora 50% da Defesa LUST nestes ataques)."
                ],
                "Pés Ágeis e Sensuais": [
                    "Pés com força. Sistema: Ganha +1 Equilíbrio (Vantagem passiva para resistir a Empurrões de FOR).",
                    "Dedos de Mão do Pé. Sistema: Vantagem em Prestidigitação usando as pernas, permitindo roubar embaixo da mesa sem usar as mãos.",
                    "Footjob Profissional. Sistema: Permite causar Dano LUST (1 Ação Bônus) usando os pés enquanto ataca normalmente com armas nas mãos.",
                    "Pisada de Controle. Sistema: Vantagem em Testes de Dominação/Controle (FOR) contra inimigos atordoados/caídos no chão.",
                    "Sentido Tátil. Sistema: Nunca é pego desprevenido; percebe furtividade no piso concedendo +1 Iniciativa passiva."
                ],
                "Mamilos Sensíveis e Longos": [
                    "Mamilos eretos. Sistema: Visíveis sob a roupa. Concede +1 em Persuasão Visual.",
                    "Tamanho aumentado. Sistema: Podem ser usados para estimulação (+1 Dano LUST em contato).",
                    "Hipersensibilidade. Sistema: Estímulo nos seios (Ação de LUST aliada/inimiga) recupera 5 de sua Stamina.",
                    "Flexíveis. Sistema: Conseguem ser sugados por si mesmos (Permite Auto-Cura de LUST de 1d4 como Ação).",
                    "Produção de fluido. Sistema: Quando com 50% de LUST, produzem fluido que cura e excita aliados que beberem (+5 HP, +2 SED)."
                ],
                "Quadris Largos": [
                    "Estrutura óssea. Sistema: Facilita posições de montar. +1 Bônus passivo para manter submissão superior.",
                    "Amplitude profunda. Sistema: Amplitude permite movimento mais focado. (+1 de Dano LUST fixo e +1 de Bônus em testes Opostos de Agarrão: FOR vs AGI).",
                    "Pelve absorvente. Sistema: Pode receber golpes fortes sem dor (Reduz 1 Dano Físico de impacto na região inferior).",
                    "Rotação de quadril. Sistema: Movimentos circulares durante sexo causam Dano LUST extra (Inimigo Rola VON vs SED ou toma dobro de Dano LUST).",
                    "Estrutura resiliente. Sistema: Cura acelerada após parir ou recuperar o fôlego (Descanso Curto concede +50% de eficácia)."
                ]
            }
        },
        con: {
            name: "Constituição", icon: "fa-shield-heart",
            perks: {
                "Couro Resistente": [
                    "Pele grossa. Sistema: Reduz permanentemente 1 Dano Físico recebido (Armadura Natural).",
                    "Couraça adaptável. Sistema: Redução base de Dano Físico aumentada para 3 absolutos.",
                    "Fechamento capilar. Sistema: Imunidade a status de Sangramento nível 1 e 2 (feridas rápidas).",
                    "Armadura Natural Reforçada. Sistema: Dobra a defesa corporal contra Perfurações (flechas e estocadas têm dano reduzido à metade).",
                    "Corpo Rígido. Sistema: Lâminas comuns têm 25% de chance de quebrar ao te atingirem com um Crítico (Teste Oposto de FOR do atacante vs sua CON para não quebrar a arma)."
                ],
                "Tolerância à Dor": [
                    "Nervos mortos leves. Sistema: Passivo; rola Vantagem em Testes de Resistência (VON) contra efeitos de dor mental.",
                    "Foco na Dor. Sistema: Penalidades por HP baixo só ativam quando chegar a 10% da vida total.",
                    "Combatente. Sistema: Imune à Paralisia ou Atordoamento oriundo de ataques físicos críticos.",
                    "Adrenalina. Sistema: Ao tomar um Crítico inimigo, ganha passivamente +2 de Dano Físico no seu próximo ataque.",
                    "Resistência Final. Sistema: Se HP zerar, não desmaia; ganha 3 Turnos para agir antes de cair inconsciente."
                ],
                "Sistema Imunológico Forte": [
                    "Digestão Forte. Sistema: Vantagem em Testes de Resistência (CON) para resistir a Náusea e Veneno injetado.",
                    "Anticorpos de guerra. Sistema: Imunidade passiva a todas as Doenças de contágio comum mundano.",
                    "Sangue Reativo. Sistema: Corta o tempo ativo de 'Envenenamento Severo' e as rolagens de toxinas pela metade.",
                    "Cura Sanguínea. Sistema: Seu sangue atua como item (Ação) que cura Veneno de aliados próximos.",
                    "Muralha Biológica. Sistema: Imune a Doenças mágicas e infestações parasitárias."
                ],
                "Regeneração Acelerada": [
                    "Sangue rápido. Sistema: Descansos curtos (Short Rests) curam 50% mais a sua barra de HP que a regra habitual.",
                    "Latente passiva. Sistema: Fora de Batalha (Exploração), você cura passivamente 1 HP permanente a cada 10 Minutos no jogo.",
                    "Pulsante em combate. Sistema: No início do seu turno, recupera HP exato equivalente ao seu Modificador de Constituição (CON).",
                    "Costura Rápida. Sistema: Estanca automaticamente a condição Hemorragia Massiva instantâneo no turno 1, sem rolar nem gastar Ação.",
                    "Regeneração Avançada. Sistema: Reconecta e conserta Magicamente Membros do corpo amputados usando a ação inteira."
                ],
                "Densidade Óssea": [
                    "Massa pesada. Sistema: Ganha +1 bônus fixo nos Testes Opostos (CON/FOR) contra tentativas inimigas de Empurrões.",
                    "Caixa torácica reforçada. Sistema: Imunidade passiva a quebra-ossos; (Armas Contundentes perdem o bônus de Dano Crítico em você).",
                    "Esqueleto Encouraçado. Sistema: Bater em você machuca o oponente. Socos Desarmados inimigos dão 1 Dano a quem bateu.",
                    "Imóvel em Quedas. Sistema: Nunca recebe Dano de Queda (Livre para até 15 metros caindo de pé).",
                    "Estrutura Óssea Densa. Sistema: Imune ao 'Dano Contundente' global e mecânica de Esmagamento."
                ],
                "Termorregulação Perfeita": [
                    "Nega incômodos. Sistema: Ignora Debuff de clima extremo (Desertos ou Neve) sem exigir roupas térmicas.",
                    "Resistência de Pele. Sistema: Ganha Resistência Passiva (Dano Cortado na metade) contra todos ataques de Fogo e Gelo comum.",
                    "Metabolismo Estável. Sistema: Imune à condição 'Fadiga por Clima'. Nunca perde Stamina por calor extremo.",
                    "Absorção Elementar. Sistema: Ser atingido por feitiços rasteiros de Fogo ou Gelo cura Vida HP no lugar de machucar.",
                    "Isolamento Absoluto. Sistema: Imunidade a tomar Dano de Fogo. Nega chamas místicas e nevascas."
                ],
                "Estômago Forte": [
                    "Mastigação Forte. Sistema: Pode ingerir e se curar com sucata orgânica como se fossem Ração nos testes de Descanso.",
                    "Processamento dobrado. Sistema: Toda Poção Menor de HP/Stamina tem eficácia dobrada em você.",
                    "Corrupção Alimentar. Sistema: Ingerir venenos propositais curam seus outros debuffs internos em vez de causar dano.",
                    "Devorar. Sistema: (Ação Principal) Consumir orgânicos caídos na arena aplica bônus de +20 HP temporário.",
                    "Fornalha Gástrica. Sistema: Engolir miúdos de Chefes confere um Status temporário do Monstro na sua ficha."
                ],
                "Firmeza de Montanha": [
                    "Base Firme. Sistema: Impossível sofrer ataques de condição 'Surpresa' furtivos corpo-a-corpo e não cai por tropeço normal.",
                    "Duelo de força. Sistema: Rolagem de +2 base fixo em Testes Opostos de Rasteiras ou Disputas de Agarrão.",
                    "Enraizamento. Sistema: Imunidade completa a Knockback vindo de Forças de Tamanho 'Médio' ou inferior.",
                    "Rebote Cinético. Sistema: Tentar te dar um empurrão devolve 1d4 de Dano Contundente (Requer Falha em Teste Oposto: FOR do atacante vs sua CON).",
                    "Gravidade Puxada. Sistema: Cancela e imuniza as mecânicas ambientais de Telecinese Inimiga e Levitações forçadas."
                ],
                "Vitalidade Ampliada": [
                    "Sangue encorpado. Sistema: Modificador de Multiplicação: +10% de acréscimo final calculado no seu HP Máximo Base.",
                    "Coração espesso. Sistema: O Bônus sobe para +20% HP Máximo total da ficha.",
                    "Veias Fortes. Sistema: O Modificador atinge +30% HP Máximo na ficha.",
                    "Reservatório Físico. Sistema: Aplica +50% no HP Máximo e ganha Vantagem em Testes Opostos de empurrão.",
                    "Coração Resistente. Sistema: Ressurreição: Uma vez em campanha, se morto em batalha, você auto-revive com 50% HP imediato."
                ],
                "Estase Carnal": [
                    "Genética Lenta. Sistema: A longevidade da vida ignora os efeitos e penalidades de envelhecimento.",
                    "Pulmões Controlados. Sistema: Confere x3 no multiplicador de Fôlego debaixo d'água antes de sofrer asfixia.",
                    "Hibernação. Sistema: Consegue sobreviver semanas sem água/comida zerando os limites de sobrevivência ao adormecer.",
                    "Controle Hemorrágico. Sistema: (Ação Livre) Prende Veneno ativo em 1 membro anulando a dispersão sistêmica.",
                    "Estase Completa. Sistema: Imune à maldição de Roubo de Idade e a mecânicas temporais de envelhecimento mágico."
                ],
                "Escudo Físico Reativo": [
                    "Músculos reflexos. Sistema: +1 de CA (Classe de Armadura) contra golpes furtivos surpresa.",
                    "Pele repulsiva. Sistema: Quem te ataca corpo-a-corpo e erra sofre Desvantagem no próximo ataque (Teste de Resistência: VON vs sua CON).",
                    "Onda Muscular. Sistema: Receber +30 de dano num turno empurra inimigos 2m pra trás (Teste Oposto: FOR/AGI do inimigo vs sua CON para resistir).",
                    "Casco da Tartaruga. Sistema: Ação Bônus (Desistir de andar): Dobra sua Defesa Física passiva no turno.",
                    "Abalo Refletor. Sistema: Todo dano físico corpo a corpo recebido reflete 50% de volta (Teste de Resistência: AGI do atacante vs sua CON para esquivar)."
                ],
                "Glândulas Adaptativas": [
                    "Suor ácido. Sistema: Ganha Vantagem (+2) em Testes Opostos (CON/AGI) para escapar de amarras de corda.",
                    "Suor Inibidor. Sistema: Inimigos num raio de 2m sofrem Desvantagem para lançar feitiços de Medo/LUST contra você.",
                    "Película Deslizante. Sistema: Imunidade passiva permanente contra a condição de ser 'Agarrado' (Grappled).",
                    "Mutações Químicas. Sistema: Oponentes que ingerirem/tocarem seu fluido sofrem Envenenamento e -2 VON (Teste de Resistência: CON vs sua CON anula).",
                    "Crisálida de Sono. Sistema: Em MindBreak ou HP zero, vira um casulo por 24h e revive com HP max/LUST zero."
                ]
            }
        },
    vig: {
        name: "Vigor", icon: "fa-bolt",
        perks: {
            "Fôlego Constante": [
                "Pulmões de ferro. Sistema: Aumenta sua reserva máxima em +10 Stamina.",
                "Músculos incansáveis. Sistema: Aumento permanente de +20 Stamina Máxima.",
                "Eficiência cardiovascular. Sistema: Reduz em -1 o Custo de Stamina de golpes físicos.",
                "Fornalha pulmonar. Sistema: Ganha +50 Stamina Máxima. Imunidade à condição Exaustão.",
                "Recuperação Contínua. Sistema: Recupera passivamente 15 Stamina a cada turno de combate."
            ],
            "Corredor Frequente": [
                "Pernas densas. Sistema: Bônus permanente de +2m na sua Movimentação.",
                "Passo Lamacento. Sistema: Ignora custo extra de movimento mecânico em Terreno Difícil.",
                "Adaptação de Carga. Sistema: Ignora penalidades de movimentação impostas por Armaduras pesadas.",
                "Investida Direta. Sistema: Ação Correr (Dash) agora custa apenas uma Ação Bônus.",
                "Mobilidade Tática. Sistema: Movimentação em combate não aciona Ataques de Oportunidade do inimigo."
            ],
            "Coração Resiliente": [
                "Adrenalina. Sistema: Recupera 5 Stamina imediata ao sofrer dano físico.",
                "Foco em Combate. Sistema: Acertar ataque melee (corpo a corpo) recupera 5 Stamina.",
                "Sacrifício da Carne. Sistema: Permite usar HP no lugar de Stamina (Conversão 1 HP = 2 Stamina).",
                "Coração forte. Sistema: A regeneração natural de Stamina é dobrada permanentemente.",
                "Imunidade Muscular. Sistema: Zerar HP/Stamina não causa inconsciência imediata; você aguenta mais 1 turno de pé."
            ],
            "Repelir Êxtase": [
                "Controle Mental. Sistema: Aumenta o seu Limiar Máximo da barra de LUST em +5 pontos.",
                "Treino de Foco. Sistema: Aumenta o seu Limiar Máximo da barra de LUST em +10 pontos.",
                "Tolerância. Sistema: Aumenta o seu Limiar Máximo da barra de LUST em +20 pontos.",
                "Masoquismo Reativo. Sistema: Passar de 50% de LUST concede Bônus de +2 em Rolagens Físicas (FOR/AGI/CON).",
                "Transe de Combate. Sistema: LUST Cheio ativa Fúria (+50% Dano) ao invés de aplicar Mind Break automático."
            ],
            "Adaptação Erótica": [
                "Alívio prático. Sistema: Ação de 'Alívio Sexual' custa metade da Stamina em combate.",
                "Maestria corporal. Sistema: Alívio Pessoal em combate não consome Ação Principal (apenas Ação Bônus).",
                "Foco Rápido. Sistema: A ação de Alívio Sexual recupera +15 Stamina instantânea.",
                "Provocação. Sistema: Se aliviar em combate aplica Dano LUST em área (Teste de Resistência Oposto: VON vs VIG/SED para anular).",
                "Clímax de Combate. Sistema: Atingir gozo zera todos os tempos de recarga (Cooldowns) da sua classe de combate."
            ],
            "Tolerância Adrenalínica": [
                "Bloqueio de Tesão. Sistema: Imune aos debuffs mecânicos causados pelo Estágio 1 de LUST.",
                "Foco Inibidor. Sistema: Anula completamente os debuffs causados pelo Estágio 2 de LUST.",
                "Conversão Mística. Sistema: O debuff de Estágio 3 passa a conceder +2 de Dano Físico ao invés da penalidade.",
                "Couraça de Nervos Rígidos. Sistema: 100% Imune aos Espasmos Paralisantes e perda de turno gerada por alto LUST.",
                "Fúria após Mind Break. Sistema: Sofrer Mind Break ativa a Fúria de Combate, dobrando FOR sem controle (Berserk) por 3 turnos."
            ],
            "Capacidade Pulmonar": [
                "Oxigenação Elevada. Sistema: Dobra o limite mecânico de tempo segurando o fôlego sob água ou gás.",
                "Filtro natural. Sistema: Vantagem natural (CON) contra ataques que envolvam Veneno/Gás inalados.",
                "Sobrevivência aquática. Sistema: Ignora o Dano Fixo de Asfixia direto nas primeiras 5 rodadas submerso.",
                "Caixa Respiratória. Sistema: Fica completamente imune a sofrer 'Dano de Toxina Inalada'.",
                "Pulmões Adaptáveis. Sistema: Passa a respirar normalmente debaixo d'água e em áreas de vácuo mágico."
            ],
            "Segundo Fôlego": [
                "Reserva emergencial. Sistema: (Ação Bônus) Recupera 10 Stamina ativa em batalha 1x ao dia.",
                "Dobro da Reserva. Sistema: O Segundo Fôlego passa a recuperar 30 Stamina no combate.",
                "Conversão de Vitalidade. Sistema: Pode queimar 25% do seu HP Máximo para recuperar imediatamente toda a Stamina.",
                "Onda de Energia. Sistema: Acionar Segundo Fôlego joga Inimigos adjacentes 2m para trás (Teste Oposto: FOR/AGI vs sua VIG para resistir).",
                "Vigor Mínimo. Sistema: A sua Stamina é incapaz de descer abaixo de 10 na barra mecânica."
            ],
            "Atleta Treinado": [
                "Corpo flexível. Sistema: Vantagem passiva (+ mod VIG) em todo Teste Acrobático e de Escalada de cenário.",
                "Fibras elásticas. Sistema: Multiplica a distância de qualquer rolagem base de Salto longo por 3.",
                "Corpo Resistente. Sistema: Não exige Teste de Resistência à Exaustão (CON) ao ficar múltiplas noites sem dormir.",
                "Biorritmo Estável. Sistema: Imunidade ao status mecânico 'Lentidão' vindo de armadilhas ou Feitiços de Gelo.",
                "Físico Protegido. Sistema: Feitiços e Monstros não conseguem drenar ou aplicar debuff permanente nos seus Atributos Físicos."
            ],
            "Aura de Energia": [
                "Inspiração Tropa. Sistema: Concede +5 de Stamina (Max ST) passiva a aliados num raio de 5m.",
                "Corrente Mágica. Sistema: Aumenta o buff para os aliados na aura para +10 Max ST.",
                "Transferência de Pulso. Sistema: Doa (Ação Bônus) metade da sua Stamina pra curar a barra de um aliado.",
                "Comando de Motivação. Sistema: Ao usar ação para motivar um Aliado, sua próxima habilidade custa zero Stamina.",
                "Cúpula Revigorante. Sistema: Passivamente dobra a velocidade de Regeneração de ST natural de todos aliados na aura."
            ],
            "Blindagem Mental": [
                "Bloqueio de Tesão. Sistema: Subtrai passivamente 10% do Dano LUST total que um inimigo causa a você.",
                "Psiquê Protegida. Sistema: A redução contra qualquer Dano LUST sofrido no combate aumenta para 25%.",
                "Drenagem de Energia. Sistema: Ataques Místicos LUST contra ti curam a sua Stamina num valor equivalente ao invés de subir LUST.",
                "Impactos Telepáticos Convertidos. Sistema: Qualquer magia telepática agressiva contra você te cura em HP.",
                "Vigor Estável. Sistema: Inimigos estão impedidos magicamente de sugar ou roubar seu MP/Stamina."
            ],
            "Descanso Profundo": [
                "Sono Rápido. Sistema: Descansos curtos de Acampamento (1h) concedem a você a cura máxima de um Descanso Longo (8h).",
                "Reparação Celular. Sistema: Dormir remove a Condição 'Doença Menor' automaticamente sem itens.",
                "Tática de Guerrilha. Sistema: Bastam 15 minutos em meditação para curar todo o HP e Stamina no meio da masmorra.",
                "Sono Purgante. Sistema: O descanso zera a corrupção oculta mental sombria que restou (Zera a barra de LUST).",
                "Estase de Cristal. Sistema: Torna-se Imune a ataques furtivos e dano furtivo bônus enquanto estiver dormindo."
            ]
        }
    },
    for: {
        name: "Força", icon: "fa-dumbbell",
        perks: {
            "Golpes Pesados": [
                "Músculos grandes. Sistema: Adiciona +1 de Dano Fixo Corpo-a-Corpo (Melee).",
                "Impactos maciços. Sistema: Concede +3 de Dano Fixo (Melee).",
                "Força de Empurrão. Sistema: Acertos físicos empurram os alvos em 1 Metro (Teste Oposto de Resistência: FOR/AGI do alvo vs sua FOR para não recuar).",
                "Ataque em Área. Sistema: Seu ataque físico atinge também alvos menores em 1 quadrado adjacente ao principal.",
                "Quebra de Armadura. Sistema: Seus ataques corpo-a-corpo ignoram 50% da Armadura Física inimiga (passivo)."
            ],
            "Agarre Firme": [
                "Trava Corporal. Sistema: Vantagem passiva automática para rolar testes Opostos de Agarrões/Submissão.",
                "Cadeado físico. Sistema: O Inimigo possui Desvantagem para tentar escapar de seus agarrões.",
                "Aperto na Garganta. Sistema: Oponente agarrado toma 1d4 de Dano Asfixiante direto no início do seu turno (Dano automático).",
                "Trauma Físico. Sistema: Um Crítico num agarrão aplica -2 em Atributos Físicos (FOR/AGI) do alvo permanentemente.",
                "Abraço Asfixiante. Sistema: (Ação) O Agarrão em lacaios pequenos resulta em Morte Instantânea (Requer falha em Teste Oposto: FOR/AGI vs sua FOR)."
            ],
            "Músculos Fibrosos": [
                "Enrijecer. Sistema: Vantagem (+2) em Testes de Resistência Opostos (FOR/AGI) para evitar Rasteiras ou ser derrubado.",
                "Redutor Contundente. Sistema: Reduz em 2 todo Dano Contundente sofrido no combate.",
                "Densidade Tática. Sistema: Monstros ou magias de tamanho médio não conseguem mover ou jogar você pelo grid.",
                "Rompedor de Amarras. Sistema: Quebra amarras e correntes usando apenas 1 Ação Bônus sem rolar dados.",
                "Corpo Imóvel. Sistema: Ganha Imunidade passiva total às condições de 'Agarrado' ou 'Imobilizado'."
            ],
            "Quebra-Defesas": [
                "Fura-Defesas. Sistema: Seus ataques ignoram 1 Ponto direto de Redução de Dano Físico inimigo.",
                "Aço Danificado. Sistema: Seus ataques desconsideram 3 Pontos de Defesa Física passiva de Monstros Fortes.",
                "Destruição de Base. Sistema: Acertos críticos quebram escudos pequenos de madeira imediatamente.",
                "Abalo Físico. Sistema: Acertos Críticos reduzem permanentemente a Defesa Base do inimigo em 1 ponto.",
                "Dano a Estruturas. Sistema: Quebra instantaneamente qualquer Parede Mágica de Gelo/Terra conjurada usando Força."
            ],
            "Arremesso Pesado": [
                "Atirador Físico. Sistema: Pode usar Perícia Atletismo (FOR) para atacar jogando objetos pesados no inimigo.",
                "Arremesso de Corpos. Sistema: (Ação) Permite arremessar inimigos pequenos ou cadáveres como projéteis.",
                "Remoção Aliada. Sistema: Arremessa um Aliado pra fora de Zonas de Perigo sem causar Dano a ele.",
                "Chuva de Detritos. Sistema: Jogar objetos massivos causa 'Atordoado' em área de 3m (Teste Oposto de Esquiva: AGI do alvo vs sua FOR).",
                "Impacto em Gigantes. Sistema: Consegue realizar Empurrões (Knockbacks) contra Chefes Gigantes (Teste Oposto normal de FOR vs FOR)."
            ],
            "Força de Impacto": [
                "Peso Extra. Sistema: Inflige a condição 'Lentidão' nos Inimigos que bloquearem golpes pesados (Teste de Resistência: CON vs sua FOR anula).",
                "Concussão Focada. Sistema: Acertos Críticos aplicam a Condição 'Tonto', reduzindo a rolagem do Próximo Turno Inimigo.",
                "Impacto na Cabeça. Sistema: Pancadas Desarmadas aplicam status de 'Atordoado' em Lacaios (Teste de Resistência: CON do alvo vs sua FOR para evitar).",
                "Abalo. Sistema: Golpear o chão converte um raio de 3m do grid em 'Terreno Difícil'.",
                "Onda de Choque. Sistema: Ataques errados ainda causam Dano (metade da FOR) em alvos adjacentes pelo impacto."
            ],
            "Força Desmedida": [
                "Ataque a Caídos. Sistema: +2 de Dano Fixo imediato em Oponentes sob a condição 'Caído/Derrubado'.",
                "Dano Extra. Sistema: +5 de Dano Fixo Adicional ao atacar inimigos sob a condição 'Agarrado' ou 'Imobilizado'.",
                "Chute Rápido. Sistema: Atacar oponentes 'Atordoados' garante Vantagem (Rola 2d20) nas rolagens de acerto melee.",
                "Ataque Oportunista. Sistema: O seu primeiro ataque contra um inimigo 'Rendido/Dormindo' multiplica o Dano Final por x2.",
                "Grito Aterrador. Sistema: Matar um inimigo força alvos ao redor a sentirem Medo (Teste de Resistência Oposto: VON do alvo vs sua FOR)."
            ],
            "Tensão Muscular Mágica": [
                "Força Mágica. Sistema: Em Duelos Arcanos, você pode rolar FORÇA em vez de VONTADE para resistir a um Empurrão Mágico.",
                "Quebrar Magia. Sistema: Pode quebrar Prisões Arcanas invisíveis socando-as diretamente com Atletismo (FOR).",
                "Soco Antimagia. Sistema: Golpes Desarmados aplicam +2 Dano Bônus Fixo ao atingir Invocações ou Elementais Mágicos.",
                "Empunhadura Estável. Sistema: Segurar espadas envoltas em chamas ou venenos não causa Dano nas mãos.",
                "Rebote Físico. Sistema: (Ação de Reação) Permite socar feitiços de projétil (Teste Oposto: FOR vs Magia) rebatendo-os."
            ],
            "Saltador Experiente": [
                "Salto de Base. Sistema: Pode realizar saltos acrobáticos de +5m Verticais sem impulso de corrida.",
                "Ataque em Queda. Sistema: Cair de um Salto Longo em cima de inimigos permite adicionar um Dado Extra de Dano da arma.",
                "Transporte Aéreo. Sistema: Salto Longo permite carregar 1 Aliado leve sem diminuir a distância do pulo.",
                "Abalo na Queda. Sistema: A aterrissagem pesada causa 'Derrubado' em Inimigos num raio de 3m (Teste Oposto de Equilíbrio: FOR/AGI vs sua FOR).",
                "Aterrissagem Pesada. Sistema: Zera o Dano de Queda livre e reverte como Dano Esmagador contra o alvo atingido no solo."
            ],
            "Carregador de Fardo": [
                "Costas Firmes. Sistema: Armas mecânicamente classificadas como 'Pesadas' não diminuem sua Velocidade de Movimento.",
                "Carga Extra. Sistema: Dobra permanentemente sua capacidade de Carga/Inventário sem lhe causar Debuff de peso.",
                "Mover Corpos. Sistema: Arrastar lacaios imobilizados no grid passa a não gastar ou penalizar sua Movimentação.",
                "Firmeza de Uma Mão. Sistema: Consegue empunhar Armas 'Duas Mãos' usando apenas Uma Mão (Liberando a outra para Escudo).",
                "Suporte Estrutural. Sistema: (Ação) Capaz de suportar fisicamente Armadilhas de Esmagamento/Teto para o grupo."
            ],
            "Ataques Focados": [
                "Ritmo de Batalha. Sistema: Ganha um bônus progressivo de +1 Dano Fixo por rodada se atacar sem errar.",
                "Foco Acumulado. Sistema: O bônus progressivo aumenta para +2 de Dano Fixo por cada rodada acertando.",
                "Ferida Aberta. Sistema: Seu Dano Físico aplica o Status de 'Sangramento Nível 1' em criaturas biológicas.",
                "Ferida Profunda. Sistema: Causar o Dano de Sangramento debuffa Curas Inimigas (-50% Heal Reduction) no alvo.",
                "Amputação Direta. Sistema: Um Sucesso Crítico permite inutilizar partes secundárias (Braço, Cauda, Asas) do alvo."
            ],
            "Impacto Sísmico": [
                "Tremores Leves. Sistema: Errar um golpe desequilibra Alvos Menores em volta (-1 Acerto para eles) (Teste Oposto: AGI vs FOR anula).",
                "Abalo de Solo. Sistema: (Ação Bônus) Pisada cria um abalo; Inimigos a 2m sofrem Derrubado (Teste Oposto: FOR/AGI vs sua FOR).",
                "Cobertura Rápida. Sistema: Soco Mágico no chão sobe uma pedra temporária que lhe concede Cobertura Média (+2 CA).",
                "Fenda Direta. Sistema: Esmagar o Chão cria uma Fenda num alvo com Dano e 'Pernas Presas' (Teste Oposto de Esquiva: AGI vs FOR).",
                "Abalo Estrutural. Sistema: (Ação Suprema) Um único golpe direcionado derruba Paredes Mágicas ou Fortificações do cenário."
            ]
        }
    },
    agi: {
        name: "Agilidade", icon: "fa-person-running",
        perks: {
            "Reflexos Apurados": [
                "Percepção leve. Sistema: Ganha +2 Fixo nos lances de Iniciativa em combate.",
                "Reação de aranha. Sistema: Ganha +5 Fixo de Iniciativa, movendo-se no instante em que pensam em atacar.",
                "Mente acelerada. Sistema: Impossível sofrer ataques de condição 'Surpresa' enquanto dorme ou de olhos vendados.",
                "Antecipação Tática. Sistema: Uma vez por combate (Ação Livre), troque seu lugar na ordem de turnos de Iniciativa com um aliado.",
                "Iniciativa Perfeita. Sistema: Você é invariavelmente o primeiro a agir em qualquer combate (Iniciativa Máxima Absoluta)."
            ],
            "Esquiva Acrobática": [
                "Ginga fluida. Sistema: Bônus permanente de +1 na sua Classe de Armadura (CA) / Esquiva base.",
                "Rolamentos de recuo. Sistema: Bônus permanente aumenta para +3 de CA (Esquiva natural) contra Ataques a Distância.",
                "Olhos afiados focados. Sistema: Garante Vantagem passiva para desviar (Teste de Resistência de AGI) contra Magias de Área.",
                "Acrobacia Aérea. Sistema: +5 CA absoluta e permite usar Esquiva no Ar, cancelando ataques anti-aéreos.",
                "Aparar do Vento. Sistema: Todo ataque que errar você força o inimigo a rolar (Teste Oposto: FOR/AGI dele vs sua AGI) ou ele deixa a arma cair."
            ],
            "Deslize Furtivo": [
                "Passos sutis. Sistema: Ganha Vantagem (Rola 2d20) em todos Testes de Furtividade (AGI) para não fazer ruído.",
                "Camuflagem instintiva. Sistema: Ficar parado em sombras densas fornece status de Invisibilidade a olho nu.",
                "Pés sem atrito. Sistema: Ignora e passa imune a armadilhas de piso de placa de pressão sem acioná-las.",
                "Aproximação Letal. Sistema: Usar a Ação de Esconder-se agora consome apenas uma Ação Bônus.",
                "Ataque Furtivo. Sistema: Se iniciar combate Oculto, seu primeiro ataque multiplica o Dano Final por x10 (Abate Vitais)."
            ],
            "Precisão Letal": [
                "Olhar calculista. Sistema: Margem de Crítico Físico aumentada em 1 (Acerta Crítico rolando 19 ou 20 no d20).",
                "Punhaladas nos vasos. Sistema: Margem Crítica aumentada para 2 (Acerta Crítico Físico rolando 18, 19 ou 20).",
                "Golpes perfeitamente aplicados. Sistema: Acertos Críticos aplicam o Status Cegueira ou Sangramento Severo no inimigo.",
                "Ponto fraco exposto. Sistema: Seu Dano Crítico passa a ignorar 100% da Redução de Armadura Física do alvo.",
                "Abate de Lacaios. Sistema: Todo ataque Crítico Corpo-a-Corpo contra lacaios menores/fracos resulta em Instakill garantido."
            ],
            "Queda de Gato": [
                "Articulações elásticas. Sistema: Corta pela exata metade todo o Dano Físico recebido por Quedas Livres.",
                "Pulo Felino. Sistema: Quedas ou saltos acidentais de até 20m de altura tornam-se mecanicamente inofensivos (0 Dano).",
                "Equilíbrio Aéreo. Sistema: Imune à condição 'Derrubado' após Quedas ou Knockbacks Aéreos; sempre pousa de pé.",
                "Planar Aerodinâmico. Sistema: Pode planar suavemente (como Magia Levitação leve) manipulando as roupas no ar.",
                "Aterrissagem Segura. Sistema: Ignora Dano Terminal completamente, caindo de céu/nuvens até o chão sem receber nenhum arranhão."
            ],
            "Escapar de Agarrões": [
                "Corpo escorregadio. Sistema: Recebe Bônus Fixo de +2 nos Testes Opostos (AGI) para escapar de Agarrões/Grapples Inimigos.",
                "Articulações deslocáveis. Sistema: O Bônus Fixo aumenta para +5 Absoluto em testes para fugir de qualquer Submissão/LUST.",
                "Escape Rápido. Sistema: Tentar soltar-se vira uma Ação Bônus ao invés de consumir sua Ação Principal.",
                "Reflexo Sujo. Sistema: Inimigos que tentarem te Agarrar e falharem recebem Condição 'Atordoado' no turno (Teste de Resistência CON vs AGI).",
                "Escape Oportuno. Sistema: Quando se solta com sucesso, rouba passivamente a arma ou 1 item menor do inimigo."
            ],
            "Ataques Rápidos": [
                "Movimento contínuo. Sistema: Armas leves/finesse (Adagas/Sabres) causam +1 de Dano Fixo.",
                "Mãos borradas. Sistema: Ganha a capacidade de usar um Ataque Extra (Ação Bônus) se usar Armas Leves/Desarmado.",
                "Aceleração Cardíaca. Sistema: Pode gastar 10 Stamina para desferir um Terceiro Ataque Físico livre na sua rodada.",
                "Foco Sanguíneo. Sistema: Acertar golpes sucessivos num mesmo inimigo acumula Bônus de +2 Dano por acerto na mesma rodada.",
                "Ataque Giratório. Sistema: (Ação Principal) Você gira atacando todos os alvos a 1 quadrado de distância ao mesmo tempo com sua arma."
            ],
            "Contra-Ataque Rápido": [
                "Abertura oportunista. Sistema: Se um inimigo corpo-a-corpo errar o ataque em você, permite 1 Revide/Contra-Ataque de Reação imediato.",
                "Revide Direto. Sistema: Seu Contra-Ataque de Reação ganha Bônus para causar seu Dano Bruto integral da Arma Primária.",
                "Reação Dupla. Sistema: Você recebe passivamente 2 Ações de Reação por Rodada (pode contra-atacar duas vezes em turnos inimigos).",
                "Aparar e Perfurar. Sistema: Acertar um Contra-Ataque interrompe o combo inimigo, encerrando o turno de ação física dele.",
                "Contra-Ataque Preciso. Sistema: Alvos atingidos pelo seu Contra-Ataque sofrem Sangramento e 'Lentidão' no próximo turno."
            ],
            "Passo Fantasma": [
                "Corrida ofuscante. Sistema: Mover-se ao menos 3 metros no seu turno te concede +1 de CA (Esquiva) passiva até o próximo turno.",
                "Passo Invisível. Sistema: Se mover ou sair de combate corporal não gera/ativa Ataques de Oportunidade contra você.",
                "Fase etérea passageira. Sistema: Pode usar seu Deslocamento para atravessar fisicamente 1 espaço ocupado por um inimigo sem impedimento.",
                "Leveza Impossível. Sistema: Corre livremente por Superfícies Verticais (paredes) ou por cima de Água Líquida se mantiver o passo.",
                "Salto Sombrio. Sistema: (Ação Bônus) Se esconder em área de Penumbra permite se Teleportar para outra área de Breu a até 10m visíveis."
            ],
            "Mobilidade Avançada": [
                "Bater e Correr. Sistema: Após realizar Ação de Ataque, desliza magicamente 2 metros grátis no grid.",
                "Recuo Elástico. Sistema: O deslize/recuo grátis é estendido para 5 metros de fuga absoluta na rodada.",
                "Impulso Tático. Sistema: Mover-se no primeiro turno de combate tem o Deslocamento total dobrado.",
                "Miragem de Passos. Sistema: Ao usar Correr (Dash), todos inimigos ganham Desvantagem (-Rola 2d20) ao te alvejar com ataques visuais.",
                "Movimento e Ataque. Sistema: Seu 'Ataque Giratório' (Ataque em Área) agora pode atingir alvos separados saltando num raio de 10m."
            ],
            "Reação Ocular": [
                "Visão cinética. Sistema: (Ação de Reação) Rola Teste Oposto (AGI vs Acerto Inimigo) para tentar desviar ou cortar 1 flecha atirada em você.",
                "Aparagem Absoluta. Sistema: Bloqueio de Projéteis mundanos (Flechas/Facas) torna-se 100% à prova de falhas se você usar Reação.",
                "Devolução de Projéteis. Sistema: Flechas e projéteis rebatidos voam de volta ao atirador causando o dano original nele mesmo (Acerto Automático).",
                "Reflexo Arcano. Sistema: Permite usar a Aparagem Absoluta contra Feitiços/Balas Mágicas de uso Direto e Foco único.",
                "Refletir Magia. Sistema: Reflete magias Supremos e Lendários em área de volta ao Caster usando todo o corpo como eixo rotacional."
            ],
            "Dança da Morte": [
                "Passos ágeis. Sistema: Todo Arqueiro ou Atirador sofre passivamente -1 de penalidade para te acertar (Devido a sua fluidez constante).",
                "Graciosidade que Empolga. Sistema: Sucesso num Teste de Esquiva confere +1 de Bônus em testes no próximo turno de todos os seus aliados num raio de 5m.",
                "Combate de Multidão. Sistema: Ganha +1 CA para cada inimigo a mais (além do primeiro) que estiver em quadrado adjacente a você.",
                "Abertura Falsa. Sistema: (Ação Bônus) Abre a guarda de propósito. Todo Inimigo a 2m que tentar bater e errar perde a Postura caindo 'Derrubados'.",
                "Esquiva em Grupo. Sistema: Em caso de falha num Teste Oposto de Magia de Área inimiga (Fogo/Gelo), um salto puxando o aliado garante Dano Zero para ambos."
            ]
        }
    },
    von: {
        name: "Vontade", icon: "fa-brain",
        perks: {
            "Mente Inabalável": [
                "Postura de veterano. Sistema: Rola Testes de Resistência Opostos (VON) com Vantagem contra Intimidação.",
                "Cérebro blindado. Sistema: Bônus absoluto de +2 na Defesa Base contra magias de Hipnose/Ilusão.",
                "Claridade Racional. Sistema: Imunidade total à Condição 'Amedrontado/Fobia' imposta por Monstros.",
                "Carisma Inverso. Sistema: Completamente impermeável à feitiços de Encantamento e Sedução Arcanos.",
                "Defesa Mental. Sistema: Inimigos que tentam ataques telepáticos sofrem Dano Psíquico de volta (Teste Oposto: VON do atacante vs sua VON)."
            ],
            "Resistência Mental": [
                "Acostumado à sujeira. Sistema: +2 nos Testes de Resistência (VON) contra o acúmulo de LUST (Tesão).",
                "Foco. Sistema: Aumenta o Bônus de Defesa contra Dano LUST para +5 Fixo passivo.",
                "Inversão do Papel. Sistema: Corta pela metade a eficácia de Magias LUST inimigas direcionadas a você.",
                "Mente Dissociativa. Sistema: No Estágio 3 de LUST, você não sofre os debuffs de paralisação e fadiga extremas.",
                "Conversão de Dano. Sistema: Dano massivo de LUST curará o seu HP ao invés de causar Mind Break."
            ],
            "Clarividência": [
                "Intuição afiada. Sistema: Inimigos rolam com Desvantagem testes Furtividade contra você (Teste Oposto: AGI deles vs sua VON/Percepção).",
                "Vê borrões nítidos. Sistema: Magias Menores de Invisibilidade falham passivamente na sua presença num raio de 5m.",
                "Ilusões frágeis. Sistema: Você ganha +5 Fixo em Testes de VON para não cair em labirintos ou miragens de feitiço.",
                "Sentido Assassino. Sistema: Imune a acertos críticos originados de flanqueamento e emboscadas furtivas (Percebe automaticamente).",
                "Análise Completa. Sistema: Permite enxergar Dados Ocultos dos NPCs e Chefes (HP exato, CA, LUST e Resistências Elementais)."
            ],
            "Presença Imponente": [
                "Postura intimidadora. Sistema: Bônus Fixo de +2 em rolagens de Persuasão e Intimidação.",
                "Predador Nato. Sistema: Ameaçar inimigos enfraquecidos inflige 'Abalado' neles (Teste de Resistência: VON do alvo vs sua VON).",
                "Grito Intimidador. Sistema: (Ação) Berro aplica Lentidão e -1 Iniciativa num raio de 5m (Teste Oposto: VON do alvo vs sua VON para resistir).",
                "Aterrorizar Lacaios. Sistema: Monstros menores fogem em Medo ao você realizar Acertos Críticos neles (Teste de Resistência: VON).",
                "Comando Mental. Sistema: Força inimigos normais a largarem suas armas (Teste de Resistência: VON do inimigo vs sua VON para anular)."
            ],
            "Meditação Tática": [
                "Respira e foca. Sistema: Gastar o turno (Ação Completa) para Meditar recupera passivamente Vida e Estamina baseados na VON.",
                "Calmante Interior. Sistema: Meditar em combate cessa Venenos fracos, Sangramentos menores ou Cegueira.",
                "Foco Pleno. Sistema: Ignora passivamente as penalidades (debuffs de atributos) derivadas de estar com HP baixo no combate.",
                "Transe de Batalha. Sistema: Meditar por 1 minuto purga (zera) a sua barra de LUST acumulada na masmorra.",
                "Aura de Calma. Sistema: Sua Meditação cria uma Aura que remove Debuffs Mentais/Medo de aliados num raio de 5m."
            ],
            "Foco Implacável": [
                "Coração Concentrado. Sistema: Vantagem natural em Testes de Concentração (VON) para não perder magias invocadas ao tomar dano.",
                "Ignora Espasmos. Sistema: Receber Dano Físico de raspão (menos de 5 Dano) nunca cancela os seus Rituais Arcanos Castados.",
                "Controle Sensorial. Sistema: Imune a Cegueira ou Surdez para efeitos de mirar feitiços mágicos à distância.",
                "Máquina Mística. Sistema: Ser alvo de Acerto Crítico dobra (x2) o Dano Fixo ou a Cura Falsa do seu próximo feitiço conjurado.",
                "Concentração Final. Sistema: Atingir HP Zero permite finalizar as Invocações pendentes de Feitiço em Forma Espiritual antes do coma."
            ],
            "Disciplina Carnal": [
                "Mente Reprimida. Sistema: Diminui a corrupção LUST em -2 pontos por rodada passivamente, sem necessitar da Ação de Alívio Sexual.",
                "Afastar do Combate. Sistema: Usar Desengajar/Fuga Tática retira passivamente -5 pontos da barra de LUST.",
                "Limiar Expansivo. Sistema: Dobra a capacidade Total da barra de Limites de Prazer LUST da sua Ficha de Atributos.",
                "Flagelo Purificador. Sistema: (Ação Especial) Paga custo de HP em auto-flagelação para curar 2d10 da Corrupção LUST de aliados próximos.",
                "Recuperação de Sanidade. Sistema: Se sofrer Mind Break, ignora a Derrota Absoluta (Insta-Lose) e recobra 10% da sanidade (1x por Masmorra)."
            ],
            "Barreira Psíquica": [
                "Reduz Dano Mental. Sistema: Ignora 1 ponto fixo de Dano Arcânico advindo de Magias de LUST ou Raios Telepáticos Ocultos.",
                "Escudo Mágico Espesso. Sistema: Diminui 5 Pontos Absolutos de Dano recebido de Explosões de Magias Elementais.",
                "Projeta Escudo Foco. Sistema: Confere +2 de Redução Mágica e Imunidade a Medo/Pânico para Aliados adjacentes a você.",
                "Ricochete Mental. Sistema: Ataques Mentais/Telepáticos Inimigos rebatem Dano Psíquico neles mesmos (Teste Oposto: VON atacante vs sua VON).",
                "Mente Fechada. Sistema: 100% de Imunidade a Magias Colossais de Possessão Mental ou Mind Control Inimigo."
            ],
            "Quebra-Amarras": [
                "Controle afrouxado. Sistema: Magias inimigas de Enraizamento ('Root') tem a duração em turnos reduzida pela metade.",
                "Desdém mental. Sistema: Efeitos inimigos de 'Paralisia' ou 'Atordoamento' na sua mente duram no máximo 1 único Turno.",
                "Toque de Despertar. Sistema: Usar a Ação Tocar num Aliado o desperta do Controle Mental inimigo de Magos e Súcubos automaticamente.",
                "Veto do Enfraquecimento. Sistema: Imunidade a Feitiços de Preguiça, Enfraquecer Atributos e Magias de Sono em Área inimigas.",
                "Quebra de Ilusões. Sistema: Cancela automaticamente Labirintos e Ilusões de Cenário, revelando a saída ao grupo."
            ],
            "Avatar da Mente": [
                "Empodera Conjurações. Sistema: Adiciona seu Modificador de VONTADE no Dano Base em todas as suas Magias Ofensivas.",
                "Guerreiro Monge Oculto. Sistema: Seus Ataques Corpo-a-Corpo passam a Escalar Dano Bruto rolando VONTADE (VON) em vez de FORÇA.",
                "Canalização Divina. Sistema: Converte 100% do Dano Físico de suas Armas em Dano Mental (ignorando Armaduras Físicas pesadas).",
                "Ataque a Espíritos. Sistema: Seus Golpes Físicos acertam Invocações Intangíveis e Fantasmas que possuem Imunidade Física total.",
                "Projeção Astral. Sistema: (Ação) Permite Lutar como Espírito Invulnerável fisicamente enquanto seu corpo real descansa seguro."
            ],
            "Vontade de Sobreviver": [
                "Recusa a morte de amigos. Sistema: Se um aliado Cair a 0 HP, você ganha Vantagem e +2 de Dano Extra contra o agressor dele.",
                "A Party no Limite. Sistema: Se todos aliados caírem na luta, você dobra seu próprio HP Máximo curando a saúde como herói final.",
                "Foco na Sobrevivência. Sistema: Chegar a 0 HP não lhe causa Nocaute/Desmaio; você permanece lutando ignorando a morte por 3 turnos.",
                "Grito do Último Suspiro. Sistema: (Ação de Reação) Quando Aliado sofrer Letalidade, você Cancela a Morte dele o deixando com 1 HP firme.",
                "Ignorar Letalidade. Sistema: Cancela e Anula Passivamente os Ataques Inimigos de Execução (InstaKill), convertendo em Dano Físico Normal."
            ],
            "Telecinese Latente": [
                "Balanço suave. Sistema: Permite Atrair e Levitar Itens Leves à distância com a mente em combate, usando Percepção Visual (Ação Bônus).",
                "Atirar pedras e estilhaços. Sistema: (Ação Principal) Causa Dano Mágico de Longa Distância usando pedras e escombros (Teste Acerto de Magia normal).",
                "Dedos da Mente. Sistema: (Reação Bônus) Interrompe a Concentração Mágica do Inimigo asfixiando-o telecineticamente (Teste Oposto: VON vs VON).",
                "Levitação Pessoal. Sistema: Adquire Deslocamento de Voo passivo (Flutuar). Fica Imune a Terrenos Difíceis e armadilhas de piso ocultas.",
                "Arremesso Telecinético. Sistema: (Ação Suprema) Empurra Objetos Massivos em linha reta. Inimigos esmagados rolam (Teste Oposto: FOR/AGI vs sua VON)."
            ]
        }
    },
    mis: {
        name: "Misticismo", icon: "fa-wand-magic-sparkles",
        perks: {
            "Afinidade Elemental": [
                "Magia Primal. Sistema: Concede +1 base de Dano Mágico Fixo em todos os feitiços ofensivos.",
                "Sintonia. Sistema: +3 de Bônus Fixo direto a todos os danos mágicos elementais.",
                "Impacto residual. Sistema: Feitiços de dano aplicam Queimadura ou Congelamento (Teste de Resistência: CON vs MIS do Conjurador).",
                "Magia Perfurante. Sistema: O seu Dano Mágico passa a ignorar todas as resistências secundárias de alvos comuns.",
                "Magia Pura. Sistema: Todo seu Dano Elemental se converte em Dano Puro, ignorando Imunidades Inimigas."
            ],
            "Controle de Mana/Energia": [
                "Redução de Custo. Sistema: Reduz em 1 o custo de Estamina/Mana de qualquer magia de nível médio.",
                "Feitiços Menores. Sistema: Magias Menores (Custo 1) se tornam Habilidades Grátis que não gastam recursos.",
                "Condensação de rituais. Sistema: Corta pela exata metade o custo final de todas as Magias Pesadas ou Supremos.",
                "Magia de Sangue. Sistema: Permite usar HP próprio no lugar de Estamina/Mana para conjurar (1 HP = 2 Mana).",
                "Reserva Mágica. Sistema: (Ação Principal) 1x ao Dia, ignora limites e custos conjurando uma Magia Lendária grátis."
            ],
            "Canalização Rápida": [
                "Acelera feitiços. Sistema: Reduz o tempo de preparação de feitiços em 1 turno inteiro.",
                "Sinergia com runas. Sistema: Permite mover-se e conjurar magias simultaneamente (sem perder Esquiva ou Movimento).",
                "Mãos independentes. Sistema: Magias ofensivas ou defensivas menores se tornam conjuráveis com Ação Bônus na rodada.",
                "Conjuração Dupla. Sistema: Permite conjurar ativamente duas magias distintas (ex: Ataque e Cura) no mesmo turno.",
                "Conjuração Instantânea. Sistema: Transforma feitiços de lentidão (Preparação de Turnos) em Casts Instantâneos."
            ],
            "Escudo Arcano": [
                "Escudo Leve. Sistema: Cria passivamente barreira que absorve os primeiros 10 pontos de Dano recebido no combate.",
                "Parede Prismática. Sistema: Aumenta a proteção passiva base do Escudo Arcano para absorver 30 HP Dano.",
                "Barreira Empática. Sistema: Inimigos que quebrarem sua Barreira recebem Dano LUST (Teste Oposto: VON do atacante vs sua MIS).",
                "Explosão do Escudo. Sistema: Quando o escudo rompe, explode em Dano em Área (Teste Oposto: AGI para meia Esquiva vs MIS).",
                "Cúpula Protetora. Sistema: Barreira divina densa que absorve 1 Golpe Letal (Insta-Kill) antes de trincar."
            ],
            "Raio Aumentado": [
                "Expansão Mística. Sistema: Aumenta o tamanho de magias de alvo único para pegar alvos numa área extra de 5 Metros.",
                "Artilharia Mágica. Sistema: Amplia em +10 metros o alcance global da distância de ataque sem penalidade.",
                "Área Dobrada. Sistema: Qualquer Área de Efeito (AoE) criada por você tem o seu Raio Base exatamente dobrado.",
                "Ramificação. Sistema: Projéteis mágicos se ramificam passivamente para atingir múltiplos inimigos em 2m do alvo.",
                "Projétil Perfurante. Sistema: Magias atravessam obstáculos de cenário sólido sem perder precisão no alvo."
            ],
            "Percepção Arcana": [
                "Terceiro Olho. Sistema: Passiva ativada; percebe imediatamente armadilhas arcanas e paredes falsas (Testes de Percepção automáticos).",
                "Visão da Aura. Sistema: Identifica status de maldição e criaturas sob Efeito de Invisibilidade magicamente.",
                "Antecipação Arcana. Sistema: Ganha 1 Turno de Aviso informando qual elemento que o inimigo Mago vai conjurar.",
                "Lê Segredos. Sistema: (Ação) Permite invadir a mente e puxar informações do Inimigo (Teste Oposto: VON do alvo vs sua MIS).",
                "Visão Estrutural. Sistema: Seu olhar revela a planta da masmorra."
            ],
            "Manipulação de Fluidos": [
                "Biologia Mágica. Sistema: Poções e itens curativos ingeridos por você recebem +5 de Cura extra.",
                "Transmutação alquímica. Sistema: Transmuta poças em Venenos ou Antídotos mágicos usando Ação Bônus.",
                "Dreno Leve. Sistema: Absorve HP de Oponentes Atordoados/Lentos causando Dano Drenante (Teste Oposto de Resistência: CON vs MIS).",
                "Transferência de Vitalidade. Sistema: Permite cortar o pulso para doação (Transferência 100% eficiente) do seu HP a aliados caídos.",
                "Cura Pura. Sistema: Magias de cura passam a anular passivamente Mutações Demoníacas ou Corrupções pesadas."
            ],
            "Cura Amplificada": [
                "Estabilizador bruto. Sistema: Todos os seus Feitiços de Cura ganham Bônus Fixo de +10 de HP em qualquer aliado.",
                "Rios de luz. Sistema: Aumenta para +20 HP Fixo bônus curativo passivo de Magias Divinas ou Médicas.",
                "Cura Purificante. Sistema: Suas curas de HP limpam (zera ou debuffa) as barras de LUST dos alvos.",
                "Regeneração Celular. Sistema: Cura agora regenera Membros Decepados permanentemente.",
                "Ressurreição. Sistema: Magias de Cura podem reviver Aliados do Estado de Morte Permanente os trazendo com 50% HP."
            ],
            "Pacto de Sangue": [
                "Magia Sanguínea. Sistema: Sem mana, paga custos normais consumindo seu HP Próprio (1 para 1).",
                "Conversão de Sangue. Sistema: Ofertar 1 HP com cortes converte em 2 de Energia para gastar no turno.",
                "Retaliação Arcana. Sistema: Dobra o Alcance e Dano final (x2) da sua próxima Magia se tiver sofrido um Acerto Crítico recém.",
                "Lifesteal Sanguinário. Sistema: Passiva: Todas as magias sombrias roubam 25% do HP que deram de Dano Inimigo.",
                "Dreno Vital. Sistema: Drena a Vida (HP) de Lacaios imobilizados em 1 Turno para recarregar as próprias magias gratuitamente."
            ],
            "Absorção Mística": [
                "Esponja Mágica. Sistema: Ser alvo de uma magia inimiga (Mesmo tomando Dano) recarrega +2 na sua Energia Mágica.",
                "Devorador de Luxúria. Sistema: Dano LUST de Súcubos é anulado (Imunidade) e convertido como +5 Cura Arcana para você.",
                "Absorção de Magia Menor. Sistema: Magias Elementares inimigas fracas (Custo de 1 a 3) são passivamente sugadas pela sua aura (0 Dano).",
                "Dreno Vampírico. Sistema: (Ação Bônus Corpo-a-Corpo) Zera a Energia do inimigo pra você (Teste Oposto: VON vs MIS).",
                "Absorção de Magia Maior. Sistema: Usa Ação Reação para Engolir e Anular totalmente 1 Magia Suprema Lendária."
            ],
            "Mestre Ritualístico": [
                "Ritual Rápido. Sistema: Corta 50% dos Turnos exigidos (Arredondado para baixo) de qualquer Ritual Pesado.",
                "Libertação Material. Sistema: Conjura magias Sombrias/Ritual sem necessitar de Componentes Materiais Mundanos.",
                "Âncora Ambulante. Sistema: Cúpulas e Áreas Mágicas de proteção não precisam mais ser fixas no chão; seguem como Aura o Avatar.",
                "Conjurador Solitário. Sistema: Conjura feitiços que pediriam 3 Magos do Coven de forma Solitária, pagando custos sozinho.",
                "Feitiços Híbridos. Sistema: Permite criar Feitiços Híbridos Inéditos (Fogo que congela, etc.) misturando efeitos das cartas."
            ],
            "Invocação Vinculante": [
                "Familiar Espião. Sistema: Permite Invocar Pequenos Familiares para revelar o Grid invisível (Não atacam).",
                "Familiar Explosivo. Sistema: Familiares podem ser explodidos numa Ação (Teste Oposto de Esquiva Inimiga: AGI vs MIS).",
                "Invocação de Batalha. Sistema: Invoca Lacaios Mágicos para dar Dano no Turno Próprio como aliados.",
                "Boi de Piranha Mental. Sistema: Familiares atraem (Taunt) Magias de Possessão Inimiga protegendo o Invocador de LUST e Medo.",
                "Invocação Maior. Sistema: (Ação Suprema) Invoca e controla inteiramente 1 Entidade Chefe Primordial no Campo substituindo sua ficha."
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
