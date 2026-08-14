; PA21 — Hex count on PAT display
        ORG     0600H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,00H
REPEAT: PUSH    AX
        MOV     AH,WRBYTE
        INT     028H
        MOV     BX,1000
        MOV     AH,WTNMS
        INT     028H
        MOV     AH,CLRSCR
        INT     28H
        POP     AX
        INC     AL
        JMP     REPEAT
