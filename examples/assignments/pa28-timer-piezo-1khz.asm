; PA28 — Timer-driven piezo at 1kHz
        INCLUDE PATCALLS.INC
INT25V  EQU     0094H
        ORG     0300H
        CLI
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:INT25V,0400H
        MOV     WORD PTR DS:INT25V+2,0080H
        MOV     DS,DX
        MOV     AL,02H
        OUT     UCRREG1,AL
        MOV     AL,08H
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        MOV     AL,20H
        OUT     UPORT1CTL,AL
        STI
OUTPUT: MOV     AL,00H
        OUT     UPORT1,AL
        HLT
        MOV     AL,20H
        OUT     UPORT1,AL
        HLT
        JMP     OUTPUT
        ORG     0400H
        IN      AL,UIRQADR
        MOV     AL,08H
        OUT     UTIMER1,AL
        MOV     AL,01H
        OUT     UIRQEN,AL
        MOV     AL,20H
        OUT     40H,AL
        IRET
