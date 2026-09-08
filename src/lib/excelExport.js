import { t } from './i18n.js'
import ExcelJS from 'exceljs'
import { getMaintStatus, formatDate, getMaintenanceForVehicle, driveLabel } from './constants.js'

// ─── Color palette (ARGB hex) ───
const C = {
  amber: 'FFF59E0B', amberLight: 'FFFEF3C7', amberDark: 'FFB45309',
  dark: 'FF1F2937', darker: 'FF111827',
  white: 'FFFFFFFF', light: 'FFF9FAFB',
  text: 'FF111827', muted: 'FF6B7280',
  green: 'FF16A34A', greenLight: 'FFDCFCE7',
  red: 'FFDC2626', redLight: 'FFFEE2E2',
  yellow: 'FFCA8A04', yellowLight: 'FFFEF9C3',
  blue: 'FF2563EB', blueLight: 'FFDBEAFE',
  purple: 'FF8B5CF6', purpleLight: 'FFEDE9FE',
}

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
}

function fill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function calcAvgConsumption(fuelLogs) {
  if (fuelLogs.length < 2) return null
  const sorted = [...fuelLogs].sort((a, b) => a.km - b.km)
  const cs = []
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].km - sorted[i - 1].km
    if (d > 0) cs.push((sorted[i].liters / d) * 100)
  }
  return cs.length > 0 ? +(cs.reduce((s, v) => s + v, 0) / cs.length).toFixed(2) : null
}

function statusFill(status) {
  const map = {
    [t('status.ok')]: { bg: C.greenLight, fg: C.green },
    [t('status.warn')]: { bg: C.yellowLight, fg: C.yellow },
    [t('status.overdue')]: { bg: C.redLight, fg: C.red },
    'NEGATIVA': { bg: C.redLight, fg: C.red },
    'DESFAVORABLE': { bg: C.yellowLight, fg: C.yellow },
    'FAVORABLE': { bg: C.greenLight, fg: C.green },
    'ALTA': { bg: C.redLight, fg: C.red },
    'MEDIA': { bg: C.yellowLight, fg: C.yellow },
    'BAJA': { bg: C.greenLight, fg: C.green },
  }
  return map[status] || { bg: C.light, fg: C.muted }
}

// Title row helper
function addTitle(ws, text, color, span) {
  ws.mergeCells(1, 1, 1, span)
  const cell = ws.getCell('A1')
  cell.value = text
  cell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: C.white } }
  cell.fill = fill(color)
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 34
}

// Header row helper
function styleHeaderRow(row, color) {
  row.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.white } }
    cell.fill = fill(color)
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  })
  row.height = 26
}

export async function exportCarExcel({ car, maintenance, kmLogs, fuelLogs, parts, itvRecords = [], todos = [] }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Pibes Mecánicos'
  wb.created = new Date()
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  const totalMaintCost = maintenance.reduce((s, m) => s + +(m.cost || 0), 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + +(f.total_cost || 0), 0)
  const grandTotal = totalMaintCost + totalFuelCost
  const totalLiters = fuelLogs.reduce((s, f) => s + +(f.liters || 0), 0)
  const avgConsumption = calcAvgConsumption(fuelLogs)
  const avgPrice = fuelLogs.length > 0 ? (fuelLogs.reduce((s, f) => s + +(f.price_liter || 0), 0) / fuelLogs.length) : 0
  const costPerKm = car.current_km > 0 ? grandTotal / car.current_km : 0

  let okCount = 0, warnCount = 0, overdueCount = 0
  maintenance.forEach(m => {
    const s = getMaintStatus(m, car.current_km)
    if (s === 'ok') okCount++
    else if (s === 'warn') warnCount++
    else if (s === 'overdue') overdueCount++
  })

  // ════════════ SHEET 1: RESUMEN ════════════
  const ws1 = wb.addWorksheet(t('rep.summary'), { views: [{ showGridLines: false }] })
  ws1.columns = [{ width: 30 }, { width: 46 }]
  addTitle(ws1, t('rep.reportOf', { name: `${car.brand.toUpperCase()} ${car.model.toUpperCase()}` }), C.amber, 2)

  ws1.mergeCells('A2:B2')
  const sub = ws1.getCell('A2')
  sub.value = t('rep.generatedOn', { date: today })
  sub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: C.white } }
  sub.fill = fill(C.amberDark)
  sub.alignment = { horizontal: 'center', vertical: 'middle' }

  function section(ws, title) {
    const row = ws.addRow([title])
    ws.mergeCells(row.number, 1, row.number, 2)
    const cell = ws.getCell(`A${row.number}`)
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: C.white } }
    cell.fill = fill(C.dark)
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    row.height = 24
    return row
  }

  function kv(ws, label, value, opts = {}) {
    const row = ws.addRow([label, value])
    const lc = ws.getCell(`A${row.number}`)
    lc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.muted } }
    lc.fill = fill(C.light)
    lc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
    lc.border = thinBorder
    const vc = ws.getCell(`B${row.number}`)
    vc.font = { name: 'Calibri', size: 11, color: { argb: opts.color || C.text }, bold: !!opts.bold }
    vc.alignment = { horizontal: opts.align || 'left', vertical: 'middle', indent: opts.align === 'right' ? 0 : 1 }
    vc.border = thinBorder
    if (opts.numFmt) vc.numFmt = opts.numFmt
    if (opts.fillBg) { lc.fill = fill(opts.fillBg); vc.fill = fill(opts.fillBg) }
    return row
  }

  ws1.addRow([])
  section(ws1, '  ' + t('rep.vehicleData'))
  kv(ws1, t('rep.makeModel'), `${car.brand} ${car.model}`)
  kv(ws1, t('common.plate'), car.plate)
  kv(ws1, t('common.type'), car.vehicle_type === 'moto' ? t('veh.moto') : t('veh.coche'))
  kv(ws1, t('rep.year'), car.year)
  kv(ws1, t('common.fuel'), car.fuel)
  kv(ws1, t('dash.transmission'), car.transmission)
  kv(ws1, t('rep.currentKm'), car.current_km || 0, { align: 'right', numFmt: '#,##0 "km"', bold: true })
  kv(ws1, t('common.notes'), car.notes || '—')

  ws1.addRow([])
  section(ws1, '  ' + t('rep.economic'))
  const er = ws1.addRow(['Concepto', 'Importe'])
  styleHeaderRow(er, C.amberDark)
  kv(ws1, t('common.maintenance'), +totalMaintCost.toFixed(2), { align: 'right', numFmt: '#,##0.00 €', color: C.blue, bold: true })
  kv(ws1, t('common.fuel'), +totalFuelCost.toFixed(2), { align: 'right', numFmt: '#,##0.00 €', color: C.green, bold: true })
  kv(ws1, t('rep.totalSpent'), +grandTotal.toFixed(2), { align: 'right', numFmt: '#,##0.00 €', bold: true, fillBg: C.amberLight })
  kv(ws1, t('rep.costPerKm'), +costPerKm.toFixed(3), { align: 'right', numFmt: '#,##0.000 €', bold: true })

  ws1.addRow([])
  section(ws1, '  ' + t('rep.fuelCaps'))
  kv(ws1, t('rep.refuelCount'), fuelLogs.length, { align: 'right' })
  kv(ws1, t('rep.totalLitres'), +totalLiters.toFixed(2), { align: 'right', numFmt: '#,##0.00 "L"' })
  kv(ws1, t('rep.avgPriceCol'), +avgPrice.toFixed(3), { align: 'right', numFmt: '#,##0.000 "€/L"' })
  kv(ws1, t('fuelt.avgConsum'), avgConsumption || t('common.noData'), { align: 'right', numFmt: avgConsumption ? '#,##0.00 "L/100km"' : undefined, color: C.blue, bold: true })

  ws1.addRow([])
  section(ws1, '  ' + t('rep.maintState'))
  kv(ws1, t('adm.upToDate'), okCount, { align: 'right', color: C.green, bold: true, fillBg: C.greenLight })
  kv(ws1, t('rep.upcoming'), warnCount, { align: 'right', color: C.yellow, bold: true, fillBg: C.yellowLight })
  kv(ws1, t('adm.overdue'), overdueCount, { align: 'right', color: C.red, bold: true, fillBg: C.redLight })
  kv(ws1, 'Total registros', maintenance.length, { align: 'right' })

  ws1.addRow([])
  section(ws1, '  ITV')
  let itvLabel = t('rep.noRecords')
  const latestItv = itvRecords[0]
  if (latestItv) {
    if (latestItv.result === 'negativa') itvLabel = t('rep.itvFailed')
    else if (latestItv.result === 'desfavorable' && !latestItv.resolved) itvLabel = t('rep.itvPending')
    else if (latestItv.expiry_date) {
      const days = Math.floor((new Date(latestItv.expiry_date) - new Date()) / 86400000)
      if (days < 0) itvLabel = t('rep.itvExpiredCaps', { n: Math.abs(days) })
      else if (days <= 30) itvLabel = t('rep.expiresIn', { n: days })
      else itvLabel = t('rep.validUntil', { date: formatDate(latestItv.expiry_date) })
    } else itvLabel = 'Favorable'
  }
  kv(ws1, t('rep.currentState'), itvLabel)
  kv(ws1, 'Registros totales', itvRecords.length, { align: 'right' })

  if (todos.length > 0) {
    ws1.addRow([])
    section(ws1, '  ' + t('rep.tasksCaps'))
    const pend = todos.filter(t => !t.completed).length
    kv(ws1, t('rep.pending'), pend, { align: 'right', color: pend > 0 ? C.red : C.green, bold: true })
    kv(ws1, t('rep.completed'), todos.filter(t => t.completed).length, { align: 'right' })
  }

  // ════════════ SHEET 2: MANTENIMIENTOS ════════════
  const ws2 = wb.addWorksheet(t('rep.maintCaps'), { views: [{ showGridLines: false }] })
  ws2.columns = [{ width: 30 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 30 }]
  addTitle(ws2, t('rep.maintCaps'), C.blue, 8)
  ws2.addRow([])
  const m2h = ws2.addRow([t('car.element'), t('common.state'), t('rep.lastKm'), t('rep.lastDate'), t('rep.nextKm'), t('rep.nextDate'), t('rep.costEur'), t('common.notes')])
  styleHeaderRow(m2h, C.blue)

  getMaintenanceForVehicle(car.vehicle_type, car.fuel).forEach((mt, idx) => {
    const m = maintenance.find(x => x.type_id === mt.id)
    const status = m ? getMaintStatus(m, car.current_km) : null
    const statusText = !m ? '—' : status === 'ok' ? t('status.ok') : status === 'warn' ? t('status.warn') : t('status.overdue')
    const row = ws2.addRow([
      mt.name, statusText,
      m && m.last_km ? m.last_km : '', m && m.last_date ? formatDate(m.last_date) : '',
      m && m.next_km ? m.next_km : '', m && m.next_date ? formatDate(m.next_date) : '',
      m && m.cost ? +(+m.cost).toFixed(2) : '', m?.notes || '',
    ])
    const alt = idx % 2 === 1
    row.eachCell((cell, col) => {
      cell.border = thinBorder
      cell.font = { name: 'Calibri', size: 10, color: { argb: C.text } }
      if (alt) cell.fill = fill(C.light)
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
      if (col === 1) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.text } }
      if (col === 3 || col === 5) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; if (cell.value) cell.numFmt = '#,##0 "km"' }
      if (col === 4 || col === 6) cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (col === 7) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; if (cell.value) cell.numFmt = '#,##0.00 €' }
    })
    // Status badge
    if (statusText !== '—') {
      const sc = row.getCell(2)
      const sf = statusFill(statusText)
      sc.fill = fill(sf.bg)
      sc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: sf.fg } }
      sc.alignment = { vertical: 'middle', horizontal: 'center' }
    } else {
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' }
    }
  })

  const m2t = ws2.addRow(['TOTAL', '', '', '', '', '', +totalMaintCost.toFixed(2), ''])
  m2t.eachCell((cell, col) => {
    cell.fill = fill(C.blueLight)
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.text } }
    cell.border = { ...thinBorder, top: { style: 'thin', color: { argb: C.blue } } }
    cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right', indent: col === 1 ? 1 : 0 }
    if (col === 7) cell.numFmt = '#,##0.00 €'
  })

  // ════════════ SHEET 3: REPOSTAJES ════════════
  if (fuelLogs.length > 0) {
    const ws3 = wb.addWorksheet(t('fuelt.title'), { views: [{ showGridLines: false }] })
    ws3.columns = [{ width: 14 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 12 }, { width: 30 }]
    addTitle(ws3, t('rep.fuel'), C.green, 8)
    ws3.addRow([])
    const h3 = ws3.addRow([t('common.date'), t('car.tabKm'), t('fuelt.litres'), t('rep.priceCol'), 'Total €', t('fuelt.fullTankQ'), t('rep.mode'), t('common.notes')])
    styleHeaderRow(h3, C.green)

    const sortedFuel = [...fuelLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
    sortedFuel.forEach((l, idx) => {
      const row = ws3.addRow([
        formatDate(l.date), l.km || 0, +(+l.liters).toFixed(2),
        +(+l.price_liter).toFixed(3), +(+l.total_cost).toFixed(2),
        l.full_tank ? t('common.yes') : t('common.no'), driveLabel(l.driving_mode || 'ciudad'), l.notes || '',
      ])
      const alt = idx % 2 === 1
      row.eachCell((cell, col) => {
        cell.border = thinBorder
        cell.font = { name: 'Calibri', size: 10, color: { argb: C.text } }
        if (alt) cell.fill = fill(C.light)
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        if (col === 2) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = '#,##0 "km"' }
        if (col === 3) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = '#,##0.00 "L"' }
        if (col === 4) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = '#,##0.000 €' }
        if (col === 5) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = '#,##0.00 €'; cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.green } } }
        if (col === 8) cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      })
    })

    const t3 = ws3.addRow(['TOTAL', '', +totalLiters.toFixed(2), +avgPrice.toFixed(3), +totalFuelCost.toFixed(2), '', '', ''])
    t3.eachCell((cell, col) => {
      cell.fill = fill(C.greenLight)
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.text } }
      cell.border = { ...thinBorder, top: { style: 'thin', color: { argb: C.green } } }
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right', indent: col === 1 ? 1 : 0 }
      if (col === 3) cell.numFmt = '#,##0.00 "L"'
      if (col === 4) cell.numFmt = '#,##0.000 €'
      if (col === 5) cell.numFmt = '#,##0.00 €'
    })

    ws3.addRow([])
    const cr = ws3.addRow([t('fuelt.avgConsum'), avgConsumption || t('common.noData')])
    cr.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.muted } }
    const cc = cr.getCell(2)
    cc.font = { name: 'Calibri', size: 12, bold: true, color: { argb: C.blue } }
    if (avgConsumption) cc.numFmt = '#,##0.00 "L/100km"'
  }

  // ════════════ SHEET: ITV ════════════
  if (itvRecords.length > 0) {
    const wsI = wb.addWorksheet('ITV', { views: [{ showGridLines: false }] })
    wsI.columns = [{ width: 16 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 32 }, { width: 10 }, { width: 12 }, { width: 30 }]
    addTitle(wsI, t('rep.itvHistory'), C.purple, 8)
    wsI.addRow([])
    const hI = wsI.addRow([t('itv.inspectionDate'), t('itv.expiryDate'), t('rep.result'), t('rep.station'), t('rep.defects'), t('rep.repaired'), t('rep.costEur'), t('common.notes')])
    styleHeaderRow(hI, C.purple)

    itvRecords.forEach((rec, idx) => {
      const resultUpper = (rec.result || '').toUpperCase()
      const row = wsI.addRow([
        formatDate(rec.inspection_date), rec.expiry_date ? formatDate(rec.expiry_date) : '',
        resultUpper, rec.station || '', rec.defects || '',
        rec.resolved ? t('common.yes') : (rec.result === 'desfavorable' ? t('common.no') : ''),
        rec.cost ? +(+rec.cost).toFixed(2) : '', rec.notes || '',
      ])
      const alt = idx % 2 === 1
      row.eachCell((cell, col) => {
        cell.border = thinBorder
        cell.font = { name: 'Calibri', size: 10, color: { argb: C.text } }
        if (alt) cell.fill = fill(C.light)
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        if (col === 4 || col === 5 || col === 8) cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
        if (col === 7) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; if (cell.value) cell.numFmt = '#,##0.00 €' }
      })
      const sc = row.getCell(3)
      const sf = statusFill(resultUpper)
      sc.fill = fill(sf.bg)
      sc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: sf.fg } }
    })
  }

  // ════════════ SHEET: RECAMBIOS ════════════
  if (parts.length > 0) {
    const wsP = wb.addWorksheet(t('car.tabParts'), { views: [{ showGridLines: false }] })
    wsP.columns = [{ width: 32 }, { width: 25 }, { width: 55 }]
    addTitle(wsP, t('rep.partsCaps'), C.blue, 3)
    wsP.addRow([])
    const hP = wsP.addRow([t('common.name'), t('common.reference'), t('common.link')])
    styleHeaderRow(hP, C.blue)
    parts.forEach((p, idx) => {
      const row = wsP.addRow([p.name, p.reference || '', p.url || ''])
      const alt = idx % 2 === 1
      row.eachCell((cell, col) => {
        cell.border = thinBorder
        cell.font = { name: 'Calibri', size: 10, color: { argb: C.text } }
        if (alt) cell.fill = fill(C.light)
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        if (col === 1) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.text } }
      })
      if (p.url) {
        const lc = row.getCell(3)
        lc.value = { text: p.url, hyperlink: p.url }
        lc.font = { name: 'Calibri', size: 10, color: { argb: C.blue }, underline: true }
      }
    })
  }

  // ════════════ SHEET: KILÓMETROS ════════════
  if (kmLogs.length > 0) {
    const wsK = wb.addWorksheet(t('car.tabKm'), { views: [{ showGridLines: false }] })
    wsK.columns = [{ width: 16 }, { width: 16 }, { width: 50 }]
    addTitle(wsK, t('rep.kmHistory'), C.amber, 3)
    wsK.addRow([])
    const hK = wsK.addRow([t('common.date'), t('car.tabKm'), t('common.notes')])
    styleHeaderRow(hK, C.amberDark)
    kmLogs.forEach((l, idx) => {
      const row = wsK.addRow([formatDate(l.date), l.km || 0, l.notes || ''])
      const alt = idx % 2 === 1
      row.eachCell((cell, col) => {
        cell.border = thinBorder
        cell.font = { name: 'Calibri', size: 10, color: { argb: C.text } }
        if (alt) cell.fill = fill(C.light)
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        if (col === 2) { cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.numFmt = '#,##0 "km"'; cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.text } } }
        if (col === 3) cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      })
    })
  }

  // ════════════ SHEET: TAREAS ════════════
  if (todos.length > 0) {
    const wsT = wb.addWorksheet(t('car.tabTodos'), { views: [{ showGridLines: false }] })
    wsT.columns = [{ width: 13 }, { width: 12 }, { width: 35 }, { width: 30 }, { width: 14 }, { width: 14 }]
    addTitle(wsT, t('rep.tasksCaps'), C.red, 6)
    wsT.addRow([])
    const hT = wsT.addRow([t('common.state'), t('rep.priority'), t('rep.titleCol'), t('common.notes'), 'Creado', t('rep.doneCol')])
    styleHeaderRow(hT, C.red)
    todos.forEach((t, idx) => {
      const prio = (t.priority || 'media').toUpperCase()
      const row = wsT.addRow([
        t.completed ? t('rep.completed') : t('rep.pending'), prio, t.title, t.notes || '',
        t.created_at ? formatDate(t.created_at.split('T')[0]) : '',
        t.completed_at ? formatDate(t.completed_at.split('T')[0]) : '',
      ])
      const alt = idx % 2 === 1
      row.eachCell((cell, col) => {
        cell.border = thinBorder
        cell.font = { name: 'Calibri', size: 10, color: { argb: C.text } }
        if (alt) cell.fill = fill(C.light)
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        if (col === 3 || col === 4) cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
        if (col === 1) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: t.completed ? C.green : C.amber } }
        if (col === 3) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.text } }
      })
      const pc = row.getCell(2)
      const sf = statusFill(prio)
      pc.fill = fill(sf.bg)
      pc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: sf.fg } }
    })
  }

  // ─── Write & download ───
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${car.brand}_${car.model}_${car.plate.replace(/\s/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
