; PA20 — Add AX+BX+CX+DX, save at 1000H, restore regs
        ORG     0200H
        INCLUDE PATCALLS.INC
        PUSHF
        PUSHA
        ADD     AX,BX
        ADD     AX,CX
        ADD     AX,DX
        MOV     DS:1000H,AX
        POPA
        POPF
        MOV     AH,EXIT
        INT     28H
