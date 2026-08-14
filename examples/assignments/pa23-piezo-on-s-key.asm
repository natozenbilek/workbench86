; PA23 — Sound piezo when S key pressed
        ORG     0800H
        INCLUDE PATCALLS.INC
CHECK:  MOV     AH,GETIN
        INT     28H
        CMP     AL,0FFH
        JZ      CHECK
        CMP     AL,053H
        JNZ     CHECK
        MOV     AL,20H
        OUT     UPORT1CTL,AL
ALARM:  MOV     BL,64H
OUTPUT: MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AH,WT1MS
        INT     028H
        MOV     AL,20H
        OUT     UPORT1,AL
        MOV     AH,WT1MS
        INT     028H
        DEC     BL
        JNZ     OUTPUT
        JMP     CHECK
