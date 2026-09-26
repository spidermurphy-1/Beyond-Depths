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
    }
};
