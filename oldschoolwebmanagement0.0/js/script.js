function generateRandomProperty(propType) {
  const quantities = [5, 10, 15, 20];
  const rarities = ['Common', 'Uncommon', 'Rare', 'Legendary'];
  const restock = ['2 days', '1 week', '3 weeks', '1 month'];

  switch(propType) {
    case 'quantity': return quantities[Math.floor(Math.random() * quantities.length)];
    case 'rarity': return rarities[Math.floor(Math.random() * rarities.length)];
    case 'restock': return restock[Math.floor(Math.random() * restock.length)];
  }
}

function showInventory() {
  const items = [
    'Firewood',
    'Lightbulb',
    'Toner Cartridge',
    'Painkiller Tablets'
  ];

  const content = document.getElementById('content');
  content.innerHTML = '<h2>Inventory Items</h2><div class="item-grid" id="itemGrid"></div>';

  const grid = document.getElementById('itemGrid');

  items.forEach(name => {
    const quantity = generateRandomProperty('quantity');
    const rarity = generateRandomProperty('rarity');
    const restock = generateRandomProperty('restock');

    const itemHTML = `
      <div class="item">
        <img src="images/PLACEHOLDER_IMAGE.jpg" alt="${name}">
        <p><strong>${name}</strong><br>
          Quantity: ${quantity}<br>
          Rarity: ${rarity}<br>
          Restock in: ${restock}
        </p>
      </div>
    `;

    grid.innerHTML += itemHTML;
  });
}

function showHome() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Welcome!</h2>
    <p>This is a basic inventory management interface. Click on "Inventory" to view current items.</p>
  `;
}