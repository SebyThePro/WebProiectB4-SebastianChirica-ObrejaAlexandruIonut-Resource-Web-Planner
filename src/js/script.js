
function showProductSection() {
    document.getElementById('product-section').style.display = 'block';
}

function openProductForm() {
    document.getElementById('product-form').style.display = 'block';
}

function addProduct() {
    const name = document.getElementById('product-name').value;
    const quantity = document.getElementById('product-quantity').value;
    const unit = document.getElementById('product-unit').value;

    if (name && quantity && unit) {
        const table = document.querySelector("#product-list tbody");
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${name}</td>
            <td>${quantity}</td>
            <td>${unit}</td>
            <td><button onclick="deleteProduct(this)">Șterge</button></td>
        `;

        table.appendChild(row);

        // Clear form
        document.getElementById('product-name').value = "";
        document.getElementById('product-quantity').value = "";
        document.getElementById('product-unit').value = "kg";
        document.getElementById('product-form').style.display = 'none';
    }
}

function deleteProduct(btn) {
    btn.closest('tr').remove();
}
