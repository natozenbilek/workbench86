; LED Dice — random-ish dice pattern on Port 2
; Rolls through patterns rapidly, press RESET to stop
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
        ; Dice face patterns (LED bits):
        ; 1=08H  2=24H  3=2CH  4=66H  5=6EH  6=77H
ROLL:   MOV     SI,OFFSET FACES
        MOV     DL,6
NXTFC:  MOV     AL,[SI]
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DLY1:   NOP
        LOOP    DLY1
        INC     SI
        DEC     DL
        JNZ     NXTFC
        JMP     ROLL
FACES   DB      08H,24H,2CH,66H,6EH,77H
