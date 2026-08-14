; PA24 — Organ: keypad keys 1..8 play a C-major scale on the piezo
;   Press 1 2 3 4 5 6 7 8  ->  C D E F G A B C (one note per key press).
;   Uses GETIN to read the keypad and the TONE / NOTOFF monitor calls.
;   (In the simulator the keys come from your PC keyboard.)
        ORG     0800H
        INCLUDE PATCALLS.INC
ORGAN:  MOV     AH,GETIN        ; read a key (0FFH = no key waiting)
        INT     28H
        CMP     AL,031H         ; '1'  -> 262 Hz (C4)
        JZ      N1
        CMP     AL,032H         ; '2'  -> 294 Hz (D4)
        JZ      N2
        CMP     AL,033H         ; '3'  -> 330 Hz (E4)
        JZ      N3
        CMP     AL,034H         ; '4'  -> 349 Hz (F4)
        JZ      N4
        CMP     AL,035H         ; '5'  -> 392 Hz (G4)
        JZ      N5
        CMP     AL,036H         ; '6'  -> 440 Hz (A4)
        JZ      N6
        CMP     AL,037H         ; '7'  -> 494 Hz (B4)
        JZ      N7
        CMP     AL,038H         ; '8'  -> 523 Hz (C5)
        JZ      N8
        JMP     ORGAN           ; any other key: ignore, keep listening
N1:     MOV     BX,0106H
        JMP     PLAY
N2:     MOV     BX,0126H
        JMP     PLAY
N3:     MOV     BX,014AH
        JMP     PLAY
N4:     MOV     BX,015DH
        JMP     PLAY
N5:     MOV     BX,0188H
        JMP     PLAY
N6:     MOV     BX,01B8H
        JMP     PLAY
N7:     MOV     BX,01EEH
        JMP     PLAY
N8:     MOV     BX,020BH
PLAY:   MOV     CX,012CH        ; (BX = note frequency in Hz) 300 ms note length
        MOV     AH,TONE         ; play the note (BX=Hz, CX=ms)
        INT     28H
        MOV     AH,NOTOFF       ; release the note
        INT     28H
        JMP     ORGAN           ; back to listening
