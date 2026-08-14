; Piezo buzzer short beep
; PZO = Port 1 bit 5 (20H)
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; Port 1 bit 5 output (piezo)
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        MOV     AL,20H
        OUT     UPORT1CTL,AL
        MOV     DX,500
BEEP:   MOV     AL,20H
        OUT     UPORT1,AL
        MOV     CX,200
D1:     NOP
        LOOP    D1
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,200
D2:     NOP
        LOOP    D2
        DEC     DX
        JNZ     BEEP
        MOV     AH,EXIT
        INT     28H
