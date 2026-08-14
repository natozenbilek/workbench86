; PA03 — Copy AX,BX,CX,DX to memory
        ORG     0100H
        MOV     SI,3000H
        MOV     [SI],AX
        MOV     [SI+2],BX
        MOV     [SI+4],CX
        MOV     [SI+6],DX
        MOV     BX,0000H
        MOV     AH,04H
        INT     28H
