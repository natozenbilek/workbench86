; PA14 — Add bytes at 1000H and 1100H, output to Port 1
        ORG     0300H
        INCLUDE PATCALLS.INC
        MOV     AL,0FFH
        OUT     UPORT1CTL,AL
        MOV     AL,BYTE PTR DS:1000H
        ADD     AL,BYTE PTR DS:1100H
        OUT     UPORT1,AL
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
