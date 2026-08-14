; Calculate first 10 Fibonacci numbers, store at DS:3000H
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     SI,3000H
        MOV     CX,10
        MOV     AL,00H
        MOV     BL,01H
        MOV     [SI],AL
        INC     SI
        DEC     CX
        MOV     [SI],BL
        INC     SI
        DEC     CX
NXTFIB: MOV     DL,AL
        ADD     DL,BL
        MOV     [SI],DL
        MOV     AL,BL
        MOV     BL,DL
        INC     SI
        LOOP    NXTFIB
        MOV     AH,EXIT
        INT     28H
