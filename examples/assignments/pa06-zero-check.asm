; PA06 — If DS:1200H is zero, store 33H; else 55H
        ORG     0200H
        MOV     AX,DS:1200H
        OR      AX,0000H
        JZ      EQUALZ
NOTZ:   MOV     DS:2100H,55H
        JMP     FINISH
EQUALZ: MOV     DS:2100H,33H
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
