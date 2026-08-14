const fs = require('fs');

const file = 'src/hooks/useRentals.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Insertar pago mensual por defecto si es activa[\s\S]*?status: 'pending_confirmation'[\s\S]*?\}\]\);\s*\}/m;
content = content.replace(regex, '// Pago inicial cubierto, ensureCurrentMonthPayments manejará los meses siguientes');

fs.writeFileSync(file, content);
console.log('useRentals updated');
