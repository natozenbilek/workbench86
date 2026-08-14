; PA22 — Display "XX + YY = ZZ" on PAT display
        ORG     0700H
        INCLUDE PATCALLS.INC
        MOV     AH,CLRSCR
        INT     28H
        MOV     AL,BYTE PTR DS:2000H
        MOV     AH,WRBYTE
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,'+'
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,BYTE PTR DS:2100H
        MOV     AH,WRBYTE
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,'='
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,' '
        MOV     AH,WRCHAR
        INT     028H
        MOV     AL,BYTE PTR DS:2000H
        ADD     AL,BYTE PTR DS:2100H
        MOV     AH,WRBYTE
        INT     028H
        MOV     AH,EXIT
        INT     028H
