; Blink D0-D7 LEDs on, delay, off, EXIT
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; LEDs on
        MOV     AL,0FFH
        OUT     UPORT2,AL
        ; Delay
        MOV     CX,0FFFFH
WAIT1:  NOP
        LOOP    WAIT1
        ; LEDs off
        MOV     AL,00H
        OUT     UPORT2,AL
        MOV     AH,EXIT
        INT     28H
