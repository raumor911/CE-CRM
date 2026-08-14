const fs = require('fs');

const file = 'src/hooks/useRentalPayments.ts';
let content = fs.readFileSync(file, 'utf8');

const oldGeneration = `        // La agenda comienza con la mensualidad del mes siguiente
        let targetMonthDate = startOfMonth(addMonths(startDate, 1));
        
        // Generamos desde el mes siguiente al inicio hasta el mes actual
        while (!isAfter(targetMonthDate, currentPeriodDate)) {
          const periodStr = format(targetMonthDate, 'yyyy-MM-01');
          const dueDateStr = calculateDueDate(rental.start_date, targetMonthDate);

          // No deben generarse pagos posteriores a contractual_end_date
          if (rental.contractual_end_date) {
            const endDate = parseLocalDate(rental.contractual_end_date);
            const dueDate = parseLocalDate(dueDateStr);
            if (endDate && dueDate && isAfter(dueDate, endDate)) {
              break;
            }
      const fs = require('fs');

const file = 'src/ho  
const file = 'src/hooks/use   let content = fs.readFileSync(file, 'utf8');
at
const oldGeneration = `        // La agenda comiendAm        let targetMonthDate = startOfMonth(addMonths(startDate, 1));
        
        //"