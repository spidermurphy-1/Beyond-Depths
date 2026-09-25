const RACE_TEMPLATES = {
    "Humano": {
        skills: [
            {
                name: "Resiliência",
                type: "Passiva",
                desc: "Movido por teimosia, quando o Humano atinge 50% ou menos de seu HP ou Stamina máximo, seu instinto de preservação é ativado. Ele recebe +4 de Defesa de Lust e reduz em 15% todo o LUST acumulado por ações adversas enquanto permanecer nessa condição."
            }
        ],
        weaknesses: [
            {
                name: "Carne Ordinária",
                desc: "Por possuírem corpos puramente biológicos, os humanos são naturalmente mais suscetíveis à essência do Círculo da Luxúria. Ações sexuais de controle ou ataque realizadas por Nativos do Abismo (Demônios) ignoram 3 pontos da Defesa de Lust natural do Humano."
            }
        ]
    },
    "Tiefling": {
        skills: [
            {
                name: "Hellblood",
                type: "Passiva",
                desc: "Quando derrotado em combate seu sangue ferve em adrenalina, permitindo que possa agir por mais dois turnos antes de cair oficialmente. Derrotar um inimigo durante esse intervalo recarrega Hellblood, caso contrário apenas após descanso longo."
            }
        ],
        weaknesses: [
            {
                name: "Linhagem Maligna",
                desc: "O Tiefling é tentado pelo sangue de seus ancestrais e pode sair do controle em algum momento, temporariamente. Pode usar um ataque erótico em um aliado, roubar algo sem perceber, comportamento bestial, etc."
            }
        ]
    }
};
