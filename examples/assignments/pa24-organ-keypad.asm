; PA24 Organ: keypad keys 1..8 play a C major scale on the piezo
;   Press 1 2 3 4 5 6 7 8 to hear C D E F G A B C (one note per key press).
;   Key 0 or ESC ends the program. Any other key is ignored.
;   Keys are read with GETIN.
;
; In the simulator the keys come from your PC keyboard, which does not pass
; ESC on, so use 0 there. Choose Max speed: one note is about 233,000
; instructions, and the program reads no key until the note ends. The
; simulator sounds the same fixed tone for every key, so judge the pitch on
; the board.
;
; The PAT monitor has no TONE call; the piezo is driven directly, as in the
; manifest songs: all UPORT1 bits are toggled high and low with software
; delay loops (UPORT1CTL=0FFH makes the port an output).
;
; PLAY: SI=half-period delay, DI=cycle count (same routine as the songs)
; C4=900 D4=800 E4=710 F4=675 G4=600 A4=535 B4=475 C5=450
;   F4 is not in the song table: 900 x 262 / 349 = 675.6, and the table
;   uses steps of 5, so 675.
; Note length: DI x SI is kept near 58500 (65 cycles of C4), so every note
;   lasts about the same time, roughly a quarter second if C4 is 262 Hz.
        ORG     0800H
        INCLUDE PATCALLS.INC

        MOV     AL,0FFH         ; port 1: all bits output
        OUT     UPORT1CTL,AL
        MOV     AL,00H          ; piezo line low
        OUT     UPORT1,AL

ORGAN:  MOV     AH,GETIN        ; read a key (0FFH = no key waiting)
        INT     28H
        CMP     AL,030H         ; '0'  -> stop
        JZ      DONE
        CMP     AL,01BH         ; ESC  -> stop
        JZ      DONE
        CMP     AL,031H         ; '1'  -> C4
        JZ      N1
        CMP     AL,032H         ; '2'  -> D4
        JZ      N2
        CMP     AL,033H         ; '3'  -> E4
        JZ      N3
        CMP     AL,034H         ; '4'  -> F4
        JZ      N4
        CMP     AL,035H         ; '5'  -> G4
        JZ      N5
        CMP     AL,036H         ; '6'  -> A4
        JZ      N6
        CMP     AL,037H         ; '7'  -> B4
        JZ      N7
        CMP     AL,038H         ; '8'  -> C5
        JZ      N8
        JMP     ORGAN           ; any other key: ignore, keep listening

N1:     MOV     SI,900          ; C4
        MOV     DI,65
        JMP     SOUND
N2:     MOV     SI,800          ; D4
        MOV     DI,73
        JMP     SOUND
N3:     MOV     SI,710          ; E4
        MOV     DI,82
        JMP     SOUND
N4:     MOV     SI,675          ; F4
        MOV     DI,87
        JMP     SOUND
N5:     MOV     SI,600          ; G4
        MOV     DI,98
        JMP     SOUND
N6:     MOV     SI,535          ; A4
        MOV     DI,109
        JMP     SOUND
N7:     MOV     SI,475          ; B4
        MOV     DI,123
        JMP     SOUND
N8:     MOV     SI,450          ; C5
        MOV     DI,130
SOUND:  CALL    PLAY            ; play the note, then listen again
        JMP     ORGAN

DONE:   MOV     AL,00H          ; piezo line low
        OUT     UPORT1,AL
        MOV     AH,EXIT         ; back to the PAT monitor
        INT     28H

; ---- PLAY subroutine ----
; SI = half-period delay (loop count, controls frequency)
; DI = number of full cycles (controls duration)
PLAY:   MOV     AL,0FFH
        OUT     UPORT1,AL
        MOV     CX,SI
PL1:    NOP
        LOOP    PL1
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     CX,SI
PL2:    NOP
        LOOP    PL2
        DEC     DI
        JNZ     PLAY
        RET
