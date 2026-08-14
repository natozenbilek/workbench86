# workbench86: Labda Hızlı Kullanım (Microprocessors / BBM436)

Kısa cevap: **evet, her şeyi bu programla halledebilirsiniz.** Merlin'de takıldığınız
"dönüştürücü" derdi burada yok; program, assembly kodunu kendi içinde derliyor
(assemble) ve gerektiğinde gerçek karta doğrudan yüklüyor. Kurulum, indirme, DOSBox
vb. yok; tek bir web sayfası.

- **Tarayıcı:** Gerçek karta yükleme (Upload) için **Chrome veya Edge** kullanın
  (WebSerial yalnızca bunlarda var). Sadece simülasyon için Firefox/Safari de olur.
- **Proje linki:** https://natozenbilek.github.io/workbench86/

---

## A) Simülatörde çalışma (kart olmadan, her tarayıcıda)

1. Linki aç.
2. Soldaki **Explorer**'dan bir örnek seç (ör. `assignments/` klasörü), ya da yeni bir
   `.asm` dosyası açıp kendi kodunu yaz.
3. **Ctrl+Enter** (veya ▶ Assemble) → kod derlenir. Hata varsa ilgili satır kırmızı
   işaretlenir, en alttaki durum çubuğunda mesaj çıkar.
4. **Step** ile tek tek, **Run** ile akıcı çalıştır. Sağ paneldeki kartlardan
   register / bayrak (FLAGS) / bellek / stack / I/O durumunu izle. Sim çubuğundaki
   **←** düğmesi ile geri sar (zaman yolculuğu).
   - **Tüm hata ayıklamayı burada, simülatörde yapın.** Sağ panel yalnızca
     simülatörde canlıdır.

## B) Gerçek PAT kartına yükleme (Chrome/Edge şart)

5. Kartı bilgisayara **USB↔RS-232 (seri) çevirici** ile bağla (çeviricinin sürücüsü
   kurulu olmalı; değilse bilgisayar portu görmez).
6. Üstteki **Device** düğmesine bas → açılan listeden seri portu seç ve izni ver.
7. Karttaki **PAT RESET**'e bas → terminal panelinde `PAT:` istemi görünür (kart
   monitör modunda demektir).
8. **Upload and Run**'a bas → program karta byte byte yazılır ve `G` komutuyla
   çalıştırılır.

---

## En sık karıştırılan nokta

Karta yükleyip çalıştırınca **sağ taraftaki debug paneli ilerlemez, yani "donar". Bu
bir hata değil, normaldir.** Program artık kartın işlemcisinde çalışıyor; kart kendi
başına koştuğu için sayfaya canlı register durumu geri dönmez.

Doğru akış:

1. Önce **simülatörde** yaz, derle, Step/Back ile debug et, doğru çalıştığını gör.
2. Sonra **Upload and Run** ile aynı kodu karta gönder, gerçek donanımda
   (LED / motor / display) sonucu izle.

İki tarafı (simülatör + kart) aynı anda canlı izleyemezsiniz.

---

## Takılırsanız

- Terminalde `PAT:` çıkmıyor → kart monitörde değil. Karttaki **RESET**'e tekrar bas.
- **Device** listesinde port görünmüyor → çeviricinin sürücüsü eksik/yanlış olabilir;
  Chrome veya Edge kullandığından emin ol.
- Assemble hatası → kırmızı satırı ve alttaki mesajı oku; çoğu hata yanlış operand
  ya da tanımsız etikettir.
- Sayfayı yenilersen editördeki kod kaybolur (henüz otomatik kayıt yok). Kendi
  kodunu bilgisayarına kaydet.

---

## Donanım örnekleri ve bilinen sınırlar

- **Yükleme adresi:** Program artık kendi `ORG` adresine yüklenip oradan çalıştırılır
  (örn. `ORG 0500H` → `G 500`). Daha önce her şey `0100`'e yükleniyordu; bu yüzden
  `ORG`'u `0100` olmayan örnekler (pa19/25/26/27/28/29) "Invalid Opcode" (ERROR 30)
  veriyordu; bu düzeltildi.
- **Çoklu-`ORG` programları** (ör. pa27, pa29) artık her `ORG` bloğu ayrı yüklenir;
  aralardaki boş bölge gönderilmez, yükleme çok daha hızlıdır.
- **Organ/piyano:** `assignments/pa24-organ-keypad.asm` dosyasında 1..8 tuşları
  do-re-mi... çalar (simülatörde tuşlar PC klavyesinden gelir).
- **Keypad ve 7-seg display (gerçek kart):** Henüz sürülmüyor. Simülatörde keypad =
  PC klavyesi (INT 28H GETIN ile okunur) ve display = INT 28H metin çıktısı. Gerçek
  karttaki keypad/display denetleyicisinin bağlantısı henüz çözülmedi; bu yüzden
  `scripts/` klasöründe tek bir hazır yol yerine birkaç deneme (probe) programı var.
- **Canlı port aktarımı yok:** Simülatör çalışırken portlar gerçek karta
  yansıtılmaz. Desteklenen yol, programı karta yükleyip orada çalıştırmaktır.
