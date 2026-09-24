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
            "Volúpia Anatômica: Seios": [
                "Volume acentuado que atrai olhares gulosos. Você ganha +1 em testes sociais de persuasão leve.",
                "Formato perfeito e chamativo. O contato físico intencional causa um leve LUST passivo no alvo.",
                "Mamilos sempre marcados e pele quente. Combates próximos atordoam inimigos com excitação visual passiva.",
                "Proporções macias e avassaladoras. Permite usar o próprio peso para sufocar oponentes de prazer, reduzindo a defesa LUST deles.",
                "Bênção da Luxúria: A mera exposição nua causa transe hipnótico em área, forçando rendição orgástica incondicional."
            ],
            "Volúpia Anatômica: Glúteos e Quadris": [
                "Curvas sinuosas que balançam. Inimigos hesitam instintivamente antes de golpear você pelas costas.",
                "Molejo hipnótico (+1 persuasão). Ao dar as costas, quem estiver olhando sofre LUST direto.",
                "Coxas grossas permitindo 'Ataque Sentada Esmagadora', imobilizando alvos sob o peso enquanto os estimula brutalmente.",
                "Carne mágica: absorve golpes físicos e os devolve como gemidos contagiantes, quebrando a concentração de feitiços inimigos.",
                "Dança do Cio: Uma rebolada cria onda de choque de luxúria, engolindo inimigos em área numa euforia atordoante."
            ],
            "Magnificência Genital": [
                "Aroma inebriante, exalando umidade e calor que desperta instintos primitivos em quem chega perto.",
                "Sensibilidade adaptativa (+2 provocação). O atrito aumenta a produção de feromônios, deixando parceiros obcecados.",
                "Tamanho/profundidade ideais. Anula defesa de dor/LUST de quem entrar em contato íntimo direto; 50% mais LUST gerado.",
                "Templo do Pecado. Drena magicamente energia ou LUST de quem se aliviar com você, transferindo-a para o seu HP.",
                "Anatomia Dominadora. A primeira penetração (ativa ou passiva) decreta o Mind Break instantâneo de oponentes fracos."
            ],
            "Feromônios Inebriantes": [
                "Suor tem aroma afrodisíaco. Torna pessoas ao redor mais propensas a aceitar toques casuais.",
                "O cheiro quebra lógicas. Impõe -1 VON a alvos em alcance corpo a corpo.",
                "Névoa sensual exalada em combate (+2 LUST em área). Inimigos erram por confusão erótica.",
                "Aura Densa. Quem respira a névoa perde 25% da Resistência a LUST permanente durante o combate.",
                "Nuvem de Dominância Absoluta. Ativa frenesi incontrolável; afetados atacam roupas uns dos outros se falharem em teste."
            ],
            "Beijo Sugador": [
                "Lábios macios e quentes que instigam obediência canina instintiva após o contato.",
                "Beijo profundo que confunde a mente do alvo por 1 turno inteiro, apagando intenções hostis.",
                "Beijo ofegante que rouba 10 de fôlego e Stamina do alvo durante intimidade forçada ou consentida.",
                "Beijo Vampírico. Rouba HP do alvo e o cura em si, convertendo a vitalidade do alvo em puro êxtase no doador.",
                "Beijo de Dreno de Alma. Um beijo prolongado reduz atributos do alvo permanentemente na cena, garantindo escravidão emocional."
            ],
            "Olhar da Perdição": [
                "Olhos gulosos que prometem perversão. Fixar o olhar atrai inimigos para você.",
                "Contato visual paralisa o alvo momentaneamente num misto de medo e atração cega (atrasa iniciativa).",
                "Encarar o alvo ativamente queima LUST diretamente na mente dele, sem necessitar de toque.",
                "Olhar Despido. Atravessa defesas morais; focar no alvo corta a Defesa LUST dele pela metade instantaneamente.",
                "Comando de Submissão. Um piscar de olhos imperativo ordena que o alvo se deite ou implore por você."
            ],
            "Voz de Sereia": [
                "Timbre aveludado e relaxante que desmonta guardas defensivas.",
                "Sussurros macios no ouvido garantem Vantagem (+1) ao tentar iniciar imobilizações corporais/sexuais.",
                "Palavras de comando excitam à distância, induzindo dano de LUST sem precisar encostar no alvo.",
                "Gemidos que perfuram tímpanos e quebram a aura inimiga, anulando status de Fúria ou buffs mentais deles.",
                "Cântico do Prazer. Paralisa todos numa grande área, fazendo-os ouvir a voz como uma ordem sagrada e irrecusável."
            ],
            "Toque Corruptor": [
                "Temperatura das pontas dos dedos arrepia a pele, desarmando tensões físicas de quem é tocado.",
                "Um arranhão ou massagem deixa os músculos do inimigo trêmulos de vontade, aplicando Debuff de agilidade.",
                "Sucos físicos carregados: Metade de todo o Dano físico causado se converte em Dano LUST no alvo.",
                "Pele Amolecida. Ignora 50% da armadura do inimigo caso a ação seja tentar despi-lo em combate.",
                "Dissolução Perversa. Toque mágico que derrete roupas e armaduras de metal/couro instantaneamente, expondo a vítima nua."
            ],
            "Graça Felina": [
                "Postura elegante, com movimentos e alongamentos extremamente sensuais e provocativos.",
                "Substitui uso de Agilidade por Sedução em esquivas ou acrobacias leves em combate.",
                "Dança de combate contínua que passivamente excita (gera LUST) em todos os alvos que estiverem te assistindo.",
                "Flexibilidade surreal. Imune a penalidades por estar no chão ou ser imobilizado em posições submissas.",
                "Dança Intangível. Pode se mover como água nua; ataques inimigos erram automaticamente se falharem contra o seu LUST."
            ],
            "Imunidade à Vergonha": [
                "Não sofre penalidades morais por lutar com roupas expostas, rasgadas e provocantes.",
                "A nudez parcial te fornece +1 de Defesa LUST, pois o orgulho do próprio corpo bloqueia a humilhação.",
                "Nudez Total fornece +3 absurdo em TODOS os testes sociais e habilidades corpo-a-corpo de Sedução.",
                "Masoquismo. Sofrer LUST extremo não te debuffa; na verdade, bater o Limiar garante Buffs de ataque.",
                "Avatar Transcendental. Estar completamente despido no ápice do LUST torna sua mente incorruptível e força sobre-humana."
            ],
            "Secreções Afetivas": [
                "Lágrimas, suor e saliva ganham um sabor doce, servindo como bebida revigorante para parceiros.",
                "Ingerir fluidos do seu corpo cura e estanca pequenos sangramentos, agindo como +5 HP para os aliados.",
                "Néctar Viciante. Quem consome entra em 'abstinência', facilitando obedecer aos seus comandos no combate.",
                "Fluidos purificadores celestiais. O sexo curativo limpa venenos pesados do corpo do aliado através do seu suor.",
                "Santuário Fluido. Banhá-los em suas secreções (intimidade profunda) garante ao alvo imunidade total a LUST por 24h."
            ],
            "Domínio do Vínculo": [
                "Empatia erótica passiva: Sabe de cara quem tem fetiches sombrios ou desejos latentes na sala.",
                "Permite marcar o alvo com mordida/chupão. Você sente na pele a direção e a distância dele.",
                "A marca pune. Quem tem sua marca sofre espasmos de dor (LUST massivo) se tentar atacar o mestre.",
                "Telepatia de Prazer. Você pode enviar ondas de orgasmo ou dor prazerosa diretamente na mente conectada à distância.",
                "Coleira de Alma. A marca obriga o alvo a trocar a própria vida, recebendo dano no seu lugar cegamente por amor."
            ]
        }
    },
    con: {
        name: "Constituição", icon: "fa-shield-heart",
        perks: {
            "Couro Resistente": [
                "Pele grossa. Diminui hematomas rápidos e resiste melhor a chicotadas leves (-1 Dano).",
                "A pele enrijece ao contato violento. Redução de dano físico base aumentada para 3.",
                "Ferimentos fecham antes de verter muito sangue. Ignora sangramentos menores.",
                "Armadura Viva. Tencionar a pele num turno dobra a defesa contra armas pontiagudas.",
                "Corpo de Aço Mágico. Lâminas e armas de ferro mundanas entortam ou ricocheteiam na sua carne nua."
            ],
            "Tolerância à Dor": [
                "Ignora choques estáticos ou cortes finos, achando a dor curiosamente tolerável.",
                "A barra de dor mistura-se com euforia. Penalidades mecânicas por HP baixo só começam em 30%.",
                "Sádico Físico. Tortura não-sexual apenas enfurece, concedendo imunidade a paralisia por dor excruciante.",
                "Adrenalina Escarlate. Receber um ataque Crítico te concede aumento massivo de Força temporária.",
                "Máquina de Combate. Mesmo com HP em ZERO, o corpo continua agindo perfeitamente e violento por 3 turnos antes de cair."
            ],
            "Sistema Imunológico Implacável": [
                "Sistema digestivo bruto. Comer lixo, fluidos impuros ou coisas nojentas não causa ânsia.",
                "Anticorpos rápidos. Vantagem pesada para não pegar doenças em lugares inóspitos.",
                "O sangue derrete neurotoxinas. Corta o efeito letal de venenos fortes pela metade do tempo.",
                "Sangue Antitóxico Puro. Pode cortar as veias para misturar sangue na água e curar aliados envenenados.",
                "Muralha Biológica Absoluta. Imunidade total a doenças, pragas mágicas ou gestação/infestação parasitária demoníaca."
            ],
            "Sangue Fervente (Regeneração)": [
                "Feridas esfoladas cicatrizam ligeiramente num único repouso curto.",
                "Regeneração latente passiva. Cura ferimentos menores fora de combate a uma taxa de 1 HP/turno.",
                "Sangue pulsante em batalha. Cura HP por turno ativamente com base na sua barra de Vigor.",
                "Costura Mágica Celular. A pele se regenera, estancando feridas abertas ou decepadas de hemorragias em segundos.",
                "Regeneração Titânica. Membros amputados reconectam como se fossem feitos de barro vivo se pressionados juntos."
            ],
            "Densidade Óssea": [
                "Ossos pesados pesam mais. Passos densos, impossível ser levado por empurrões leves.",
                "Caixa torácica protetora. Proteção extra contra golpes de impacto como porretes.",
                "Esqueleto Encouraçado. Socos teus quebram ossos finos; inimigos batendo as mãos sentem-se esmurrando pedra.",
                "Imóvel contra Quedas. Cai de 15 metros de altura diretamente nos pés afundando o chão e os ossos intactos.",
                "Estrutura Divina Calificada. Absolutamente imune a dano contundente ou ter os ossos estilhaçados por esmagamento."
            ],
            "Termorregulação Perfeita": [
                "Não sente suores em calor ou tremores no frio moderados.",
                "Corpo resistente a elementos bruscos (Resistência Nível 1 a Fogo/Gelo).",
                "O metabolismo estabiliza. Pode lutar completamente nú na neve profunda ou vulcão sem debuffs.",
                "Pele Absorsora Elementar. Magias místicas de nível fraco em Fogo ou Gelo te curam HP em vez de queimar.",
                "Isolamento Titânico. Imunidade completa a ser incendiado por chamas místicas ou congelamento arcano fatal."
            ],
            "Estômago de Ogro": [
                "Pode mastigar couro, folhas e carne completamente podre sem se sentir doente.",
                "Processamento eficiente. Qualquer refeição decente recupera o dobro do HP/Stamina base.",
                "Pode ingerir magias venenosas ou poções de corrupção sombria ignorando os debuffs pesados para pegar curas residuais.",
                "Fome Carniceira. Devorar materiais crus (rocha macia, inimigos menores mortos) converte-os em massivos Buffs de HP temporário.",
                "Fornalha Gástrica Negra. Pode literalmente engolir o coração ou cérebro de monstros mágicos recém-abatidos para absorver temporariamente o atributo maior deles."
            ],
            "Firmeza de Montanha": [
                "Base plantada larga e densa, dificultando ser pego de surpresa e derrubado.",
                "Vantagem clara de resistência em disputas para evitar agarrões pélvicos, empurrões ou rasteiras pesadas.",
                "Enraizamento Terreno. Impossível de ser arrastado ou movido contra a vontade por chefes/criaturas de porte Médio.",
                "Rebote de Força. Quem tentar empurrar seu corpo brutalmente falha e toma dano de impacto muscular de volta.",
                "Gravidade Pessoal Puxada. Imunidade total à ser levitado, telecinese ou sofrer Knockbacks colossais de magias massivas."
            ],
            "Vitalidade Descomunal": [
                "As paredes do coração são grossas (+10% HP Máximo mod).",
                "Sangue carrega nutrientes de forma violenta pelos músculos espessos (+20% HP Máximo mod).",
                "A vitalidade salta aos olhos, com veias proeminentes transbordando força vital (+30% HP Máximo mod).",
                "Reservatório Gárgula vivo (+50% HP Máximo mod).",
                "Coração de Dragão. Ao ser dado como morto ou executado em combate, ressurge uma rodada depois com uma explosão cardíaca e 50% de Vida."
            ],
            "Estase Carnal": [
                "Desaceleração cronológica molecular leve. A aparência não envelhece no ritmo natural.",
                "Pode bloquear o ar por 3x mais tempo mantendo a mente ativa embaixo d'água.",
                "Pode desacelerar o metabolismo a 1% para entrar em Hibernação profunda, sobrevivendo semanas em tumbas de pedra sem água/ar.",
                "Controle Hemorrágico Manual. Pode estancar e parar fluxo sanguíneo num braço específico para ilhar espalhamento de veneno.",
                "Imortalidade Genética Biológica. Corrosões do tempo, maldições de senilidade ou morte natural não existem para sua espécie."
            ],
            "Escudo Físico Reativo": [
                "Músculos contraem instintivamente protegendo vasos grandes e garganta.",
                "Pele repulsiva. Se alguém o esmurra no corpo-a-corpo, sente a mão doer, tomando desvantagem no próximo ataque.",
                "Onda de Choque Muscular. Levar mais de 30 de dano instantâneo causa uma explosão de ar que joga todos inimigos ao redor pra trás.",
                "Casco da Tartaruga-Leão. Ao desistir da sua Movimentação na rodada, sua Defesa e Constituição dobram passivamente no turno inimigo.",
                "Abalo Sísmico do Impacto Refletor. Ignora a rolagem do inimigo para absorver e refletir de imediato 50% de qualquer colisão violenta."
            ],
            "Glândulas Adaptativas": [
                "Suor tem uma composição ácida rala que lava sujeiras mortais facilmente.",
                "Pode expulsar toxinas através de um suor fedido que emana agressividade, assustando monstros de LUST de nível rasteiro.",
                "As glândulas produzem uma película espessa e lubrificada. Inimigos escorregam pateticamente nos seus ombros ao tentar agarrões forçados.",
                "Mutações Químicas Profundas. Seu sangue ou suor puro quebram as barreiras químicas da mente: dão debuffs na geração LUST de inimigos que as beberem/tomarem espirrado.",
                "Ovo de Stase Crisálido. No limite do colapso de MindBreak ou Morte Iminente, secreta uma cúpula de cristal opaco em volta de si para dormir por 24 horas e reemergir zerado de debuffs."
            ]
        }
    },
    vig: {
        name: "Vigor", icon: "fa-bolt",
        perks: {
            "Fôlego Inesgotável": [
                "Pulmões de ferro. Aumenta diretamente a reserva base (+10 Max Stamina).",
                "O cansaço diminui, os músculos aguentam mais (+20 Max Stamina).",
                "Eficiência cardiovascular mística. Corta o custo de estamina de qualquer movimentação agressiva pela metade.",
                "Fornalha pulmonar (+50 Max Stamina). Cansaço em combate longo passa a ser uma ilusão.",
                "Motor Biológico Perpétuo. O corpo atinge uma regeneração absurda de Stamina a cada turno, ignorando exaustão completa."
            ],
            "Corredor Incansável": [
                "Pernas densas. Aumenta a distância percorrida base em +2m no combate.",
                "Atravessa lama, teias ou pântanos ignorando debuffs de locomoção (Terreno Difícil).",
                "Os músculos adaptam-se ao peso. Ignora completamente a penalidade de Armaduras Pesadas na movimentação.",
                "Investida Furiosa. Lançar-se correndo contra o inimigo não consome a Ação Principal do turno.",
                "Mobilidade Sombria. Em velocidade máxima, seu movimento parece teletransporte em curtas distâncias."
            ],
            "Coração Resiliente": [
                "Adrenalina do corte. Recupera 5 Stamina imediatamente sempre que o próprio corpo sofrer dano.",
                "A dor se converte em oxigênio. Recupera 10 Stamina a cada ataque inimigo bem-sucedido.",
                "Sacrifício da Carne. Permite gastar fôlego (Stamina) para recuperar Vida (HP) do próprio corpo 1x/combate.",
                "Coração em fúria controlada. Dobra permanentemente sua regeneração de Vigor base.",
                "Imunidade à Falha Muscular. Nunca sofre com estados de 'Exaustão Máxima' ao zerar atributos."
            ],
            "Repelir Êxtase": [
                "Controle mental sádico sob o próprio corpo. Limiar de Êxtase (LUST) estendido em +5.",
                "Treinado para bloquear tentações luxuriosas intensas (+10 no Limiar de Êxtase).",
                "Você suporta violações mentais ou de contato que enlouqueceriam civis (+20 Limiar de Êxtase).",
                "Masoquismo Reativo. Em vez de ceder, passar do Limiar de Êxtase te dá Buffs temporários de Força Bruta.",
                "Ascensão da Carne. Atingir LUST Extremo nunca mais te causa debuffs, apenas foca a sua violência e destrói oponentes."
            ],
            "Adaptação Erótica": [
                "Sabe aliviar a tensão oculta rapidamente. Ações táticas de Alívio (LUST) custam -5 Stamina.",
                "Maestria do alívio em campo. Ações de purgar LUST agora custam ZERO Stamina.",
                "Vício funcional. O Alívio no meio da batalha torna-se recompensador, restaurando 10 de Stamina extra.",
                "Sadomasoquismo reverso. Se aliviar na frente do inimigo provoca a mente fraca dele (Aplica dano de LUST neles).",
                "Clímax Tático. O ápice e mind-break em campo agora recarrega todos os cooldowns e habilidades vitais do personagem."
            ],
            "Tolerância Adrenalínica": [
                "A adrenalina bloqueia os primeiros calafrios do prazer mágico. Ignora debuffs de Estágio 1 de LUST.",
                "Foco sanguinário inibe a luxúria. Ignora debuffs graves de Estágio 2 de LUST.",
                "Conversão Mística: O debuff provocado pelo tesão extremo passa a te dar um Bônus temporário de ataque e dano.",
                "Corpo completamente imune à paralisação causada por espasmos de dor física ou dor luxuriosa (Orgasmos).",
                "Mind Break Assassino. Quebrar a mente de LUST apenas ativa um Transe Feroz letal sem limite de Stamina (Berserk)."
            ],
            "Capacidade Pulmonar": [
                "Consegue segurar o oxigênio por até 10 minutos sob esforço extenuante.",
                "Os pulmões filtram passivamente magias e toxinas pelo ar, garantindo imunidade a gases de controle mental fracos.",
                "Sobrevive ativamente sem respirar por mais de 1 hora inteira na água/veneno.",
                "Caixa torácica protetora. Nuvens tóxicas letais ou névoas ácidas não causam dano por inalação.",
                "Pulmões de Titã Adaptativo. Pode respirar indefinidamente em áreas vácuas, ambientes mortos e pântanos abissais venenosos."
            ],
            "Segundo Fôlego": [
                "Quando as forças acabam (Zerar Stamina), o corpo busca energia reserva devolvendo 10 ST (1x ao dia).",
                "O instinto dobra a reserva. Recupera 30 ST ao colapsar (1x ao dia).",
                "Sacrifício sangrento. Pode usar o próprio Sangue (HP) para conjurar habilidades se a barra de Stamina esgotar.",
                "A quebra do limite muscular emite uma Onda de Choque e Vento bruto afastando alvos próximos em volta.",
                "Vigor Imortal. O corpo se recusa a falhar, tornando impossível a barra de Stamina descer abaixo de 10 permanentemente."
            ],
            "Atleta Divino": [
                "Alongamento contorcionista que garante grande Vantagem em saltos, fugas, Acrobacias e Escalada livre.",
                "Fibras elásticas divinas. Seus saltos naturais são multiplicados por 3 em altura e distância.",
                "A máquina perfeita: não precisa dormir por 48 horas inteiras e jamais ganha fadiga passiva por lutar dia e noite.",
                "Biorritmo Intocável. Ignora e corta toda magia inimiga cujo alvo seja impor Lentidão ou paralisia tática.",
                "Físico Puro e Inabalável. Maldições macabras ou drenos arcanos jamais podem roubar os seus atributos base (FOR, AGI, etc)."
            ],
            "Aura de Energia": [
                "Aliados ao redor se inspiram na sua determinação (+5 Max Stamina passivo pra party em raio curto).",
                "Sua energia contagiante eleva todos a guerreiros imparáveis (+10 Max Stamina passiva aliados).",
                "Permite transferir e doar grandes porções da sua própria Estamina para revigorar com o toque.",
                "Inspirar Fúria. Grita comandos de vida, fazendo 1 Aliado próximo não gastar custo de Estamina naquela rodada.",
                "Cúpula Revigorante Sombria. Uma aura persistente pulsa de você, purificando e dobrando a regeneração natural na área inteira."
            ],
            "Blindagem Mental": [
                "Reduz instintivamente em 10% todo impacto sombrio de magias de LUST na barra de Estamina.",
                "Sua psiquê resiste forte. Subtrai passivamente 25% do impacto de estresse LUST sobre a Stamina global.",
                "Sadismo convertido. O Dano de LUST tentado contra você passa a recuperar ativamente e aumentar a sua própria Stamina.",
                "Ataques telepáticos contra a mente alimentam seus músculos e enchem a barra do corpo em lutas místicas.",
                "Vigor Psíquico Indomável. Completamente Invulnerável a feitiços de roubo de magia, controle mental sugador e dreno."
            ],
            "Descanso Profundo": [
                "O corpo adormece letalmente como pedra. Dormir curtas 2h recupera os efeitos equivalentes a sonos lentos de 8h.",
                "Transe celular. Dormir remove a maioria das pequenas doenças e debuffs físicos contínuos acumulados.",
                "Tática de Guerrilha. Transforma descansos curtos e fáceis (20 min) em descansos completos para recuperação total de fichas.",
                "Sonho lúcido purgante mágico. Enquanto dorme, zera resquícios persistentes psíquicos de corrupção ou tentação mágica (LUST).",
                "Estase de Cristal Escuro. Enquanto repousa os olhos, torna-se literalmente invulnerável a facadas e dano mundano furtivo covarde."
            ]
        }
    },
    for: {
        name: "Força", icon: "fa-dumbbell",
        perks: {
            "Golpes Esmagadores": [
                "Músculos rasgados aplicam brutalidade extra. Adiciona +1 de Dano Fixo (Corpo-a-Corpo).",
                "Impactos maciços desestabilizam bloqueios fracos do inimigo. (+3 de Dano Bruto)",
                "Força de Aríete. Seu golpe joga os oponentes leves para trás, causando +5 Dano absoluto e recuo.",
                "Golpes amplos ganham a violência do efeito 'Cleave' (Dano colateral atinge alvos adjacentes menores).",
                "Estilhaçar Blindagem. Seus acertos ignoram brutalmente 50% de todas as defesas físicas inimigas grossas."
            ],
            "Agarre Titânico": [
                "Dedos grossos como torniquetes. Confere Vantagem tática garantida para iniciar Agarrões e Submissões.",
                "Uma vez nas suas mãos, tentar fugir é um pesadelo. Alvo rola escape com Desvantagem esmagadora.",
                "Esmagar a Garganta. Oponentes imobilizados sofrem asfixia (Dano Físico Contínuo a cada rodada sua).",
                "Quebra-ossos Implacável. Agarrões bem sucedidos em alvos fracos fraturam braços fisicamente.",
                "Abraço do Gigante. Consegue estalar a espinha ou decapitar alvos pequenos na força bruta instantaneamente."
            ],
            "Músculos Fibrosos": [
                "Enrijecer o corpo dificulta que predadores te derrubem (Vantagem para evitar Submissões inimigas).",
                "Contração muscular brutal reduz dano contundente de maças ou punhos em 2 pontos fixos na pele.",
                "Monstros médios ou humanos normais simplesmente não conseguem te erguer ou mover do chão.",
                "Tensionar a carne rompe correntes, cipós ou cordas comuns sem exigir testes múltiplos demorados.",
                "Colosso Imóvel de Sangue. Torna você perfeitamente Imune a agarrões, redes mágicas e amarras místicas."
            ],
            "Quebra-Defesas": [
                "Sua força oblitera pequenos escudos. Ignora passivamente 1 ponto de proteção física do alvo.",
                "O aço cede sob os punhos. Seus golpes puros já não respeitam e furam 3 de defesa física inimiga.",
                "Sua selvageria destrói bloqueios convencionais, partindo escudos menores de madeira em pedaços.",
                "Amasse Crítico de Metal. Bater reduz permanentemente a armadura do alvo, facilitando o acerto dos seus aliados.",
                "Demolição Estrutural. Estilhaça carapaças de dragão encouraçado ou escudos mágicos divinos no soco."
            ],
            "Arremesso Brutal": [
                "Mãos calejadas atiram objetos de 50Kg a longas distâncias como se fossem adagas de arremesso.",
                "Pode erguer inimigos fracos pelo pescoço e atirá-los contra outros nobres/soldados (Dano colateral).",
                "Transporte Aéreo Tático. Arremessa aliados pesados para fora do perigo com precisão sem machucá-los.",
                "Catapulta Macabra. Lança pilastras de pedra esmagando inimigos e causando Atordoamento em Área.",
                "Impacto da Fera. Alvos enormes ou Chefes colossais podem ser empurrados e nocauteados pelas costas."
            ],
            "Força de Impacto": [
                "O peso das suas armas faz inimigos tremerem os braços (aplica Lentidão fraca a quem defende).",
                "Pancadas pesadas contundentes sacodem o cérebro da vítima, infligindo Tontura.",
                "Esmagamento Cerebral. Impactos na cabeça/tronco geram confusão profunda (Atordoamento) em lacaios.",
                "Dano de Terremoto. Acertos Críticos quebram o piso onde o inimigo está, criando terreno difícil.",
                "Barreira do Som. Golpes rompem o ar tão violentamente que causam Dano Sônico ao redor, estourando tímpanos."
            ],
            "Violência Bruta": [
                "Predador. Bater num oponente já no chão ou ajoelhado te garante +2 de Dano Fixo sádico.",
                "Massacre. Inimigos presos/agarrados recebem +5 de Dano extra direto no corpo indefeso.",
                "Vantagem massiva de acerto sempre que bater em alvos sofrendo de atordoamento ou imobilizados.",
                "Execução Sumária de Carniceiro. O primeiro golpe contra um inimigo rendido dá 2x o Dano e pode mutilar.",
                "Grito de Guerra Colossal. Matar alguém barbaramente aterroriza monstros e faz os fracos fugirem apavorados."
            ],
            "Tensão Muscular Mágica": [
                "Músculos contra Magia: Pode rolar Força no lugar de Vontade para resistir a empurrões arcanos.",
                "Suporta a dor divina: Consegue quebrar prisões arcanas ou paredes invisíveis à força dos punhos.",
                "Bater com os punhos dissipa invocações frageis e golem elementais no puro impacto físico cego.",
                "Ignora o calor/raios: Pode segurar a lâmina de espadas mágicas inimigas sem perder os dedos.",
                "Rebote Titânico de Feitiços. Rebate as bolas de fogo de conjuradores primários dando socos nelas no ar."
            ],
            "Saltador Colossal": [
                "O chão racha quando você salta: Pula 5 metros verticalmente sem impulso prévio.",
                "Saltos de 10 metros de distância rasgando o ar; a inércia dá bônus para ataques aéreos caindo.",
                "Impulso de Transporte. Consegue saltar grandes abismos segurando e salvando um aliado junto no peito.",
                "Queda Sísmica. A aterrissagem violenta atordoa quem estiver num raio de 3m ao seu redor.",
                "Meteoro Humano. Cair intencionalmente de altitudes letais no inimigo o esmaga obliterando 99% da sua vida."
            ],
            "Carregador de Fardo": [
                "Carregar espadas pesadas ou poções simplesmente não pesa nas costas maciças do personagem.",
                "Pode carregar o dobro do limite de peso racial no grid sem sofrer debuff algum de agilidade.",
                "Arrastar cadáveres, rochas de barreiras ou parceiros mortos não interfere no gasto de Ação do turno.",
                "Usa pilastras ou portas pesadas de madeira/metal arrancadas como grandes escudos com uma só mão.",
                "Pilar do Mundo (Atlas). O personagem sustenta desabamentos inteiros de masmorras enormes sob os ombros sozinhos."
            ],
            "Machado Humano": [
                "Entrando no Eixo de Morte. Cada rodada seguida em combate te garante passivamente +1 de Dano Fixo.",
                "A Fúria Sangrenta escala rápido. Ganha +2 Dano progressivo a cada rodada golpeando (Limpa se parar).",
                "Golpes certeiros agora atingem artérias. O seu Dano Físico aplica 'Sangramento Pesado' aos inimigos.",
                "Limiar da Carnificina. Cortar a carne vira rotina; seus golpes diminuem as curas do inimigo atingido.",
                "Amputador Instintivo. Braços, asas e membros finos de Monstros são arrancados rotineiramente em acertos críticos limpos."
            ],
            "Impacto Sísmico": [
                "Socar a terra pura cria pequenos tremores que desequilibram lacaios inimigos corpo a corpo.",
                "Um pisão brutal de pé levanta detritos e derruba todos os inimigos menores no raio de 2m em volta.",
                "Esmurrar o chão ergue uma placa protetora temporária de terra densa (Escudo de Cobertura Meia).",
                "Socos Tectônicos em área média causam fissuras letais afundando as pernas dos zumbis na fenda.",
                "Doutrina do Terremoto. Seus murros direcionam ondas pelo solo demolindo uma muralha ou blindado específico à frente."
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
                "Postura de veterano carrancudo: Vantagem para resistir a Intimidações e chantagens.",
                "Cérebro blindado. Bônus de +2 na Defesa base contra dominação mental hipnótica.",
                "Claridade Racional Fria. Ignora completamente histerias mágicas de Fobias induzidas.",
                "Carisma Inverso e Vazio. Impermeável a encantos demoníacos e vozes de súcubos.",
                "Aura Mental Estilhaçadora. Almas que tentarem forçar a entrada na sua mente sofrem Choque Psíquico bruto."
            ],
            "Estoicismo Carcerário": [
                "Acostumado à sujeira moral e física. +2 Base no teste de Defesa contra corrupções LUST.",
                "Castidade Bruta. O espírito afasta tentações; +5 direto em qualquer Defesa LUST.",
                "Inversão do Papel. Corta pela metade os bônus mágicos de Sedução do inimigo em combate.",
                "Mente Dissociativa. No Estágio 3 de LUST, sua mente ignora a paralisação do prazer e age normalmente.",
                "Doutrina do Masoquismo Divino. Dano Massivo de LUST em vez de doer ou corromper, te cura HP."
            ],
            "Clarividência": [
                "Intuição quase divina. Sabe pelos micro-sinais quando NPCs estão mentindo.",
                "Vê borrões nítidos através de magias menores de invisibilidade e camuflagem.",
                "Ilusões primárias mágicas perdem consistência de imediato aos seus olhos frios.",
                "Sentido Assassino Primordial. Vibração no crânio te avisa 1 turno antes do oponente tentar agressão letal.",
                "Olho de Deus. Foca a aura e enxerga segredos vitais, alinhamento sombrio e invulnerabilidades ocultas."
            ],
            "Presença Imponente": [
                "Postura intimidadora colossal. +2 direto nas rolagens de Persuasão por meio de ameaça.",
                "Predador Nato. Lacaios e oponentes machucados hesitam e paralisam de medo só de te ver.",
                "Grito Sangrento que Gela as Veias. Rugir e bater no próprio peito impõe -1 de Iniciativa a todos os inimigos.",
                "Aterroriza taticamente inimigos normais para dar passos para trás ou quebrarem a postura defensiva.",
                "Comando Soberano Seco. Força NPCs não-chefes a renderem suas armas tremendo, implorando pela vida."
            ],
            "Meditação Tática": [
                "Respira um turno no meio do combate abrindo mão do ataque para recuperar Foco e Stamina massiva.",
                "Calmante Interior. Ao se concentrar, estabiliza e remove 1 Debuff Mental contínuo (Veneno/LUST).",
                "Desprezo Divino pelas Falhas da Carne. Medita brevemente para ignorar as dores de mutilação física na hora.",
                "Transe de Batalha. No caos, sua energia LUST esvazia gradualmente enquanto seu HP regenera focado.",
                "Farol de Paz Santificada. Ao meditar no caos sexual/mágico, os companheiros num raio médio sentem sanidade pura voltando."
            ],
            "Foco Implacável": [
                "Arranhões leves ou ataques rápidos não quebram sua conjuração letal em andamento.",
                "Ignora espasmos de dor para garantir invocações lentas ao som das lâminas.",
                "Pode continuar rituais surdo e amordaçado apenas com o tato, olhos fechados e coragem pura.",
                "Máquina Mística. Se sofrer Crítico conjurando, o feitiço absorve a raiva e explode com dano em dobro.",
                "Transe de Conjuração Cadavérico. A mente desmaiada continua segurando as âncoras arcanas salvando o grupo no solo limpo."
            ],
            "Disciplina Carnal": [
                "A mente suprime passivamente LUST reprimido latente (-2 LUST no medidor por turno de descanso livre).",
                "Afastar-se do combate permite purgar passivamente e drenar -5 LUST em suor limpo purificado.",
                "Abusos mentais e toques imundos não causam gatilhos imediatos; barra limite de prazer esticada massivamente.",
                "Flagelo Purificador. Pode sacrificar muito HP com cortes no próprio corpo para purgar a barra inteira de LUST letal.",
                "Veto Moral Impiedoso. Impede que sua mente se quebre em Mind Break negando rendição total 1x por batalha brutal."
            ],
            "Barreira Psíquica": [
                "Reduz em 1 ponto limpo toda e qualquer magia psíquica que colide contra seus ombros estáticos.",
                "Escudo Mágico Espesso mental anula e retém pancadas pesadas mágicas diminuindo o dano limpo em 5.",
                "Projeta o escudo como proteção empática invisível anulando magias de pânico cego de mortais aliados perto.",
                "Transforma a aura mental defensiva concentrando ricochete em súcubos: devolvendo feitiço mental do próprio algoz.",
                "Mente de Diamante Lapidado. Totalmente inabalável contra tentativas de possessão e corrupção vindas de falsos Deuses."
            ],
            "Quebra-Amarras": [
                "Liberta-se de feitiços de controle mental frouxos mais rapidamente (Quebra amarras em 2 turnos).",
                "Desdém mental imediato. Magias de controle duram não mais que 1 turno em sua cabeça.",
                "Toque de Despertar. Sendo um pilar mental, um tapa seu acorda aliados do controle inimigo instantaneamente.",
                "Veto do Feitiço Enfraquecedor. Completamente Imune ao Sono Arcano e feitiços primitivos de Preguiça.",
                "Supremacia Real Perante a Mentira. Anula completamente a existência de ilusões ou labirintos mágicos na pura negação."
            ],
            "Avatar da Mente": [
                "Sua Vontade empodera conjurações: Soma de base +1 a todos os danos Divinos ou Psíquicos causados.",
                "Guerreiro Monge das artes ocultas. Seus Ataques Desarmados abandonam Força e escalam baseados em Vontade.",
                "Canalização Divina pelas armas seguradas. Lâminas passam a dar +Dano do tipo Mental ou Divino nos cortes.",
                "Exorcismo Brutal no Soco Físico. Seus punhos rasgam a fronteira, atordoando e esmurrando espíritos intangíveis no vazio.",
                "Alma Projetada em Fúria. O corpo dorme selado enquanto o espírito massivo luta e conjura de forma astral impiedosamente."
            ],
            "Vontade de Sobreviver": [
                "Recusa a morte dos amigos. Se 1 Aliado for massacrado, ganha +2 Dano imediato pela vingança focada.",
                "A Party no Limite. Se todos os aliados caírem nocauteados, dobra seu próprio HP máximo para fúria de resgate.",
                "Senso de Dever Inumano. Imune ao Desmaio; se a barra zerar, você continua lutando contanto que o Chefe esteja de pé.",
                "Grito do Último Suspiro. Berra do fundo da alma e impede a execução dos aliados, restaurando-os com 1HP salvador.",
                "Recusa a Morte Escrita. Simplesmente ignora e cancela dano de Execução Sumária e Insta-Kill sobre você."
            ],
            "Telecinese Latente": [
                "Balanço suave das sinapses do Córtex. Levita e atrai itens normais (copos, adagas, chaves) até as suas mãos.",
                "Atirar pedras e estilhaços invisíveis, causando dano decente batendo objetos pesados contra o oponente à distância.",
                "Dedos da Mente Apertando Pescoços fracos. Pode enforcar inimigos distantes cortando a fala ou sufocando o oxigênio.",
                "Levitação da própria gravidade. Realiza vôos psíquicos curtos ou levita para ignorar terreno acidentado venenosos.",
                "Massa da Destruição Telecinética Mestra. Arremessa vagões, cavalos de metal ou esmaga crânios de ursos blindados com opressão psíquica."
            ]
        }
    },
    mis: {
        name: "Misticismo", icon: "fa-wand-magic-sparkles",
        perks: {
            "Afinidade Elemental": [
                "Magia Primal escorre com naturalidade. Concede +1 base de Dano Mágico fixo.",
                "Sintonia com a tempestade de chamas. +3 direto a danos de magia elementais e curas sombrias.",
                "Impacto residual impregna no feitiço, aplicando pequenos debuffs (Queimadura ou Congelamento) na conjuração base.",
                "Rasga a consistência inimiga. O Dano Mágico ignora resistências secundárias rasteiras do alvo comum.",
                "Purificador Supremo. Converte magias em Dano Divino, destruindo demônios e bestas que antes tinham resistência imune."
            ],
            "Controle de Mana/Energia": [
                "Enxuga e reduz desperdício de energia arcana. Magias médias diminuem 1 do seu Custo Base em MP.",
                "Feitiços menores de 1 Custo transformam-se puramente em Habilidades Grátis que podem ser atiradas sempre.",
                "Condensa rituais de custo imenso pela metade, permitindo que magias muito pesadas entrem na sua carteira.",
                "Magia de Sangue de Sacrifício. Ultrapassar seu limite mágico consumirá Vida do seu HP no lugar sem te impedir.",
                "Reservatório Arcano Infinito Antigo. Uma vez por dia, permite ignorar todo o limite conjurando Magias Lendárias destrutivas de graça."
            ],
            "Canalização Rápida": [
                "Acelera feitiços pesados de fogo contínuo e cura extensa cortando e adiantando 1 Turno inteiro do preparo.",
                "Corpo em sinergia com runas. Permite conjurar magias complexas andando e evadindo normalmente no grid tático.",
                "Mãos independentes. Magias ofensivas ou proteções menores viram uma Ação Rápida secundária bônus no combate.",
                "Dual-Cast Arcano Mestre. Tece magia de cura na esquerda e fogo na direita atirando 2 magias rasas independentes no mesmo turno.",
                "Corte temporal e controle absoluto. Feitiços finais gigantes que demoram batalhas inteiras são conjurados instantaneamente no estalar dos dedos."
            ],
            "Escudo Arcano": [
                "Condensação de pequenos hexágonos roxos em uma barreira que absorve os primeiros frágeis 10 HP de dano mágico recebido.",
                "Parede de Força prismática densa e pesada que amortece até 30 HP do dano de machadadas ou bolas de luz inimigas.",
                "Carapaça Empática. Romper a barreira enlouquece quem atacou, causando um grande Dano Reativo Mental (LUST) ao agressor que o tocou.",
                "Bomba Protetora Retaliatória. Quando a defesa quebra as runas explodem em um leque AOE (dano em área) massivo ao redor do seu corpo.",
                "Aegis Cúpula de Prata Pura. Defesa divina invulnerável perfeita que absorve 1 Golpe Cataclísmico e Final que obliteraria cidades ileso."
            ],
            "Raio Aumentado": [
                "Expansão Mística Focada. Alonga raios curtos e alvos isolados pra atingir e afetar em um círculo de até +5 Metros extra.",
                "Domínio Míssil Longo de Artilharia Mágica das Florestas. Amplia com +10 metros sem perder potência da zona de chamas e fumaça.",
                "Cúpulas Massivas Dobradas. Magias como chuva venenosa e círculos de cura curativos simples simplesmente dobram suas escalas de raio total.",
                "Metralhadora Ramificada Dividida. Qualquer magia focada numa flecha atômica de luz se ramifica na cabeça batendo múltiplos parceiros adjacentes à força.",
                "Balística do Sniper Arcano Sábio. Mágicas focais lentas atravessam os vales por milhas e batem de longe em batalhas a distâncias gigantescas do horizonte visual da masmorra."
            ],
            "Percepção Arcana": [
                "Terceiro Olho Aberto nas Sombras. Permite reconhecer magia ativa perto e perceber portões de ilusão secretos na madeira.",
                "Visão da Aura Sombria. Identifica Auras e relíquias mágicas invisíveis ou possuídas sob o tecido dos camponeses.",
                "Reação de Super-Computador Lógico. Identifica exatamente que tipo de elemento foi usado no ataque inimigo antes de colidir no seu corpo.",
                "Lê os Segredos Rasteiros. Arranca memórias e informações ocultas ou superficiais da mente apenas no toque ou combate.",
                "Onisciência Completa no Território. O olhar divino enxerga sem esforço toda a movimentação furtiva e mágica invisível da masmorra."
            ],
            "Manipulação de Fluidos": [
                "Poções e fluidos ingeridos ou injetados são processados melhor (+5 de Cura passiva para itens).",
                "Transmutação alquímica. Converte fluidos ou poças d'água nojentas em vinho sedutor afrodisíaco ou veneno violento ralo.",
                "Sanguessuga. Pode drenar umidade vital de oponentes lentos ou extrair do próprio corpo para hidratação total imediata em desertos.",
                "Transferência de Vitalidade. Corta o próprio pulso ou mistura sangue em feitiços curativos, doando seus atributos buffados a aliados caídos.",
                "Lágrimas de Ressurreição Purificadoras. Fluidos que escorrem de milagres e magias finais curam instantaneamente a morte ou Mutações Demoníacas incuráveis."
            ],
            "Cura Amplificada": [
                "Feitiços de cura simples agora ganham reforço passivo estabilizador bruto (+10 HP curado extra em qualquer aliado).",
                "Rios vigorosos de luz. Adiciona +20 HP direto para feitiços curativos mantendo companheiros de pé contra Chefões.",
                "Terapia Oculta Purificante. Os seus feitiços de cura em aliados agora simultaneamente retiram passivamente o tesão sombrio e os debuffs de LUST deles.",
                "Regeneração Celular Arcana Letal. Os feitiços superam o limite de pontos colando fraturas reais e recriando braços decepados durante as batalhas longas.",
                "Ressurreição da Luz Completa Imaculada. Restaura parceiros aniquilados que viraram apenas pó com toda vida, memória, atributos e Alma ilesos e perfeitos da Morte Limbo."
            ],
            "Pacto de Sangue": [
                "Magia pelo Fio da Faca. Permite que você pague o custo absurdo de mana dos feitiços ignorando estamina arrombando seu próprio HP (Vida).",
                "Conversão Mística Densa Sombria. Ofertar um corte macabro em si próprio converte 1HP em 2 Energia Arcana massiva taticamente para o grupo.",
                "A dor é Fúria Atômica Vingativa. O dano mágico bruto recebido no seu corpo é convertido diretamente dobrando o alcance/dano da sua PRÓXIMA Magia vingadora cega de luz.",
                "Lifesteal Sanguinário Passivo Macabro Letal. Suas magias sombrias passam a roubar vampiricamente a barra vermelha vital de Chefões curando suas próprias veias estouradas de batalha e fadiga.",
                "Parasitismo Oculto das Almas de Batalha Mortas do Caos. Consegue roubar, arrastar e usar à força o HP (Vida) de Inimigos controlados ou aliados fracos desavisados nas costas pra pagar suas contas mortais de feitiços colossais insanos."
            ],
            "Absorção Mística": [
                "Esponja Mágica. Ser atingido por qualquer feitiço devolve +2 de Energia mágica recarregando suas baterias passivamente.",
                "Devorador de Luxúria. Absorver magias súcubos e ilusões não te quebra: pelo contrário, zera +5 Energia Arcana na sua barra.",
                "Buraco Negro Reflexivo. Magias elementares fracas apenas desaparecem sugadas na sua couraça, anulando o dano completamente.",
                "Dreno Vampírico Oculto. Um toque no inimigo seca e drena passivamente o MP/Stamina mágica da reserva dele para a sua.",
                "Engolidor do Caos Sideral. Engole literalmente magias nucleares e lendárias inimigas colossais, anulando ataques de Chefe Absoluto."
            ],
            "Mestre Ritualístico": [
                "Rapidez Sombria. Reduz pela metade o tempo letárgico e perigoso que rituais frouxos de magia demoram para conjurar.",
                "Libertação Material. Não necessita do peso de giz, incenso ou pedras arcanas de pó para focar os círculos mágicos.",
                "Âncora Ambulante. Consegue manter feitiços gigantes ou domínios ativados andando, sem precisar fixá-los em castelos parados.",
                "Coro Macabro Único. Você emite força mística equivalente a 3 Magos para conjurar qualquer feitiço massivo de guilda sozinho.",
                "Falsificador de Leis da Realidade. A sua palavra e grimório anulam as gravidades, convertendo lava em gelo num piscar tático."
            ],
            "Invocação Vinculante": [
                "Familiar Espião. Invoca criaturas etéreas e sombrias menores que espiam a masmorra e carregam recados simples.",
                "Mensageiro Kamikaze. Pode invocar morcegos de fogo ou corvos para entregar feitiços explodindo nos inimigos de longe.",
                "Invocação Sombria Média. Chama demônios medianos ou lobos das cinzas para linha de frente do combate caótico sangrento.",
                "Boi de Piranha Mental. O Familiar absorve ativamente tentações, mind-breaks, fobias e o Dano LUST que era focado para você.",
                "Pacto Colossal Avatar de Sangue. Assina contrato infernal massivo invocando Bestas e Deuses Primários Destruidores sob seu controle."
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
