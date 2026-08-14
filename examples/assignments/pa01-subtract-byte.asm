; PA01 — Subtract DS:1000H from 80H, store at DS:2000H
        ORG     0300H
        MOV     AL,80H
        SUB     AL,BYTE PTR DS:1000H
        MOV     BYTE PTR DS:2000H,AL
        MOV     BX,0000H
        MOV     AH,04H
        INT     028H
