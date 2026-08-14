; PA09 — Copy null-terminated string from MEM1 to MEM2
        ORG     0200H
MEM1    EQU     0FFFH
MEM2    EQU     1FFFH
        MOV     SI,0000H
NEXT:   INC     SI
        MOV     AL,MEM1[SI]
        MOV     BYTE PTR MEM2[SI],AL
        OR      AL,00H
        JNZ     NEXT
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
