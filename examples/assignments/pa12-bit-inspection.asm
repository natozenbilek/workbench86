; PA12 — Check if any of bits 0-3 at DS:1200H are clear
        ORG     0300H
        MOV     AL,BYTE PTR DS:1200H
        AND     AL,0FH
        XOR     AL,0FH
        TEST    AL,0FH
        JNZ     TRUE
FALSE:  MOV     BYTE PTR DS:1300H,077H
        JMP     FINISH
TRUE:   MOV     BYTE PTR DS:1300H,0F0H
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
