// Regla de periodo de traken: solo se pueden registrar fechas del mes en curso o futuras;
// únicamente el día 1 de cada mes se permite todavía el mes anterior.
const TZ = process.env.BUSINESS_TZ || 'America/Bogota';

const todayIn = (tz = TZ) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const monthIndex = (iso) => {
  const [y, m] = iso.split('-').map(Number);
  return y * 12 + m;
};

function isOutOfPeriod(dates, today = todayIn()) {
  const [, , d] = today.split('-').map(Number);
  const min = monthIndex(today) - (d === 1 ? 1 : 0);
  return dates.some((date) => monthIndex(date) < min);
}

module.exports = { isOutOfPeriod, todayIn };
