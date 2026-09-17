import { call } from "@/utils/apiWrapper"
import { logger } from "@/utils/logger"

const log = logger.create('PrintInvoice')

/**
 * Print invoice using Frappe's print format system
 * @param {Object} invoiceData - The invoice document data
 * @param {string} printFormat - The print format name (optional)
 * @param {string} letterhead - The letterhead name (optional)
 * @note Use "POS Next Receipt" format for thermal printer (80mm) or configure via POS Profile
 */
export async function printInvoice(
	invoiceData,
	printFormat = null,
	letterhead = null,
) {
	try {
		if (!invoiceData || !invoiceData.name) {
			throw new Error("Invalid invoice data")
		}

		// Handle offline invoices - they always use custom local print format
		if (invoiceData.name.startsWith("OFFLINE-")) {
			log.info("Printing offline invoice using local template")
			return printInvoiceCustom(invoiceData)
		}

		const doctype = invoiceData.doctype || "Sales Invoice"
		const format = printFormat || "POS Next Receipt"

		// Build PDF print URL
		const params = new URLSearchParams({
			doctype: doctype,
			name: invoiceData.name,
			format: format,
			no_letterhead: letterhead ? 0 : 1,
			_lang: "en",
			trigger_print: 1,
			_t: Date.now(), // Cache buster to force fresh print format
		})

		if (letterhead) {
			params.append("letterhead", letterhead)
		}

		// Open PDF in new window - browser will handle print dialog
		const printUrl = `/printview?${params.toString()}`
		const printWindow = window.open(printUrl, "_blank", "width=800,height=600")

		if (!printWindow) {
			throw new Error(
				"Failed to open print window. Please check your popup blocker settings.",
			)
		}

		return true
	} catch (error) {
		log.error("Error printing with Frappe print format:", error)
		// Fallback to custom print format
		return printInvoiceCustom(invoiceData)
	}
}

/**
 * Generates and prints a custom POS receipt using a thermal printer layout.
 *
 * This fallback printer is used when Frappe's standard print format is unavailable.
 * The receipt is optimized for 80mm thermal printers with clean, readable formatting.
 *
 * Receipt Structure:
 * - Header: Company name and invoice type
 * - Info: Invoice number, date, customer, payment status
 * - Items: Each item shows quantity × original price = subtotal
 * - Discounts: Displayed as separate line items with negative amounts
 * - Totals: Subtotal, tax, and grand total
 * - Payments: Payment methods and amounts, change, outstanding balance
 * - Footer: Thank you message and branding
 *
 * @param {Object} invoiceData - The invoice document data from ERPNext
 * @param {string} invoiceData.name - Invoice number
 * @param {string} invoiceData.company - Company name
 * @param {Array} invoiceData.items - Invoice line items
 * @param {Array} invoiceData.payments - Payment records
 * @param {number} invoiceData.grand_total - Invoice total amount
 */
export function printInvoiceCustom(invoiceData) {
	// Open print window with receipt size dimensions (80mm ≈ 302px at 96 DPI)
	const printWindow = window.open("", "_blank", "width=400,height=600")

	// Helper to format values similar to Frappe's get_formatted
	const formatValue = (val, type) => {
		if (val === undefined || val === null) return "-"
		if (type === "currency") return formatCurrency(val)
		return val
	}

	const printContent = `
		<!DOCTYPE html>
		<html dir="rtl">
		<head>
			<meta charset="UTF-8">
			<title>${invoiceData.name}</title>
			<style>
				/* General */
				@page { 
					size: 80mm auto; 
					margin: 0;
				}
				
				body {
					margin: 0;
					padding: 0;
					background: #fff;
				}

				.print-format {
					direction: rtl;
					font-family: "Tahoma", "Arial", sans-serif;
					font-size: 10pt;
					color: #111;
					width: 80mm;
					padding: 2px;
					margin: 0 auto;
				}

				.print-format p, .print-format td, .print-format th, .print-format div {
					line-height: 1.4;
					vertical-align: middle;
				}

				/* Header */
				.pf-header { text-align: center; margin-bottom: 5px; }
				.pf-logo { max-width: 90px; height: 90px; display: block; margin: 0 auto 2px; }
				.pf-title { font-weight: 700; font-size: 10pt; margin-top: 2px; }

				/* Info block */
				.pf-info { margin: 5px 0; font-size: 9pt; direction: rtl; }
				.pf-info b { display: inline-block; min-width: 70px; text-align: right; margin-left: 4px; }

				/* Table styles */
				table.pf-table {
					left: 55%;
					width: 95%;
					border-collapse: collapse;
					font-size: 8pt;
					color:black;
					table-layout: fixed;
					page-break-inside: auto;
				}
				table.pf-table th, table.pf-table td {
					border: 1px solid #ccc;
					padding: 4px;
					word-wrap: break-word;
				}
				table.pf-table thead th {
					background: #f6f6f6;
					font-weight: 800;
					text-align: center;
				}
				.text-left { text-align: left; direction: ltr; }
				.text-right { text-align: right; }
				.text-center { text-align: center; }
				.small { font-size: 8pt; }

				/* Totals area */
				.pf-totals { margin-top: 5px; width: 100%; font-size: 7pt; border-collapse: collapse; }
				.pf-totals td { padding: 3px 4px; border: none; }
				.pf-totals .label { text-align: right; width: 65%; font-weight: 800; }
				.pf-totals .value { text-align: right; width: 35%; direction: ltr; }

				hr.sep { border: none; border-top: 1px dashed #ccc; margin: 5px 0; }

				/* Footer */
				.pf-footer { text-align: center; margin-top: 5px; font-size: 9pt; }

				@media print {
					.no-print { display: none; }
					.print-format { width: 80mm; padding: 1mm; }
				}
			</style>
			<!-- Load JS once, non-blocking -->
			<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js" async></script>
		</head>
		<body>
			<div class="print-format">
				<div class="pf-header">
					<div class="pf-title">${invoiceData.select_print_heading || "فاتورة / Invoice"}</div>
				</div>

				<div class="pf-info">
					<div style="display:flex; justify-content:space-between; align-items:center; gap:4px; margin-bottom:4px;">
						<div style="text-align:right; min-width:55%;">
							<b>رقم الفاتورة:</b>
							<span>${invoiceData.name}</span>
						</div>
						<div style="text-align:right; min-width:45%; direction:ltr;">
							<b>التاريخ:</b>
							<span>${invoiceData.posting_date || new Date().toISOString().split('T')[0]}</span>
						</div>
					</div>

					<div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
						<div style="text-align:right; min-width:55%;">
							<b>اسم العميل:</b>
							<span>${invoiceData.customer_name || invoiceData.customer || "-"}</span>
						</div>
						<div style="text-align:right; min-width:45%; direction:ltr;">
							<b>الكاشير:</b>
							<span>${invoiceData.owner || "-"}</span>
						</div>
					</div>
				</div>

				<!-- Barcode -->
				<div style="text-align:center; margin:8px 0;">
					<div style="display:inline-block; padding:4px; border:1px dashed #999; border-radius:4px;">
						<svg id="invoice-barcode" style="width:100%; max-width:100%; height:35px;"></svg>
					</div>
					<div class="small" style="margin-top:4px; letter-spacing:0.5px;">${invoiceData.name}</div>
				</div>

				<hr class="sep">

				<table class="pf-table">
					<thead>
						<tr>
							<th style="width:40%; color:#000;">الصنف / Item</th>
							<th style="width:15%; color:#000;">الكمية</th>
							<th style="width:22%; color:#000;">سعر الوحدة</th>
							<th style="width:23%; color:#000;">المبلغ</th>
						</tr>
					</thead>
					<tbody>
						${(invoiceData.items || []).map(item => `
							<tr>
								<td style="vertical-align: top; text-align: right;">
									${item.item_code}
									${item.item_name && item.item_name !== item.item_code ? `<br><span class="small">${item.item_name}</span>` : ""}
									${item.serial_no ? `<br><span class="small"><b>SR.No:</b> ${item.serial_no.replace(/\n/g, ", ")}</span>` : ""}
								</td>
								<td class="text-center">${item.qty || item.quantity}</td>
								<td class="text-right" style="direction: ltr;">${formatCurrency(item.rate)}</td>
								<td class="text-right" style="direction: ltr; font-size: 9px;">${formatCurrency(item.amount || (item.qty || item.quantity) * item.rate)}</td>
							</tr>
						`).join("")}
					</tbody>
				</table>

				<table class="pf-totals">
					<tbody>
						${(invoiceData.taxes || []).filter(t => !t.included_in_print_rate).map(tax => `
							<tr>
								<td class="label">${tax.description || "Tax"}</td>
								<td class="value">${formatCurrency(tax.tax_amount)}</td>
							</tr>
						`).join("")}

						${invoiceData.discount_amount ? `
							<tr>
								<td class="label">الخصم / Discount</td>
								<td class="value">-${formatCurrency(invoiceData.discount_amount)}</td>
							</tr>
						` : ""}
						
						<tr>
							<td class="label"><b>الإجمالي الكلي / TOTAL</b></td>
							<td class="value"><b>${formatCurrency(invoiceData.grand_total)}</b></td>
						</tr>

						${(invoiceData.payments || []).map(p => `
							<tr>
								<td class="label">${p.mode_of_payment}</td>
								<td class="value">${formatCurrency(p.amount)}</td>
							</tr>
						`).join("")}

						<tr>
							<td class="label"><b>المدفوع / Paid</b></td>
							<td class="value"><b>${formatCurrency(invoiceData.paid_amount)}</b></td>
						</tr>

						${invoiceData.change_amount ? `
							<tr>
								<td class="label">الباقي / Change</td>
								<td class="value">${formatCurrency(invoiceData.change_amount)}</td>
							</tr>
						` : ""}
					</tbody>
				</table>

				<hr class="sep">

				<p class="pf-footer">${invoiceData.terms || ""}</p>
				<p class="pf-footer">شكراً لثقتك بألوان المنزل رجوعك يفرحنا، وبيتك ومطبخك يستاهلوا الأفضل</p>
			</div>

			<div class="no-print" style="text-align: center; margin: 15px 0;">
				<button onclick="window.print()" style="padding: 8px 16px; cursor: pointer;">Print</button>
				<button onclick="window.close()" style="padding: 8px 16px; cursor: pointer; margin-left: 8px;">Close</button>
			</div>

			<script>
				(function() {
					var tryRender = function() {
						if (window.JsBarcode) {
							try {
								var raw = "${invoiceData.name}";
								var digits = raw.replace(/\D/g, "");
								var value = digits.length >= 9 ? digits.slice(-15) : raw.slice(-15);

								JsBarcode("#invoice-barcode", value, {
									format: "CODE128",
									displayValue: false,
									height: 30,
									margin: 2,
									width: 1.2,
									lineColor: "#000",
									background: "transparent"
								});
								
								// Set up auto-close before triggering print
								window.onafterprint = function() {
									window.close();
								};

								// Short delay to ensure SVG is painted and then print
								setTimeout(function() { 
									window.print();
									// Fallback for browsers that don't support onafterprint properly
									// or if the print dialog doesn't block
									setTimeout(function() {
										// We only close if the window is still open (some browsers close it via onafterprint)
										if (!window.closed) {
											// A small extra delay to ensure the user has time to see the dialog
											// but since print() is usually blocking, this runs after dialog is closed
											window.close();
										}
									}, 500);
								}, 250);
							} catch (e) {
								console.error("Barcode error:", e);
								window.print();
								setTimeout(function() { window.close(); }, 500);
							}
						} else {
							// Poll using rAF for maximum responsiveness
							requestAnimationFrame(tryRender);
						}
					};

					// Trigger print as soon as script and content are ready
					if (document.readyState === "complete") {
						tryRender();
					} else {
						window.addEventListener("load", tryRender);
					}
				})();
			</script>
		</body>
		</html>
	`

	printWindow.document.open()
	printWindow.document.write(printContent)
	printWindow.document.close()
}

function formatCurrency(amount) {
	return Number.parseFloat(amount || 0).toFixed(2)
}

/**
 * Print invoice by name, fetching print format from POS Profile
 * @param {string} invoiceName - The name of the invoice to print
 * @param {string} printFormat - Optional print format override
 * @param {string} letterhead - Optional letterhead override
 */
export async function printInvoiceByName(
	invoiceName,
	printFormat = null,
	letterhead = null,
) {
	try {
		// Fetch the invoice document using proper POS API endpoint
		const invoiceDoc = await call("pos_next.api.invoices.get_invoice", {
			invoice_name: invoiceName,
		})

		if (!invoiceDoc) {
			throw new Error("Invoice not found")
		}

		// If no print format specified and invoice has a POS Profile, fetch its print settings
		if (!printFormat && invoiceDoc.pos_profile) {
			try {
				const posProfileDoc = await call("frappe.client.get", {
					doctype: "POS Profile",
					name: invoiceDoc.pos_profile,
				})

				if (posProfileDoc) {
					printFormat = posProfileDoc.print_format
					letterhead = letterhead || posProfileDoc.letter_head
				}
			} catch (error) {
				log.warn("Could not fetch POS Profile print settings:", error)
				// Continue with default print format
			}
		}

		// Print the invoice
		return await printInvoice(invoiceDoc, printFormat, letterhead)
	} catch (error) {
		log.error("Error fetching invoice for print:", error)
		throw error
	}
}
