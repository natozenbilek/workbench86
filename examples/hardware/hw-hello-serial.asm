; Write "Hello PAT!" to serial port
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,OFFSET MSG
PRINT:  MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     PRINT
DONE:   MOV     AH,EXIT
        INT     28H
MSG     DB      "Hello PAT!",00H
