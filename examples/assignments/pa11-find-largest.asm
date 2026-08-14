; PA11 — Find largest of 3 words
        ORG     0500H
        MOV     AX,DS:2500H
        CMP     AX,DS:2600H
        JNC     LESS1
        MOV     AX,DS:2600H
LESS1:  CMP     AX,DS:2700H
        JNC     LESS2
        MOV     AX,DS:2700H
LESS2:  MOV     DS:2800H,AX
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
