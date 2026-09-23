/* ============================================================
   /docs — Açık kaynak proje dökümanları (Markdown)
   Yeni not eklemek için: ilgili projenin docs dizisine
   { id:'benzersiz-id', title:'Başlık', md: `...markdown...` }
   nesnesi eklemen yeterli. id'ler URL hash'inde kullanılır:
   /docs#neox-ekosistemi/mimari-genel-bakis
   ============================================================ */
window.DOCS_DATA = {

  projects: [

    /* ---------------- QuantumOS ---------------- */
    {
      id: 'quantumos',
      name: 'QuantumOS',
      tag: 'İşletim Sistemi',
      desc: 'Deneysel işletim sistemi mimarisi — çekirdek tasarımı, zamanlayıcı ve bellek yönetimi notları.',
      docs: [
        {
          id: 'giris',
          title: 'Giriş & Genel Bakış',
          md: `# QuantumOS — Genel Bakış

QuantumOS, düşük seviyeli sistem programlama pratiklerini ve modern çekirdek tasarım ilkelerini bir araya getiren deneysel bir işletim sistemi projesidir.

## Tasarım Hedefleri

- **Sıfır bağımlılık (zero-dependency):** Harici kütüphane yok; saf C ve Assembly.
- **Modüler mimari:** Her alt sistem bağımsız derlenir ve test edilir.
- **Okunabilirlik:** Çekirdek kodu, dökümanıyla birlikte yaşar.

## Alt Sistemler

| Alt Sistem | Durum | Açıklama |
|---|---|---|
| Bootloader | ✅ Kararlı | Multiboot2 uyumlu |
| Bellek Yöneticisi | 🚧 Geliştirme | PMM + VMM (4 KiB sayfalar) |
| Zamanlayıcı | 🚧 Geliştirme | Preemptive, tick tabanlı |
| Dosya Sistemi | 📋 Planlandı | VFS katmanı tasarım aşamasında |

> **Not:** Bu dökümanlar geliştirme süreciyle birlikte güncellenir. Katkı önerileri için GitHub üzerinden iletişime geçebilirsiniz.`
        },
        {
          id: 'bellek-yonetimi',
          title: 'Bellek Yönetimi',
          md: `# Bellek Yönetimi

QuantumOS bellek yönetimi iki katmandan oluşur:

## 1. Fiziksel Bellek Yöneticisi (PMM)

Açılışta bootloader'dan gelen bellek haritası okunur ve kullanılabilir bölgeler **bitmap** ile işaretlenir.

\`\`\`c
/* pmm.c — sayfa tahsisi */
uint64_t pmm_alloc_page(void) {
    for (uint64_t i = 0; i < bitmap_pages; i++) {
        if (!bitmap_test(i)) {
            bitmap_set(i);
            return i * PAGE_SIZE;   /* 4 KiB */
        }
    }
    return 0; /* bellek yok */
}
\`\`\`

## 2. Sanal Bellek Yöneticisi (VMM)

- 4 seviyeli sayfa tablosu (PML4 → PDP → PD → PT)
- Kimlik eşleme (identity mapping) yalnızca açılışta kullanılır
- Kernel alanı yüksek yarım küreye taşınır (**higher-half kernel**)

## Tasarım Kararları

1. Bitmap, serbest liste yerine tercih edildi — tahmin edilebilir tahsis süresi sağlar.
2. Slab allocator, çekirdek nesneleri için ikinci aşamada eklenecek.`
        },
        {
          id: 'zamanlayici',
          title: 'Zamanlayıcı (Scheduler)',
          md: `# Zamanlayıcı Tasarımı

QuantumOS zamanlayıcısı **preemptive** ve **round-robin** temellidir.

## Temel Kavramlar

- **Tick:** APIC timer üzerinden periyodik kesme (varsayılan 100 Hz)
- **Run queue:** Hazır görevlerin tutulduğu döngüsel liste
- **Context switch:** Görev kaydedicileri stack üzerine kaydedilir, RSP değiştirilir

## Bağlam Değişimi

\`\`\`nasm
; switch_context(prev_rsp: rdi, next_rsp: rsi)
switch_context:
    push rbp
    push rbx
    push r12
    push r13
    push r14
    push r15
    mov  [rdi], rsp      ; önceki görevin stack'ini kaydet
    mov  rsp, [rsi]      ; yeni görevin stack'ine geç
    pop  r15
    pop  r14
    pop  r13
    pop  r12
    pop  rbx
    pop  rbp
    ret
\`\`\`

## Yol Haritası

- [ ] Öncelikli kuyruk desteği
- [ ] SMP (çok çekirdek) dengeleme
- [ ] Gerçek zamanlı sınıf (RT class)`
        }
      ]
    },

    /* ---------------- NeOx Ekosistemi ---------------- */
    {
      id: 'neox-ekosistemi',
      name: 'NeOx Ekosistemi',
      tag: 'Kernel + RTOS',
      desc: 'Stux6 Technologies amiral gemisi — NeOx-Kernel mimarisi, IPC tasarımı ve RTOS bileşenleri.',
      docs: [
        {
          id: 'mimari-genel-bakis',
          title: 'Mimari Genel Bakış',
          md: `# NeOx Ekosistemi — Mimari

NeOx, **NeOx-Kernel** çekirdeği etrafında şekillenen; gömülü ve gerçek zamanlı sistemleri hedefleyen bir ekosistemdir.

## Katmanlar

1. **NeOx-Kernel** — Hibrit çekirdek: mikroçekirdek modülerliği + monolitik performans
2. **NeOx-RTOS** — Deterministik zamanlama gerektiren gömülü uygulamalar için profil
3. **Sistem Servisleri** — Sürücüler, ağ yığını, güvenlik modülleri (kullanıcı alanında)

## İlkeler

- **Zero-dependency:** Tüm kod tabanı kendi araç zinciriyle derlenir.
- **Least privilege:** Sürücüler dahil her bileşen minimum yetkiyle çalışır.
- **Auditability:** Her sistem çağrısı izlenebilir ve kayıt altına alınabilir.

> NeOx, savunma sanayii gereksinimleri doğrultusunda yüksek güvenlikli gömülü çözümler için tasarlanmaktadır.`
        },
        {
          id: 'ipc-tasarimi',
          title: 'IPC Tasarımı',
          md: `# Süreçler Arası İletişim (IPC)

NeOx IPC mekanizması, Mach'tan ilham alan ancak daha sade bir **port + mesaj** modeli kullanır.

## Temel Yapı

\`\`\`c
typedef struct {
    uint32_t  msg_id;
    uint32_t  size;
    uint64_t  port;      /* hedef port */
    uint8_t   payload[]; /* esnek veri */
} neox_msg_t;
\`\`\`

## Özellikler

- **Senkron iletişim:** Gönderen, yanıt gelene kadar bloklanır (deterministik davranış)
- **Zero-copy:** Büyük veriler sayfa paylaşımı ile aktarılır, kopya yapılmaz
- **Yetki (capability) tabanlı port hakları:** Bir porta yazma hakkı açıkça devredilmelidir

## Neden senkron?

RTOS profilinde öngörülebilirlik esastır; asenkron kuyrukların getirdiği belirsiz gecikme kabul edilemez. Senkron model, öncelik devri (priority inheritance) ile birlikte kilitlenme senaryolarında üst sınır garantisi verir.`
        },
        {
          id: 'guvenlik-modeli',
          title: 'Güvenlik Modeli',
          md: `# NeOx Güvenlik Modeli

## Tehdit Varsayımları

- Kullanıcı alanındaki her bileşen **potansiyel olarak düşmanca** kabul edilir
- Sürücü hataları çekirdeği etkilememelidir

## Savunma Katmanları

| Katman | Mekanizma |
|---|---|
| Bellek | Sayfa bazlı izolasyon, W^X politikası |
| Yetki | Capability tabanlı erişim kontrolü |
| Kripto | **Kafes tabanlı (lattice-based)** algoritmalar — post-quantum dayanıklılık |
| İzleme | Sistem çağrısı denetim günlüğü (audit log) |

## Kafes Tabanlı Kriptografi

NeOx'ta kimlik doğrulama ve bütünlük doğrulama süreçlerinde klasik RSA/ECC yerine **CRYSTALS-Kyber / Dilithium** ailesinden ilham alan yapılar değerlendirilmektedir. Amaç, kuantum sonrası dönemde de güvenli kalacak bir temel atmaktır.

\`\`\`
[ Anahtar Üretimi ] → [ Kapsülleme ] → [ Paylaşılan Sır ]
   (Dilithium imzası her aşamada bütünlüğü doğrular)
\`\`\`

## İlke

> Güvenlik bir özellik değil, mimarinin kendisidir.`
        }
      ]
    }

  ]
};
