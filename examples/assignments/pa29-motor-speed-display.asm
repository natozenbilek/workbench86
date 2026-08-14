; PA29 — Timer-driven motor speed display
        INCLUDE PATCALLS.INC
INT25V  EQU     0094H
        ORG     0500H
        CLI
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:INT25V,0600H
        MOV     WORD PTR DS:INT25V+2,0080H
        MOV     DS,DX
AGAIN:  MOV     AL,00H
        OUT     UMODEREG,AL
        MOV     AL,0AH
        OUT     UPORT1CTL,AL
        MOV     AL,02H
        OUT     UPORT1,AL
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AL,02H
        OUT     UPORT1,AL
CMPLTE: IN      AL,UPORT1
        TEST    AL,04H
        JZ      CMPLTE
        MOV     AL,0F7H
        OUT     UPORT1,AL
        IN      AL,UPORT2
        MOV     BL,AL
        MOV     AL,08H
        OUT     UPORT1,AL
        MOV     AL,01H
        OUT     UPORT1CTL,AL
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AL,03H
        OUT     UMODEREG,AL
        MOV     AL,BL
        OUT     UPORT2,AL
        MOV     AL,03H
        OUT     UCRREG1,AL
        MOV     AL,0FAH
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        STI
        MOV     CL,00H
CHECK:  IN      AL,UPORT1
        TEST    AL,10H
        JZ      CHECK
        INC     CL
WTHIGH: IN      AL,UPORT1
        TEST    AL,10H
        JNZ     WTHIGH
        JMP     CHECK
        ORG     0600H
        IN      AL,UIRQADR
        MOV     AL,0FAH
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        PUSHA
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,CL
        MOV     DL,04H
        MUL     DL
        MOV     AH,WRBYTE
        INT     028H
        MOV     CL,00H
        MOV     AL,20H
        OUT     40H,AL
        POPA
        JMP     AGAIN
