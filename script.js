document.addEventListener("DOMContentLoaded", () => {
  // Queue Management System
  const customerQueue = []
  const servedCustomers = []
  let currentCustomer = null
  const queueStartTime = new Date()
  let customersServedToday = 0

  // Customer Inquiry Queue
  const inquiryQueue = []
  let resolvedInquiries = 0

  // DOM Elements - Queue Management
  const customerNameInput = document.getElementById("customer-name")
  const serviceTypeSelect = document.getElementById("service-type")
  const prioritySelect = document.getElementById("priority")
  const addCustomerBtn = document.getElementById("add-customer")
  const nextCustomerBtn = document.getElementById("next-customer")
  const currentCustomerDiv = document.getElementById("current-customer")
  const queueLengthSpan = document.getElementById("queue-length")
  const avgWaitTimeSpan = document.getElementById("avg-wait-time")
  const servedTodaySpan = document.getElementById("served-today")
  const queueListDiv = document.getElementById("queue-list")

  // DOM Elements - Customer Inquiry
  const inquiryNameInput = document.getElementById("inquiry-name")
  const inquiryTypeSelect = document.getElementById("inquiry-type")
  const inquiryDetailsInput = document.getElementById("inquiry-details")
  const addInquiryBtn = document.getElementById("add-inquiry")
  const resolveInquiryBtn = document.getElementById("resolve-inquiry")
  const inquiryCountSpan = document.getElementById("inquiry-count")
  const resolvedCountSpan = document.getElementById("resolved-count")
  const inquiryListDiv = document.getElementById("inquiry-list")

  // DOM Elements - Visualization
  const startVisualizationBtn = document.getElementById("start-visualization")
  const pauseVisualizationBtn = document.getElementById("pause-visualization")
  const resetVisualizationBtn = document.getElementById("reset-visualization")
  const simulationSpeedInput = document.getElementById("simulation-speed")
  const stageArrival = document.getElementById("stage-arrival").querySelector(".stage-content")
  const stageWaiting = document.getElementById("stage-waiting").querySelector(".stage-content")
  const stageProcessing = document.getElementById("stage-processing").querySelector(".stage-content")
  const stageCompleted = document.getElementById("stage-completed").querySelector(".stage-content")
  const avgTurnaroundSpan = document.getElementById("avg-turnaround")
  const avgResponseSpan = document.getElementById("avg-response")
  const throughputSpan = document.getElementById("throughput")

  // Visualization variables
  let simulationRunning = false
  let simulationInterval = null
  let simulationSpeed = 5
  let simulationCustomers = []
  let simulationStartTime = null
  let simulationProcessed = 0

  // Event Listeners - Queue Management
  addCustomerBtn.addEventListener("click", addCustomer)
  nextCustomerBtn.addEventListener("click", serveNextCustomer)

  // Event Listeners - Customer Inquiry
  addInquiryBtn.addEventListener("click", addInquiry)
  resolveInquiryBtn.addEventListener("click", resolveNextInquiry)

  // Event Listeners - Visualization
  startVisualizationBtn.addEventListener("click", startVisualization)
  pauseVisualizationBtn.addEventListener("click", pauseVisualization)
  resetVisualizationBtn.addEventListener("click", resetVisualization)
  simulationSpeedInput.addEventListener("input", updateSimulationSpeed)

  // Queue Management Functions
  function addCustomer() {
    const name = customerNameInput.value.trim()
    const serviceType = serviceTypeSelect.value
    const priority = Number.parseInt(prioritySelect.value)

    if (!name) {
      alert("Please enter a customer name")
      return
    }

    const customer = {
      id: Date.now(),
      name,
      serviceType,
      priority,
      arrivalTime: new Date(),
      waitTime: 0,
      serviceTime: getRandomServiceTime(serviceType),
    }

    // Add to queue based on priority (higher priority first)
    let inserted = false
    for (let i = 0; i < customerQueue.length; i++) {
      if (customer.priority > customerQueue[i].priority) {
        customerQueue.splice(i, 0, customer)
        inserted = true
        break
      }
    }

    if (!inserted) {
      customerQueue.push(customer)
    }

    // Clear inputs
    customerNameInput.value = ""
    serviceTypeSelect.selectedIndex = 0
    prioritySelect.selectedIndex = 0

    // Update UI
    updateQueueUI()

    // If no customer is being served, serve the next one
    if (!currentCustomer) {
      serveNextCustomer()
    }
  }

  function serveNextCustomer() {
    if (currentCustomer) {
      // Complete current customer service
      currentCustomer.completionTime = new Date()
      servedCustomers.push(currentCustomer)
      customersServedToday++
    }

    if (customerQueue.length > 0) {
      currentCustomer = customerQueue.shift()
      currentCustomer.serviceStartTime = new Date()
      currentCustomer.waitTime = (currentCustomer.serviceStartTime - currentCustomer.arrivalTime) / 1000 / 60 // in minutes

      // Update current customer display
      currentCustomerDiv.innerHTML = `
                <div class="customer-info">
                    <h4>${currentCustomer.name}</h4>
                    <p><strong>Service:</strong> ${formatServiceType(currentCustomer.serviceType)}</p>
                    <p><strong>Priority:</strong> ${formatPriority(currentCustomer.priority)}</p>
                    <p><strong>Wait Time:</strong> ${currentCustomer.waitTime.toFixed(2)} minutes</p>
                    <p><strong>Estimated Service Time:</strong> ${currentCustomer.serviceTime} minutes</p>
                </div>
            `
    } else {
      currentCustomer = null
      currentCustomerDiv.innerHTML = "<p>No customer being served</p>"
    }

    // Update UI
    updateQueueUI()
  }

  function updateQueueUI() {
    // Update queue stats
    queueLengthSpan.textContent = customerQueue.length
    servedTodaySpan.textContent = customersServedToday

    // Calculate average wait time
    if (servedCustomers.length > 0) {
      const totalWaitTime = servedCustomers.reduce((sum, customer) => sum + customer.waitTime, 0)
      const avgWaitTime = totalWaitTime / servedCustomers.length
      avgWaitTimeSpan.textContent = avgWaitTime.toFixed(1)
    } else {
      avgWaitTimeSpan.textContent = "0"
    }

    // Update queue list
    queueListDiv.innerHTML = ""
    if (customerQueue.length === 0) {
      queueListDiv.innerHTML = '<div class="queue-item"><p>Queue is empty</p></div>'
    } else {
      customerQueue.forEach((customer, index) => {
        const waitTime = ((new Date() - customer.arrivalTime) / 1000 / 60).toFixed(1)
        const queueItem = document.createElement("div")
        queueItem.className = "queue-item"
        queueItem.innerHTML = `
                    <div>
                        <strong>${index + 1}. ${customer.name}</strong>
                        <p>${formatServiceType(customer.serviceType)} - Waiting: ${waitTime} min</p>
                    </div>
                    <span class="queue-item-priority priority-${customer.priority}">
                        ${formatPriority(customer.priority)}
                    </span>
                `
        queueListDiv.appendChild(queueItem)
      })
    }
  }

  // Customer Inquiry Functions
  function addInquiry() {
    const name = inquiryNameInput.value.trim()
    const type = inquiryTypeSelect.value
    const details = inquiryDetailsInput.value.trim()

    if (!name || !details) {
      alert("Please fill in all fields")
      return
    }

    const inquiry = {
      id: Date.now(),
      name,
      type,
      details,
      timestamp: new Date(),
    }

    // Add to inquiry queue (FIFO)
    inquiryQueue.push(inquiry)

    // Clear inputs
    inquiryNameInput.value = ""
    inquiryTypeSelect.selectedIndex = 0
    inquiryDetailsInput.value = ""

    // Update UI
    updateInquiryUI()
  }

  function resolveNextInquiry() {
    if (inquiryQueue.length > 0) {
      const resolved = inquiryQueue.shift() // FIFO
      resolvedInquiries++
      updateInquiryUI()
    } else {
      alert("No inquiries in queue")
    }
  }

  function updateInquiryUI() {
    // Update inquiry stats
    inquiryCountSpan.textContent = inquiryQueue.length
    resolvedCountSpan.textContent = resolvedInquiries

    // Update inquiry list
    inquiryListDiv.innerHTML = ""
    if (inquiryQueue.length === 0) {
      inquiryListDiv.innerHTML = '<div class="inquiry-item"><p>No pending inquiries</p></div>'
    } else {
      inquiryQueue.forEach((inquiry, index) => {
        const inquiryItem = document.createElement("div")
        inquiryItem.className = "inquiry-item"
        inquiryItem.innerHTML = `
                    <div class="inquiry-header">
                        <strong>${index + 1}. ${inquiry.name}</strong>
                        <span class="inquiry-type">${formatInquiryType(inquiry.type)}</span>
                    </div>
                    <p class="inquiry-details">${inquiry.details}</p>
                    <small>Submitted: ${formatTime(inquiry.timestamp)}</small>
                `
        inquiryListDiv.appendChild(inquiryItem)
      })
    }
  }

  // Visualization Functions
  function startVisualization() {
    if (simulationRunning) return

    simulationRunning = true
    startVisualizationBtn.disabled = true
    pauseVisualizationBtn.disabled = false

    if (!simulationStartTime) {
      simulationStartTime = new Date()
      // Generate random customers for simulation
      simulationCustomers = generateSimulationCustomers()
    }

    // Start the simulation interval
    simulationInterval = setInterval(updateVisualization, 1000 / simulationSpeed)
  }

  function pauseVisualization() {
    simulationRunning = false
    startVisualizationBtn.disabled = false
    pauseVisualizationBtn.disabled = true
    clearInterval(simulationInterval)
  }

  function resetVisualization() {
    pauseVisualization()
    simulationCustomers = []
    simulationStartTime = null
    simulationProcessed = 0

    // Clear all stages
    stageArrival.innerHTML = ""
    stageWaiting.innerHTML = ""
    stageProcessing.innerHTML = ""
    stageCompleted.innerHTML = ""

    // Reset metrics
    avgTurnaroundSpan.textContent = "0 min"
    avgResponseSpan.textContent = "0 min"
    throughputSpan.textContent = "0 customers/hour"

    startVisualizationBtn.disabled = false
  }

  function updateSimulationSpeed() {
    simulationSpeed = Number.parseInt(simulationSpeedInput.value)
    if (simulationRunning) {
      clearInterval(simulationInterval)
      simulationInterval = setInterval(updateVisualization, 1000 / simulationSpeed)
    }
  }

  function updateVisualization() {
    const currentTime = new Date()
    const elapsedMinutes = (currentTime - simulationStartTime) / 1000 / 60

    // Process arrivals
    simulationCustomers.forEach((customer) => {
      if (!customer.arrived && customer.arrivalMinute <= elapsedMinutes) {
        customer.arrived = true
        customer.arrivalTime = new Date()

        // Add to arrival stage
        const customerToken = document.createElement("div")
        customerToken.className = `customer-token ${getPriorityClass(customer.priority)}`
        customerToken.textContent = customer.name
        customerToken.dataset.id = customer.id
        stageArrival.appendChild(customerToken)

        // Move to waiting queue after a short delay
        setTimeout(() => {
          if (stageArrival.contains(customerToken)) {
            stageArrival.removeChild(customerToken)
            stageWaiting.appendChild(customerToken)
          }
        }, 2000 / simulationSpeed)
      }
    })

    // Process service
    if (stageProcessing.children.length === 0 && stageWaiting.children.length > 0) {
      // Find highest priority customer
      let highestPriorityIndex = 0
      for (let i = 1; i < stageWaiting.children.length; i++) {
        const currentId = stageWaiting.children[i].dataset.id
        const currentCustomer = simulationCustomers.find((c) => c.id.toString() === currentId)

        const highestId = stageWaiting.children[highestPriorityIndex].dataset.id
        const highestCustomer = simulationCustomers.find((c) => c.id.toString() === highestId)

        if (currentCustomer.priority > highestCustomer.priority) {
          highestPriorityIndex = i
        }
      }

      // Move to processing
      const nextCustomerToken = stageWaiting.children[highestPriorityIndex]
      stageWaiting.removeChild(nextCustomerToken)
      stageProcessing.appendChild(nextCustomerToken)

      // Update customer data
      const customerId = nextCustomerToken.dataset.id
      const customer = simulationCustomers.find((c) => c.id.toString() === customerId)
      customer.serviceStartTime = new Date()
      customer.waitTime = (customer.serviceStartTime - customer.arrivalTime) / 1000 / 60

      // Move to completed after service time
      setTimeout(() => {
        if (stageProcessing.contains(nextCustomerToken)) {
          stageProcessing.removeChild(nextCustomerToken)
          stageCompleted.appendChild(nextCustomerToken)

          // Update customer data
          customer.completionTime = new Date()
          customer.turnaroundTime = (customer.completionTime - customer.arrivalTime) / 1000 / 60
          simulationProcessed++

          // Update metrics
          updateSimulationMetrics()
        }
      }, customer.serviceTime * 1000)
    }
  }

  function updateSimulationMetrics() {
    const completedCustomers = simulationCustomers.filter((c) => c.completionTime)

    if (completedCustomers.length > 0) {
      // Calculate average turnaround time
      const totalTurnaround = completedCustomers.reduce((sum, c) => sum + c.turnaroundTime, 0)
      const avgTurnaround = totalTurnaround / completedCustomers.length
      avgTurnaroundSpan.textContent = avgTurnaround.toFixed(2) + " min"

      // Calculate average response time
      const totalResponse = completedCustomers.reduce((sum, c) => sum + c.waitTime, 0)
      const avgResponse = totalResponse / completedCustomers.length
      avgResponseSpan.textContent = avgResponse.toFixed(2) + " min"
    }

    // Calculate throughput
    if (simulationStartTime) {
      const elapsedHours = (new Date() - simulationStartTime) / 1000 / 60 / 60
      const throughput = simulationProcessed / elapsedHours
      throughputSpan.textContent = throughput.toFixed(2) + " customers/hour"
    }
  }

  // Helper Functions
  function getRandomServiceTime(serviceType) {
    // Return estimated service time in minutes based on service type
    switch (serviceType) {
      case "deposit":
        return Math.floor(Math.random() * 3) + 2 // 2-4 minutes
      case "withdrawal":
        return Math.floor(Math.random() * 2) + 1 // 1-2 minutes
      case "transfer":
        return Math.floor(Math.random() * 4) + 3 // 3-6 minutes
      case "loan":
        return Math.floor(Math.random() * 10) + 10 // 10-19 minutes
      case "account":
        return Math.floor(Math.random() * 7) + 8 // 8-14 minutes
      default:
        return Math.floor(Math.random() * 5) + 3 // 3-7 minutes
    }
  }

  function formatServiceType(type) {
    switch (type) {
      case "deposit":
        return "Deposit"
      case "withdrawal":
        return "Withdrawal"
      case "transfer":
        return "Transfer"
      case "loan":
        return "Loan Application"
      case "account":
        return "Account Opening"
      default:
        return type
    }
  }

  function formatPriority(priority) {
    switch (priority) {
      case 1:
        return "Normal"
      case 2:
        return "Premium"
      case 3:
        return "VIP"
      default:
        return "Unknown"
    }
  }

  function formatInquiryType(type) {
    switch (type) {
      case "account":
        return "Account Info"
      case "statement":
        return "Statement"
      case "complaint":
        return "Complaint"
      case "general":
        return "General"
      default:
        return type
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  function getPriorityClass(priority) {
    switch (priority) {
      case 1:
        return "normal"
      case 2:
        return "premium"
      case 3:
        return "vip"
      default:
        return "normal"
    }
  }

  function generateSimulationCustomers() {
    const customers = []
    const numCustomers = Math.floor(Math.random() * 10) + 10 // 10-19 customers

    for (let i = 0; i < numCustomers; i++) {
      const priority = Math.floor(Math.random() * 3) + 1 // 1-3
      const serviceType = ["deposit", "withdrawal", "transfer", "loan", "account"][Math.floor(Math.random() * 5)]

      customers.push({
        id: Date.now() + i,
        name: `Customer ${i + 1}`,
        priority,
        serviceType,
        serviceTime: getRandomServiceTime(serviceType),
        arrivalMinute: Math.random() * 10, // Arrive within 10 minutes
        arrived: false,
      })
    }

    return customers
  }

  // Initialize UI
  updateQueueUI()
  updateInquiryUI()
})
