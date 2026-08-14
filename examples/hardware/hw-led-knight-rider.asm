; LED Knight Rider — bouncing pattern D0-D7-D0 on Port 2
        ORG     0100H
        INCLUDE PATCALLS.INC
        ; MUART init
        MOV     AL,0FFH
        OUT     UCRREG1,AL
        OUT     UCRREG2,AL
        OUT     UCRREG3,AL
        OUT     UMODEREG,AL
        OUT     UPORT1CTL,AL
AGAIN:  ; Shift left D0 to D7
        MOV     BL,01H
        MOV     DL,8
SLEFT:  MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DLY1:   NOP
        LOOP    DLY1
        SHL     BL,1
        DEC     DL
        JNZ     SLEFT
        ; Shift right D7 to D0
        MOV     BL,80H
        MOV     DL,8
SRIGHT: MOV     AL,BL
        OUT     UPORT2,AL
        MOV     CX,0FFFFH
DLY2:   NOP
        LOOP    DLY2
        SHR     BL,1
        DEC     DL
        JNZ     SRIGHT
        JMP     AGAIN
