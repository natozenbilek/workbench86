; PA02 — Add 4DH + 67H, store at DS:1000H
        ORG     0100H
        MOV     AL,4DH
        ADD     AL,67H
        MOV     BYTE PTR DS:1000H,AL
        MOV     BX,0000H
        MOV     AH,04H
        INT     028H
