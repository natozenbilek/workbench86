; CALL/RET with subroutine
        ORG     0100H
        INCLUDE PATCALLS.INC
        CALL    ADD_NUMS
        MOV     AH,WRBYTE
        INT     028H
        MOV     AH,EXIT
        INT     028H
ADD_NUMS:
        MOV     AL,10H
        ADD     AL,20H
        RET
