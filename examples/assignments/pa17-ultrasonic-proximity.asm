; PA17 — Ultrasonic proximity detector with piezo
        ORG     0300H
        INCLUDE PATCALLS.INC
        MOV     AL,60H
        OUT     UPORT1CTL,AL
UTSON:  MOV     AL,40H
        OUT     UPORT1,AL
DETECT: IN      AL,UPORT1
        TEST    AL,80H
        JNZ     DETECT
ALARM:  MOV     BL,64H
OUTPUT: MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,0FAH
DELY1:  LOOP    DELY1
        MOV     AL,20H
        OUT     UPORT1,AL
        MOV     CX,0FAH
DELY2:  LOOP    DELY2
        DEC     BL
        JNZ     OUTPUT
        JMP     UTSON
