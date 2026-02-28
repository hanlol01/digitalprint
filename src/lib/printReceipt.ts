import type { PaymentMethod, TransactionItemType } from "@/types";
import { PAYMENT_METHOD_LABELS } from "@/types";

// Tipe data untuk nota / struk

export interface ReceiptItem {
  name: string;
  itemType: TransactionItemType;
  material: string;
  finishing: string;
  quantity: number;
  width?: number;
  height?: number;
  subtotal: number;
}

export interface ReceiptData {
  orderNumber: string;
  date: Date;
  cashierName: string;
  customerName: string;
  customerPhone: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount?: number;
  remainingDebt?: number;
}

// Konfigurasi Toko (Edit sesuai kebutuhan)

const STORE_CONFIG = {
  name: "One Stop Digital Printing",
  address: "Jl. Bagusrangin No.20, Lebakgede, Kecamatan Coblong",
  city: "Kota Bandung, 40132",
  phone: "0812-3456-7890",
  footerLine1: "Terima kasih atas kunjungan Anda!",
  footerLine2: "Barang yang sudah dibeli tidak dapat dikembalikan. Jika ada yang ingin ditanyakan, silahkan hubungi kami.",
  footerLine3: "Lanjut",
};

// Helper format

const fmtCurrency = (v: number): string =>
  `Rp ${Math.round(v).toLocaleString("id-ID")}`;

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtTime = (d: Date): string =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const typeLabel: Record<TransactionItemType, string> = {
  produk: "Produk",
  jasa: "Jasa",
  display: "Display",
};

// Bangun HTML struk thermal 58mm / 80mm

function buildReceiptHTML(data: ReceiptData): string {
  const paymentLabel =
    PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod;

  // Bangun baris item
  const itemsHTML = data.items
    .map((item) => {
      const dimLabel =
        item.width && item.height ? ` (${item.width} x ${item.height})` : "";
      return `
        <tr class="item-row">
          <td colspan="2" class="item-name">
            ${escapeHTML(item.name)}
            <span class="item-type">[${typeLabel[item.itemType]}]</span>
          </td>
        </tr>
        <tr class="item-detail-row">
          <td class="item-detail">
            ${item.quantity}x${dimLabel}
            &nbsp;&middot;&nbsp;${escapeHTML(item.material)}
            ${item.finishing !== "Tanpa Finishing" ? `&nbsp;&middot;&nbsp;${escapeHTML(item.finishing)}` : ""}
          </td>
          <td class="item-price">${fmtCurrency(item.subtotal)}</td>
        </tr>`;
    })
    .join("");

  // Bangun baris pembayaran
  let paymentRows = "";

  if (data.paymentMethod === "piutang") {
    paymentRows = `
      <tr>
        <td>Metode</td>
        <td class="val">${escapeHTML(paymentLabel)}</td>
      </tr>
      <tr>
        <td>Uang Muka (DP)</td>
        <td class="val">${fmtCurrency(data.amountPaid)}</td>
      </tr>
      <tr class="highlight">
        <td>Sisa Piutang</td>
        <td class="val">${fmtCurrency(data.remainingDebt ?? 0)}</td>
      </tr>`;
  } else {
    paymentRows = `
      <tr>
        <td>Metode</td>
        <td class="val">${escapeHTML(paymentLabel)}</td>
      </tr>
      <tr>
        <td>Bayar</td>
        <td class="val">${fmtCurrency(data.amountPaid)}</td>
      </tr>
      <tr>
        <td>Kembalian</td>
        <td class="val">${fmtCurrency(data.changeAmount ?? 0)}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>Nota ${escapeHTML(data.orderNumber)}</title>
<style>
  /* Reset & Page */
  @page { margin: 0; size: 80mm auto; }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
    width: 80mm;
    max-width: 80mm;
    padding: 3mm 4mm;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
  }

  /* Header Toko */
  .store-header { text-align: center; padding-bottom: 4px; }
  .store-name {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .store-info { font-size: 10px; color: #333; }

  /* Divider */
  .divider {
    border: none;
    border-top: 1px dashed #000;
    margin: 5px 0;
  }
  .divider-double {
    border: none;
    border-top: 2px double #000;
    margin: 5px 0;
  }

  /* Meta info */
  .meta-table { width: 100%; font-size: 11px; }
  .meta-table td { padding: 1px 0; vertical-align: top; }
  .meta-table .label { width: 70px; color: #555; }

  /* Items */
  .items-table { width: 100%; border-collapse: collapse; }
  .item-row .item-name {
    font-weight: bold;
    font-size: 12px;
    padding-top: 4px;
  }
  .item-type {
    font-weight: normal;
    font-size: 9px;
    color: #666;
  }
  .item-detail-row .item-detail {
    font-size: 10px;
    color: #444;
    padding-left: 4px;
    padding-bottom: 2px;
  }
  .item-detail-row .item-price {
    font-size: 11px;
    text-align: right;
    white-space: nowrap;
    vertical-align: bottom;
    padding-bottom: 2px;
  }

  /* Summary */
  .summary-table { width: 100%; font-size: 11px; }
  .summary-table td { padding: 1px 0; }
  .summary-table .val { text-align: right; }
  .summary-table .total-row td {
    font-size: 14px;
    font-weight: 900;
    padding-top: 4px;
    padding-bottom: 4px;
  }
  .summary-table .discount { color: #c00; }

  /* Payment */
  .payment-table { width: 100%; font-size: 11px; }
  .payment-table td { padding: 1px 0; }
  .payment-table .val { text-align: right; font-weight: bold; }
  .payment-table .highlight td { font-weight: bold; }

  /* Footer */
  .footer {
    text-align: center;
    font-size: 10px;
    color: #555;
    padding-top: 4px;
  }
  .footer .thanks {
    font-size: 12px;
    font-weight: bold;
    color: #000;
    margin-bottom: 2px;
  }

  /* Print */
  @media print {
    body { width: 80mm; max-width: 80mm; padding: 2mm 3mm; }
    .no-print { display: none !important; }
  }

  /* Screen preview button */
  .print-btn {
    display: block;
    width: 100%;
    margin: 10px 0;
    padding: 8px;
    font-size: 13px;
    font-weight: bold;
    background: #000;
    color: #fff;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }
  .print-btn:hover { background: #333; }
</style>
</head>
<body>

  <!-- Tombol cetak (hanya tampil di layar, tidak ikut tercetak) -->
  <button class="print-btn no-print" onclick="window.print()">CETAK NOTA</button>

  <!-- HEADER TOKO -->
  <div class="store-header">
    <div class="store-name">${escapeHTML(STORE_CONFIG.name)}</div>
    <div class="store-info">${escapeHTML(STORE_CONFIG.address)}</div>
    <div class="store-info">${escapeHTML(STORE_CONFIG.city)}</div>
    <div class="store-info">Telp: ${escapeHTML(STORE_CONFIG.phone)}</div>
  </div>

  <hr class="divider-double"/>

  <!-- INFO TRANSAKSI -->
  <table class="meta-table">
    <tr>
      <td class="label">No. Order</td>
      <td>: ${escapeHTML(data.orderNumber)}</td>
    </tr>
    <tr>
      <td class="label">Tanggal</td>
      <td>: ${fmtDate(data.date)}</td>
    </tr>
    <tr>
      <td class="label">Waktu</td>
      <td>: ${fmtTime(data.date)}</td>
    </tr>
    <tr>
      <td class="label">Kasir</td>
      <td>: ${escapeHTML(data.cashierName)}</td>
    </tr>
    <tr>
      <td class="label">Pelanggan</td>
      <td>: ${escapeHTML(data.customerName)}</td>
    </tr>
    <tr>
      <td class="label">Telepon</td>
      <td>: ${escapeHTML(data.customerPhone)}</td>
    </tr>
  </table>

  <hr class="divider"/>

  <!-- DAFTAR ITEM -->
  <table class="items-table">
    ${itemsHTML}
  </table>

  <hr class="divider"/>

  <!-- RINGKASAN -->
  <table class="summary-table">
    <tr>
      <td>Subtotal (${data.items.length} item)</td>
      <td class="val">${fmtCurrency(data.subtotal)}</td>
    </tr>
    ${
      data.discount > 0
        ? `<tr class="discount">
             <td>Diskon</td>
             <td class="val">-${fmtCurrency(data.discount)}</td>
           </tr>`
        : ""
    }
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="val">${fmtCurrency(data.grandTotal)}</td>
    </tr>
  </table>

  <hr class="divider"/>

  <!-- PEMBAYARAN -->
  <table class="payment-table">
    ${paymentRows}
  </table>

  <hr class="divider-double"/>

  <!-- FOOTER -->
  <div class="footer">
    <div class="thanks">${escapeHTML(STORE_CONFIG.footerLine1)}</div>
    <div>${escapeHTML(STORE_CONFIG.footerLine2)}</div>
    <div style="margin-top:4px">${escapeHTML(STORE_CONFIG.footerLine3)}</div>
  </div>

</body>
</html>`;
}

// Fungsi utama: Buka jendela cetak nota

export function printReceipt(data: ReceiptData): void {
  const html = buildReceiptHTML(data);

  const printWindow = window.open("", "_blank", "width=350,height=700");
  if (!printWindow) {
    alert("Popup diblokir browser. Izinkan popup untuk mencetak nota.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Tunggu konten dimuat, lalu otomatis buka dialog cetak
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
}

// Utility: Escape HTML untuk mencegah XSS

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

