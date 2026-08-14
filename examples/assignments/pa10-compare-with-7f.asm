; PA10 — Compare DS:2300H with 7FH
        ORG     0400H
        MOV     AL,BYTE PTR DS:2300H
        CMP     AL,7FH
        JZ      EQUAL
        JC      LESS
GREAT:  MOV     DS:2400H,0FEH
        JMP     FINISH
LESS:   MOV     DS:2400H,01H
        JMP     FINISH
EQUAL:  MOV     DS:2400H,0AAH
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
