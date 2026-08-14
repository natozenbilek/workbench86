; Display Test — 7-segment display demo
; Writes text and counts on the PAT Display
        ORG     0100H
        INCLUDE PATCALLS.INC

        ; Clear display
        MOV     AH,CLRSCR
        INT     28H

        ; Write "HELLO" character by character
        MOV     AL,'H'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'E'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'L'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'L'
        MOV     AH,WRCHAR
        INT     28H
        MOV     AL,'0'
        MOV     AH,WRCHAR
        INT     28H

        ; Wait 2 seconds
        MOV     BX,2000
        MOV     AH,WTNMS
        INT     28H

        ; Now count 00..FF on display
        MOV     AH,CLRSCR
        INT     28H
        MOV     CL,00H
COUNT:  MOV     AL,CL
        MOV     AH,WRBYTE
        INT     28H
        MOV     BX,500
        MOV     AH,WTNMS
        INT     28H
        MOV     AH,CLRSCR
        INT     28H
        INC     CL
        JNZ     COUNT

        MOV     AH,EXIT
        INT     28H
