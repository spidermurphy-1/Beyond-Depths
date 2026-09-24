import re

new_perks_db = """const PERKS_DB = {
    "sed": {
        "name": "Sedução",
        "icon": "fa-heart",
        "perks": {
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
"""

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"const PERKS_DB = \{.*?\n\};\n?", new_perks_db + "\n", content, flags=re.DOTALL)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
