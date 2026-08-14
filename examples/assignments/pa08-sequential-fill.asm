; PA08 — Fill 1500H-15FFH with 00H-FFH
        ORG     0500H
        MOV     BX,15FFH
        MOV     AL,0FFH
NEXT:   MOV     BYTE PTR [BX],AL
        DEC     AL
        DEC     BL
        JNZ     NEXT
        MOV     BYTE PTR [BX],AL
FINISH: MOV     BX,0000H
        MOV     AH,04H
        INT     028H
