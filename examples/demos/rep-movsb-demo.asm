; REP MOVSB — Copy string from SRC to DST
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AX,DS
        MOV     ES,AX
        MOV     SI,OFFSET SRC
        MOV     DI,OFFSET DST
        MOV     CX,6
        CLD
        REP     MOVSB
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,OFFSET DST
SHOW:   MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     SHOW
DONE:   MOV     AH,EXIT
        INT     028H
SRC     DB      "HELLO",00H
DST     DB      00H,00H,00H,00H,00H,00H
