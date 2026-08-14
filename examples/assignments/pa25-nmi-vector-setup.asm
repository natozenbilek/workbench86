; PA25 — Set NMI vector to F000:6000H
NMIVCT  EQU     0008H
        ORG     0300H
        MOV     DX,DS
        MOV     AX,0000H
        MOV     DS,AX
        MOV     WORD PTR DS:NMIVCT,6000H
        MOV     WORD PTR DS:NMIVCT+2,0F000H
        MOV     DS,DX
HERE:   JMP     HERE
