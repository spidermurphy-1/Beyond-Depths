import json
import re

PERKS_DB = {
    "sed": {
        "name": "Sedução",
        "icon": "fa-heart",
        "perks": {
            "Atributos Exuberantes (Seios/Físico)": [
                "+1 em testes de persuasão corporal. Contato físico aplica 1 Dano LUST (Sem teste).",
                "O formato do seu corpo distrai: inimigos em 2m têm -1 de Iniciativa.",
                "Agarrões aplicam Vantagem para Sedução e reduzem a Defesa LUST do alvo em -2."
            ],
            "Molejo e Quadris": [
                "Ataques sofridos pelas costas rolam com Desvantagem para o atacante.",
                "Montaria Sensível: Ganha Vantagem para testes de agarrar/imobilizar usando as pernas.",
                "Ação - Rebolar (Área 5m): Inimigos fazem teste (VON vs SED) ou perdem a Ação Principal."
            ],
            "Feromônios Viciantes": [
                "Inimigos a 2m sofrem 1 Dano LUST passivo no início do turno deles.",
                "Penetração/Ação Oral ganha +1d4 de Dano LUST e cura você em 1d4 de Stamina.",
                "Se o alvo gozar/sofrer Mind Break a 5m de você, recupere 3d6 de HP."
            ]
        }
    },
    "for": {
        "name": "Força",
        "icon": "fa-dumbbell",
        "perks": {
            "Pegada Firme": [
                "Agarrões causam 1d4 de Dano LUST extra por turno em áreas sensíveis.",
                "Pode usar Ação Menor para forçar o alvo imobilizado a receber toque (+SED em Dano LUST).",
                "Aumenta limite de peso e permite carregar/suspender parceiros sem penalidade."
            ],
            "Resistência Bruta": [
                "Ao sofrer Dano Físico, você pode gastar 5 Stamina para reduzir o dano em 1d4.",
                "Resistir a imobilizações ou posições indesejadas rola com Vantagem.",
                "Dano Corpo-a-Corpo (Físico) ganha +FOR no dano."
            ],
            "Submissão Forçada": [
                "Quando imobiliza alguém, o alvo perde 2 de Defesa LUST instantaneamente.",
                "Ganha Vantagem em testes de FOR vs AGI para iniciar atos sexuais.",
                "Alvos penetrados à força por você perdem -5 de Stamina por turno."
            ]
        }
    },
    "agi": {
        "name": "Agilidade",
        "icon": "fa-person-running",
        "perks": {
            "Flexibilidade Extrema": [
                "Consegue escapar de amarras e agarrões rolando com Vantagem.",
                "Pode usar posições exóticas: garante +2 de Dano LUST em ações corporais.",
                "Ao esquivar de um ataque, pode gastar Reação para aplicar Toque Sensível no atacante."
            ],
            "Reflexos Eróticos": [
                "Adiciona +AGI na Defesa contra ataques corpo-a-corpo.",
                "Movimentação sexual não gera Ataque de Oportunidade.",
                "Pode usar uma Ação Menor para realizar masturbação/oral rápido num alvo agarrado."
            ],
            "Acrobata Sensual": [
                "Ganha +AGI em testes de Sedução durante danças ou movimentos rítmicos.",
                "Ao sofrer dano LUST, passe num teste de AGI (CD 15) para reduzir o dano pela metade.",
                "Uma vez por combate, troque de lugar com o alvo no meio de um ato."
            ]
        }
    },
    "con": {
        "name": "Constituição",
        "icon": "fa-shield-heart",
        "perks": {
            "Vigor Inesgotável": [
                "Adiciona +10 na Stamina Máxima.",
                "Descansos rápidos curam o dobro de HP e Stamina.",
                "Chegar a 0 Stamina não causa Exaustão imediata (suporta +1 rodada no ápice)."
            ],
            "Corpo Sensível e Resistente": [
                "+1 de Defesa contra Ataques Físicos.",
                "Vantagem contra Venenos, Doenças e Fadiga Exaustiva.",
                "Ao final de atos intensos, ganha um buff temporário de +1 FOR e +1 AGI ao invés de cansaço."
            ],
            "Absorção e Prazer": [
                "Dano físico contundente pode ser resistido com Vantagem usando CON.",
                "Ganha +CON como bônus em testes para resistir ao seu próprio orgasmo precoce.",
                "Converter Dor em Stamina: Dano físico intenso recupera 1d4 de Stamina."
            ]
        }
    },
    "mis": {
        "name": "Misticismo",
        "icon": "fa-wand-magic-sparkles",
        "perks": {
            "Magia Carnal": [
                "Feitiços aplicam +MIS em Dano LUST secundário.",
                "Magias de cura restauram +1d4 HP se aplicadas através de fluidos ou beijo.",
                "Pode conjurar magias usando LUST ao invés de Stamina (1 LUST = 2 Stamina)."
            ],
            "Aura Sensível": [
                "Inimigos a 3m têm Desvantagem para resistir às suas ilusões.",
                "Feitiços de Sedução Mágica ganham +2 na Classe de Dificuldade (CD).",
                "Atacar você corpo-a-corpo rola com Desvantagem se o atacante tiver LUST > 50%."
            ],
            "Laço Místico": [
                "Pode conectar-se a 1 aliado. Vocês compartilham as barras de Stamina.",
                "Danos (HP ou LUST) do aliado podem ser absorvidos por você.",
                "Orgasmos Mágicos: Seu orgasmo cura 2d6 HP para todos os aliados conectados."
            ]
        }
    },
    "von": {
        "name": "Vontade",
        "icon": "fa-brain",
        "perks": {
            "Mente Blindada": [
                "+1 de Defesa Base contra ataques Mágicos e Mentais.",
                "Vantagem em testes para resistir ao status Mind Break.",
                "Qualquer Dano LUST que você sofra é reduzido em 2 pontos."
            ],
            "Masoquismo / Êxtase Curativo": [
                "Ao receber Dano Físico, você acumula metade do dano como Energia Sexual.",
                "Rola com Vantagem contra intimidação, dor ou medo.",
                "Conversão de Dano (Regra): Se receber 10 ou mais de Dano LUST em um só turno, cura 1d8 do seu HP e previne Mind Break."
            ],
            "Controle de Êxtase": [
                "Seu limite Máximo de LUST aumenta em +20.",
                "Ignora penalidades de Confusão por LUST passando num teste (CD 12+VON).",
                "Pode gastar sua Energia Sexual para buffar ataques (cada ponto = +1d6 Dano LUST)."
            ]
        }
    }
}

with open('/home/nathan/Documentos/repos/beyond-depths/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace PERKS_DB
pattern = re.compile(r'const PERKS_DB = \{.*?^\};\n+const CLASS_TEMPLATES = \{', re.DOTALL | re.MULTILINE)
replacement = f"const PERKS_DB = {json.dumps(PERKS_DB, indent=4, ensure_ascii=False)};\n\nconst CLASS_TEMPLATES = {{"

new_content = pattern.sub(replacement, content)

with open('/home/nathan/Documentos/repos/beyond-depths/app.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated PERKS_DB successfully.")
