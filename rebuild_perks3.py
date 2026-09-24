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
                "1: Costura forte. Redução Dano +1",
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
                "1: Pulso fino, escorrega. Defesa +1",
                "2: Desloca o ombro voluntariamente. Defesa +1",
                "3: Lubrifica a própria pele para escapar. Defesa +2",
                "4: Mestre do Escape: Escapar de cordas é Ação Livre para você. Defesa +2",
                "5: Usa as amarras soltas contra o inimigo. Defesa +3",
                "6: Imune a imobilizações convencionais. Defesa +3",
                "7: Escapa até de magias de restrição corpórea. Defesa +3, Testes +3"
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
                "4: Masoquismo: Converte dano Físico recebido em +1 LUST Dano nos seus ataques. Defesa +2",
                "5: Lubrificação natural extrema, difícil agarrar. Defesa LUST +3",
                "6: Não sofre assaduras, desliza em qualquer fricção. Defesa LUST +3",
                "7: Intocável por dor, contato gera apenas prazer puro. Defesa LUST +3, Testes +3"
            ],
            "Venenos / Drogas": [
                "1: Resistência a drogas fracas. Redução de Dano Químico/Lust +1",
                "2: Fígado resistente. Redução de Dano Químico/Lust +1d2",
                "3: Ignora efeitos alucinógenos menores. Redução de Dano Químico/Lust +1d3",
                "4: Sangue Tóxico/Doce: Monstros que te morderem sofrem dano químico. Redução +1d4",
                "5: Pode beber veneno puro. Redução de Dano Químico/Lust +2d2",
                "6: Drogas sexuais não funcionam (a não ser que queira). Redução +2d3",
                "7: Metabolismo imune a toxinas absolutas. Redução Dano +2d4, Testes +3"
            ],
            "Tolerância a Dor": [
                "1: Aguenta tapas duros. Redução Dano +1",
                "2: Sorri sangrando. Redução Dano +1d2",
                "3: Ignora cortes superficiais. Redução Dano +1d3",
                "4: Adrenalina: Quando com -50% HP, ganha +2 em Dano Global. Redução +1d4",
                "5: Continua lutando com ossos quebrados. Redução Dano +2d2",
                "6: Choques elétricos e chicotes são só cócegas. Redução Dano +2d3",
                "7: Um Juggernaut de dor absorvida. Redução Dano +2d4, Testes +3"
            ],
            "Vigor Reprodutivo": [
                "1: Capacidade de fluidos acima do normal. Stamina máxima levemente maior.",
                "2: Recupera fluidos rápido após orgasmos.",
                "3: Pode procriar/gerar sêmen ou leite à vontade.",
                "4: Máquina de Procriação: Orgasmos não te deixam atordoado. Redução LUST +1d4",
                "5: Gera litros de fluidos por sessão. Redução LUST +2d2",
                "6: Nunca fica exausto por descargas. Redução LUST +2d3",
                "7: Capacidade infinita, o corpo é uma fonte eterna de prazer sem cansar. Redução +2d4, Testes +3"
            ]
        }
    },
    "von": {
        "name": "Vontade",
        "icon": "fa-brain",
        "perks": {
            "Resistência a Provocações": [
                "1: Difícil de irritar ou seduzir. Defesa LUST +1",
                "2: Mente calma. Defesa LUST +1",
                "3: Ignora xingamentos eróticos. Defesa LUST +2",
                "4: Estoicismo: Libera Habilidade 'Foco Absoluto' (Limpa condições mentais). Defesa LUST +2",
                "5: Frio como gelo. Defesa LUST +3",
                "6: Desligamento emocional a vontade. Defesa LUST +3",
                "7: Mente de Titã, impossível de ser quebrado por palavras. Defesa LUST +3, Testes +3"
            ],
            "Resistência a Ilusões": [
                "1: Percebe ilusões fracas. Testes de VON +1",
                "2: Mente focada. Testes de VON +1",
                "3: Reconhece realidade. Testes de VON +2",
                "4: Visão Verdadeira: Ignora magias de invisibilidade ou clones. Testes +2",
                "5: Visualiza a verdade em magias complexas. Testes +3",
                "6: Destrói ilusões com a força da mente. Testes +3, Dano Retorno +2d2",
                "7: Uma rocha contra magia mental e ilusões supremas. Testes +3, Dano Retorno +3d4"
            ],
            "Êxtase de Cura": [
                "1: Dano de LUST massivo converte 10% do Dano LUST em HP em vez de Mind Break.",
                "2: Converte 20% do Dano LUST massivo em HP.",
                "3: Converte 30% do Dano LUST massivo em HP.",
                "4: Converte 50% do Dano LUST em HP. Libera 'Cura Orgasmo' para aliados. Testes +1",
                "5: Converte 70% do Dano LUST em HP. Testes +2",
                "6: Converte 85% do Dano LUST em HP. Testes +2",
                "7: Orgasmos curam TODO (100%) o HP ao invés de causar dano. Testes +3"
            ],
            "Presença Dominadora": [
                "1: Postura imponente. Dano LUST psicológico +1",
                "2: Olhares que julgam e excitam. Dano LUST +1d2",
                "3: Ajoelham perante sua voz. Dano LUST +1d3",
                "4: Aura do Rei/Rainha: Libera habilidade 'Comando de Submissão'. Dano LUST +1d4",
                "5: Alvos sentem medo misturado com tesão. Dano LUST +2d2",
                "6: Sua presença exige respeito absoluto. Dano LUST +2d3",
                "7: Comandos se tornam leis absolutas na mente do alvo. Dano LUST +3d4, Testes +3"
            ],
            "Submissão Focada": [
                "1: Prazer em ser dominado. Defesa Fís +1 quando amarrado",
                "2: Mente limpa sob controle. Testes +1 quando amarrado",
                "3: Sofre menos dano real de golpes. Redução +1d3 em BDSM",
                "4: Força do Submisso: Converte LUST recebido em Vantagem no próximo turno. Redução +1d4",
                "5: Adoração profunda pelo Mestre te blinda. Redução +2d2",
                "6: Protege a mente refugiando-se no espaço de submissão. Redução +2d3",
                "7: Imunidade a traumas. Você prospera na dor ordenada. Redução +2d4, Testes +3"
            ],
            "Bloqueio de Trauma": [
                "1: Esquece dores rápido. Resiliência mental leve",
                "2: Mente compartimentada. Ignora penalidades leves",
                "3: Pode reprimir LUST para depois. Armazena LUST e solta ao fim da luta.",
                "4: Despertar: Se cair a 0 HP, volta com 1 HP por pura força de vontade (1x).",
                "5: Imune a condições de Pânico/Medo.",
                "6: Pode escolher não sentir nada em membros específicos.",
                "7: Mente acima do corpo. Continua lutando mesmo com corpo despedaçado. Testes +3"
            ]
        }
    },
    "vig": {
        "name": "Vigor",
        "icon": "fa-battery-full",
        "perks": {
            "Fôlego": [
                "1: Fôlego bom. Stamina extra.",
                "2: Não cansa fácil.",
                "3: Recupera fôlego rápido.",
                "4: Segundo Fôlego: Libera Habilidade de curar 50% da Stamina 1x por combate. Testes +1",
                "5: Fôlego de atleta de elite. Testes +2",
                "6: Orgasmos múltiplos sem parar para respirar. Testes +2",
                "7: Energia infinita em atos sexuais contínuos. Testes +3, Dano LUST passivo +3d4"
            ],
            "Metabolismo Regenerativo": [
                "1: Cura pequenos arranhões.",
                "2: Recupera Stamina rápido dormindo.",
                "3: Beber fluidos dá energia.",
                "4: Fator de Cura: Regenera 1d4 HP passivamente a cada turno. Testes +1",
                "5: Ignora efeitos de cansaço extremo. Testes +2",
                "6: Cicatriza cortes profundos em segundos. Testes +2",
                "7: Regeneração total imediata após um descanso curto. Testes +3, Redução Dano +2d4"
            ],
            "Orgasmos Múltiplos": [
                "1: Continua ativo após 1 orgasmo.",
                "2: Sensibilidade não machuca pós-clímax.",
                "3: Pode ter 3 seguidos sem desmaiar.",
                "4: Catarse Contínua: Cada orgasmo buffa o próximo dano LUST em +1d4.",
                "5: Pode gozar infinitamente sem perder HP.",
                "6: O prazer se retroalimenta gerando Stamina.",
                "7: Cascata de Clímax que paralisa qualquer parceiro em choque. Dano +3d4, Testes +3"
            ],
            "Imparável": [
                "1: Ignora dores nas juntas.",
                "2: Ignora lentidão.",
                "3: Resiste a exaustão.",
                "4: Motor a Diesel: Zero Stamina não te impede de atacar (custa HP).",
                "5: Quebra barreiras pelo cansaço.",
                "6: Nunca recebe Desvantagem por cansaço.",
                "7: Uma máquina eterna de carne. Imune a exaustão total. Testes +3"
            ],
            "Coração de Touro/Súcubo": [
                "1: Batimentos fortes, muita vitalidade.",
                "2: O sangue ferve de tesão rápido.",
                "3: Pressão sanguínea suporta extremos.",
                "4: Adrenalina Erótica: Ganha Vantagem se estiver com mais LUST que HP.",
                "5: Aquece o corpo a níveis de dar queimaduras de prazer.",
                "6: Bombardeia energia pelo corpo curando toxinas.",
                "7: O coração bate como tambores de guerra, impenetrável. Testes +3, Redução Dano +2d4"
            ],
            "Desespero Vital": [
                "1: Fica agressivo quando machucado. Dano +1",
                "2: Mais rápido sob pressão. Dano +1d2",
                "3: Bate mais forte quase morto. Dano +1d3",
                "4: Último Suspiro: +2d4 de Dano quando o HP estiver menor que 20%.",
                "5: Ignora defesa inimiga na exaustão. Dano +2d2",
                "6: Ataques suicidas mortais. Dano +2d3",
                "7: Uma fera encurralada. Dano +3d4, Testes +3 quando ferido"
            ]
        }
    },
    "mis": {
        "name": "Misticismo",
        "icon": "fa-book-journal-whills",
        "perks": {
            "Aura": [
                "1: Presença leve. Dano Mágico +1",
                "2: Aura brilhante. Dano Mágico +1d2",
                "3: Assusta ou atrai seres fracos. Dano Mágico +1d3",
                "4: Intimidação Arcana: Libera Habilidade de Área para assustar/afugentar. Dano +1d4",
                "5: O ar pesa perto de você. Dano Mágico +2d2",
                "6: Magia escorre pelo seu corpo em chispas. Dano Mágico +2d3",
                "7: Aura divina/demoníaca que corrompe tudo num raio imenso. Dano Mágico +3d4, Testes +3"
            ],
            "Controle de Energia": [
                "1: Manipulação básica. Defesa Mágica +1",
                "2: Escudos finos ao redor do corpo. Defesa Mágica +1",
                "3: Absorve pequenas magias. Defesa Mágica +2",
                "4: Desviar Magia: Libera habilidade de rebater magias inimigas. Defesa +2",
                "5: Reflete ataques mentais passivamente. Defesa Mágica +3",
                "6: Molda energia mágica bruta como se fosse argila. Defesa Mágica +3",
                "7: Mestre Absoluto do Fluxo (anula ataques diretos com Testes). Defesa Mág +3, Redução +2d4"
            ],
            "Hipnose / Transe": [
                "1: Olhar cativante. Dano Mágico LUST +1",
                "2: Voz que ecoa na mente. Dano Mágico LUST +1d2",
                "3: Pêndulos ou movimentos repetitivos prendem a visão. Dano +1d3",
                "4: Comandos Mentais: Libera habilidade para dar ordens a mentes fracas. Dano +1d4",
                "5: Zumbifica inimigos após prazer intenso. Dano +2d2",
                "6: Reprograma desejos básicos do alvo. Dano +2d3",
                "7: Dominação Cerebral Completa de um alvo. Dano +3d4, Testes +3"
            ],
            "Sensibilidade Mágica": [
                "1: Sente arapucas mágicas.",
                "2: Sente emoções do ambiente.",
                "3: Lê aros mágicos de monstros.",
                "4: Visão da Alma: Revela vulnerabilidades elementais e mentais do alvo. Testes +1",
                "5: Enxerga correntes de mana a quilômetros. Testes +2",
                "6: Nunca é surpreendido por magias. Testes +2",
                "7: Onisciência local, conecta-se à rede mágica do plano. Testes +3"
            ],
            "Feitiçaria Sensual": [
                "1: Encanta roupas para cair. Dano LUST +1",
                "2: Cria tentáculos fantasmagóricos menores. Dano LUST +1d2",
                "3: Aquece o corpo do alvo com magia. Dano LUST +1d3",
                "4: Conjurar Luxúria: Libera magia forte de tentáculos/ilusões de súcubo. Dano +1d4",
                "5: Feitiços causam orgasmos como efeito colateral. Dano LUST +2d2",
                "6: Magias de controle tornam alvos submissos sexuais. Dano LUST +2d3",
                "7: A própria manifestação mágica da devassidão. Dano LUST +3d4, Testes +3"
            ],
            "Pactos / Vínculos": [
                "1: Facilidade de selar promessas mágicas.",
                "2: Vínculo tátil: compartilha sensações.",
                "3: Vínculo mental fraco com o mestre/servo.",
                "4: Selo de Escravidão/Proteção: Libera habilidade de marcar parceiros para buffs mútuos.",
                "5: Compartilha buffs e dano com o alvo marcado.",
                "6: Puxa o parceiro através das sombras.",
                "7: A vida de ambos está atrelada, magia suprema de alma. Testes +3"
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
