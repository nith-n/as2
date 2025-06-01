document.addEventListener('DOMContentLoaded', function() {
    // Navigation buttons
    document.getElementById('btn-list-parts').addEventListener('click', showPartsView);
    document.getElementById('btn-list-pos').addEventListener('click', showPOsView);
    document.getElementById('btn-show-po-form').addEventListener('click', showPODetailsView);
    document.getElementById('btn-new-po').addEventListener('click', showNewPOView);
    
    // PO Details View
    document.getElementById('btn-fetch-po').addEventListener('click', fetchPODetails);
    
    // New PO Form
    document.getElementById('add-line').addEventListener('click', addLineItem);
    document.getElementById('new-po-form').addEventListener('submit', submitPO);
    
    // Initialize client select and parts selects
    loadClients();
    loadParts();
    
    // Show parts view by default
    showPartsView();
});

function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show requested view
    document.getElementById(viewId).classList.add('active');
}

// listParts010() implementation
function showPartsView() {
    showView('parts-view');
    
    fetch('/api/parts')
        .then(response => response.json())
        .then(parts => {
            const tbody = document.querySelector('#parts-table tbody');
            tbody.innerHTML = '';
            
            parts.forEach(part => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${part.partNo010}</td>
                    <td>${part.descrPart}</td>
                    <td>$${part.pricePart.toFixed(2)}</td>
                    <td>${part.qoh}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching parts:', error);
            alert('Failed to load parts. See console for details.');
        });
}

// listPOs010() implementation
function showPOsView() {
    showView('pos-view');
    
    fetch('/api/pos')
        .then(response => response.json())
        .then(pos => {
            const tbody = document.querySelector('#pos-table tbody');
            tbody.innerHTML = '';
            
            if (pos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">No purchase orders found</td></tr>';
                return;
            }
            
            pos.forEach(po => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${po.poNo010}</td>
                    <td>${po.clientName}</td>
                    <td>${new Date(po.dateOfPO).toLocaleString()}</td>
                    <td>${po.statusPO}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching POs:', error);
            alert('Failed to load purchase orders. See console for details.');
        });
}

// Show PO Details Form
function showPODetailsView() {
    showView('po-details-view');
    document.getElementById('po-details-container').style.display = 'none';
}

// listPOinfo010() implementation
function fetchPODetails() {
    const poNumber = document.getElementById('po-number').value;
    
    if (!poNumber) {
        alert('Please enter a PO number');
        return;
    }
    
    fetch(`/api/pos/${poNumber}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to fetch PO details');
                });
            }
            return response.json();
        })
        .then(data => {
            // Display PO header
            const header = document.getElementById('po-header');
            header.innerHTML = `
                <h3>PO #${data.poHeader.poNo010}</h3>
                <p><strong>Client:</strong> ${data.poHeader.clientName} (ID: ${data.poHeader.clientId010})</p>
                <p><strong>Date:</strong> ${new Date(data.poHeader.dateOfPO).toLocaleString()}</p>
                <p><strong>Status:</strong> ${data.poHeader.statusPO}</p>
                <p><strong>Phone:</strong> ${data.poHeader.clientPhone}</p>
            `;
            
            // Display PO lines
            const tbody = document.querySelector('#po-lines-table tbody');
            tbody.innerHTML = '';
            
            data.poLines.forEach(line => {
                const row = document.createElement('tr');
                const lineTotal = line.qtyOrdered * line.priceOrdered;
                
                row.innerHTML = `
                    <td>${line.lineNo010}</td>
                    <td>${line.partNo010}</td>
                    <td>${line.descrPart}</td>
                    <td>${line.qtyOrdered}</td>
                    <td>$${line.priceOrdered.toFixed(2)}</td>
                    <td>$${lineTotal.toFixed(2)}</td>
                `;
                tbody.appendChild(row);
            });
            
            // Display total
            document.getElementById('po-total').textContent = `Total: $${data.total.toFixed(2)}`;
            
            // Show the details container
            document.getElementById('po-details-container').style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching PO details:', error);
            alert(error.message || 'Failed to fetch PO details');
            document.getElementById('po-details-container').style.display = 'none';
        });
}

// Show New PO Form
function showNewPOView() {
    showView('new-po-view');
    document.getElementById('po-result').innerHTML = '';
    document.getElementById('po-result').className = '';
    
    // Reset form
    document.getElementById('new-po-form').reset();
    
    // Clear line items except the first one
    const lineItemsContainer = document.getElementById('line-items-container');
    lineItemsContainer.innerHTML = `
        <div class="line-item">
            <select class="part-select" required>
                <option value="">Select Part</option>
            </select>
            <input type="number" class="qty-input" placeholder="Quantity" min="1" required>
            <button type="button" class="remove-line">Remove</button>
        </div>
    `;
    
    // Reload parts
    loadParts();
    
    // Set up remove button event
    setupRemoveLineEvents();
}

// Load clients for dropdown
function loadClients() {
    fetch('/api/clients')
        .then(response => response.json())
        .then(clients => {
            const select = document.getElementById('client-select');
            select.innerHTML = '<option value="">Select Client</option>';
            
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.clientId010;
                option.textContent = `${client.clientName} (${client.clientPhone})`;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading clients:', error);
        });
}

// Load parts for dropdowns
function loadParts() {
    fetch('/api/parts')
        .then(response => response.json())
        .then(parts => {
            const partSelects = document.querySelectorAll('.part-select');
            
            partSelects.forEach(select => {
                // Keep the first option
                select.innerHTML = '<option value="">Select Part</option>';
                
                parts.forEach(part => {
                    const option = document.createElement('option');
                    option.value = part.partNo010;
                    option.textContent = `${part.partNo010} - ${part.descrPart} ($${part.pricePart.toFixed(2)}, QOH: ${part.qoh})`;
                    option.dataset.qoh = part.qoh;
                    select.appendChild(option);
                });
            });
        })
        .catch(error => {
            console.error('Error loading parts:', error);
        });
}

// Add line item to form
function addLineItem() {
    const lineItemsContainer = document.getElementById('line-items-container');
    const newLine = document.createElement('div');
    newLine.className = 'line-item';
    newLine.innerHTML = `
        <select class="part-select" required>
            <option value="">Select Part</option>
        </select>
        <input type="number" class="qty-input" placeholder="Quantity" min="1" required>
        <button type="button" class="remove-line">Remove</button>
    `;
    
    lineItemsContainer.appendChild(newLine);
    
    // Add parts to the new select
    loadParts();
    
    // Set up remove button event
    setupRemoveLineEvents();
}

// Set up remove line button events
function setupRemoveLineEvents() {
    document.querySelectorAll('.remove-line').forEach(button => {
        button.addEventListener('click', function() {
            // Don't remove if it's the only line item
            const lineItems = document.querySelectorAll('.line-item');
            if (lineItems.length > 1) {
                this.closest('.line-item').remove();
            }
        });
    });
}

// submitPO010() implementation
function submitPO(event) {
    event.preventDefault();
    
    const clientId = document.getElementById('client-select').value;
    if (!clientId) {
        alert('Please select a client');
        return;
    }
    
    const lineItems = document.querySelectorAll('.line-item');
    const lines = [];
    
    for (const item of lineItems) {
        const partSelect = item.querySelector('.part-select');
        const qtyInput = item.querySelector('.qty-input');
        
        const partNo = partSelect.value;
        const qty = parseInt(qtyInput.value);
        
        if (!partNo || !qty || qty <= 0) {
            alert('Please fill in all line items with valid quantities');
            return;
        }
        
        // Check against available quantity
        const selectedOption = partSelect.options[partSelect.selectedIndex];
        const qoh = parseInt(selectedOption.dataset.qoh);
        
        if (qty > qoh) {
            alert(`Not enough quantity available for the selected part. Available: ${qoh}`);
            return;
        }
        
        lines.push({ partNo, qty });
    }
    
    if (lines.length === 0) {
        alert('Please add at least one line item');
        return;
    }
    
    const orderData = { clientId, lines };
    
    fetch('/api/pos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || 'Failed to submit purchase order');
            });
        }
        return response.json();
    })
    .then(data => {
        const resultDiv = document.getElementById('po-result');
        resultDiv.innerHTML = `
            <h3>Success!</h3>
            <p>Purchase Order #${data.poNo} created successfully.</p>
        `;
        resultDiv.className = 'success';
        
        // Reset form
        document.getElementById('new-po-form').reset();
        
        // Update parts list to reflect new quantities
        loadParts();
    })
    .catch(error => {
        console.error('Error submitting PO:', error);
        
        const resultDiv = document.getElementById('po-result');
        resultDiv.innerHTML = `
            <h3>Error</h3>
            <p>${error.message || 'Failed to submit purchase order'}</p>
        `;
        resultDiv.className = 'error';
    });
}