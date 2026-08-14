; PA13 — Rotate DS:1400H right until bit 12 clear
        ORG     0400H
        MOV     WORD PTR DS:1400H,0F800H
CHECK:  ROR     WORD PTR DS:1400H,1
        MOV     AX,DS:1400H
        XOR     AX,0FFFFH
        TEST    AX,1000H
        JZ      CHECK
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
