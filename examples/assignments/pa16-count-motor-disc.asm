; PA16 — Count on Port 2, paused by motor disc
        ORG     0600H
        INCLUDE PATCALLS.INC
        MOV     AL,00H
        OUT     UPORT1CTL,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,00H
        OUT     UPORT2,AL
CHECK:  IN      AL,UPORT1
        TEST    AL,10H
        JNZ     CHECK
COUNT:  IN      AL,UPORT2
        INC     AL
        OUT     UPORT2,AL
        MOV     BX,05H
        MOV     CX,0FFFFH
DELY:   LOOP    DELY
        DEC     BX
        JNZ     DELY
        JMP     CHECK
