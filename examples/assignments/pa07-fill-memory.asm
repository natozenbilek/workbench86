; PA07 — Fill 1400H-14FFH with 77H
        ORG     0400H
        MOV     BX,14FFH
NEXT:   MOV     BYTE PTR [BX],77H
        DEC     BL
        JNZ     NEXT
        MOV     BYTE PTR [BX],77H
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
