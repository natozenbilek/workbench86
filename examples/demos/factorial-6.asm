; Calculate 6! = 720 (02D0H), store at DS:2000H
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     CX,6
        MOV     AX,1
MLOOP:  MUL     CX
        LOOP    MLOOP
        MOV     DS:2000H,AX
        MOV     AH,EXIT
        INT     28H
