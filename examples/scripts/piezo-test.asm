; Piezo buzzer test — continuous beep on physical DigiAC2000
; Tests UPORT1 bit 5 toggle (piezo pin)
; If no sound, try changing the bit (0-7)
        ORG     0100H
        INCLUDE PATCALLS.INC

        ; Set Port 1 direction: all output
        MOV     AL,0FFH
        OUT     UPORT1CTL,AL

        ; Print "BEEP" on serial to confirm running
        MOV     BL,'B'
        MOV     AH,WRCHAR
        INT     28H
        MOV     BL,'E'
        MOV     AH,WRCHAR
        INT     28H
        MOV     BL,'E'
        MOV     AH,WRCHAR
        INT     28H
        MOV     BL,'P'
        MOV     AH,WRCHAR
        INT     28H

        ; Toggle ALL bits of UPORT1 — one of them is the piezo
        MOV     DX,500          ; 500 full cycles (~1 second)
BEEP:   MOV     AL,0FFH         ; all bits high
        OUT     UPORT1,AL
        MOV     CX,600          ; half-period delay
W1:     NOP
        LOOP    W1
        MOV     AL,00H          ; all bits low
        OUT     UPORT1,AL
        MOV     CX,600          ; half-period delay
W2:     NOP
        LOOP    W2
        DEC     DX
        JNZ     BEEP

        ; Done
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AH,EXIT
        INT     28H
