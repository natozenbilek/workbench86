; Toggles each UPORT1 bit individually to find the piezo
; Beeps bit 0, then bit 1, ... up to bit 7
; Listen which bit makes sound!
        ORG     0100H
        INCLUDE PATCALLS.INC

        MOV     AL,0FFH
        OUT     UPORT1CTL,AL       ; all output

        MOV     BL,0                ; start with bit 0
NEXTBIT:
        ; Print which bit we are testing
        PUSH    BX
        MOV     AH,WRBYTE           ; print bit number
        INT     28H
        MOV     BL,' '
        MOV     AH,WRCHAR
        INT     28H
        POP     BX

        ; Calculate bit mask: 1 << BL
        MOV     CL,BL
        MOV     AL,1
        SHL     AL,CL
        MOV     AH,AL               ; AH = bit mask

        ; Toggle this bit 300 times (~0.5 sec beep)
        MOV     DX,300
TONE:   MOV     AL,AH
        OUT     UPORT1,AL
        MOV     CX,600
D1:     NOP
        LOOP    D1
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,600
D2:     NOP
        LOOP    D2
        DEC     DX
        JNZ     TONE

        ; Silence gap between bits
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     BX,500
        MOV     AH,WTNMS
        INT     28H

        ; Next bit
        INC     BL
        CMP     BL,8
        JB      NEXTBIT

        MOV     AH,EXIT
        INT     28H
