; PA27 — Display "NO INT", change on IR0/IR1
        INCLUDE PATCALLS.INC
        ORG     2000H
BUFFER: DB      "NO INT",00H
        ORG     0900H
        CLI
        MOV     AH,CLRSCR
        INT     28H
        MOV     SI,BUFFER
NXTCHR: MOV     AL,[SI]
        TEST    AL,0FFH
        JZ      DONE
        MOV     AH,WRCHAR
        INT     28H
        INC     SI
        JMP     NXTCHR
DONE:   STI
HERE:   JMP     HERE
