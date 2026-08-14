; PA04 — Add bytes at 4000H..4003H, store at 4004H
        ORG     0200H
        MOV     SI,4000H
        MOV     AL,[SI]
        ADD     AL,[SI+1]
        ADD     AL,[SI+2]
        ADD     AL,[SI+3]
        MOV     [SI+4],AL
        MOV     BX,0000H
        MOV     AH,04H
        INT     28H
