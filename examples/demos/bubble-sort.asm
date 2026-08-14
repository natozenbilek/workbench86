; Bubble sort — ascending order
        INCLUDE PATCALLS.INC
        ORG     USRBSE
START:  XOR     BL,BL
        MOV     SI,OFFSET TABLE
        MOV     CX,SZTABLE-1
AGAIN:  MOV     AL,[SI]
        CMP     AL,[SI+1]
        JC      NOSWAP
        MOV     AH,AL
        MOV     AL,[SI+1]
        MOV     [SI],AL
        MOV     [SI+1],AH
        INC     BL
NOSWAP: INC     SI
        LOOP    AGAIN
        OR      BL,BL
        JNZ     START
        MOV     AH,EXIT
        INT     USER
TABLE   DB      1,7,3,5,2,8,4,9,0,6
SZTABLE EQU     $-TABLE
