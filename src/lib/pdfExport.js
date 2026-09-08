import { t, getLocale, fmtNum } from './i18n.js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MAINT_TYPES, getMaintStatus, formatDate, getMaintenanceForVehicle } from './constants.js'

const C = {
  accent: [245, 158, 11], accentDark: [217, 119, 6],
  text: [17, 24, 39], muted: [107, 114, 128],
  light: [243, 244, 246], lighter: [249, 250, 251], border: [229, 231, 235],
  green: [22, 163, 74], greenSoft: [220, 252, 231],
  yellow: [202, 138, 4], yellowSoft: [254, 249, 195],
  red: [220, 38, 38], redSoft: [254, 226, 226],
  blue: [37, 99, 235], blueSoft: [219, 234, 254],
  purple: [139, 92, 246], purpleSoft: [237, 233, 254],
}

function calcAvgConsumption(fuelLogs) {
  if (fuelLogs.length < 2) return null
  const sorted = [...fuelLogs].sort((a, b) => a.km - b.km)
  const consumptions = []
  for (let i = 1; i < sorted.length; i++) {
    const kmDiff = sorted[i].km - sorted[i - 1].km
    if (kmDiff > 0) consumptions.push((sorted[i].liters / kmDiff) * 100)
  }
  return consumptions.length > 0 ? +(consumptions.reduce((s, v) => s + v, 0) / consumptions.length).toFixed(2) : null
}

function getItvStatus(itv) {
  if (!itv || itv.length === 0) return { label: t('rep.noRecords'), color: C.muted }
  const latest = itv[0]
  if (latest.result === 'negativa') return { label: t('itv.notRoadworthy'), color: C.red }
  if (latest.result === 'desfavorable' && !latest.resolved) return { label: t('itv.pendingFix'), color: C.yellow }
  if (latest.expiry_date) {
    const days = Math.floor((new Date(latest.expiry_date) - new Date()) / 86400000)
    if (days < 0) return { label: t('rep.expiredAgo', { n: Math.abs(days) }), color: C.red }
    if (days <= 30) return { label: t('rep.expiresIn', { n: days }), color: C.yellow }
    return { label: t('rep.validUntil', { date: formatDate(latest.expiry_date) }), color: C.green }
  }
  return { label: 'Favorable', color: C.green }
}

function drawHeader(doc, car) {
  doc.setFillColor(...C.text)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PIBES MECÁNICOS', 14, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${car.brand} ${car.model} | ${car.plate}`, 196, 12, { align: 'right' })
}

function drawFooter(doc, page, totalPages) {
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(14, 285, 196, 285)
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  doc.text(t('rep.generatedOn', { date: new Date().toLocaleDateString(getLocale(), { day: '2-digit', month: 'long', year: 'numeric' }) }), 14, 291)
  doc.text(`Pagina ${page} de ${totalPages}`, 196, 291, { align: 'right' })
}

function sectionTitle(doc, y, title, accentColor = C.accent) {
  doc.setFillColor(...accentColor)
  doc.rect(14, y, 3, 7, 'F')
  doc.setTextColor(...C.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(title, 21, y + 5.5)
  return y + 12
}

function kpiBox(doc, x, y, w, h, label, value, color = C.accent, sublabel = null) {
  doc.setFillColor(...C.lighter)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, h, 2, 2, 'FD')
  doc.setFillColor(...color)
  doc.rect(x, y, 1.5, h, 'F')
  doc.setTextColor(...C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(label.toUpperCase(), x + 5, y + 6)
  doc.setTextColor(...C.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(value, x + 5, y + 15)
  if (sublabel) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.text(sublabel, x + 5, y + 21)
  }
}

export function exportCarPdf({ car, maintenance, kmLogs, fuelLogs, parts, itvRecords = [], todos = [] }) {
  const doc = new jsPDF()

  // ─── PAGE 1: Cover + Executive Summary ───
  drawHeader(doc, car)
  let y = 32
  doc.setTextColor(...C.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(t('rep.vehicleReport'), 14, y)

  y += 10
  doc.setTextColor(...C.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text(`${car.brand} ${car.model}`, 14, y)

  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C.muted)
  const vTypeName = car.vehicle_type === 'moto' ? t('veh.moto') : t('veh.coche')
  doc.text(`${vTypeName} - ${car.plate} - ${car.year} - ${car.fuel} - ${car.transmission}`, 14, y)
  if (car.notes) {
    y += 5
    doc.text(`"${car.notes}"`, 14, y)
  }

  y += 14
  const totalMaintCost = maintenance.reduce((s, m) => s + +(m.cost || 0), 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + +(f.total_cost || 0), 0)
  const grandTotal = totalMaintCost + totalFuelCost
  const avgConsumption = calcAvgConsumption(fuelLogs)
  const itvStatus = getItvStatus(itvRecords)

  const boxW = 44, boxH = 26, gap = 4
  kpiBox(doc, 14, y, boxW, boxH, t('rep.currentKmBox'), fmtNum(car.current_km || 0), C.blue, t('rep.kmUnit'))
  kpiBox(doc, 14 + (boxW + gap), y, boxW, boxH, t('rep.totalSpend'), `${grandTotal.toFixed(0)} EUR`, C.accent, 'mant+comb')
  kpiBox(doc, 14 + 2 * (boxW + gap), y, boxW, boxH, t('common.fuel'), `${totalFuelCost.toFixed(0)} EUR`, C.green, avgConsumption ? `${avgConsumption} L/100` : t('rep.noData'))
  kpiBox(doc, 14 + 3 * (boxW + gap), y, boxW, boxH, t('common.maintenance'), `${totalMaintCost.toFixed(0)} EUR`, C.purple, `${maintenance.length} reg.`)
  y += boxH + 12

  // Status counters
  let okCount = 0, warnCount = 0, overdueCount = 0
  maintenance.forEach(m => {
    const s = getMaintStatus(m, car.current_km)
    if (s === 'ok') okCount++
    else if (s === 'warn') warnCount++
    else if (s === 'overdue') overdueCount++
  })

  y = sectionTitle(doc, y, t('rep.overall'), C.accent)

  function statusBox(x, y, label, count, color, soft) {
    const w = 58, h = 22
    doc.setFillColor(...soft)
    doc.setDrawColor(...color)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, w, h, 2, 2, 'FD')
    doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text(String(count), x + 6, y + 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(label, x + 22, y + 11)
    doc.setFontSize(7)
    const desc = color === C.green ? t('rep.maintOk') : color === C.yellow ? t('rep.checkSoon') : t('rep.urgent')
    doc.text(desc, x + 22, y + 16)
  }
  statusBox(14, y, 'AL DIA', okCount, C.green, C.greenSoft)
  statusBox(14 + 63, y, 'PROXIMOS', warnCount, C.yellow, C.yellowSoft)
  statusBox(14 + 126, y, t('rep.overdueCaps'), overdueCount, C.red, C.redSoft)
  y += 30

  // ITV
  y = sectionTitle(doc, y, t('rep.itvSection'), C.purple)
  doc.setFillColor(...C.lighter)
  doc.setDrawColor(...C.border)
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD')
  doc.setFillColor(...itvStatus.color)
  doc.rect(14, y, 1.5, 18, 'F')
  doc.setTextColor(...C.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(itvStatus.label, 20, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  if (itvRecords.length > 0) {
    doc.text(t('rep.itvCount', { n: itvRecords.length, date: formatDate(itvRecords[0].inspection_date) }), 20, y + 14)
  } else {
    doc.text(t('rep.noInspections'), 20, y + 14)
  }
  y += 26

  // Pending todos
  const pendingTodos = todos.filter(t => !t.completed)
  if (pendingTodos.length > 0) {
    y = sectionTitle(doc, y, t('rep.todos'), C.red)
    doc.setFontSize(9)
    doc.setTextColor(...C.muted)
    doc.text(t('rep.pendingCount', { n: pendingTodos.length }), 14, y)
    y += 8
    pendingTodos.slice(0, 5).forEach(t => {
      const color = t.priority === 'alta' ? C.red : t.priority === 'media' ? C.yellow : C.green
      doc.setFillColor(...color)
      doc.circle(17, y - 1.5, 1.2, 'F')
      doc.setTextColor(...C.text)
      doc.setFontSize(9)
      doc.text(t.title.substring(0, 90), 22, y)
      y += 6
    })
    if (pendingTodos.length > 5) {
      doc.setTextColor(...C.muted)
      doc.setFontSize(8)
      doc.text(`... y ${pendingTodos.length - 5} mas`, 22, y)
    }
  }

  // ─── PAGE 2: Maintenance ───
  doc.addPage()
  drawHeader(doc, car)
  y = 30
  y = sectionTitle(doc, y, t('rep.maintDetail'), C.blue)

  const maintRows = getMaintenanceForVehicle(car.vehicle_type, car.fuel).map(mt => {
    const m = maintenance.find(x => x.type_id === mt.id)
    const status = m ? getMaintStatus(m, car.current_km) : null
    const statusText = !m ? t('common.noData') : status === 'ok' ? t('status.ok') : status === 'warn' ? t('status.warn') : t('status.overdue')
    return [
      mt.name, statusText,
      m ? `${(m.last_km || 0).toLocaleString()} km` : '-',
      formatDate(m?.last_date),
      m ? `${(m.next_km || 0).toLocaleString()} km` : '-',
      formatDate(m?.next_date),
      m?.cost ? `${(+m.cost).toFixed(0)} EUR` : '-',
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [[t('car.element'), t('common.state'), t('car.lastKm'), t('car.lastDate'), t('car.nextKm'), t('car.nextDate'), t('common.cost')]],
    body: maintRows,
    theme: 'plain',
    headStyles: { fillColor: C.text, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8, textColor: C.text, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: C.lighter },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { cellWidth: 22, fontStyle: 'bold' }, 6: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const val = data.cell.raw
        if (val === t('status.overdue')) { data.cell.styles.textColor = C.red; data.cell.styles.fillColor = C.redSoft }
        else if (val === t('status.warn')) { data.cell.styles.textColor = C.yellow; data.cell.styles.fillColor = C.yellowSoft }
        else if (val === 'AL DIA') { data.cell.styles.textColor = C.green; data.cell.styles.fillColor = C.greenSoft }
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ─── Fuel page ───
  if (fuelLogs.length > 0) {
    doc.addPage()
    drawHeader(doc, car)
    y = 30
    y = sectionTitle(doc, y, t('rep.fuel'), C.green)

    const totalLiters = fuelLogs.reduce((s, f) => s + +(f.liters || 0), 0)
    const avgPrice = (fuelLogs.reduce((s, f) => s + +(f.price_liter || 0), 0) / fuelLogs.length).toFixed(2)

    const fbW = 44, fbH = 22
    kpiBox(doc, 14, y, fbW, fbH, t('rep.totalSpend'), `${totalFuelCost.toFixed(0)} EUR`, C.green)
    kpiBox(doc, 14 + 48, y, fbW, fbH, t('rep.totalLitres'), `${totalLiters.toFixed(0)} L`, C.green)
    kpiBox(doc, 14 + 96, y, fbW, fbH, t('rep.avgPrice'), `${avgPrice} EUR`, C.green)
    kpiBox(doc, 14 + 144, y, fbW, fbH, t('fuelt.avgConsum'), avgConsumption ? `${avgConsumption}` : '-', C.blue, 'L/100km')
    y += fbH + 8

    const sortedFuel = [...fuelLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
    autoTable(doc, {
      startY: y,
      head: [[t('common.date'), t('common.km'), t('fuelt.litres'), 'EUR/L', t('common.total'), t('fuelt.fullTankQ'), t('rep.mode'), t('common.notes')]],
      body: sortedFuel.map(l => [
        formatDate(l.date), (l.km || 0).toLocaleString(),
        `${l.liters} L`, `${l.price_liter} EUR`,
        `${(l.total_cost || 0).toFixed(2)} EUR`,
        l.full_tank ? 'Si' : 'No', l.driving_mode || 'ciudad', l.notes || '',
      ]),
      foot: [['', '', `${totalLiters.toFixed(1)} L`, `${avgPrice} EUR`, `${totalFuelCost.toFixed(2)} EUR`, '', '', '']],
      theme: 'plain',
      headStyles: { fillColor: C.green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
      footStyles: { fillColor: C.greenSoft, textColor: C.text, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: C.text, cellPadding: 3 },
      alternateRowStyles: { fillColor: C.lighter },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    })
  }

  // ─── ITV history ───
  if (itvRecords.length > 0) {
    doc.addPage()
    drawHeader(doc, car)
    y = 30
    y = sectionTitle(doc, y, 'HISTORIAL ITV', C.purple)

    autoTable(doc, {
      startY: y,
      head: [[t('itv.inspectionDate'), t('itv.expiryDate'), t('rep.result'), t('rep.station'), t('rep.defects'), t('common.cost')]],
      body: itvRecords.map(r => [
        formatDate(r.inspection_date), formatDate(r.expiry_date),
        (r.result || '').toUpperCase(), r.station || '-',
        r.defects || '-', r.cost ? `${(+r.cost).toFixed(0)} EUR` : '-',
      ]),
      theme: 'plain',
      headStyles: { fillColor: C.purple, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
      bodyStyles: { fontSize: 8, textColor: C.text, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: C.lighter },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const val = data.cell.raw
          if (val === 'NEGATIVA') { data.cell.styles.textColor = C.red; data.cell.styles.fontStyle = 'bold' }
          else if (val === 'DESFAVORABLE') { data.cell.styles.textColor = C.yellow; data.cell.styles.fontStyle = 'bold' }
          else if (val === 'FAVORABLE') { data.cell.styles.textColor = C.green; data.cell.styles.fontStyle = 'bold' }
        }
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ─── Parts & KM ───
  if (parts.length > 0 || kmLogs.length > 0) {
    doc.addPage()
    drawHeader(doc, car)
    y = 30

    if (parts.length > 0) {
      y = sectionTitle(doc, y, t('rep.partsCaps'), C.blue)
      autoTable(doc, {
        startY: y,
        head: [[t('common.name'), t('common.reference'), t('common.link')]],
        body: parts.map(p => [p.name, p.reference || '-', p.url ? t('rep.inAppLink') : '-']),
        theme: 'plain',
        headStyles: { fillColor: C.blue, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
        bodyStyles: { fontSize: 8, textColor: C.text, cellPadding: 3.5 },
        alternateRowStyles: { fillColor: C.lighter },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 12
    }

    if (kmLogs.length > 0 && y < 240) {
      y = sectionTitle(doc, y, t('rep.kmHistory'), C.accent)
      autoTable(doc, {
        startY: y,
        head: [[t('common.date'), t('car.tabKm'), t('common.notes')]],
        body: kmLogs.map(l => [formatDate(l.date), `${(l.km || 0).toLocaleString()} km`, l.notes || '-']),
        theme: 'plain',
        headStyles: { fillColor: C.accent, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
        bodyStyles: { fontSize: 8, textColor: C.text, cellPadding: 3.5 },
        alternateRowStyles: { fillColor: C.lighter },
        margin: { left: 14, right: 14 },
      })
    }
  }

  // ─── Apply footers ───
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooter(doc, i, total)
  }

  doc.save(`${car.brand}_${car.model}_${car.plate.replace(/\s/g, '')}_${new Date().toISOString().split('T')[0]}.pdf`)
}
