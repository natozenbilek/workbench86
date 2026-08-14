; Reverse a string in-place using the stack
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     SI,OFFSET STR1
        XOR     CX,CX
        ; Push all chars onto stack
PUSH1:  MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DOPOP
        PUSH    AX
        INC     CX
        INC     SI
        JMP     PUSH1
        ; Pop chars back in reverse order
DOPOP:  MOV     SI,OFFSET STR1
POP1:   POP     AX
        MOV     [SI],AL
        INC     SI
        LOOP    POP1
        ; Display reversed string
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,OFFSET STR1
SHOW:   MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     SHOW
DONE:   MOV     AH,EXIT
        INT     28H
STR1    DB      "ABCDEF",00H
