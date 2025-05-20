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

function showHome() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Welcome!</h2>
    <p>This is a basic inventory management interface. Click on "Inventory" to view current items.</p>
  `;
}

let userInventory = [];

function addToInventory(item) {
  userInventory.push(item);
  alert(item.name + " added to your inventory!");
}

function showInventoryPage() {
  const content = document.getElementById('content');

  if (userInventory.length === 0) {
    content.innerHTML = '<h2>My Inventory</h2><p>No items purchased yet.</p>';
    return;
  }

  content.innerHTML = '<h2>My Inventory</h2><div class="item-grid" id="inventoryGrid"></div>';
  const grid = document.getElementById('inventoryGrid');

  userInventory.forEach(item => {
    const itemHTML = `
      <div class="item">
        <img src="images/PLACEHOLDER_IMAGE.jpg" alt="${item.name}">
        <p><strong>${item.name}</strong><br>
          Quantity: ${item.quantity}<br>
          Rarity: ${item.rarity}<br>
          Restock in: ${item.restock}
        </p>
      </div>
    `;
    grid.innerHTML += itemHTML;
  });
}

function showInventory() {
  const items = [
    'Firewood',
    'Lightbulb',
    'Toner Cartridge',
    'Painkiller Tablets'
  ];

  const content = document.getElementById('content');
  content.innerHTML = '<h2>Available Items</h2><div class="item-grid" id="itemGrid"></div>';

  const grid = document.getElementById('itemGrid');

  items.forEach(name => {
    const quantity = generateRandomProperty('quantity');
    const rarity = generateRandomProperty('rarity');
    const restock = generateRandomProperty('restock');

    const item = { name, quantity, rarity, restock };

    const itemHTML = `
      <div class="item">
        <img src="images/PLACEHOLDER_IMAGE.jpg" alt="${name}">
        <p><strong>${name}</strong><br>
          Quantity: ${quantity}<br>
          Rarity: ${rarity}<br>
          Restock in: ${restock}<br>
          <button onclick='addToInventory(${JSON.stringify(item)})'>Purchase</button>
        </p>
      </div>
    `;

    grid.innerHTML += itemHTML;
  });
}
