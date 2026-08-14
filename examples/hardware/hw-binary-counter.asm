; Binary counter 0-FF on D0-D7 LEDs
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        MOV     BL,00H
COUNT:  MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DELAY:  NOP
        LOOP    DELAY
        INC     BL
        JMP     COUNT
