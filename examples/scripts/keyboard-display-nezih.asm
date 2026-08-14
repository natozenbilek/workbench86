; Keyboard Display: show "NEZIH"
; Writes straight into the DigiAC2000 keyboard display
; KYDBUF (0000:047D) = display buffer (system segment)
; 7-seg encoding: a=b0 b=b1 c=b2 d=b3 e=b4 f=b5 g=b6
;   n=54H  E=79H  Z=5BH  I=06H  H=76H
        ORG     0100H
        INCLUDE PATCALLS.INC

        ; point DS at the system segment (0000)
        PUSH    DS
        MOV     AX,0000H
        MOV     DS,AX

        ; write 7-seg data into the keyboard display buffer
        ; 8 digits: blanks on the left, NEZIH on the right
        MOV     BYTE PTR DS:047DH,00H
        MOV     BYTE PTR DS:047EH,00H
        MOV     BYTE PTR DS:047FH,00H
        MOV     BYTE PTR DS:0480H,54H
        MOV     BYTE PTR DS:0481H,79H
        MOV     BYTE PTR DS:0482H,5BH
        MOV     BYTE PTR DS:0483H,06H
        MOV     BYTE PTR DS:0484H,76H

        POP     DS

        ; spin forever so the display stays lit
STAY:   JMP     STAY
