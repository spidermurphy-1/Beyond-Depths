import subprocess
import re
import json

# Extract old app.js
old_app = subprocess.check_output(['git', 'show', 'HEAD:app.js']).decode('utf-8')

# Extract vig from old_app
vig_match = re.search(r'"vig":\s*\{\s*"name": "Vigor".*?"perks":\s*\{(.*?)\}\s*\},', old_app, re.DOTALL)
von_match = re.search(r'"von":\s*\{\s*"name": "Vontade".*?"perks":\s*\{(.*?)\}\s*\},', old_app, re.DOTALL)

old_vig_perks = vig_match.group(1).strip()
old_von_perks = von_match.group(1).strip()

new_vig_perks = """
            "Fígado de Ferro": [
                "1: Tolerância alcoólica e resistência leve a venenos.",
                "2: O corpo processa drogas exóticas sem colaterais pesados.",
                "3: Imune a venenos paralisantes comuns.",
                "4: Sangue Limpo: Cura 1 nível de Envenenamento por turno passivamente.",
                "5: Metabolismo Impecável: Imune a doenças biológicas e infecções.",
                "6: Quebra toxinas e as transforma em 1d4 de Stamina.",
                "7: Purificação Perfeita: Imunidade total a qualquer tipo de veneno, ácido ou contaminação."
            ],
            "Pulmões de Aço": [
                "1: Prende a respiração por longos minutos sem penalidade.",
                "2: Fôlego para correr sem cansar tão rápido.",
                "3: Imune a afogamento rápido ou asfixia simples.",
                "4: Fôlego Inesgotável: Ignora o primeiro nível de Exaustão.",
                "5: Imune a gases venenosos e esporos através do controle respiratório.",
                "6: Grito Desestabilizador: Usa o fôlego extremo para atordoar alvos próximos.",
                "7: Sem Necessidade de Ar: Pode lutar debaixo d'água ou no vácuo sem nenhuma perda de performance."
            ],
            "Tolerância à Dor": [
                "1: Arranhões não incomodam. +1 contra Dor leve.",
                "2: Ignora a dor de cortes profundos.",
                "3: Foco através do Sangue: Não sofre Desvantagem por dor severa.",
                "4: Quebra de Limite: Se sofrer um acerto crítico, ganha +2 em Dano no próximo turno por adrenalina.",
                "5: Ossos quebrados não te param. Movimento normal mesmo gravemente ferido.",
                "6: Masoquismo Focado: Converte 10% do Dano Físico sofrido em Vantagem no ataque seguinte.",
                "7: Máquina Insensível: Ignora completamente qualquer penalidade física decorrente de ferimentos."
            ],
            "Sangue Estancado": [
                "1: Coagulação rápida. +1 de resistência contra cortes.",
                "2: Pequenas feridas se fecham em segundos.",
                "3: Imune a Condição: Sangramento Leve.",
                "4: Coagulação Forçada: Custa 5 Stamina para parar um sangramento severo instantaneamente.",
                "5: Reduz todo o dano cortante recebido em 1d4.",
                "6: Imune a Hemorragias críticas e Feridas Abertas.",
                "7: O Sangue Ferve, Mas Não Vaza. Reduz dano de armas brancas afiadas pela metade permanentemente."
            ],
            "Vigor Extremo": [
                "1: Corpo descansado rende mais. +5 Stamina Máxima.",
                "2: Fôlego duradouro. Ações de movimento custam menos Stamina.",
                "3: Bateria Reserva: Quando Stamina chegar a 0, recupera 1d6 (1x por combate).",
                "4: Motor a Querosene: Recupera passivamente +2 de Stamina no início do seu turno.",
                "5: Nunca precisa dormir mais que 2 horas por dia para estar 100%.",
                "6: Recupera passivamente +1d4 de Stamina no início do turno.",
                "7: O Coração da Terra: Sua Stamina máxima aumenta em +30 e você nunca mais sente cansaço natural."
            ],
            "Casca Grossa": [
                "1: Pele caleijada. Reduz 1 de Dano Físico puro recebido.",
                "2: Músculos rígidos. HP Máximo +10.",
                "3: Absorção Corporal: Ignora Dano Físico menor que 3 (não machuca).",
                "4: Muro de Carne: Você ganha Vantagem em testes para não ser Empurrado ou Derrubado.",
                "5: Reduz todo e qualquer Dano Físico sofrido em 2.",
                "6: Imune a atordoamento (Stun) por impacto físico.",
                "7: O Colosso Vivo: Reduz 20% de TODO o Dano Físico sofrido, antes de contar a armadura."
            ],
            "Motor Biológico": [
                "1: Digestão rápida permite comer muito para ganhar bônus leve.",
                "2: Gasta HP (2 pontos) para ganhar Stamina (2 pontos) como Ação Livre.",
                "3: O corpo emana calor intenso ao queimar energia, imunidade ao frio.",
                "4: Burst Metabólico: Gasta 10 HP para dobrar sua locomoção por 1 turno.",
                "5: Consegue curar ossos através do consumo massivo de alimentos.",
                "6: Gasta HP para adicionar Dano Extra (1 HP = +1 Dano, max +5).",
                "7: Sobrecarga Celular: Aquece o corpo a 100°C, queimando inimigos próximos passivamente enquanto você tem Stamina."
            ]
"""

new_von_perks = """
            "Foco Inabalável": [
                "1: Concentração afiada. +1 em testes para evitar ser distraído.",
                "2: Ruídos altos não quebram sua linha de pensamento.",
                "3: Vantagem em testes mentais ao realizar trabalhos minuciosos.",
                "4: Túnel de Foco: Ignora penalidades de ambiente caótico (ex: campo de batalha gritante).",
                "5: Imune a magias de Desorientação.",
                "6: Perfeição Absoluta. Nunca erra ataques por motivo de 'distração mágica'.",
                "7: A Mente Fechada: Ninguém pode ler sua mente, tentar fazer isso causa 2d6 de Dano Mágico ao invasor."
            ],
            "Resiliência ao Medo": [
                "1: Coragem testada. +1 de resistência contra Pânico.",
                "2: Ignora auras de intimidação de monstros pequenos.",
                "3: Você não recua. +2 contra magias de Terror.",
                "4: Frio e Calculista: Imune ao status de Medo.",
                "5: O medo dos aliados é mitigado se estiverem próximos a você.",
                "6: Intimidadores sentem desconforto perante a sua apatia.",
                "7: O Caçador de Pesadelos: Imunidade total a auras de Pavor. Você causa medo naquilo que tenta te assustar."
            ],
            "Instinto de Sobrevivência Mental": [
                "1: Reflexo cognitivo. Sabe quando alguém tenta influenciar você magicamente.",
                "2: Cria barreiras rasas na própria mente contra invasões de charme.",
                "3: A dor psíquica se transforma em irritação leve.",
                "4: Ceticismo Atroz: Magias ilusórias e de charme rolam com Desvantagem contra você.",
                "5: Desperta imediatamente se colocado sob efeito de transe forçado.",
                "6: Ao chegar a 0 LUST, rola um dado; par, você recupera 20 LUST em pura teimosia.",
                "7: Incorruptível. Seu estado mental de LUST não pode ser alterado por poderes externos contra a sua vontade."
            ],
            "Aura de Autoridade": [
                "1: Postura inabalável. NPCs sentem respeito instintivo.",
                "2: Apenas um olhar silencia provocações fracas.",
                "3: Vantagem em testes para resistir a ordens ou comandos absolutos (Geas).",
                "4: Vontade Esmagadora: Reduz Dano LUST sofrido de magias de sedução em 1d4.",
                "5: Comandos mentais lançados contra você falham miseravelmente 50% das vezes.",
                "6: 'Eu não obedeço': Imune à condição Submisso.",
                "7: O Rei Intocável. Imunidade absoluta a controle de ordens e encantamentos diretos."
            ],
            "Mente Desperta": [
                "1: Sono sempre leve, nunca é pego em estado vulnerável.",
                "2: Ignora o cansaço mental diário (1 nível de exaustão mental a menos).",
                "3: Resiste a feitiços básicos de indução ao sono.",
                "4: Despertar Brutal: Imune a magias de letargia, lentidão mental ou sono profundo.",
                "5: Nunca pode ser apagado por traumas psicológicos.",
                "6: A mente trabalha mesmo quando o corpo descansa, imunidade a ataques em sonhos.",
                "7: Consciência Perpétua. Você está ciente de tudo, mesmo se o corpo físico for paralisado ou nocauteado."
            ],
            "Determinação Cega": [
                "1: A meta acima de tudo. Ignora penalidades leves se focado num objetivo.",
                "2: Resistência contra magias de Desânimo ou Tristeza induzida.",
                "3: Se recusar a perder: +1 em Testes se o HP estiver muito baixo.",
                "4: Teimosia Absoluta: Uma vez por dia, ignora um golpe letal que reduziria seu HP a 0, caindo para 1 HP em vez disso.",
                "5: Imune a fraqueza mágica.",
                "6: 'Nós vamos conseguir': Passa Vantagem inspiradora aos aliados se você estiver quase caindo.",
                "7: A Recusa da Morte: Enquanto tiver determinação/foco, nem feitiços de Morte Instantânea funcionam contra você."
            ],
            "Fúria Fria": [
                "1: Agressividade controlada. Transforma insultos em foco.",
                "2: Quando provocam você, seus ataques não perdem precisão.",
                "3: Quando recebe Dano LUST, o próximo Dano Físico que causar recebe +1.",
                "4: Retribuição Calada: Quando alguém tenta controlar sua mente, ganha Vantagem no ataque contra essa pessoa.",
                "5: Absorção Gélida: Quando recebe Dano LUST Crítico, devolve Dano Físico equivalente ao atacante.",
                "6: Ignora qualquer debuff imposto por sedução ao realizar um ataque letal.",
                "7: A Vontade é uma Arma. Sempre que for alvo de poder LUST/Sedução, converte o efeito falho em +2d6 de Dano Adicional."
            ]
"""

# Now replace vig in current app.js
with open('app.js', 'r') as f:
    current_app = f.read()

# We need to find the current vig and von and replace them
# Find "vig": { ... perks: { ... } }
vig_pattern = re.compile(r'("vig":\s*\{\s*"name":\s*"Vigor".*?"perks":\s*\{)(.*?)(\}\s*\n\s*\})', re.DOTALL)
von_pattern = re.compile(r'("von":\s*\{\s*"name":\s*"Vontade".*?"perks":\s*\{)(.*?)(\}\s*\n\s*\})', re.DOTALL)

# Insert old perks + new perks
new_vig_content = old_vig_perks + ",\n" + new_vig_perks
new_von_content = old_von_perks + ",\n" + new_von_perks

current_app = vig_pattern.sub(r'\1\n' + new_vig_content + r'\n\3', current_app)
current_app = von_pattern.sub(r'\1\n' + new_von_content + r'\n\3', current_app)

with open('app.js', 'w') as f:
    f.write(current_app)

