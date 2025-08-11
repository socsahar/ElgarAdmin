console.log('🚗 Simple car data updater...');

// Add a few realistic car entries manually
const cars = [
  { username: 'admin', car_type: 'פרטית', license_plate: '123-45-678', car_color: 'לבן' },
  { username: 'sayer1', car_type: 'רכב שטח', license_plate: '234-56-789', car_color: 'שחור' },
  { username: 'sayer2', car_type: 'מסחרית', license_plate: '345-67-890', car_color: 'כסף' },
  { username: 'sayer3', car_type: 'פרטית', license_plate: '456-78-901', car_color: 'כחול' },
  { username: 'sayer4', car_type: 'פיקאפ', license_plate: '567-89-012', car_color: 'אדום' }
];

cars.forEach(car => {
  console.log(`${car.username}: ${car.license_plate} ${car.car_color} ${car.car_type}`);
});

console.log('\n✅ Sample car data generated successfully!');
