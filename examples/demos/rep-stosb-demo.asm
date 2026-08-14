; REP STOSB — Fill 256 bytes at 2000H with AAH
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AX,DS
        MOV     ES,AX
        MOV     DI,2000H
        MOV     CX,0100H
        MOV     AL,0AAH
        CLD
        REP     STOSB
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,BYTE PTR DS:2000H
        MOV     AH,WRBYTE
        INT     28H
        MOV     AH,EXIT
        INT     028H
