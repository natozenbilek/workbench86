; PA05 — (E7H * C3H) / B9H
        ORG     0300H
        MOV     AX,0E7H
        MOV     BX,0C3H
        MOV     CX,0B9H
        MUL     BX
        DIV     CX
        MOV     DS:3000H,AX
        MOV     DS:3002H,DX
        MOV     BX,0000H
        MOV     AH,04H
        INT     028H
