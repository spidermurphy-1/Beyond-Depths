import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

new_perks_db = """const PERKS_DB = {
    "sed": {
        "name": "Sedução",
        "icon": "fa-heart",
        "perks": {
            "Peitos/Peitoral": [
                "1: Seu busto chama atenção. Dano de LUST +1",
                "2: O balanço hipnotiza. Dano de LUST +1d2",
                "3: O toque neles excita. Dano de LUST +1d3",
                "4: Eles dominam a visão do alvo. Dano de LUST +1d4, Testes +1",
                "5: Tamanho e maciez surreais. Dano de LUST +2d2, Testes +2",
                "6: O alvo mal consegue pensar direito. Dano de LUST +2d3, Testes +2",
                "7: Fartura divina e sufocante. Dano de LUST +3d4, Testes +3"
            ],
            "Quadril/Glúteos": [
                "1: Quadril largo e convidativo. Defesa LUST +1",
                "2: Movimentos sinuosos. Defesa LUST +1, Dano +1d2",
                "3: Uma retaguarda invejável. Defesa LUST +1, Dano +1d3",
                "4: Rebolado que desestabiliza. Defesa LUST +2, Dano +1d4",
                "5: Difícil tirar os olhos. Defesa LUST +2, Dano +2d2",
                "6: Cada passo é uma provocação. Defesa LUST +3, Dano +2d3",
                "7: Proporções perfeitas, domina ambientes. Defesa LUST +3, Dano +3d4"
            ],
            "Lábios/Fala": [
                "1: Lábios atraentes. Dano LUST +1",
                "2: Sussurros excitantes. Dano LUST +1d2",
                "3: Gemidos que afetam a mente. Dano LUST +1d3",
                "4: Beijos inesquecíveis. Dano LUST +1d4, Testes +1",
                "5: Promessas vulgares. Dano LUST +2d2, Testes +2",
                "6: Apenas ouvir sua voz excita. Dano LUST +2d3, Testes +2",
                "7: Um simples beijo ou sussurro quebra mentes. Dano LUST +3d4, Testes +3"
            ],
            "Mãos/Dedos": [
                "1: Toque sensível. Dano LUST +1",
                "2: Dedos ágeis. Dano LUST +1d2",
                "3: Carícias exatas. Dano LUST +1d3",
                "4: Encontra todos os pontos G. Dano LUST +1d4, Testes +1",
                "5: Mãos profanas. Dano LUST +2d2, Testes +2",
                "6: Massagens que derretem resistências. Dano LUST +2d3, Testes +2",
                "7: Dominância completa pelos dedos. Dano LUST +3d4, Testes +3"
            ],
            "Pés": [
                "1: Pés bonitos e bem cuidados. Dano LUST +1",
                "2: Fetiche moderado. Dano LUST +1d2",
                "3: Toque de pernas. Dano LUST +1d3",
                "4: Especialista em dominação por pés. Dano LUST +1d4, Testes +1",
                "5: Capaz de levar ao delírio sem usar as mãos. Dano LUST +2d2, Testes +2",
                "6: Pés irresistíveis para submissos. Dano LUST +2d3, Testes +2",
                "7: Um passo em cima e o alvo já implora. Dano LUST +3d4, Testes +3"
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
                "4: Força esmagadora. Dano Físico +1d4, Testes +1",
                "5: Quase quebra ossos. Dano Físico +2d2, Testes +2",
                "6: Domina alvos na força bruta. Dano Físico +2d3, Testes +2",
                "7: Músculos surreais, ninguém escapa. Dano Físico +3d4, Testes +3"
            ],
            "Pegada/Mãos": [
                "1: Aperto firme. Redução Dano +1",
                "2: Mãos pesadas. Redução Dano +1d2",
                "3: Difícil de soltar. Redução Dano +1d3",
                "4: Deixa marcas fortes no corpo. Redução Dano +1d4, Testes +1",
                "5: Quebra itens facilmente. Redução Dano +2d2, Testes +2",
                "6: Aperto sufocante. Redução Dano +2d3, Testes +2",
                "7: Onde você agarra, você domina. Redução Dano +2d4, Testes +3"
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
                "4: Contorcionismo erótico. Defesa +2, Testes +1",
                "5: Dobra o corpo em ângulos impossíveis. Defesa +3, Testes +2",
                "6: Praticamente água. Defesa +3, Testes +2",
                "7: Uma aberração ginástica, inagarrável. Defesa +3, Testes +3, Dano LUST +2d3"
            ],
            "Pernas/Acrobacia": [
                "1: Pernas ágeis. Dano +1",
                "2: Chutes rápidos. Dano +1d2",
                "3: Saltos altos. Dano +1d3",
                "4: Posições aéreas. Dano +1d4, Testes +1",
                "5: Montaria rápida. Dano +2d2, Testes +2",
                "6: Movimentos impossíveis de prever. Dano +2d3, Testes +2",
                "7: Causa dano ou escapa antes de ser notado. Dano +3d4, Testes +3"
            ]
        }
    },
    "con": {
        "name": "Constituição",
        "icon": "fa-shield-heart",
        "perks": {
            "Abdômen/Costas": [
                "1: Barriga firme. Redução de Dano Físico +1",
                "2: Tanquinho. Redução de Dano Físico +1d2",
                "3: Aguenta golpes limpos. Redução de Dano Físico +1d3",
                "4: Parede de músculos. Redução de Dano Físico +1d4, Testes +1",
                "5: Ignora dor moderada. Redução de Dano Físico +2d2, Testes +2",
                "6: Costas largas, barriga de aço. Redução de Dano Físico +2d3, Testes +2",
                "7: Corpo como uma muralha, quase indestrutível. Redução de Dano Físico +2d4, Testes +3"
            ],
            "Coxas": [
                "1: Pernas grossas. Dano LUST +1",
                "2: Esmaga rostos leves. Dano LUST +1d2",
                "3: Alvo não escapa de montarias. Dano LUST +1d3",
                "4: Coxas sufocantes (Thick). Dano LUST +1d4, Testes +1",
                "5: Fetiche mortal. Dano LUST +2d2, Testes +2",
                "6: Quebra melancias e mentes. Dano LUST +2d3, Testes +2",
                "7: Aperto definitivo entre as pernas. Dano LUST +3d4, Testes +3"
            ],
            "Pele": [
                "1: Pele sensível. Defesa +1",
                "2: Suor perfumado. Defesa +1",
                "3: Maciez absurda. Defesa +2",
                "4: Resiste à dor convertendo em tesão. Defesa +2, Testes +1",
                "5: Lubrificação natural extrema. Defesa +3, Testes +2",
                "6: Não sofre assaduras ou marcas, desliza. Defesa +3, Testes +2",
                "7: Intocável por dor, apenas prazer. Defesa +3, Testes +3, Redução Dano +2d4"
            ],
            "Venenos/Fluidoss": [
                "1: Resistência a drogas fracas. Redução de Dano Químico/Lust +1",
                "2: Secreções com sabor doce. Redução de Dano Químico/Lust +1d2",
                "3: Ignora efeitos alucinógenos menores. Redução de Dano Químico/Lust +1d3",
                "4: Seu sêmen/fluido excita o alvo. Redução de Dano Químico/Lust +1d4, Testes +1",
                "5: Pode beber veneno. Redução de Dano Químico/Lust +2d2, Testes +2",
                "6: Drogas sexuais não funcionam em você. Redução de Dano Químico/Lust +2d3, Testes +2",
                "7: Metabolismo imune a toxinas, seus fluidos são o veneno. Redução Dano +2d4, Testes +3"
            ]
        }
    },
    "von": {
        "name": "Vontade",
        "icon": "fa-brain",
        "perks": {
            "Resistência a Provocações": [
                "1: Difícil de provocar. Defesa LUST +1",
                "2: Mente calma. Defesa LUST +1",
                "3: Ignora xingamentos eróticos. Defesa LUST +2",
                "4: Consegue manter o foco enquanto estimulado. Defesa LUST +2, Testes +1",
                "5: Frio como gelo. Defesa LUST +3, Testes +2",
                "6: Desligamento emocional a vontade. Defesa LUST +3, Testes +2",
                "7: Mente de Titã, impossível de ser quebrado por palavras. Defesa LUST +3, Testes +3, Redução LUST +2d4"
            ],
            "Resistência a Ilusões": [
                "1: Percebe ilusões fracas. Testes +1",
                "2: Mente focada. Testes +1",
                "3: Reconhece realidade. Testes +2",
                "4: Imune a fumaça de súcubos. Testes +2",
                "5: Visualiza a verdade. Testes +3",
                "6: Destrói ilusões com a mente. Testes +3, Dano LUST de volta +2d2",
                "7: Uma rocha contra magia mental. Testes +3, Dano LUST de volta +3d4"
            ],
            "Êxtase de Cura": [
                "1: Dano de LUST massivo converte 10% do Dano LUST em HP em vez de Mind Break.",
                "2: Converte 20% do Dano LUST massivo em HP.",
                "3: Converte 30% do Dano LUST massivo em HP.",
                "4: Converte 50% do Dano LUST em HP. Testes +1",
                "5: Converte 70% do Dano LUST em HP. Testes +2",
                "6: Converte 85% do Dano LUST em HP. Testes +2",
                "7: Orgasmos curam TODO (100%) o HP ao invés de causar dano. Testes +3"
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
                "4: Mantém posições por horas. Testes +1",
                "5: Fôlego de atleta de elite. Testes +2",
                "6: Orgasmos múltiplos sem parar. Testes +2",
                "7: Energia infinita em atos sexuais. Testes +3, Dano LUST contínuo +3d4"
            ],
            "Metabolismo": [
                "1: Cura pequenos arranhões.",
                "2: Recupera Stamina rápido.",
                "3: Beber fluidos dá energia.",
                "4: Regenera 1d4 HP por turno. Testes +1",
                "5: Ignora efeitos de cansaço. Testes +2",
                "6: Não sente fome ou sede. Testes +2",
                "7: Regeneração total imediata após descanso rápido. Testes +3, Redução Dano +2d4"
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
                "3: Assusta ou atrai fracos. Dano Mágico +1d3",
                "4: Aura palpável que excita e queima. Dano Mágico +1d4, Testes +1",
                "5: O ar pesa perto de você. Dano Mágico +2d2, Testes +2",
                "6: Magia escorre pelo seu corpo. Dano Mágico +2d3, Testes +2",
                "7: Aura divina/demoníaca que corrompe tudo em volta. Dano Mágico +3d4, Testes +3"
            ],
            "Controle de Energia": [
                "1: Manipulação básica. Defesa Mágica +1",
                "2: Escudos finos. Defesa Mágica +1",
                "3: Absorve pequenas magias. Defesa Mágica +2",
                "4: Converte magia em LUST. Defesa Mágica +2, Testes +1",
                "5: Reflete ataques mentais. Defesa Mágica +3, Testes +2",
                "6: Molda energia como argila. Defesa Mágica +3, Testes +2",
                "7: Mestre Absoluto do Fluxo (anula ataques diretos com Testes). Defesa Mágica +3, Testes +3, Redução Mágica +2d4"
            ]
        }
    }
};"""

# Replace PERKS_DB
content = re.sub(r"const PERKS_DB = \{.*?\n\};\n?", new_perks_db + "\n", content, flags=re.DOTALL)

# Replace PERK_COSTS
content = re.sub(
    r"const PERK_COSTS = \[.*?\];",
    "const PERK_COSTS = [0, 1, 2, 3, 5, 9, 14, 20];",
    content
)

# Replace maxPV multiplier to 2
content = re.sub(
    r"const maxPV = Math\.max\(0, attrs\[attrKey\] \* 3\);",
    "const maxPV = Math.max(0, attrs[attrKey] * 2);",
    content
)

# Fix max level in adjustPerk
content = re.sub(
    r"if\(lvl > 3\) lvl = 3;",
    "if(lvl > 7) lvl = 7;",
    content
)
# Also fix in renderDashboard logic if it exists (wait, render uses if(lvl === 3))
content = re.sub(
    r"if\(lvl === 3\)",
    "if(lvl === 7)",
    content
)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
