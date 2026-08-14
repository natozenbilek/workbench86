; Turn on all D0-D7 LEDs (press RESET to stop)
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; Light D0-D7 (Port 2)
        MOV     AL,0FFH
        OUT     UPORT2,AL
HERE:   JMP     HERE
