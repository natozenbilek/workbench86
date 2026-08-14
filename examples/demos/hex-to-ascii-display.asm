; Read byte from DS:1000H, display as two hex ASCII chars
        ORG     0100H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,BYTE PTR DS:1000H
        MOV     BL,AL
        ; High nibble
        SHR     AL,1
        SHR     AL,1
        SHR     AL,1
        SHR     AL,1
        CALL    NIB2ASC
        MOV     AH,WRCHAR
        INT     28H
        ; Low nibble
        MOV     AL,BL
        AND     AL,0FH
        CALL    NIB2ASC
        MOV     AH,WRCHAR
        INT     28H
        MOV     AH,EXIT
        INT     28H
; Subroutine: convert nibble in AL to ASCII hex char
NIB2ASC:
        CMP     AL,0AH
        JC      ISDIG
        ADD     AL,37H
        RET
ISDIG:  ADD     AL,30H
        RET
