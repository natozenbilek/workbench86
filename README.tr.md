# workbench86

English: [README.md](README.md)

workbench86, DIGIAC 2000 laboratuvar eğitim setinin tarayıcıdaki tezgâhı. 8086 real mode assembly kodunu burada yazar, programı debugger'ı geriye doğru da adım atabilen bir simülatörde çalıştırır, eğitim setinin I/O portlarının nasıl tepki verdiğini izler, assemble edilmiş byte'ları da WebSerial üzerinden fiziksel karta yüklersiniz.

Canlı demo: <https://natozenbilek.github.io/workbench86/>. Adım adım anlatım: <https://natozenbilek.github.io/workbench86/howto/?lang=tr>.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/overview-dark.png">
  <img src="docs/screenshots/overview.png" alt="workbench86'nın ana penceresi, açık tema. Soldaki Explorer'da demos klasörü açık, fibonacci.asm seçili. Ortadaki editörde, 52 adımdan sonra sırada bekleyen komut olan 14. satır (NXTFIB) işaretli. Sağdaki debug panelinde az önce dallanan LOOP komutu ve 3'ten 2'ye inen CX var, altında da general purpose, segment ve control register'lar görünüyor.">
</picture>

workbench86 ilk açıldığında koyu temadadır. Üst çubuktaki tema düğmesinde o anki temanın adı yazar (Dark ya da Light); düğmeye basınca öbür temaya geçilir ve seçim hatırlanır. GitHub da kendi temanıza uyan ekran görüntüsünü gösterir.

Bu README v18 build'ini anlatıyor. Değişiklikler [CHANGELOG.md](CHANGELOG.md) dosyasında, açık sorunlar da [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) dosyasında listeleniyor.

## Neden var

Hedef donanım, LJ Technical Systems'in DIGIAC 2000 Microprocessor Training System eğitim seti, daha doğrusu setin 80286 CPU kartı. Laboratuvarda bu karta "PAT" deniyor; bu, üreticinin verdiği bir ürün adı değil, Hacettepe Üniversitesi'nde kullanılan yerel bir ad. Kart, Hacettepe Üniversitesi Bilgisayar Mühendisliği'nde BBM436 Mikroişlemciler Laboratuvarı dersinde ve İstanbul Teknik Üniversitesi'nde kullanılıyor.

Set modüler. Kasada CPU kartı ile keypad ve display modülü durur; çevre birimleri (peripheral) ise Applications Module'dedir: LED'ler, optik disk encoder'ı olan bir DC motor, bir potansiyometre, ADC ve DAC, ultrasonik verici ve alıcı, optik bağlantı (optical link) ve bir piezo buzzer.

Bu karta program, kartla birlikte gelen komut satırı assembler'ı Merlin ile yazılır. Programı yazar, assemble eder ve byte'ları kartın ROM monitörü aracılığıyla belleğe yerleştirirsiniz; `PATCALLS.INC` ve INT 28H çağrı kümesi de bu monitörden gelir. Merlin'in vermediği şey, makinenin içini görmek: program çalışırken register ya da bellek göstergesi yok, bir şeyi kaçırdığınızda bir komut geri gitmenin yolu yok ve önünüzde fiziksel bir kart yokken hiçbir şeyi deneyemezsiniz. Pratikte bu, lab saatini beklemek demek.

workbench86 bu iş akışını değiştirmiyor, etrafına tam bir IDE kuruyor. Ne kartın ne de Merlin'in kurallarının yerini alıyor: `INCLUDE PATCALLS.INC` ile yazılmış bir program burada da olduğu gibi assemble olur, yani mevcut ders materyali değişmeden kullanılabilir. Simülatörün çalıştırdığı byte dizisi, yüklemenin karta gönderdiğiyle aynıdır; bu yüzden program, donanıma gitmeden önce simülatörde doğru hale getirilir.

workbench86 tek sayfalık bir uygulama. Build adımı, backend, kütüphane ya da framework yok. 32 dosyada yaklaşık 6,6 kLOC JavaScript ve 7 dosyada 1,6 kLOC CSS var, hepsi vanilla. How to use sayfası bunlara bir script ve bir stil dosyası (ikisi birlikte yaklaşık 0,8 kLOC), test düzeneği de üç script (0,3 kLOC) ekliyor. Herhangi bir statik sunucudan çalışır; büyük kısmı `file://` üzerinden de çalışır. Başka bir sunucuya giden tek istek, Google Fonts'tan alınan üç web fontu içindir; çevrimdışıyken sayfa Consolas ve Segoe UI gibi sistem fontlarına geçer. How to use sayfasının fontları ise kendi klasöründe, sayfayla birlikte gelir.

## Hızlı başlangıç

Depoyu klonlayıp `index.html` dosyasını açın:

```bash
git clone https://github.com/natozenbilek/workbench86.git
cd workbench86
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Editör, assembler, simülatör ve debugger bu şekilde çalışır. Çalışmayan iki şey var. Örnek programlar `fetch` ile yüklenir ve tarayıcı bunu `file://` üzerinden engeller, bu yüzden Explorer'daki dört örnek klasörü boş kalır; `languages` altındaki yerleşik örnekler yine de açılır. WebSerial ise secure context ister. İkisi için de dizini HTTP üzerinden sunun:

```bash
python3 -m http.server 8000
```

Sonra <http://localhost:8000> adresini açın.

İlk programınız:

1. Explorer'da `demos` klasörünü açıp `fibonacci.asm` dosyasına tıklayın. Örnek açılınca assemble edilip simülatöre yüklenir. Değişiklik yaptıktan sonra `Ctrl+Enter` ile yeniden assemble edersiniz.
2. `Step` düğmesine birkaç kez basın. Debug panelinin en üstündeki Current instruction kartı, mnemonic'i, komutun ne yaptığını ve değişen register'ları gösterir.
3. Bir adımı geri almak için `← Back`, yeniden yapmak için `Fwd →` düğmesine basın. Register'lar, bellek, portlar ve çevre birimlerinin durumu birlikte geri sarılır.
4. Serbest çalıştırmak için `Run` (varsayılan 20 Hz), durdurmak için `Pause` düğmesine basın. Run ile çalışan kısım kaydedilmez; bu yüzden Run'dan sonra `← Back`, son Step'inizden önceki duruma döner.

## How to use sayfası

![How to use sayfasının ilk kartı. Sayfanın üst çubuğunda workbench86'ya dönüş bağlantısı, 1 / 57 kart sayacı, README ve Hardware guide bağlantıları, Present düğmesi, TR ile EN arasında dil seçimi ve tema düğmesi var. Kartta başlık, 'An 8086 simulator in the browser, with upload to the DIGIAC 2000 board' satırı, v18 sürümü ve uygulamanın bir ekran görüntüsü duruyor.](docs/screenshots/howto.png)

Adım adım bir anlatım [howto/](https://natozenbilek.github.io/workbench86/howto/) sayfasında; uygulamanın üst çubuğundaki How to use bağlantısı bu sayfayı açar. Pencere 1024 px ya da daha darsa bu bağlantı üst çubuktaki ⋮ menüsünün ilk maddesi olur. Sayfada hem Türkçesi hem İngilizcesi olan 57 kart var: seri iletişimin temelleri (RS-232, TX ve RX, 9600 8N2), simülatörde çalışma, karta yükleme (PAT RESET, yeni bir `PAT:`, 0080 segmentiyle `C` ve `G`), kart modu ve hata kodları.

Dil, tarayıcının diline göre seçilir; adrese `?lang=tr` ya da `?lang=en` eklenirse o dil açılır. TR | EN düğmesindeki seçim de hatırlanır. Sayfa uygulamanın temasıyla açılır. Kartlar arasında ok tuşları, Space, Page Up, Page Down, Home ve End ile gezilir; Present (ya da `F`) kartları tam ekranda tek tek gösterir, `Esc` ile çıkılır. Konuşmacı notları yalnızca Türkçedir ve adreste `?notes` varsa görünür. Ekran görüntülerinde kartın verdiği cevaplar PAT monitörünün bir modelinden alındı; gerçek bir kartta biraz farklı görünebilir.

## Özellikler

### Explorer ve dosyalar

Explorer'ın üstünde New, Open ve Download düğmeleri var. Klasörler sırasıyla My files, assignments, demos, hardware, scripts ve languages. `languages` klasöründe sekiz yerleşik örnek var: `c/led_blink.c`, `python/counter.py`, `go/chase.go`, `java/blink.java`, `cpp/counter.cpp` ve `asm/` altında `led_blink.asm`, `knight_rider.asm` ile `fibonacci.asm`. Translate to ASM ilk dosyayı yazdığında `generated` adında bir klasör belirir.

New bir isim sorar ve My files içinde bir `.asm` dosyası oluşturur. Open, bilgisayarınızdan `.asm`, `.inc`, `.c`, `.cpp`, `.py`, `.java`, `.go` ve `.txt` dosyalarını alıp My files'a koyar. Download, `Ctrl+S` ya da `Cmd+S` açık dosyayı kendi adıyla kaydeder; Windows'ta satır sonları CRLF olur.

Örnek programlar ve `languages` örnekleri yeniden adlandırılamaz, silinemez. Birini kendi sekmesinde düzenleyebilirsiniz ama değişiklikler o sekmede kalır; Make an editable copy, My files'a `my-<dosya adı>` adında bir kopya koyar. Fareyle bir satırın üzerine gelince düğmeler çıkar: kendi dosyalarınızda Rename ve Delete, örneklerde Make an editable copy, ikisinde de Download. Bir dosyaya, ağacın boş bir yerine ya da bir sekmeye sağ tıklayınca bağlam menüsü açılır. Sekme menüsünde Close, Close Others, Close All, Copy Path, Download ve Duplicate ya da Make an editable copy bulunur. Sekmedeki nokta, dosyanın açıldığından ya da indirildiğinden beri değiştiğini gösterir; düzenlenmiş bir örneği kapatırken sayfa onay ister.

My files yalnızca sayfanın belleğinde durur. Sayfayı yenilerseniz açık sekmelerle birlikte silinir ve sayfa sizi uyarmaz (sayfadan çıkarken yalnızca kartla ilgili bir iş sürüyorsa onay ister). Saklamak istediğinizi indirin. Sayfanın hatırladığı tek şey tema ve panel genişlikleri.

### Editör

Editör çok sekmeli; metnin üstündeki breadcrumb klasörü ve dosyayı gösterir. Hiç sekme açık değilken bir karşılama ekranı New file, Open a file from this computer ve Start with assignment PA01 seçeneklerini sunar. Syntax highlighting assembly'yi ve transpiler'ın okuduğu beş dili kapsar. Bir mnemonic'in ya da register'ın üzerine gelince ne işe yaradığı görünür; bir label'ın ya da başka bir ismin üzerine gelince diğer kullanımları vurgulanır.

Ghost completion `.asm` sekmelerinde çalışır. Satırın başında mnemonic ve directive önerir; operand alanında register'ları, label'ları, `EQU` isimlerini ve `PATCALLS.INC` sembollerini önerir. `Tab` öneriyi kabul eder, öneri yoksa 8 boşluk ekler.

Bul ve değiştir, editördeyken `Ctrl+F` ile açılır. Düz metin arar, düzenli ifade (regex) kabul etmez. Büyük-küçük harf düğmesi açık değilse harf farkına bakmaz. Replace ve Replace All düğmeleri de var. `Enter` sonraki, `Shift+Enter` önceki eşleşmeye gider. `Ctrl+Shift+P` ile açılan command palette, 19 komut arasında bulanık eşleşmeyle (fuzzy match) arar: assemble, run, step, geri ve ileri adım, reset, tema, Ports, Export/Import, ISA rehberi, Connect Device, Upload Program, dosya işlemleri, sekme kapatma ve bütün panelleri katlayıp açma.

Geri alma (undo) geçmişi tarayıcının değil, editörün kendisinin. 200 durum tutar; `Ctrl+Z` ile `Ctrl+Y` yalnızca editörde çalışır ve sekme değiştirince geçmiş sıfırlanır.

Assembler hata bulduğunda mesajlar editörün üstündeki bir şeritte ve durum çubuğunda görünür, hatalı satırların numarası kırmızıyla işaretlenir, editör de ilk hataya kayar. `F1` ISA referans rehberini açar; rehberde Overview, Registers, Instructions, Addressing ve I/O & Peripherals sekmeleri var.

### Debug paneli

<img src="docs/screenshots/debugger.png" width="420" alt="fibonacci.asm 52 adım çalıştıktan sonra workbench86'nın debug paneli. Çalıştırma düğmelerinin altında kartlar kaydırılabilen tek bir sütunda dizili: current instruction, general purpose, segment ve control register'lar, flag satırı, PAT Display, 0080:FFF0'daki stack ve 0080:3000'deki Memory kartı. Memory kartında ilk Fibonacci sayıları 00 01 01 02 03 05 08 0D yazılı. En altta Execution Trace, Watch ve I/O Log kapalı duruyor.">

Sağdaki panel, katlanabilir kartlardan oluşan bir sütun.

| Kart | İçerik |
|---|---|
| Current instruction | Mnemonic, komutun etkisinin sade bir anlatımı ve son Step'in AX, BX, CX, DX, SP, IP ve FLAGS'te yaptığı değişiklik. Bu kart katlanamaz |
| General purpose registers | High ve low byte'larıyla AX, BX, CX ve DX, ardından SI, DI, SP ve BP. Değişen register yanıp söner |
| Segment registers | CS, DS, SS, ES |
| Control | IP, hex olarak FLAGS ve CS:IP'nin 20 bitlik fiziksel adresi |
| Flags | OF, DF, IF, TF, SF, ZF, AF, PF, CF; set olanlar yanar |
| PAT Display | INT 28H metin çıktısının son 8 karakteri, 7 segment display olarak çizilir |
| Stack | SS:SP'den yukarı doğru 16 word, SP'deki word işaretli |
| Memory | Hex ve ASCII olarak 64 byte, satır başına 8 byte. `seg:off` ya da 0080 segmentinde bir offset yazıp View'e veya `Enter`'a basın; varsayılan adres 0080:0100. IP ve SP düğmeleri görünümü CS:IP'ye ya da SS:SP'ye bağlar. Değişen byte'lar vurgulanır |
| Execution Trace | Step ile çalışan komutlar ve register farkları. 500 kayıt tutar, son 80'ini gösterir |
| Watch | En fazla 16 ifade: bir register adı, `0080:1000` gibi hex bir `seg:off`, DS içinde `1000` ya da `[1000]` gibi hex bir offset, `[SI]` gibi köşeli parantez içinde bir register ya da bir label (adresi ve CS:label'daki byte gösterilir) |
| I/O Log | Son 30 IN ve OUT işlemi, üstünde son 60 işlemin zaman şeridi |

Kartların üstündeki Cycle ve Instr sayaçlarının ikisi de çalışan komutları sayar; Cycle, 8086 saat çevrimlerini saymaz. Execution Trace, Watch ve I/O Log başta kapalıdır. Bir kartı kapatıp açmak için başlığına tıklayın.

### Çalıştırma düğmeleri

Assemble için `Ctrl+Enter`'a ya da düğmeye basın. `.c`, `.cpp`, `.py`, `.java` veya `.go` sekmesinde aynı düğmenin üstünde Translate to ASM yazar (bkz. [Transpiler](#transpiler)). Bir örnek açıldığında ya da sekmesine geri dönüldüğünde assemble edilir ve simülatör sıfırlanır. Kendi dosyalarınız ve `languages` örnekleri Assemble'a basmanızı bekler.

Step tek komut çalıştırır. `REP` ön ekli bir string komutu tek Step'te sonuna kadar çalışır. `← Back` son Step'i geri alır, `Fwd →` ise Back ile geri alınan adımı yeniden yapar; bu yüzden Fwd ancak Back'ten sonra kullanılabilir. Back düğmesindeki sayı (örneğin `← Back (52)`) kaç adım geri gidilebileceğini gösterir.

Run serbest çalışmayı başlatır, Pause durdurur. Hız 5, 20, 100 ya da 500 Hz olabilir; Max ise komutları 500'lük gruplar halinde çalıştırır. Varsayılan 20 Hz. Run geçmiş kaydetmez; bkz. [Simülatör nasıl çalışıyor](#simülatör-nasıl-çalışıyor). MUART timer'ını ya da `WTNMS`'yi kullanan bir program Max'ten düşük bir hızda çalışırken durum çubuğunda `Tip: use Max speed (this program uses the MUART timer)` (ya da `WTNMS`) yazar, çünkü ikisi de çalışan komut sayısına göre ilerler ve düşük hızlarda dakikalar sürer.

Reset editördeki metni yeniden assemble eder; klavye kuyruğunu, timer'ı ve bekleyen interrupt'ları temizler, piezoyu susturur. Bir snapshot'a geri dönmez.

Bir satır numarasına tıklayınca o satıra breakpoint konur ya da kaldırılır. Breakpoint, Step'i değil Run'ı durdurur; durma o satırdaki komut çalışmadan önce olur ve durum çubuğunda `Breakpoint: line n` yazar.

Üst çubuktaki durum etiketi READY, RUNNING, HALTED ya da ERROR gösterir. `INT 28H` EXIT ve `HLT` programı durdurur. Tek istisna: IF set ve timer 1 açıkken, timer 100 sayım içinde sıfıra inecekse `HLT` timer interrupt'ını bekler. Sıfıra bölme, sığmayan bir bölüm ya da bilinmeyen bir opcode programı ERROR ile durdurur; simülatör INT 0'a gitmez. Durum çubuğu son mesajı gösterir; mesaj kesilmişse tamamını okumak için üzerine gelin.

### Dışa ve içe aktarma

Export penceresi programı, 0080 segmentindeki simülatör belleğinin `addr: bb bb ...` biçiminde bir dökümü olarak gösterir: satırda 8 byte, tamamı sıfır olan satırlar atlanır. Döküm ilk komuttan son komutun 8 byte ötesine kadar uzanır; kodun ardındaki bir tablo ya da ayrı bir veri `ORG`'u gibi daha ileride duran veriler dışarıda kalır. Copy dökümü panoya kopyalar. Download dökümü `workbench86_program.hex` adıyla kaydeder; dosyada Intel HEX değil, bu sade döküm vardır.

Import aynı `addr: bb bb ...` biçimini okur; döküm yapıştırılabilir ya da dosyadan yüklenebilir. Belleği temizler, byte'ları 0080 segmentine yükler, CS, DS, SS ve ES'yi 0080'e, SP'yi FFF0'a, IP'yi 0100'e ayarlar. Intel HEX kayıtları çözülmez. İçe aktarılan byte'lar assemble edilmiş bir program sayılmaz. Henüz hiçbir şeyin assemble edilmediği bir sayfada Step `No program assembled.`, Run `No program.` der; Reset, editördeki metni içe aktarılan byte'ların üstüne assemble eder; Upload and Run da her zaman editördeki metnin assemble edilmiş halini gönderir, içe aktarılan byte'ları hiçbir zaman göndermez.

## Assembler nasıl çalışıyor

Assembler, Intel mnemonic sözdizimini okur ve tek bir düz byte imajı üretir. Label'lar, encoding geçişi hiçbir adres kaymayana kadar (en fazla sekiz kez) tekrarlanarak çözülür. Böylece bir komutu kısaltan ileri referans yanlış bir offset üretmez, doğru değere oturur.

Directive'ler: `ORG`, `EQU`, `DB`, `DW`, `END` ve `INCLUDE PATCALLS.INC`. İfadelerde `OFFSET`, `BYTE PTR` ve `WORD PTR`, konum sayacı `$` ve label'lar ile sabitler üzerinde aritmetik kullanılabilir.

Adresleme modları: register, immediate, doğrudan `[disp16]`, register indirect, based, indexed ve based artı indexed. Hepsine isteğe bağlı olarak bir segment override ve bir boyut niteleyicisi eklenebilir.

`INCLUDE PATCALLS.INC` port adreslerini ve INT 28H fonksiyon numaralarını sabit olarak tanımlar; böylece programda `OUT 90H, AL` yerine `OUT UPORT1, AL` yazılabilir. Bu dosya assembler'ın içine gömülüdür, diskten okunmaz. İsimler bu satır olmadan da tanımlıdır; satır kabul edilir ama bir şey yapmaz. Başka herhangi bir `INCLUDE` hata verir.

Program yazmadan önce bilmekte fayda var:

- Program 0080:ORG adresine yüklenir. Assemble'dan sonra CS, DS, SS ve ES 0080, SP FFF0, IP de ilk komutun ORG'udur (`ORG` yoksa 0100H). Kartta SS ve SP farklıydı; bkz. [Kart notları](#kart-notları).
- Yalın bir label, adresini immediate olarak verir: `MOV AX,TABLE` TABLE'ın adresini yükler. Belleği okumak için `[TABLE]` yazın; `LEA SI,[TABLE]` doğrudur, `LEA SI,TABLE` hata verir.
- Immediate alan ve `BYTE PTR` ya da `WORD PTR` taşımayan bir bellek operandı word sayılır: `MOV [BX],5`, `C7 07 05 00` olarak assemble edilir.
- Sayılar ondalık, `H` son ekli ve rakamla başlayan hex (`0FFH`) ya da tırnak içinde bir karakter olabilir. `$`, `DW $` gibi ifadelerin içinde çalışır ama jump hedefi olarak çalışmaz: `JMP $` yerine `HERE: JMP HERE` yazın.
- İfadeler JavaScript'in operatörleriyle hesaplanır: `+ - * / & | ^ << >> ~` ve parantezler. MASM'ın kelime biçimindeki operatörleri (`AND`, `OR`, `SHL` ve `MOD`) hesaplanmaz; hata da vermezler, sonuç yanlış çıkar. `SEG` ve `DUP` desteklenmez.
- Koşullu jump'lar, `JCXZ` ve `LOOP` ailesi yalnızca short'tur; menzil dışındaki bir hedef hata verir (`Branch too far`). `JMP` short ya da near biçimini kendisi seçer, `CALL` near'dır.

## Simülatör nasıl çalışıyor

CPU modeli, 1 MB'lık bellek imajı ve tam register kümesiyle 8086 real mode'dur. FLAGS, aritmetik komutlardaki AF ve OF dahil doğru hesaplanır. String komutları `REP`, `REPE`, `REPZ`, `REPNE` ve `REPNZ` ön ekleriyle çalışır. IF set iken interrupt'lar modellenen denetleyiciden alınır.

Geri çalıştırma yaklaşık değil, birebir. Motor her Step'ten önce register'ları, port dizisini, çevre birimlerinin durumunu ve interrupt durumunu bir snapshot'a alır, bellek geri alma günlüğünü de o snapshot'a bağlar. Günlük, bir önceki snapshot'tan bu yana yazılan her adres için ilk yazımdan önce orada duran byte'ı tutar; adres başına tek kayıt vardır. Bir adımı geri almak, bu günlüğü geri oynatmak demektir. İleri adım da aynı mekanizmayı ters yönde kullanır, bu yüzden bellek iki yönde de byte byte geri yüklenir. Geçmiş 500 adım tutar; yeni adımlar eklendikçe en eskileri silinir.

Geçmiş yalnızca Step ile çalışan komutlar için kaydedilir. Run hangi hızda olursa olsun ne geçmiş ne de trace kaydeder: Run'dan sonra `← Back`, son Step'ten önceki duruma döner. Klavye kuyruğu geri sarılmaz.

### Desteklenen komutlar

Uygulanmış olanlar:

- Veri taşıma: `MOV`, register'lar arasında `XCHG`, `PUSH`, `POP`, `PUSHA`, `POPA`, `PUSHF`, `POPF`, `LEA`, `IN`, `OUT`, `XLAT`, `CBW`, `CWD`, `LAHF`, `SAHF` ve segment register'lar için `PUSH` ile `POP`. `PUSHA` ve `POPA` 80186 ile gelen komutlardır; setin 80286 CPU kartı bunları çalıştırır.
- Aritmetik: `ADD`, `SUB`, `ADC`, `SBB`, `INC`, `DEC`, `NEG`, `CMP`, `MUL`, tek operandlı biçimiyle `IMUL`, `DIV`, `IDIV` ve BCD ile ASCII düzeltme komutları `DAA`, `DAS`, `AAA`, `AAS`, `AAM`, `AAD`.
- Mantık, shift ve rotate: `AND`, `OR`, `XOR`, `NOT`, `TEST`, `SHL`, `SAL`, `SHR`, `SAR`, `ROL`, `ROR`, `RCL`, `RCR`; kaydırma sayısı 1 ya da `CL` olur.
- String komutları: `MOVSB`, `MOVSW`, `STOSB`, `STOSW`, `LODSB`, `LODSW`, `CMPSB`, `CMPSW`, `SCASB` ve `SCASW`, tekrar ön ekleriyle birlikte. `MOVS BYTE PTR [DI],[SI]` gibi operandlı biçimler kabul edilmez.
- Near control flow: bir label'a `JMP` ve `CALL`, koşullu jump'lar, `JCXZ`, `LOOP`, `LOOPE`, `LOOPZ`, `LOOPNE`, `LOOPNZ`, `RET`, `RET n`, `INT`, `IRET`. 28H dışındaki her n için `INT n`, vektör kuruluysa interrupt vektör tablosu üzerinden atlar, kurulu değilse bir şey yapmaz.
- Flag control: `CLC`, `STC`, `CMC`, `CLD`, `STD`, `CLI`, `STI`.
- Ön ekler: `CS:`, `DS:`, `ES:` ve `SS:` segment override'ları.
- Ayrıca `NOP` ve `HLT`.

Uygulanmamış olanlar:

- Far `CALL`, far `JMP` ve far `RET`.
- Register ya da bellek üzerinden dolaylı `JMP` ve `CALL`, `JMP SHORT` ve bellek operandlı `XCHG`. CPU modeli dolaylı `JMP` ve `CALL`'u çalıştırabilir, ama assembler bunları reddeder.
- `LDS`, `LES`, `INTO`, `LOCK`, `WAIT`, `ESC` ve `XLATB`, `JPE`, `JPO` takma adları (`XLAT`, `JP` ve `JNP` çalışır).
- `PUSHA` ve `POPA` dışındaki 80186 ve 80286 eklemeleri, örneğin `ENTER`, `LEAVE`, `BOUND` ve immediate ile `PUSH`.
- Protected mode.
- FPU.

### PAT monitör çağrıları (INT 28H)

`INT 28H` çağrısını (`USER` 40'a, yani 28H'ye eşit olduğu için `INT USER` diye de yazılır) simülatör doğrudan kendisi karşılar; fonksiyon numarası AH'dedir.

| AH | İsim | Simülatörde |
|---|---|---|
| 00H, 01H | `READ`, `READLN` | Kabul edilir, bir şey yapmaz |
| 02H, 03H | `WRITE`, `WRITLN` | DS:DI'daki CX byte'ı (en fazla 256) PAT Display'e yazar. BL'deki cihaz dikkate alınmaz |
| 04H | `EXIT` | Programı durdurur |
| 05H–0BH | `PERR`, `AHEXTO`, `ADECTO`, `TOAHEX`, `TOADEC`, `RDCHAR`, `RDBYTE` | Uygulanmadı. Adım `unhandled` bildirir ve çalışma sürer |
| 0CH | `WRCHAR` | AL'yi karakter olarak PAT Display'e yazar |
| 0DH | `WRBYTE` | AL'yi iki hex basamak olarak PAT Display'e yazar |
| 0EH | `GETIN` | Klavye kuyruğundaki sıradaki tuşu AL'ye koyar, kuyruk boşsa FFH |
| 0FH | `WT1MS` | Run sırasında 1 ms bekler |
| 10H | `WTNMS` | Run sırasında gerçek zamanla BX ms bekler |
| 11H | `CRLF` | Yeni satır |
| 12H | `CLRSCR` | PAT Display'i temizler |
| 13H, 14H | `LEDON`, `LEDOFF` | Kabul edilir, bir şey yapmaz |
| 15H | `TONE` | Yalnızca simülatörde. BX Hz çalar ve Run sırasında programı CX ms bekletir |
| 16H | `NOTOFF` | Yalnızca simülatörde. Sesi durdurur |

## Portlar ve çevre birimleri

Intel 8256 MUART, 0x80 ile 0x9E arasındaki portlarda modellenmiştir. Interrupt denetleyicisi bunun altında, 0x40 ve 0x42 adreslerinde.

| Port | Sembol | Erişim | İşlev |
|---|---|---|---|
| 0x40 | `PIC0` | W | Interrupt denetleyicisi komutu. 0x20 yazmak bekleyen bütün istekleri temizler. |
| 0x42 | `PIC1` | W | Interrupt denetleyicisi maskesi. Saklanır ama model maskeyi uygulamaz. |
| 0x80 | `UCRREG1` | W | Control register 1. Timer saat seçimini de tutar; bu değer saklanır ama modelde etkisi yoktur. |
| 0x82 | `UCRREG2` | W | Control register 2. |
| 0x84 | `UCRREG3` | W | Control register 3. |
| 0x86 | `UMODEREG` | R/W | Port 2 modu. 0x00 ADC girişi, 0x03 DAC çıkışı. |
| 0x88 | `UPORT1CTL` | R/W | Port 1 yönü, hat başına bir bit. 1 o hattı çıkış yapar. |
| 0x8A | `UIRQEN` | W | IRQ izni. Bit 0 timer 1'i açar. |
| 0x8C | `UIRQADR` | R | IRQ onayı. Okumak bekleyen bütün istekleri temizler ve 0x00 döndürür. |
| 0x90 | `UPORT1` | R/W | Port 1 verisi. Bit haritası aşağıda. |
| 0x92 | `UPORT2` | R/W | Port 2 verisi. Yazınca DAC değeri, okuyunca ADC sonucu. |
| 0x94 | `UTIMER1` | W | Timer 1 sayısı. Yazmak tek seferlik bir geri sayım başlatır; sayım sıfırda durur ve yeniden yazılana kadar öyle kalır. |
| 0x9E | `USTATUS` | R | Durum register'ı. Modellenmedi: okuma, oraya en son ne yazıldıysa onu döndürür. |

`PATCALLS.INC` ayrıca 0x8E adresinde `URCVBUF`'ı ve 0x96, 0x98, 0x9A, 0x9C adreslerinde `UTIMER2`'den `UTIMER5`'e kadar olanları tanımlar. Assembler bu isimleri kabul eder ve bunlara yapılan yazmalar port dizisine kaydedilir, ama modelde bunlara tepki veren bir şey yoktur.

Üst çubuktaki Ports düğmesi, bu register'lardan `UCRREG1`'den `USTATUS`'a kadar on tanesini gösteren bir pencere açar. Read Current değerleri simülatörden okur, Write da sizin girdiğiniz değerleri simülatöre geri yazar. Pencere yalnızca simülatörü değiştirir ve kart bağlıyken açılmaz.

![workbench86'nın MUART Port Settings penceresi. Simülatörün on MUART register'ı, 80H'deki UCRREG1'den 9EH'deki USTATUS'a kadar, isimleri ve port adresleriyle listelenmiş, her birinin yanında düzenlenebilir bir byte değeri var. hw-led-all-on.asm'nin kurulum satırları çalıştıktan sonra UCRREG1-UCRREG3, UMODEREG, UPORT1CTL ve UPORT2 FF, diğerleri 00 gösteriyor. Altta Read Current ve Write düğmeleri var. Pencere yalnızca simülatörü değiştirir, kart bağlıyken açılmaz.](docs/screenshots/hardware.png)

### Port 1 bit atamaları

| Bit | İsim | Süren taraf | İşlev |
|---|---|---|---|
| 0 | `EN` | program | DAC enable, active low. Model bu bite bakmaz; DAC yolunu bunun yerine 0x86'daki mode register'ı açar. |
| 1 | `WR` | program | ADC başlatma. 1'den 0'a geçiş bir dönüşüm başlatır. |
| 2 | `BSY` | model | ADC meşgul. Dönüşüm başladıktan sonra port 1'in üç okuması boyunca low, sonra high okunur. |
| 3 | `RD` | program | ADC okuma izni, active low. Bu bit low iken port 2 dönüştürülmüş değeri verir. |
| 4 | `DSC` | model | Optik disk encoder darbesi. DAC değeri 10'un üstündeyken port 1 okundukça değişir, DAC değeri büyüdükçe daha sık; böylece program motor turlarını sayabilir. Zamana değil, okumalara bağlıdır. |
| 5 | `PZO` | program | Piezo buzzer. Biti set etmek sabit 1 kHz'lik bir ses başlatır, temizlemek sesi durdurur. |
| 6 | `UTX` | program | Ultrasonik verici tetiği. |
| 7 | `URX` | model | Ultrasonik alıcı. Yalnızca verici açıkken ve menzilde bir nesne varken low okunur, diğer durumlarda high. Modelde menzile hiçbir zaman nesne girmez. |

Okurken hangi tarafın geçerli olacağına 0x88'deki yön register'ı karar verir: çıkış olarak işaretli bitler çıkış latch'inden, geri kalanlar modelden okunur.

### Interrupt'lar

| Kaynak | INT | Vektör adresi |
|---|---|---|
| Harici IR0 | 20H | 0000:0080H |
| Harici IR1 | 21H | 0000:0084H |
| Timer 1 sıfırda, IR2 | 25H | 0000:0094H |
| PAT monitör çağrısı | 28H | 0000:00A0H |

Vektörü hâlâ boş olan bir istek alınmaz, bekletilir; gerçek bir denetleyici de istek hattını onaylanana kadar böyle tutar. Handler sonradan kurulursa bekleyen istek yine karşılanır; handler'ı olmayan bir istek de handler'ı olan daha düşük numaralı bir isteğin önünü tıkamaz.

Simülatörde istek üreten tek kaynak timer 1'dir. IR0 ve IR1 tabloda vektörleriyle birlikte yer alıyor ama hiç tetiklenmiyor; INT 28H'yi de simülatör, vektörünü okumadan kendisi karşılıyor. `examples/assignments/pa26-irq2-counter.asm`, harici bir IR2 için INT 22H vektörünü (0000:0088) kurar; simülatör bu isteği de hiç tetiklemez.

### Modellenen çevre birimleri

LED'ler, port 1 ve port 2'de sürülen bit desenleridir. DC motor, mode register'ı 0x03 iken port 2'ye yazılan DAC değerini alır, encoder'ı da `DSC` hattında darbe üretir. ADC, 0x00 modunda potansiyometre okumasını port 2'den döndürür. Girişleri değiştirecek bir kontrol v15'ten beri yok, bu yüzden sabit kalırlar: potansiyometreden hep 80H okunur, ultrasonik çiftin önüne hiçbir şey girmez, önü kapanınca ADC okumasını zayıflatacak olan optik bağlantının önü de hiç kapanmaz.

Piezo bir WebAudio osilatörünü sürer; ses, sayfada herhangi bir yere bir kez tıkladıktan sonra gerçekten duyulur. `PZO`'yu set etmek sabit 1 kHz'lik bir ses çalar. Kartta sesin perdesi, `PZO`'nun ses frekansında açılıp kapatılmasından gelir; simülatör bunu yeniden üretmez, bu yüzden Manifest şarkıları ve org ödevi (pa24) burada doğru duyulmaz. `AH=TONE` ile `INT 28H` BX Hz çalar ve Run sırasında programı CX ms bekletir; ses `NOTOFF`'a, BX=0 ile `TONE`'a ya da Reset'e kadar sürer. `TONE` ve `NOTOFF` yalnızca simülatörde var: PAT monitöründe bu çağrılar yok, bu yüzden kartta piezo `UPORT1` üzerinden açılıp kapatılır.

Timer 1 zamana göre değil, çalışan her 50 komutta bir azalır ve sıfıra inince IR2'yi tetikler. Odak editörde ya da bir giriş kutusunda değilken basılan tuşlar bir kuyruğa girer; `AH=GETIN` ile `INT 28H` tuşları bu kuyruktan alır. `GETIN` kuyruk boşken FFH döndürür, Enter 0DH verir.

Çevre birimlerinin durumu I/O Log ve zaman şeridi, PAT Display kartı ve Ports penceresi üzerinden okunur. Applications Module'ü çizen grafik bir panel yoktur.

## Donanım köprüsü

Köprü, assemble edilmiş byte'ları WebSerial üzerinden karta gönderir ve programı orada başlatır. Seri port ayarları 9600 baud, 8 veri biti, parity yok, 2 stop biti.

Üst çubuktaki Device düğmesine basın ve tarayıcının kendi port seçicisinden çeviricinin portunu seçin. Bağlanınca düğmenin adı Disconnect olur, yanındaki nokta yeşile döner, durum çubuğunda `Board connected (9600 8N2)` yazar ve terminal PAT RESET'e basmanızı ister. Port açılırken DTR ve RTS 100 ms boyunca düşürülüp yeniden yükseltilir; bu, kartı resetlemez. Karttaki PAT RESET'e basın ve terminalde `PAT:` görünmesini bekleyin.

Kart bağlıyken debug paneli kilitlenir ve panelin üstünde bunu söyleyen bir şerit çıkar. Program kartın kendi işlemcisinde çalışır ve hattan register ya da bellek durumu geri gelmez; bu yüzden panel kartta olanı gösteremez. Step, Back, Fwd, Run, Reset ve hız menüsü kapanır, çalışan bir simülasyon varsa piezosuyla birlikte durur, Ports penceresi açılmaz. Üst çubuktaki etiket BOARD gösterir; yükleme sırasında UPLOADING, `G`'den sonra da kart `PAT:`'a dönene kadar BOARD RUNNING olur. Editör, Assemble ve Explorer çalışmaya devam eder. Simülatörü yeniden kullanmak için Disconnect'e ya da Simulate anyway'e basın. Simulate anyway bağlantıyı kesmez ve kartla ilgili bir iş sürerken çalışmaz; bir sonraki Upload da paneli yeniden kilitler. Önce simülatörde debug edin, sonra yükleyin.

![Karta bağlı workbench86. Üst çubukta BOARD durumu, yeşil nokta ve Disconnect düğmesi var. Soluk debug panelinin üstündeki şerit programın kartta çalıştığını söylüyor ve Simulate anyway seçeneğini veriyor, adım ve çalıştırma düğmeleri pasif. Editörün altındaki terminalde PAT RESET'ten sonra kartın PAT: istemi görünüyor.](docs/screenshots/board-mode.png)

Upload and Run önce editördeki kodu assemble eder, sonra gönderir; böylece karta, Step ya da Run'ın o arada değiştirdiği bellek değil, ekrandaki kod gider. Açık sekme `.asm` değilse, kod assemble olmuyorsa ya da gönderilecek bir şey yoksa karta hiçbir şey gitmez. Her yüklemeden önce karttaki PAT RESET'e basın: döngüyle biten bir programdan sonra ekranda eski bir `PAT:` olsa bile kart o programı çalıştırmaya devam eder.

Sayfa önce CR LF gönderir ve `PAT:` bekler. İstem gelmezse başka hiçbir şey göndermez. İstem gelirse byte'ları monitörün `C` komutuyla tek tek yerleştirir, her byte'tan sonra monitörün istemini bekler ve bellek düzenleme kipinden `ESC` ardından `CR` ile çıkar. Birden fazla `ORG` içeren bir programın her bitişik bloğu ayrı yerleştirilir; böylece birbirinden uzak iki başlangıç adresi arasındaki sıfır dolgusu hiç gönderilmez. İlkinden sonraki her bloktan önce 200 ms beklenir. Upload and Run'ın gönderdiği `C` ve `G` komutları da, terminaldeki G ve T düğmelerinin gönderdikleri de 0080 segmentini içerir, örneğin `C 0080:0500`. En sonda `G 0080:` ve ardından ilk komutun ORG'u gönderilerek program başlatılır ve sayfa `PAT:` için 8 saniye bekler. Üç sonuç olabilir:

- `=== SUCCESS ===`: program monitöre döndü (normalde EXIT ile) ve kart yeniden `PAT:`'ta.
- `--- Program is running on the board. Press PAT RESET before the next upload.`: 8 saniye içinde istem gelmedi; döngüyle biten bir programda beklenen budur. Sonradan bir `PAT:` gelene kadar etiket BOARD RUNNING gösterir, `PAT:` gelince terminal `[OK] Board is back at PAT:` yazar.
- `=== FAILED: the board reported ERROR ... ===`: monitör `G`'den sonra bir `ERROR` satırı yazdı, örneğin `ERROR 30` ve bir register dökümü.

Kart yüklemenin ortasında bellek düzenleme kipinden çıkarsa (örneğin PAT RESET'e basıldığı için) yükleme `G` göndermeden durur. Cevap gelmeyen byte'lar byte akışında `[!]` ile işaretlenir, sonunda da kaç tane olduğu yazılır.

![pa02-add-bytes.asm için Upload and Run'dan sonra workbench86. Editörün altındaki terminalde yüklemenin sonu görünüyor: PAT: istemi, karta giden G 0080:0100 komutu ve yankısı, ardından === SUCCESS ===. Durum çubuğu da programın bittiğini ve kartın PAT istemine döndüğünü yazıyor.](docs/screenshots/upload.png)

Bu iki ekran görüntüsünün kart tarafı PAT monitörünün bir modelinden geliyor; gerçek bir kartın yankısı biraz farklı görünebilir.

Seri hattı aynı anda yalnızca bir iş kullanabilir. Yükleme sürerken Upload düğmesi önce `Uploading n/N`, sonra `Waiting for PAT:` gösterir ve basılamaz; ikinci bir Upload, G, T, Send ve Simulate anyway reddedilir. Disconnect her zaman kullanılabilir ve işi hemen durdurur. Bir iş sürerken sayfadan çıkmak isterseniz sayfa önce onay ister.

Sayfanın fark edebildiği her hatanın kısa bir kodu var: terminalde `[Error U01] ...`, durum çubuğunda `Error U01: ...` olarak görünür. C01–C07 bağlantı hataları, U01–U06 ve U09 yükleme hataları, A01–A03 daha hiçbir şey gönderilmeden reddedilen yüklemeler, B01 de karttan gelen bir `ERROR` satırıdır. W01 bir seri hat hatasını (Break, Framing, Parity ya da Overrun) bildirir ve sayfa bundan sonra da okumaya devam eder; W02 ise cevap gelmeyen byte'ları bildirir. Bağlantı koparsa sayfa C04 ile bağlantıyı kapatır. C07, Windows'un Prolific PL2303 çipli bir çeviriciyi açamadığını söyler; sebebi çoğunlukla sürücünün çipi reddetmesidir. Her kodun anlamı ve ne yapılacağı Türkçe olarak [laboratuvar notunda](docs/lab-hizli-kullanim.md#hata-kodları), İngilizce olarak [donanım rehberinde](docs/hardware-guide.md#error-codes) anlatılıyor.

### Seri terminal

Editörün altındaki terminal hep açıktır. Sayfanın gönderdiği komutlar `TX:` ile, sizin yazdıklarınız `>` ile başlayan satırlarda, kartın cevaplarıyla aynı akışta görünür. Yazdırılamayan byte'lar köşeli parantez içinde gösterilir; form feed `[FF]`, ESC `[1B]` olarak çıkar. Giriş kutusuna yazdığınız, `Enter`'a ya da Send'e basınca sonuna CR LF eklenerek gönderilir. G ve T, `G 0080:` ve `T 0080:` komutlarını son yüklemenin giriş ORG'uyla (henüz yükleme yapılmadıysa son assemble edilen programın ORG'uyla) gönderir, sonra `PAT:` için sırasıyla 8 ve 5 saniyeye kadar bekler. Copy kaydı panoya kopyalar ve başına build sürümünü, tarayıcıyı, son kodu ve son yüklemeyi yazan tek bir satır ekler. Terminal yaklaşık son 6000–8000 karakteri tutar.

### Intel HEX yolu ve test rutinleri

Laboratuvardaki kartlarda birbiriyle uyumsuz iki ROM monitör sürümü var; bu yüzden `L` komutunu kabul eden sürümler için ikinci bir yükleme yolu da bulunuyor. Bu yol `L`, `/t1`, en fazla 32 byte'lık Intel HEX kayıtları ve `G 0100` gönderir. Upload and Run bu yolu hiç kullanmaz. Bu yolun düğmesi yoktur, tarayıcının geliştirici konsolundan çağrılır, `ORG 0100H` varsayar ve kartta denendiğine dair bir kayıt yoktur ([donanım rehberi, bölüm 5](docs/hardware-guide.md#5-the-two-upload-paths-and-how-to-choose)). LED ve display test rutinleri (`testLedAll()`, `probeDisplay()`'den `probeDisplay4()`'e kadar olanlar ve diğerleri) de yalnızca konsoldan çalışır ([bölüm 7](docs/hardware-guide.md#7-verifying-the-link-with-the-probes)). Portları tek tek karta aktaran canlı bir köprü yok: bir programın `IN` ve `OUT` komutları karta ancak yüklenen programın parçası olarak ulaşır.

### Kart notları

Aşağıdakiler Nisan 2026'da gerçek bir kartla yapılan laboratuvar oturumlarında görüldü; ayrıntıları donanım rehberinin 6., 7. ve 9. bölümlerinde:

- Kartta CS ve DS 0080'di, ama SS 0F80, SP de 0800'dü. Simülatör SS'yi 0080'e, SP'yi FFF0'a ayarlar, bu yüzden stack farklı davranabilir. Stack'e dayanan bir program SS ve SP'yi kendisi ayarlamalı.
- Monitör EXIT'te MUART portlarını sıfırlar, bu yüzden program çıkınca LED'ler söner. LED'leri yanık tutması gereken bir program döngüyle biter ve PAT RESET ile durdurulur.
- Kart bilgisayara bağlıyken `INT 28H` `WRCHAR` metni 7 segment display'e değil, seri terminale gider.
- `INT 28H` register'ları, özellikle DX'i bozabilir. Gerekenleri çağrıdan önce saklayın.
- Keypad ve display denetleyicisinin adresi hâlâ bilinmiyor; dört display test rutininden hiçbiri doğrulanmadı.

Tüm prosedür [docs/hardware-guide.md](docs/hardware-guide.md) dosyasında: gereken çevirici, secure context koşulu, bağlanma sırası, her monitör komutunun ne yaptığı, terminal düğmeleri, kart modu, yükleme adresleri, hat testleri, hata kodları ve bir sorun giderme tablosu. Kart cevap vermediğinde oraya bakın. Rehber İngilizce. Laboratuvar için tek sayfalık Türkçe hızlı kullanım notu [docs/lab-hizli-kullanim.md](docs/lab-hizli-kullanim.md) dosyasındadır.

Yükleme yalnızca Chromium ailesi tarayıcılarda çalışır. Firefox ve Safari geri kalan her şeyi çalıştırır.

## Transpiler

Transpiler küçük C, C++, Python, Java ve Go parçacıklarını assembly'ye çevirir; böylece öğrenci aynı döngüyü iki biçimde de görebilir. Örnekler Explorer'da, `languages` altında. `.c`, `.cpp`, `.py`, `.java` veya `.go` sekmesinde Assemble düğmesinin üstünde Translate to ASM yazar, `Ctrl+Enter` da aynı işi yapar. Sonuç `generated/<isim>.asm` dosyasına yazılır, kendi sekmesinde açılır ve assemble edilir.

![languages/go/chase.go üzerinde Translate to ASM'den sonra workbench86. Explorer'da c, python, go, java, cpp ve asm örnekleriyle languages klasörü ve artık chase.asm'yi içeren generated klasörü görünüyor. Editörde chase.go ve chase.asm sekmeleri açık. chase.asm'de çevrilmiş program var: MUART kurulumu, BL'yi UPORT2'ye yazan bir döngü, LOOP ile bekleme ve ROL BL,1. Durum çubuğunda 'Translated → chase.asm & assembled' yazıyor.](docs/screenshots/transpiler.png)

Transpiler `main`'in içini okur ve şunları tanır:

- İlk değer verilen değişken tanımları (`unsigned char val = 0x01`, `val := 0x01` ya da `i = 0` gibi) ve düz atamalar.
- Yalnızca sonsuz döngüler: `while (1)`, `while (true)`, Python'da `while True:`, Go'da `for {` ve koşulu boş bırakılmış `for (type i = x; ; i++)`. Koşullu bir döngü tanınmaz.
- `port_init(...)`: her zaman `UCRREG1`–`UCRREG3`, `UMODEREG` ve `UPORT1CTL`'ye FFH yazar.
- `outport(PORT1, v)`: `UPORT1`'e gider. Başka herhangi bir port adı `UPORT2`'ye gider.
- `delay_ms(n)`: `MOV CX,n*130` ve bir `LOOP` olur; FFFFH ile sınırlıdır ve gerçek zamana göre ayarlanmamıştır.
- `x++`, `x--`, `x = x + 1`, `x = x - 1`, `x = x << n` ve `ROL`'a dönüşen döndürme kalıbı `(x << 1) | (x >> 7)`.

Değişkenler sırasıyla BL, DL, BH, DH, CL ve CH'de tutulur, yedinci değişken yine BL'yi kullanır. CL ve CH, `CX` ile kurulan gecikme döngüsüyle çakışır. Tanınmayan bir satır, uyarı verilmeden `;` ile başlayan bir yorum satırına çevrilir. Çıktının başında `ORG 0100H` ve `INCLUDE PATCALLS.INC`, sonunda `MOV AH,04H` ve `INT 28H` vardır. n 1'den büyükken `x = x << n` aşağıdaki kaydırma sayısı sınırına takılır ve 1'lik kaydırma olarak assemble edilir.

Bu bir compiler değil. `if` ya da `else` yok, kullanıcı tanımlı fonksiyon yok, iç içe control flow yok. Tek amacı, yüksek seviyeli bir dildeki döngünün assembly'de nasıl bir döngüye karşılık geldiğini göstermek.

## Örnek program kümesi

Araçla birlikte dört klasörde 52 assembly programı geliyor.

`examples/assignments/` klasöründe 28 laboratuvar ödevi var; PA01'den PA29'a kadar numaralı, PA18 yok. Sıraları laboratuvarın izlencesine uyar: byte aritmetiği ve register kopyalama, bellek doldurma ve string kopyalama, karşılaştırma ve bit inceleme, LED çıkışı, motor disk sayacı, ultrasonik yakınlık, potansiyometreyle motor sürme, stack işlemleri, hex display, piezo, keypad ile org, en sonda da interrupt vektörleri, IR2 sayacı, timer ve display'de motor hızı.

`examples/demos/` klasöründe 9 algoritma programı var: bubble sort, Fibonacci, faktöriyel, stack üzerinden string ters çevirme, `REP MOVSB` ile blok kopyalama, `REP STOSB` ile bellek doldurma, `CALL` ve `RET` gösterimi, display'de hex'ten ASCII'ye çevirme ve bir geri sayım.

`examples/hardware/` klasöründe cihaz seviyesinde 9 kısa program var; çoğu LED deseni (blink, chase, knight rider, zar, hepsi açık, hepsi kapalı), bunlara ek olarak bir ikili sayaç, `INT 28H` ile seri hatta merhaba yazan bir program ve bir piezo bip.

`examples/scripts/` klasöründe donanım köprüsü geliştirilirken yazılmış 6 program var: `INT 28H` üzerinden bir display testi, 7 segment kodlarını `KYDBUF`'a (0000:047D) yazan bir display denemesi, bir piezo testi, piezonun bağlı olduğu biti bulan bir port bit tarayıcı ve Manifest grubunun notadan aktarılıp piezoda `UPORT1` üzerinden çalınan iki şarkısı.

`languages` altındaki sekiz örnek sayfanın içine gömülüdür ve bu 52'ye dahil değildir.

## Klavye kısayolları

| Tuş | Eylem |
|---|---|
| `Ctrl+Enter` | Assemble edip yükle; yüksek seviyeli bir dilin sekmesinde Translate to ASM |
| `Ctrl+S` | Açık dosyayı indir |
| `Ctrl+Z` / `Ctrl+Y` ya da `Ctrl+Shift+Z` | Editörde geri al / yinele |
| `Ctrl+F` | Editördeyken bul ve değiştir |
| Bul kutusunda `Enter` / `Shift+Enter` | Sonraki / önceki eşleşme |
| `Tab` | 8 boşluk ekle ya da ghost completion'ı kabul et |
| `Ctrl+Shift+P` | Command palette |
| `F1` | ISA referans rehberini aç ya da kapat |
| `?` | Klavye kısayolları listesi; odak editörde ya da bir metin kutusunda değilken |
| `Escape` | Açık pencereyi, bul çubuğunu, command palette'i, bağlam menüsünü ya da ghost completion'ı kapat |
| `Alt+1` / `Alt+2` / `Alt+3` | Explorer'a, editöre, debug paneline odaklan |
| Yukarı ve aşağı oklar | Explorer'da gez ya da odaktaki debug panelini kaydır |
| Explorer'da sol ve sağ oklar | Klasörü kapat ya da aç, ya da üst klasöre veya ilk öğeye geç |
| `Enter` | Explorer'da seçili dosyayı aç. Memory kutusunda View, Watch kutusunda Add, terminal girişinde Send yerine geçer |
| `F2` / `Del` | My files'taki seçili dosyayı yeniden adlandır ya da sil |
| Satır numarasına tıklama | Breakpoint koy ya da kaldır |

Mac'te Enter, S, Z ve Y için `Ctrl` yerine `Cmd` de çalışır; bul ve command palette ise `Ctrl` ister. How to use sayfasında kartlar arasında ok tuşları, Space, Page Up, Page Down, Home ve End ile gezilir; `F` Present'i açıp kapatır, `Esc` de Present'ten çıkar.

## Dizin yapısı

```
workbench86/
├── index.html                    giriş noktası, bütün script'leri yükler
├── README.md, README.tr.md       bu dosya, İngilizce ve Türkçe
├── CHANGELOG.md                  her build için bir kayıt
├── CONTRIBUTING.md               kurallar ve pull request akışı
├── LICENSE                       MIT
├── core/
│   ├── cpu/
│   │   ├── core.js               bellek, register'lar, snapshot'lar, geri alma günlüğü
│   │   ├── decode.js             fetch, ModR/M, string komutları
│   │   ├── alu.js                ALU ve koşul testleri
│   │   ├── exec.js               opcode dağıtımı
│   │   └── int28.js              PAT monitör çağrıları
│   ├── assembler/
│   │   ├── parser.js             satırlar, ifadeler, directive'ler, geçişler
│   │   └── encoder.js            komut kodlama
│   ├── io/
│   │   ├── state.js              port haritası, çevre birimi durumu, timer, ses
│   │   └── ports.js              IN ve OUT işleyicileri
│   └── transpiler/
│       ├── compiler.js           yüksek seviyeli dilden assembly'ye
│       └── bridge.js             arayüz bağlantısı
├── app/
│   ├── main/                     editor.js, sim.js
│   ├── render/                   core.js, io.js
│   ├── editor/                   tooltips.js, features.js
│   ├── files/                    core.js, tree.js
│   ├── panels/                   layout.js, display.js
│   ├── highlighter/              render.js, constants.js
│   ├── guide/                    data.js, ui.js
│   ├── serial/                   core.js, upload.js
│   ├── ui/                       command-palette.js, search-replace.js,
│   │                             resize-handles.js, keyboard-nav.js
│   └── examples.js               örnek manifest'ini yükler
├── styles/                       7 stil dosyası, preprocessor yok
├── howto/                        How to use sayfası, Türkçe ve İngilizce, 57 kart
│   ├── index.html
│   ├── howto.js                  gezinme, dil, tema, Present
│   ├── howto.css
│   ├── img/                      ekran görüntüleri (WebP), diyagramlar ve çizimler (SVG)
│   └── fonts/                    gömülü fontlar, SIL OFL 1.1, bkz. FONTS.md
├── examples/                     52 .asm programı ve manifest.json
│   ├── assignments/
│   ├── demos/
│   ├── hardware/
│   └── scripts/
├── tests/
│   ├── run.sh                    çalıştırıcı: ./tests/run.sh [suite]
│   ├── stubs.js                  tarayıcının yerine geçenler ve test yardımcıları
│   ├── engine.test.js            differential kontroller ve sabitlenmiş regresyonlar
│   ├── examples.test.js          örnek program kümesini assemble edip çalıştırır
│   └── README.md
└── docs/
    ├── KNOWN_ISSUES.md           hâlâ açık olanlar ve kartta henüz görülmeyenler
    ├── hardware-guide.md         kart bağlantısı ve sorun giderme, İngilizce
    ├── lab-hizli-kullanim.md     laboratuvar hızlı kullanım notu, Türkçe
    ├── figures/                  v15'ten kalma üç SVG diyagram, belgelerde kullanılmıyor
    └── screenshots/              bu README'deki görseller
```

## Tarayıcı desteği

| Tarayıcı | Simülatör | WebSerial yükleme |
|---|---|---|
| Chrome 89 ve sonrası | Evet | Evet |
| Edge 89 ve sonrası | Evet | Evet |
| Opera, Brave gibi diğer Chromium tarayıcılar | Evet | Web Serial API'yi koruyan sürümlerde evet |
| Firefox | Evet | Hayır, API yok |
| Safari | Evet | Hayır, API yok |

WebSerial ayrıca secure context ister; yükleme `https://` ya da `http://localhost` üzerinden çalışır, `file://` üzerinden çalışmaz. WebSerial olmayan bir tarayıcıda Device ve Upload and Run düğmeleri pasif kalır, üzerlerine gelince `WebSerial: Chrome/Edge only` yazar.

Yerleşim üç sütunlu ve 1024 px'ten geniş bir masaüstü penceresi varsayar. Pencere 1024 px ya da daha darsa Ports, Export, Guide ve How to use üst çubuktaki ⋮ menüsüne taşınır ve paneller artık rahat sığmaz: debug paneli daralır, editöre de birkaç satırlık yer kalır. Pencere 640 px ya da daha darsa paneller tek sütunda alt alta dizilir.

## Test durumu

Motor, headless bir test düzeneğiyle sınanıyor. `tests/run.sh`, `tests/stubs.js` dosyasını `core/cpu`, `core/io` ve `core/assembler` altındaki dosyalarla birleştirip tarayıcı dışında çalıştırır; böylece assembler ve CPU bir sayfaya, DOM'a ya da cihaza gerek kalmadan çalıştırılabilir. `node` kullanır, node yoksa `osascript` üzerinden JavaScriptCore'a geçer. Transpiler yüklenmez.

```bash
./tests/run.sh           # bütün suite'ler
./tests/run.sh engine    # tek bir suite
```

İki suite var. Biri sonuçları ve flag'leri elle hesaplanmış 8086 değerleriyle karşılaştırıyor (differential); differential testin şimdiye kadar bulduğu her hata için de ayrıca sabitlenmiş bir vakası var. Diğeri örnek program kümesini baştan sona dolaşıyor ve 52 programın hepsinin assemble olmasını, en fazla 100.000 adım boyunca bilinmeyen bir opcode'a ya da uygulanmamış bir yola düşmeden çalışmasını şart koşuyor. v18'de bu iki suite sırasıyla 43 ve 54 kontrol çalıştırıyor ve hiçbiri başarısız olmuyor. Bir suite hata bildirirse script sıfırdan farklı bir çıkış koduyla biter. Ayrıntılar [tests/README.md](tests/README.md) dosyasında.

`app/` altındaki kod testlerin kapsamında değil; editör, paneller ve donanım köprüsü hâlâ elle kontrol ediliyor. Otomatik bir tarayıcı test paketi yok.

workbench86 fiziksel kartta da kullanıldı. Program yükleme yolundaki bir hata, workbench86'nın yazarı olmayan bir öğrencinin yaptığı bir lab oturumunda bulundu; hata yalnızca `ORG` değeri varsayılan adresten farklı olan programlarda ortaya çıkıyordu. Nisan 2026'daki kart oturumlarında `C 0080:0100` ve `G 0080:0100` ile yapılan yüklemeler çalıştı; o build Manifest şarkılarını kartta çalıyor. Ekim 2026'nın ilk lab haftasında öğrenciler kendi dizüstü bilgisayarlarını bağladı ve yüklemeler `PAT:` isteminden sonra sürekli başarısız oldu; bir lab raporuna göre yüklemeler bir seri port hatası çıkana kadar çalışıyordu. v18 kodda bulunan sorunları düzeltiyor ve Nisan build'indeki `0080:` segment önekini geri getiriyor. Bu sürüm test paketiyle, kodu modellenmiş bir PAT monitörüne karşı çalıştıran çevrimdışı bir düzenekle ve Chrome'da sahte bir seri portla denendi; gerçek bir kartta henüz denenmedi. Doğrulanmak için hâlâ kart bekleyen maddeler [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md#not-yet-seen-on-a-board) dosyasında listeleniyor.

## Bilinen sınırlar

- WebSerial yalnızca Chromium'da var. Firefox ve Safari simülatörü ve etrafındaki her şeyi çalıştırır ama karta yükleme yapamaz.
- `INCLUDE` yalnızca `PATCALLS.INC` dosyasını kabul eder. Başka bir `INCLUDE` satırı assembler hatası verir.
- Bazı satırlar hata vermeden ama yazıldığından farklı assemble olur: 1 ya da `CL` dışındaki bir shift veya rotate sayısı 1 olur, iki ya da üç operandlı `IMUL` tek operandlı `IMUL` olur, `MUL`, `IMUL`, `DIV`, `IDIV`, `NOT`, `NEG`, shift ya da rotate komutlarında bellek operandına yazılan `BYTE PTR` yine word biçimini verir, `DUP` tek bir byte verir, `B` son eki hex basamağı olarak okunur, bir ifadenin içindeki `AND`, `OR`, `SHL` ve `MOD` hesaplanmaz.
- Far `CALL`, far `JMP` ve far `RET` uygulanmadı; dolaylı `JMP` ve `CALL`, protected mode ve FPU da yok. CPU modeli real mode'un bir alt kümesi.
- Geri adımlama en fazla 500 Step'i kapsar, Run ile çalışan hiçbir şeyi kapsamaz. Daha eskisi silinmiş olur; oraya dönmek için Reset'e basıp programı yeniden çalıştırmak gerekir.
- MUART timer'ı zamanı değil, çalışan komutları sayar. Timer ya da `WTNMS` kullanan programlar Max'ten düşük hızlarda dakikalar sürer.
- Potansiyometre, ultrasonik ve optik girişlerin kontrolü yok, sabit değerlerde kalırlar. IR0 ve IR1 hiç tetiklenmez; PIC maskesi ve timer saat seçimi dikkate alınmaz.
- Piezo sabit 1 kHz çalar, bu yüzden `PZO`'yu açıp kapatarak elde edilen perde duyulmaz. `TONE` ve `NOTOFF` yalnızca simülatörde çalışır.
- Simülatör SS=0080 ve SP=FFF0 ile başlar. Kartta SS 0F80, SP 0800'dü.
- Import Intel HEX çözmez, Export da son komuttan sonraki veriyi dışarıda bırakır.
- Intel HEX yükleme yolunun düğmesi yok ve `ORG 0100H` varsayar.
- Transpiler bilerek kısıtlı. `if` ya da `else` yok, kullanıcı tanımlı fonksiyon yok, iç içe control flow yok, yalnızca sonsuz döngüler var ve değişkenleri `CX` gecikme döngüleriyle çakışabilir.
- Editör içeriği saklanmaz. Sayfa yenilenince açık sekmeler ve My files uyarı verilmeden silinir.
- 1024 px ya da daha dar bir pencerede yerleşim rahat sığmaz.
- Otomatik bir tarayıcı test paketi yok.
- Applications Module için grafik bir panel yok. Çevre birimlerinin durumu I/O Log, Ports penceresi ve PAT Display kartı üzerinden okunur.
- Kart bağlıyken debug paneli kilitlidir. Kart sayfaya durum bilgisi göndermez; portları tek tek karta aktaran canlı bir köprü de yoktur.
- Karttaki keypad ve display denetleyicisinin adresi bilinmiyor.

Tam liste [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) dosyasında.

## Katkı

Issue ve pull request açabilirsiniz. Proje, klasik script olarak yüklenen sade modern JavaScript (optional chaining ve `??` dahil ES2020) ile sade CSS'ten oluşuyor; build adımı, bundler ve framework yok ve böyle kalacak.

Başlamadan önce bilmekte fayda olan birkaç kural:

- İki boşluk girinti, tek tırnaklı string'ler, modül seviyesinde fonksiyonlar. `app/ui/` içindeki eklentiler kendilerini bir IIFE'ye sarar.
- Yeni bir çevre birimi için `core/io/ports.js` içinde bir port işleyicisi, `core/io/state.js` içinde durumu ve `app/guide/data.js` içindeki port belgelerinde bir kayıt gerekir.
- Yeni bir komut için mnemonic'in `core/assembler/parser.js` içindeki `isInstruction()` listesine eklenmesi, `core/assembler/encoder.js` içinde kodlama, `core/cpu/exec.js` içinde bir case, `app/highlighter/constants.js` içinde anahtar kelime, `app/editor/tooltips.js` içinde bir ipucu ve `app/guide/data.js` içinde bir satır gerekir.
- Push etmeden önce `./tests/run.sh` çalıştırın. Bütün örnek program kümesini assemble edip çalıştırır; regresyon testi budur.

Daha uzun notlar [CONTRIBUTING.md](CONTRIBUTING.md) dosyasında. Tek dosyalık bir yamadan büyük her değişiklik için önce bir issue açın.

## Teşekkür

workbench86, Hacettepe Üniversitesi Bilgisayar Mühendisliği Bölümü'nde okutulan BBM436 Mikroişlemciler Laboratuvarı dersi için yapıldı. Dersi veren Doç. Dr. Harun Artuner'e, problemi ortaya koyduğu ve çalışma boyunca yol gösterdiği için teşekkür ederim. Tasarım ve uygulama bana ait.

Port haritası, INT 28H çağrı kümesi ve C komutu yükleme protokolü, kartın kendi ROM monitörünün davranışı gözlenerek çıkarıldı. Komut ve çevre birimi semantiği için Intel 8086 kullanıcı kılavuzu ile Intel 8256 MUART datasheet'i kaynak alındı.

## Lisans

MIT. Bkz. [LICENSE](LICENSE). `howto/fonts/` içindeki fontlar (Atkinson Hyperlegible Next ve JetBrains Mono) SIL Open Font License 1.1 ile lisanslıdır; bkz. [howto/fonts/FONTS.md](howto/fonts/FONTS.md).
