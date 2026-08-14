; Count from 99 to 00 on PAT display with delay
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     BL,99
CNTLP:  PUSH    BX
        MOV     AH,CLRSCR
        INT     28H
        ; Display tens digit
        MOV     AL,BL
        XOR     AH,AH
        MOV     DL,10
        DIV     DL
        ADD     AL,30H
        MOV     AH,WRCHAR
        INT     28H
        ; Display ones digit
        POP     BX
        PUSH    BX
        MOV     AL,BL
        XOR     AH,AH
        MOV     DL,10
        DIV     DL
        MOV     AL,AH
        ADD     AL,30H
        MOV     AH,WRCHAR
        INT     28H
        ; Delay
        MOV     BX,500
        MOV     AH,WTNMS
        INT     28H
        POP     BX
        DEC     BL
        CMP     BL,0FFH
        JNZ     CNTLP
        MOV     AH,EXIT
        INT     28H
