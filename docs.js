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
      tag: 'Kernel',
      desc: 'Kuantum sonrası kafes tabanlı şifreleme sistemleri için özel tasarlanmış çekirdek.',
      docs: [
        {
          id: 'giris',
          title: 'Giriş & Genel Bakış',
          md: `# QuantumOS — Genel Bakış

QuantumOS; Dünya genelinde kuantum sonrası kafes tabanlı şifreleme sistemleri, izojeni tabanlı şifreleme ve kod tabanlı şifreleme sistemlerinin anlaşılması ve uygulanması için geliştirilen orta ölçekli bir işletim sistemi çekirdeğidir. Sıfırdan 64-bit olarak tasarlanmış ve yeni Nox Standartları'na uygun bir biçimce tasarlanmıştır. Çekirdek kendi bünyesinde bir çok sayısal kütüphane barındır. Genel kurallarımız nedeniyle; hiç bir şekilde hazır kod, kütüphane veya araç barındırmaz. Bilimsel araştırmalara destek amaçlı bir çok aracı, kütüphaneyi bünyesinde barındırır.

> **Not:** Bu dökümanlar geliştirme süreciyle birlikte güncellenir. Katkı önerileri için GitHub üzerinden iletişime geçebilirsiniz. [url: https://www.github.com/erkanalperen54-boop/QuantumOS]`
        },
        {
          id: 'dosya-yapisi',
          title: 'Genel Dosya Yapısı',
          md: `# Dosya Yapısı 

QuantumOS ~300 farklı betiğin bir araya gelmesi ile oluşur. Genel Klasör açıklaması:
- `kern`: Bu klasör QuantumOS'in temel çekirdeğini içinde barındırır; gerekli çağrılar, kesme yönetimleri, sistem izlencileri vb. kritik araçlar ve modülleri bünyesinde barındırır.
- `libkern`: Bu klasör çekirdek ve bilimsel araştırmalar için sistem kütüphanelerini bünyesinde barındırır.
- `ipc`: Bu klasör sistem genelinde çökmelere karşı dirençli, süreçler arasında iletişimi sağlar.
- `boot`: Bu klasör iki farklı sisteme (Risc-v ve x86_64) uygun çekirdek başlatma rutinlerini sağlar.
- `crypto`: Bu klasör bilimsel araştırmalar için bünyesinde; kafes tabanlı şifreleme sistemi (`crypto/lattice-based/`), izojeni tabanlı şifreleme sistemi (`crypto/separated/`), kod tabanlı şifreleme (`crypto/code-based/`), klasik şifreleme sistemleri (`crypto/cryptofs/`) ve genel amaçlı kauntum sonrası şifreleme sistemlerini (`crypto/quantum-based/`) barındırır.
- `include`: bu klasör klasik şifreleme sistemi ve matematik kütüphanesi için geliştirilmiştir (**Oynanması veya değiştirilmesi önerilmez**).

> Geliştirmelere bağlı şekilde diğer sayfalar eklenecektir :D`
        },
      ]
    },

    /* ---------------- NeOx Ekosistemi ---------------- */
    {
      id: 'neox',
      name: 'NeOx Ekosistemi',
      tag: 'Kernel + RTOS + OS + Standards + Librarys etc.',
      desc: 'Stux6 ekosistemi',
      docs: [
        {
          id: 'neox-genel-bakıs',
          title: 'Mimari Genel Bakış',
          md: `# NeOx Ekosistemi — Mimari

**NeOx**, savunma sanayii, kritik ulusal altyapılar ve yüksek gizlilik gerektiren kurumsal operasyonlar için tasarlanmış; donanım tabanlı izolasyon ve yerleşik post-kuantum kriptografi sunan tescilli, kapalı kaynaklı bir çekirdek ekosistemidir.

##  Hedef Alanlar ve Kritik Sektörler

Geleneksel işletim sistemlerinin sunduğu yazılımsal güvenlik katmanları, ulusal ve kurumsal düzeydeki gelişmiş tehdit aktörleri karşısında yetersiz kalmaktadır. NeOx ekosistemi şu kritik alanlarda tavsuziz güvenlik sağlamak üzere inşa edilmiştir:

* **Savunma Sanayii:** Askeri haberleşme, komuta-kontrol sistemleri ve taktiksel donanım entegrasyonları.
* **Kritik Altyapılar:** Enerji, nükleer SCADA simülasyonları ve kritik şebeke kontrolü.
* **İletişim ve Veri Gizliliği:** Devlet kurumları ve finansal yapılar için sızdırılamaz veri akış kanalları.

---

##  Mimari Üstünlükler ve Güvenlik Seviyesi

NeOx, sıradan çekirdek mimarilerinden farklı olarak en alt silisyum katmanından kullanıcı alanına kadar her aşamada sıkılaştırılmış güvenlik prensiplerini benimser:

* **Yerleşik Post-Kuantum Kriptografi:** Kafes tabanlı (Lattice-based) ve izojeni tabanlı (Isogeny-based) şifreleme algoritmaları, geleceğin kuantum bilgisayarlarının kıramayacağı matematiksel zırhlar sunar.
* **Derin Donanım Hakları (Ring -3, -2, -1):** İşletim sisteminin standart çekirdek halkalarının (Ring 0) da ötesine geçerek; Hypervisor, SMM (System Management Mode) ve donanım firmware katmanlarında tam denetim ve yalıtım sağlar.
* **EAL7 Seviyesi Güvenlik Hedefi:** Biçimsel doğrulama (formal verification) ve en yüksek düzeyde güvenlik değerlendirme kriterlerine uygun mimari tasarım.
* **Tescilli ve Kapalı Kaynak (Proprietary):** Dışarıdan gelebilecek zafiyet taramalarına ve tedarik zinciri saldırılarına karşı tamamen izole, Stux6 Technology standartlarıyla korunan kod tabanı.`
        }
      ]
    }

  ]
};
