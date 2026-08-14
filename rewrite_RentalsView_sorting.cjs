const fs = require('fs');

const file = 'src/components/RentalsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Próximos vencimientos window
content = content.replace(/diffDays >= 8 && diffDays <= 15/g, 'diffDays >= 8 && diffDays <= 60');
content = content.replace(/diffDays >= 0 && diffDays <= 15/g, 'diffDays >= 0 && diffDays <= 60');
content = content.replace(/expiring15/g, 'expiring60');

// Sorting logic replacement
// Find where sortedPayments is defined
const sortLogicRegex = /const sortedPayments = \[.*?\]\.sort\(\(a, b\) => \{[\s\S]*?\}\);/m;
const newSortLogic = `const sortedPayments = [...filteredPayments].sort((a, b) => {
    // Ordenar exclusivamente por payment_due_date ASC, luego customer_name ASC
    const dateA = new Date(a.payment_due_date).getTime();
    const dateB = new Date(b.payment_due_date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    
    const rentalA = rentals.find(r => r.id === a.rental_id);
    const rentalB = rentals.find(r => r.id === b.rental_id);
    const nameA = rentalA?.customer_name || '';
    const nameB = rentalB?.customer_name || '';
    return nameA.localeCompare(nameB);
  });`;

content = content.replace(sortLogicRegex, newSortLogic);

fs.writeFileSync(file, content);
console.log('RentalsView sorting updated');
