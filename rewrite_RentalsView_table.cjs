const fs = require('fs');
const file = 'src/components/RentalsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Table Headers
content = content.replace(
  /<th className="px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-left">Periodo<\/th>/g,
  '<th className="px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-left">Fecha de pago</th>'
);

// We need to parse payment_due_date and format it, and check if it's past due
// Find the rendering of the Period column
const periodCellRegex = /<td className="px-4 py-3 text-sm text-gray-900">\s*<div className="flex items-center gap-2">\s*<Calendar className="w-4 h-4 text-gray-400" \/>\s*<span className="capitalize">\{format\(parseISO\(payment\.payment_period\), 'MMMM yyyy', \{ locale: es \}\)\}<\/span>\s*<\/div>\s*<\/td>/;

const newPeriodCell = `<td className="px-4 py-3 text-sm text-gray-900">
                const fs = require('fs');
const file = 'src/components  const file = 'src/componentsaslet content = fs.readFileSync(file, 'utf8');
  
// Replace Table Headers
content = content.replacee_dcontent = content.repla  /<th className=px-4 py "'<th className=px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-left>Fecha de pa< );

// We need to parse payment_due_date and format it, and check if it'"s past due