; PA15 — Binary count on D0-D7 LEDs (Port 2)
        ORG     0500H
        INCLUDE PATCALLS.INC
        ; Init MUART — Port 2 output mode
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,00H
OUTPUT: OUT     UPORT2,AL
        MOV     CX,0FFFFH
DELY:   LOOP    DELY
        INC     AL
        JMP     OUTPUT
