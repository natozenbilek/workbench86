; Zamansizdik - Manifest (Ates Atilla)
; E minor, ~100 BPM, transcribed from kolaynota.com sheet music
; DigiAC2000 piezo toggle: all UPORT1 bits
;
; PLAY: SI=half-period delay, DI=cycle count
; C4=900 D4=800 D#4=755 E4=710 F#4=635
; G4=600 A4=535 B4=475 C5=450
;
; Duration: e=eighth q=quarter h=half t=triplet
        ORG     0100H
        INCLUDE PATCALLS.INC

        MOV     AL,0FFH
        OUT     UPORT1CTL,AL

        ; ═══ VERSE 1 ═══
        ; F#(e) E(e) F#(e) G(q) F#(e) E(e) C(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,900
        MOV     DI,267
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; Verse 1, phrase 2
        ; F#(e) G(e) F#(e) E(e) B(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; 1st ending: E(e) F#(e) G(e) F#(h)
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,378
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ VERSE 2 (repeat) ═══
        ; F#(e) E(e) F#(e) G(q) F#(e) E(e) C(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,900
        MOV     DI,267
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; F#(e) G(e) F#(e) E(e) B(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; 2nd ending: A(q) B(h)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ SECTION B ═══
        ; F#(e) E(e) D#(e) E(e) F#(e) G(e) F#(q)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,755
        MOV     DI,80
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     BX,30
        MOV     AH,WTNMS
        INT     28H

        ; Section B, phrase 2: E(q) E(e) F#(e) G(e) F#(e) E(h)
        MOV     SI,710
        MOV     DI,169
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; A(q) B(h)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,80
        MOV     AH,WTNMS
        INT     28H

        ; ═══ PRE-CHORUS ═══
        ; C(q) A(e) D(e) C(q) C(q) D(q) B(q) A(e) B(h)
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,535
        MOV     DI,112
        CALL    PLAY
        MOV     SI,800
        MOV     DI,75
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,800
        MOV     DI,150
        CALL    PLAY
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     SI,535
        MOV     DI,112
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,80
        MOV     AH,WTNMS
        INT     28H

        ; A(q) A(q) A(q) B(q)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     BX,80
        MOV     AH,WTNMS
        INT     28H

        ; ═══ CHORUS ═══
        ; A(q) G(q) A(q) G(q) A(q) B(h)
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,535
        MOV     DI,224
        CALL    PLAY
        MOV     SI,475
        MOV     DI,505
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; F#(e) G(e) F#(e) E(e) D#(e) E(e) F#(e) E(e) F#(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,755
        MOV     DI,80
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,378
        CALL    PLAY
        MOV     BX,100
        MOV     AH,WTNMS
        INT     28H

        ; ═══ BRIDGE (triplets) ═══
        ; E(t) G(t) F#(t) E(t) F#(t) E(t) G(q)
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        ; G(t) F#(t) E(t) G(t) F#(t) E(t) G(t) A(t) G(q)
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,535
        MOV     DI,75
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ BRIDGE, phrase 2 (triplets) ═══
        ; G(t) F#(t) E(t) G(t) F#(t) E(t) G(t) A(t) G(q) F#(q)
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,635
        MOV     DI,63
        CALL    PLAY
        MOV     SI,710
        MOV     DI,56
        CALL    PLAY
        MOV     SI,600
        MOV     DI,67
        CALL    PLAY
        MOV     SI,535
        MOV     DI,75
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; ═══ SECTION C ═══
        ; C(q) G(e) F#(e) C(e) D(e) C(q) C(e) D(e) C(q) F#(q) E(h)
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,600
        MOV     DI,100
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,900
        MOV     DI,67
        CALL    PLAY
        MOV     SI,800
        MOV     DI,75
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,900
        MOV     DI,67
        CALL    PLAY
        MOV     SI,800
        MOV     DI,75
        CALL    PLAY
        MOV     SI,900
        MOV     DI,133
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     BX,60
        MOV     AH,WTNMS
        INT     28H

        ; ═══ SECTION D ═══
        ; B(q) C(e) B(e) B(q) C(e) B(e) D(q) A(e) F#(e) E(e) F#(q)
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     SI,450
        MOV     DI,133
        CALL    PLAY
        MOV     SI,475
        MOV     DI,126
        CALL    PLAY
        MOV     SI,475
        MOV     DI,253
        CALL    PLAY
        MOV     SI,450
        MOV     DI,133
        CALL    PLAY
        MOV     SI,475
        MOV     DI,126
        CALL    PLAY
        MOV     SI,800
        MOV     DI,150
        CALL    PLAY
        MOV     SI,535
        MOV     DI,112
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; ═══ SECTION E ═══
        ; F#(e) E(e) F#(e) F#(e) E(e) F#(e) E(e) F#(e) E(h)
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     BX,40
        MOV     AH,WTNMS
        INT     28H

        ; ═══ OUTRO ═══
        ; F#(q) G(q) G(q) F#(e) E(e) E(h) C(h)
        MOV     SI,635
        MOV     DI,189
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,600
        MOV     DI,200
        CALL    PLAY
        MOV     SI,635
        MOV     DI,95
        CALL    PLAY
        MOV     SI,710
        MOV     DI,85
        CALL    PLAY
        MOV     SI,710
        MOV     DI,338
        CALL    PLAY
        MOV     SI,900
        MOV     DI,267
        CALL    PLAY

        ; === END ===
        MOV     AL,00H
        OUT     UPORT1,AL
        MOV     AH,EXIT
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
