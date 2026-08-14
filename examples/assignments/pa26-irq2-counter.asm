; PA26 — Count on Port 1, increment on IR2
        INCLUDE PATCALLS.INC
I22VCT  EQU     0088H
        ORG     0700H
        CLI
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:I22VCT,0800H
        MOV     WORD PTR DS:I22VCT+2,0080H
        MOV     DS,DX
        MOV     AL,0FFH
        OUT     UPORT1CTL,AL
        MOV     AL,00H
OUTPUT: CLI
        OUT     UPORT1,AL
        STI
        JMP     OUTPUT
