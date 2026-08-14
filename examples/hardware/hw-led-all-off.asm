; Turn off all D0-D7 LEDs
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        MOV     AL,00H
        OUT     UPORT2,AL
        MOV     AH,EXIT
        INT     28H
