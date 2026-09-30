const CLASS_TEMPLATES = {
    "Artífice": {
        baseStats: { hp: 110, st: 120, lust: 90, en: 30 },
        attrMods: { agi: 3, vig: 2 },
        skills: [
            {
                name: "Ligação Passada",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Enquanto para alguns as tecnologias esquecidas são como runas mágicas, os artífices conseguem compreender e se ligar com a antiga tecnologia humana. Recebe +2 em testes contra criaturas eletrônicas e é capaz de reunir seus pedaços para criação de itens e outros robôs."
            },
            {
                name: "Pequeno Eu",
                type: "Ativa",
                cost: "50 turnos",
                test: "-",
                desc: "É possível criar criaturas e objetos com funções específicas a partir de 5 pedaços eletrônicos, com o valor aumentando conforme a complexidade, não precisando de ferramentas específicas. Usando uma bancada especializada, o Artíficie pode aprimorar equipamentos."
            }
        ],
        weaknesses: [
            {
                name: "Descrente",
                desc: "Os artífices acreditam que a energia sexual é apenas um tipo de energia ainda não explicado pela física... Eles não sabem que estão errados. Recebem 10% de dano extra de qualquer fonte mágica."
            },
            {
                name: "Curiosidade Penitente",
                desc: "Quando vêem um pedaço de tecnologia jamais visto, como uma criatura diferente, são obrigados a interagir com ela."
            }
        ]
    },
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
        attrMods: { agi: 3, con: 2 },
        skills: [
            {
                name: "Munição Adaptável",
                type: "Ativa",
                cost: "2 Energia Sexual (Opcional)",
                test: "Agilidade",
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
    },
    "Bulwark": {
        baseStats: { hp: 200, st: 50, lust: 130, en: 30 },
        attrMods: { for: 1, von: 1, agi: -2 },
        skills: [
            {
                name: "Égide de Defesa",
                type: "Passiva",
                desc: "+3 Defesa GERAL. Aumenta defesa física, Constituição e sexual."
            },
            {
                name: "Vanguarda",
                type: "Passiva",
                desc: "Em equipe, os tanques se tornam mais INTRÉPIDOS, ganhando +2 em dano de força e +2 em redução de dano físico, dando passivamente para seus aliados também resistência."
            },
            {
                name: "TERREMOTO!",
                type: "Ativa",
                cost: "10 turnos",
                test: "-",
                desc: "O tanque pode e consegue com um PISAR PESADO no chão tremer tudo a sua frente, atordoando e deixando vulneravel TODOS OS ALVOS (até mesmo aliados se estiverem no caminho.) por pelo menos 2 turnos, reduzindo em -2 a agilidade dos mesmos."
            }
        ],
        weaknesses: [
            {
                name: "Lentidão",
                desc: "Os tanques apesar de grandes e fortes, são lentos demais . . . Recebem -2 em esquiva."
            },
            {
                name: "Matilha",
                desc: "Naturalmente os tanques possuem um vinculo de proteção para com aqueles que ele se preocupa, sacrificando-se sempre que seu sacrifício significar a possibilidade de salvar um companheiro."
            }
        ]
    },
    "Jester": {
        baseStats: { hp: 75, st: 100, lust: 150, en: 60 },
        attrMods: { sed: 3, agi: 2 },
        skillsToCreate: [
            {
                name: "Carta Oculta",
                type: "Passiva",
                cost: "-",
                test: "Sedução vs Vontade",
                desc: "O Jester atrai completamente o olhar do alvo através de um teste de Sedução. Em sucesso contra a Vontade dele, escolhe uma parte do corpo para prender a atenção. O alvo não percebe adequadamente ações ao redor. O Jester trata suas ações contra o alvo como surpresa, recebendo bônus igual à diferença do teste em suas aplicações de dano, e o alvo sofre -2 em Esquiva/Defesa exclusivamente contra ele. Críticos aumentam o bônus em 10% e reduzem o valor necessário para crítico em 1. Dano acumulado igual ou superior ao resultado da Sedução desperta o alvo e concede a ele um turno adicional.",
                classRestricted: "Jester"
            },
            {
                name: "Microdança",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Os micro-movimentos constantes da Jester irradiam tensão sexual. Enquanto sob Carta Oculta (ou realizando ações de Sedução), o alvo sofre 1d4 + metade do modificador de SED no início de cada turno. Em crítico de Sedução ou ataque beneficiado pela Carta Oculta: o alvo recebe +2 de LUST, adquire Vulnerabilidade Erótica por 1 rodadas (efeitos de Sedução aumentam 30%) e a Jester recupera 2 ponto de Energia Sexual.",
                classRestricted: "Jester"
            }
        ],
        weaknesses: [
            {
                name: "Corpo Exposto",
                desc: "O estilo provocativo e a necessidade de ser vista reduzem a capacidade de se esconder. O Jester sofre -3 em testes de Furtividade e é sempre o primeiro a ser notado em situações de atenção coletiva."
            },
            {
                name: "Dependência de Atenção",
                desc: "Se passar 3 turnos consecutivos sem causar dano sexual a alguém ela começa a ficar ansiosa e impaciente recebendo -3 em testes de vontade."
            }
        ]
    },
    "Berserk": {
        baseStats: { hp: 120, st: 110, lust: 120, en: 30 },
        attrMods: { vig: 3, sed: 2 },
        skillsToCreate: [
            {
                name: "Frenesi",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Ao entrar em estado de fúria, o Berserk aumenta sua pressão ofensiva, o efetivo é ativado em 2 etapas, em 30% de perca de hp ou em 30% de dano lust, o efeito pode variar entre +3 de dano físico se o usuário escolher, ou em +3 de dano lust se escolher o lust. ( Dura por 3 turnos, se renovando a cada 30% )",
                classRestricted: "Berserk"
            },
            {
                name: "Gemido provocativo",
                type: "Ativa",
                cost: "5 turnos",
                test: "-",
                desc: "Esse gemido tem efeito na cama, no combate e na inspiração dos aliados, o usuário pode usar isso para inspirar seus companheiros em um combate, dandolhes +1 no próximo teste, ou pode ser usado para causar 2d8 de dano lust em um alvo que estiver a penetrando ou a fazendo sentir prazer, um contra ataque muito eficaz.",
                classRestricted: "Berserk"
            }
        ],
        weaknesses: [
            {
                name: "Defesa Exposta",
                desc: "Por concentrar-se completamente no ataque, o Berserk sofre -2 em Defesa Física e Defesa de LUST enquanto estiver em Frenesi."
            },
            {
                name: "Movimentos Previsíveis",
                desc: "Se permanecer em Frenesi por mais de 4 turnos seguidos, seus movimentos tornam-se previsíveis, recebendo -2 em Agilidade."
            }
        ]
    },
    "Franco golpeador": {
        baseStats: { hp: 120, st: 150, lust: 100, en: 45 },
        attrMods: { for: 2, agi: 3 },
        skills: [
            {
                name: "Aparar",
                type: "Ativa",
                cost: "3 turnos",
                test: "-",
                desc: "Quando se trata de bater de frente e dominar o avanço, golpeadores são profissionais. Caso a ação seja focada em executar a famigerada ação dita como 'parry', receberá um bônus de +3, o bônus esse que se repete caso a guarda do inimigo não seja quebrada na primeira ação, porém, diminuindo a cada repetição.",
                classRestricted: "Franco golpeador"
            },
            {
                name: "My pretty girl",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Todo golpeador, mesmo com a enorme versatilidade no uso de armas, sempre tem sua favorita. Ao usar a arma que carrega esse título, tanto sua ativa quanto o bônus de força e velocidade da classe ganham +1, além de, em quesito narrativo, tornar o portador dessa classe bem mais imprevisível de se lidar. Em contra parte, sua arma favorita deve ser uma habilidade assinatura, não apenas um mero equipamento.",
                classRestricted: "Franco golpeador"
            }
        ],
        weaknesses: [
            {
                name: "Ai minha artrite",
                desc: "No que se focam em bater e correr, são péssimos em realmente aguentar golpes. Classes portadoras de uma força bruta superior a sua podem facilmente ganhar destes com até um único golpe, demonstrando apenas meras chances de sobrevivência caso seja um ataque perfurante ou cortante. ( -3 em resistência física )"
            },
            {
                name: "Faminto",
                desc: "Acabam sendo a classe mais brigona e inconsequente, não existindo a possibilidade de clicar no botão de diálogo. Se uma intriga ocorre, propõem uma luta. Se uma pessoa está sendo difícil de se persuadir, já puxam uma faca. Se não tiver alguém para segurar um golpeador, ele também não vai se segurar."
            }
        ]
    }
};
