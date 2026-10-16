# workbench86: Labda Hızlı Kullanım (Microprocessors / BBM436)

Kısa cevap: **evet, her şeyi bu programla halledebilirsiniz.** Program, assembly kodunu
kendi içinde derliyor (assemble) ve gerektiğinde gerçek karta doğrudan yüklüyor.
Kurulum, indirme, DOSBox vb. yok; tek bir web sayfası. Karta bağlanmak için yine bir
USB↔RS-232 çevirici gerekir (B bölümü).

- **Tarayıcı:** Gerçek karta yükleme (Upload) için **Chrome veya Edge** kullanın;
  sayfa bu ikisinde denendi. WebSerial desteği olmayan bir tarayıcıda **Device** ve
  **Upload and Run** gri kalır. Sadece simülasyon için Firefox/Safari de olur.
- **Proje linki:** https://natozenbilek.github.io/workbench86/
- **Adım adım anlatım:** https://natozenbilek.github.io/workbench86/howto/?lang=tr
  (programın üst çubuğundaki **How to use** da bu sayfayı açar).

---

## A) Simülatörde çalışma (kart olmadan, her tarayıcıda)

1. Linki aç.
2. Soldaki **Explorer**'dan bir örnek seç (ör. `assignments/` klasörü), ya da Explorer'daki
   **New** ile yeni bir `.asm` dosyası aç ve kendi kodunu yaz (dosyaların **My files**
   klasöründe durur, sayfa yenilense de kaybolmaz).
3. **Ctrl+Enter** (veya ▶ Assemble) → kod derlenir. Hata varsa ilgili satır kırmızı
   işaretlenir, en alttaki durum çubuğunda mesaj çıkar.
4. **Step** ile tek tek, **Run** ile akıcı çalıştır. Sağ paneldeki kartlardan
   register / bayrak (FLAGS) / bellek / stack / I/O durumunu izle. Sim çubuğundaki
   **← Back** ile adım adım geri sar, **Fwd →** ile yeniden ileri al (zaman
   yolculuğu). Geri sarma yalnızca **Step** ile attığın adımlarda işe yarar; Run
   ile çalışan kısım kaydedilmez.
   - **Tüm hata ayıklamayı burada, simülatörde yapın.** Sağ panel yalnızca
     simülatörü gösterir.
   - Zamanlayıcı (MUART timer) ya da `WTNMS` kullanan programlar 20 Hz'de çok yavaş
     ilerler; bir ölçüm dakikalar sürebilir. Run'dan önce hız menüsünden **Max**'i
     seçin. Böyle bir programı Max'in altında çalıştırırsanız durum çubuğu bunu
     hatırlatır.

## B) Gerçek PAT kartına yükleme (Chrome/Edge şart)

5. Kartı bilgisayara **USB↔RS-232 (seri) çevirici** ile bağla (çeviricinin sürücüsü
   kurulu olmalı; değilse bilgisayar portu görmez).
6. Üstteki **Device** düğmesine bas → açılan listeden seri portu seç ve izni ver.
   Bağlanınca sağ panel kilitlenir (aşağıda "Kart modu").
7. Karttaki **PAT RESET**'e bas → terminal panelinde yeni bir `PAT:` istemi görünür
   (kart monitör modunda demektir).
8. **Upload and Run**'a bas. Sayfa editördeki kodu kendisi derler; önce Assemble'a
   basmanız gerekmez. Derleme hatası varsa karta hiçbir şey gitmez, hata durum
   çubuğunda görünür. Hata yoksa program karta byte byte yazılır ve `G` komutuyla
   çalıştırılır. Yükleme sürerken düğmede `Uploading 12/142` gibi bir sayaç görünür.
9. Sonuç terminalde görünür:
   - `=== SUCCESS ===`: program bitti ve monitöre döndü.
   - `Program is running on the board. Press PAT RESET before the next upload.`:
     program döngüde, kartta çalışmaya devam ediyor. LED ya da motor programları
     böyle biter; sonucu kartın üstünde izleyin.
     Monitör, EXIT'te (`INT 28H`, `AH=4`) MUART portlarını sıfırlar ve LED'ler söner
     (Nisan 2026'da kartta görüldü). Bu yüzden LED'leri yanık tutan programlar
     döngüyle biter. Onları PAT RESET ile durdurun.

---

## Her yüklemeden önce PAT RESET

- Her **Upload and Run**'dan önce karttaki **PAT RESET**'e basın ve terminalde yeni bir
  `PAT:` görün.
- Ekranda daha önceden kalmış bir `PAT:` olması kartın hazır olduğunu göstermez.
- Döngüyle biten bir programdan sonra (örneğin `JMP $` ile biten LED programları) kart o
  programı çalıştırmaya devam eder ve sayfayı duymaz. Yeni yüklemeden önce PAT RESET'e
  basın.
- Kart cevap vermezse sayfa terminale `[WARN] No PAT: prompt.` yazar ve karta başka bir
  şey göndermez. PAT RESET'e basıp tekrar deneyin.

---

## Kart modu: sağ panel kilitli

Kart bağlıyken sağ taraftaki debug paneli kilitlenir. Panelin üstünde
**Board connected** yazan bir şerit çıkar. Step, Run, Reset ve hız seçimi kapanır.
Üstte **Upload and Run**'ın yanındaki etiket **BOARD** olur; yükleme sırasında
**UPLOADING**, program kartta çalışırken **BOARD RUNNING** yazar.

Bu bir hata değil. Program kartın işlemcisinde çalışır ve kart sayfaya register ya da
bellek durumu göndermez. Bu yüzden panel kartta olanı göstermez. Editör, Assemble ve
Explorer kilitli değildir.

Simülatöre dönmek için iki yol var:

- **Disconnect**'e (bağlıyken Device düğmesi) basıp bağlantıyı kesin, ya da
- şeritteki **Simulate anyway** düğmesine basın. Bağlantı açık kalır; bir sonraki
  Upload paneli yeniden kilitler.

Doğru akış:

1. Önce **simülatörde** yaz, derle, Step/Back ile debug et, doğru çalıştığını gör.
2. Sonra **Upload and Run** ile aynı kodu karta gönder, gerçek donanımda
   (LED / motor / display) sonucu izle.

---

## Takılırsanız

- Terminalde `PAT:` çıkmıyor → kart monitörde değil. Karttaki **PAT RESET**'e tekrar bas.
- **Device** düğmesi gri, basılmıyor → tarayıcıda WebSerial yok. Sayfayı Chrome veya
  Edge'de aç.
- **Device**'a basınca açılan listede port yok → çeviricinin sürücüsü eksik ya da
  çevirici takılı değil. Port PuTTY gibi başka bir programda açıksa onu da kapat.
- Assemble hatası → kırmızı satırı ve alttaki mesajı oku; çoğu hata yanlış operand
  ya da tanımsız etikettir. Upload sırasında da aynı hata çıkar
  (`Error A02: Upload cancelled. Fix the assembler errors first:`) ve karta bir şey gitmez.
- **Seri port hatası:**
  - `Warning W01 ... Still listening.` → bir şey yapmanız gerekmez.
    Bazı çeviriciler PAT RESET sırasında bu hatayı üretir; sayfa dinlemeye devam eder.
  - `Error C04: Board link lost ...` → bağlantı koptu. Kabloyu ve
    çeviriciyi kontrol edin, **Device**'a tekrar basıp portu seçin, sonra PAT RESET.
  - `Error C01: Could not open the serial port.` → port başka bir yerde açık. Diğer workbench86
    sekmelerini ve PuTTY gibi programları kapatın, çeviriciyi çıkarıp takın, **Device**'a
    tekrar basın.
  - `Warning W03: This USB adapter has a Prolific PL2303 chip.` → yalnızca Windows'ta, seçtiğiniz
    çeviricide Prolific çipi varsa, port açılmadan önce bir kez çıkar. Sayfa portu yine de açar:
    çip orijinalse ya da eski sürücü kuruluysa bağlantı kurulur, bir şey yapmanız gerekmez.
    Ardından C07 gelirse bir alttaki adımlara bakın.
  - `Error C07: Could not open the USB adapter (Prolific PL2303 chip).` → çeviricide taklit
    Prolific PL2303 çipi var ve Windows'un yeni Prolific sürücüsü bu çipi çalıştırmıyor. Aygıt
    Yöneticisi'nde "THIS IS NOT PROLIFIC" ya da Kod 10 görünür. Çözüm: Aygıt Yöneticisi'nde
    cihazı sürücüsüyle birlikte kaldırın ("Bu aygıtın sürücü yazılımını silmeye çalış"),
    sonra eski bir Prolific sürücüsü kurun. Önce 3.8.38.2 sürücü paketini deneyin: `.cab`
    dosyasındaki dört dosyayı bir klasöre çıkarın, Sürücüyü güncelleştir → Sürücüler için
    bilgisayarıma gözat → listeden seçmeme izin ver → Disketi Var ile o klasörü seçin. Paket
    Microsoft imzalı, Windows kurmadan önce imzayı kendisi kontrol eder. Hâlâ "THIS IS NOT
    PROLIFIC" görünürse 3.3.2.105 kurulum dosyası işe yarıyor, ama dijital imzası yok, kaynağı
    doğrulanamıyor; kurmak sizin kararınız. FTDI, CH340 ya da CP2102 çipli bir çeviricide bu
    sorun yok.
  - `Error C05: Serial write error` → **Disconnect**, sonra **Device** ile yeniden bağlanın.
- `Error U04` (`[ABORT] The board left change-memory mode`) → yükleme sürerken PAT RESET'e basıldı ya
  da kart hata verdi. `G` gönderilmedi. PAT RESET, yeni `PAT:`, sonra tekrar Upload.
- `ERROR 33 : Uninitialized Interrupt Vector` → program kartta tanımlı olmayan bir kesmeye gitti.
  Kartta DOS ve BIOS yok: `INT 21H` ya da `INT 10H` yerine monitörün servisleri `INT 28H` ile
  çağrılır, çıkış `MOV AH,4` ve `INT 28H`. `INT 40H` de yanlış, `USER` ondalık 40, yani `28H`.
  Kesmeli programlarda vektörü `STI`'dan ve MUART'ta kesmeyi açmadan önce yazın.
- `ERROR 30 : Invalid Opcode Exception` → işlemci kod olmayan bir adrese gitti. Terminaldeki
  `TX: C 0080:xxxx` adresi ORG'unuzla aynı olmalı. Programınız kesme vektörü kuruyorsa
  vektörün gösterdiği adreste gerçekten kod olmalı.
- **Dosyalarınız:** My files ve açık sekmeler bu tarayıcıda kendiliğinden kaydedilir;
  sayfa yenilense, tarayıcı kapanıp açılsa da geri gelir. Bir örneği değiştirmeye
  başlayınca sayfa onu My files'a kopyalar, örnek dosyanın kendisi değişmez. Ama dosyalar
  yalnızca o bilgisayardaki o tarayıcıda durur: başka bir bilgisayarda yoktur, lab
  bilgisayarında aynı tarayıcıyı açan bir sonraki kişi ise onları görür. Safari de siteyi
  bir hafta açmazsanız dosyaları siler. Çıkmadan önce açık dosyayı Explorer'daki
  **Download** ile (kısayol: **Ctrl+S**), hepsini de My files satırındaki zip düğmesinden
  **Download all as zip** ile indirin.
- Chrome ve Edge'de My files'ı bilgisayarınızdaki bir klasöre bağlayabilirsiniz (My files
  satırının üzerine gelince çıkan klasör düğmesi). O zaman **Ctrl+S** dosyayı o klasöre
  kaydeder.
- Editörün üstünde `Files cannot be kept in this browser` yazıyorsa tarayıcı sayfanın dosya
  saklamasına izin vermiyor (ör. site verileri engelli). Sayfa yine çalışır ama
  yenilenince her şey gider; işinizi indirin.
  `Your saved files have not loaded yet` yazıyorsa tarayıcının deposu geç cevap veriyor;
  dosyalarınız gelince My files'a kendiliğinden döner.

## Hata kodları

Sayfa algılayabildiği her hatada kısa bir kod yazar: terminalde `[Error U01] ...`,
alttaki durum çubuğunda `Error U01: ...`. Uyarılar `Warning W01` diye geçer. Harf olduğu
için kartın kendi `ERROR 30` satırıyla karışmaz. Bir sorun olduğunda kodu bize yazın;
terminaldeki **Copy** düğmesi kaydın başına sürümü, tarayıcıyı, son kodu ve son yüklemeyi
de ekler, onu da gönderebilirsiniz.

| Kod | Ne oldu | Ne yapmalı |
|---|---|---|
| C01 | Port açılamadı, başka bir sekme ya da program kullanıyor | Diğer workbench86 sekmelerini ve PuTTY gibi programları kapat, çeviriciyi çıkarıp tak, Device |
| C02 | Port önceki bağlantıdan açık kalmış | Çeviriciyi çıkarıp tak, Device |
| C03 | Port açılırken başka bir hata | Çeviriciyi çıkarıp tak, Device |
| C04 | Kartla bağlantı koptu | Kabloyu kontrol et, Device, PAT RESET |
| C05 | Porta yazılamadı | Disconnect, sonra Device |
| C06 | Bağlı değilsin | Device |
| C07 | Windows, Prolific PL2303 çipli çeviriciyi açamadı; sebep çoğunlukla sürücü | Eski Prolific sürücüsünü kur (yukarıda, önce 3.8.38.2 paketi) ya da FTDI, CH340, CP2102 çipli çevirici kullan |
| U01 | Kart cevap vermedi; büyük ihtimalle önceki program hâlâ çalışıyor | PAT RESET, `PAT:` gelsin, tekrar Upload |
| U02 | `C` komutuna cevap gelmedi | PAT RESET, tekrar dene; tekrarlarsa Copy ile kaydı gönder |
| U03 | Bir blok yazıldıktan sonra `PAT:` gelmedi | PAT RESET, tekrar dene |
| U04 | Yükleme sürerken kart yazma modundan çıktı (PAT RESET'e basıldı ya da hata); `G` gönderilmedi | PAT RESET, `PAT:` gelsin, tekrar Upload |
| U05 | Yükleme sırasında bağlantı kapandı | Device ile yeniden bağlan, tekrar Upload |
| U06 | Başka bir iş (yükleme, G, T) sürüyor | Bitmesini bekle |
| U09 | Beklenmeyen durum | Copy ile kaydı gönder |
| A01 | Açık sekme `.asm` değil | Translate to ASM, sonra `.asm` sekmesini aç |
| A02 | Kod derlenmiyor, karta bir şey gitmedi | Assemble hatalarını düzelt |
| A03 | Program boş | Bir program yaz ya da aç |
| B01 | Kart `G`'den sonra `ERROR` yazdı (ör. `ERROR 30 : Invalid Opcode Exception`, `ERROR 33 : Uninitialized Interrupt Vector`) | `TX: C 0080:xxxx` adresi ORG'unla aynı mı bak; kesme vektörü kuruyorsan gösterdiği adreste kod olmalı |
| W01 | Seri hatta bozulma (Break, Framing vb.), sayfa dinlemeye devam ediyor | Genelde bir şey yapma; bazı çeviriciler PAT RESET'te bunu üretir. Sürekli tekrarlarsa kabloya bak |
| W02 | Yüklemede bazı byte'lara karttan cevap gelmedi | Program tuhaf davranırsa PAT RESET ve tekrar Upload |
| W03 | Windows'ta seçilen çeviricide Prolific PL2303 çipi var; taklitleri yeni sürücüyle açılmaz. Sayfa portu yine de açar | Bağlanırsa bir şey yapma; ardından C07 gelirse yukarıdaki adımlar |

---

## Donanım örnekleri ve bilinen sınırlar

- **Yükleme adresi:** Program kendi `ORG` adresine yüklenir ve oradan çalıştırılır.
  Komutlar segmenti de yazar: `ORG 0500H` için terminalde `TX: C 0080:0500` ve
  `TX: G 0080:0500` görünür. Bu `0080:` biçimi, Nisan 2026'da kartta çalışan sürümden
  geri getirildi. O sürüm her şeyi `0100`'e yüklüyordu; `0100` dışındaki bir ORG ile
  bu yol kartta henüz denenmedi.
- **Çoklu-`ORG` programları** (ör. pa27, pa29): her `ORG` bloğu ayrı bir `C 0080:...` ile
  yüklenir; aralardaki boş bölge gönderilmez. Bu da kartta henüz denenmedi.
- **T düğmesi:** Terminaldeki **T**, son yüklenen programın ORG'una `T 0080:xxxx`
  gönderir. Bu biçim kartta henüz denenmedi.
- **Organ/piyano:** `assignments/pa24-organ-keypad.asm` dosyasında 1..8 tuşları
  do'dan bir üst do'ya kadar gamı çalar, 0 tuşu programı bitirir. Simülatörde tuşlar PC
  klavyesinden gelir; orada hızı **Max** yapın, yoksa tek bir nota çok uzun sürer.
  Simülatör her tuşta aynı sesi verir; gerçek perdeler ancak kartta duyulur, ama bu
  örnek orada henüz denenmedi.
- **Keypad ve 7-seg display (gerçek kart):** Henüz sürülmüyor. Simülatörde keypad =
  PC klavyesi (INT 28H GETIN ile okunur) ve display = INT 28H metin çıktısı. Kart
  PC'ye bağlıyken `INT 28H` `WRCHAR` metni 7-seg ekrana değil, sayfadaki terminale
  gider (Nisan 2026'da kartta görüldü). Gerçek karttaki keypad/display
  denetleyicisinin bağlantısı henüz çözülmedi; bu yüzden `scripts/` klasöründe tek
  bir hazır yol yerine birkaç deneme (probe) programı var.
- **Canlı port aktarımı yok:** Simülatör çalışırken portlar gerçek karta
  yansıtılmaz. Desteklenen yol, programı karta yükleyip orada çalıştırmaktır.
