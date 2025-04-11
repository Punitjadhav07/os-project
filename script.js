import { Chart } from "@/components/ui/chart"
// Initialize EmailJS with your user ID
;(() => {
  emailjs.init("YOUR_EMAILJS_USER_ID") // Replace with your actual EmailJS user ID
})()

// Global variables
let priceChart
let priceData = []
let currentPrice = 0
let selectedCrypto = "BTC"
let selectedTimeframe = "1h"
let autoRefreshInterval
let lastSignal = "neutral"
let lastSignalTime = null
let signalHistory = []
let supportLevels = []
let resistanceLevels = []
let customers = []
let serviceCounters = []
let currentTime = 0
let timeInterval = null
let isPaused = true
let customersServed = 0
let totalWaitTime = 0
let totalTurnaroundTime = 0
let ganttData = []

// Alert settings
const alertSettings = {
  email: "",
  phone: "",
  alertOnBuy: true,
  alertOnSell: true,
  minConfidence: 75,
}

// Technical indicator results
const indicators = {
  sma: { value: 0, signal: "neutral" },
  ema: { value: 0, signal: "neutral" },
  rsi: { value: 0, signal: "neutral" },
  macd: { value: 0, signal: "neutral" },
  bb: { value: 0, signal: "neutral" },
  stoch: { value: 0, signal: "neutral" },
  fib: { value: 0, signal: "neutral" },
  vwap: { value: 0, signal: "neutral" },
  atr: { value: 0, signal: "neutral" },
  sr: { value: 0, signal: "neutral" },
}

// Customer class
class Customer {
  constructor(id, name, serviceType, priority, estimatedTime) {
    this.id = id
    this.name = name
    this.serviceType = serviceType
    this.priority = Number.parseInt(priority)
    this.estimatedTime = Number.parseInt(estimatedTime)
    this.remainingTime = Number.parseInt(estimatedTime)
    this.arrivalTime = currentTime
    this.startTime = null
    this.endTime = null
    this.waitTime = 0
    this.turnaroundTime = 0
    this.status = "waiting" // waiting, processing, completed
    this.counterAssigned = null
  }
}

// Service Counter class
class ServiceCounter {
  constructor(id) {
    this.id = id
    this.customer = null
    this.status = "idle" // idle, busy
    this.timeQuantumRemaining = 0
  }

  assignCustomer(customer) {
    this.customer = customer
    this.status = "busy"
    customer.status = "processing"
    customer.startTime = customer.startTime === null ? currentTime : customer.startTime
    customer.counterAssigned = this.id

    // For Round Robin
    const timeQuantum = Number.parseInt(document.getElementById("time-quantum").value)
    this.timeQuantumRemaining = timeQuantum

    updateCounterUI(this)
  }

  completeService() {
    if (this.customer) {
      this.customer.status = "completed"
      this.customer.endTime = currentTime
      this.customer.turnaroundTime = this.customer.endTime - this.customer.arrivalTime
      this.customer.waitTime = this.customer.turnaroundTime - this.customer.estimatedTime

      // Update statistics
      customersServed++
      totalWaitTime += this.customer.waitTime
      totalTurnaroundTime += this.customer.turnaroundTime

      // Add to Gantt chart data
      updateGanttData(this.customer)

      // Clear counter
      this.customer = null
      this.status = "idle"
      this.timeQuantumRemaining = 0

      updateCounterUI(this)
      updateStatistics()
    }
  }

  processTimeUnit() {
    if (this.customer && this.status === "busy") {
      this.customer.remainingTime--

      // For Round Robin
      if (document.getElementById("scheduling-algorithm").value === "round-robin") {
        this.timeQuantumRemaining--

        // If time quantum expired but job not complete, put back in queue
        if (this.timeQuantumRemaining <= 0 && this.customer.remainingTime > 0) {
          const customer = this.customer
          customer.status = "waiting"
          customers.push(customer)
          this.customer = null
          this.status = "idle"
          updateCounterUI(this)
          updateQueueUI()
          return
        }
      }

      // If job completed
      if (this.customer && this.customer.remainingTime <= 0) {
        this.completeService()
      } else {
        updateCounterUI(this)
      }
    }
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

// Main initialization function
function initializeApp() {
  // Set up event listeners
  setupEventListeners()

  // Initialize the price chart
  initializeChart()

  // Generate initial simulated data
  generateSimulatedData()

  // Update the UI with initial data
  updateUI()

  // Set up auto-refresh
  startAutoRefresh()

  // Generate order book
  generateOrderBook()

  // Load saved alert settings
  loadAlertSettings()

  // Load signal history
  loadSignalHistoryFunc()

  // Initialize date and time display
  updateDateTime()
  setInterval(updateDateTime, 1000)

  // Initialize tab functionality
  const tabButtons = document.querySelectorAll(".tab-btn")
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons and panes
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"))

      // Add active class to clicked button and corresponding pane
      this.classList.add("active")
      document.getElementById(`${this.dataset.tab}-tab`).classList.add("active")
    })
  })

  // Initialize counters
  updateCounters()

  // Initialize time axis for Gantt chart
  initializeTimeAxis()
}

// Set up event listeners for user interactions
function setupEventListeners() {
  // Cryptocurrency selection
  document.getElementById("crypto-select").addEventListener("change", function () {
    selectedCrypto = this.value
    document.getElementById("selected-crypto").textContent = `${selectedCrypto}/USD`
    generateSimulatedData()
    updateUI()
  })

  // Timeframe selection
  const timeframeButtons = document.querySelectorAll(".timeframe-btn")
  timeframeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      timeframeButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")
      selectedTimeframe = this.dataset.timeframe
      generateSimulatedData()
      updateUI()
    })
  })

  // Refresh button
  document.getElementById("refresh-btn").addEventListener("click", () => {
    generateSimulatedData()
    updateUI()
  })

  // Auto-refresh toggle
  document.getElementById("auto-refresh").addEventListener("change", function () {
    if (this.checked) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  })

  // Confidence threshold slider
  const confidenceSlider = document.getElementById("min-confidence")
  const confidenceValue = document.getElementById("confidence-value")

  confidenceSlider.addEventListener("input", function () {
    confidenceValue.textContent = `${this.value}%`
    alertSettings.minConfidence = Number.parseInt(this.value)
  })

  // Save alert settings
  document.getElementById("save-alert-settings").addEventListener("click", saveAlertSettings)

  // Initialize event listeners
  document.getElementById("customer-form").addEventListener("submit", addCustomer)
  document.getElementById("scheduling-algorithm").addEventListener("change", handleAlgorithmChange)
  document.getElementById("update-counters").addEventListener("click", updateCounters)
  document.getElementById("start-service").addEventListener("click", startService)
  document.getElementById("pause-service").addEventListener("click", pauseService)
  document.getElementById("reset-service").addEventListener("click", resetService)
}

// Update date and time display
function updateDateTime() {
  const now = new Date()
  document.getElementById("current-time").textContent = now.toLocaleTimeString()
  document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Handle scheduling algorithm change
function handleAlgorithmChange() {
  const algorithm = document.getElementById("scheduling-algorithm").value
  const timeQuantumContainer = document.getElementById("time-quantum-container")

  if (algorithm === "round-robin") {
    timeQuantumContainer.style.display = "flex"
  } else {
    timeQuantumContainer.style.display = "none"
  }

  // Re-sort the queue based on the new algorithm
  sortQueue()
  updateQueueUI()
}

// Add a new customer to the queue
function addCustomer(event) {
  event.preventDefault()

  const name = document.getElementById("customer-name").value
  const serviceType = document.getElementById("service-type").value
  const priority = document.getElementById("priority-level").value
  const estimatedTime = document.getElementById("estimated-time").value

  const customer = new Customer(
    Date.now(), // Unique ID
    name,
    serviceType,
    priority,
    estimatedTime,
  )

  customers.push(customer)
  sortQueue()
  updateQueueUI()
  updateStatistics()

  // Reset form
  document.getElementById("customer-form").reset()
  document.getElementById("customer-name").focus()
}

// Sort the queue based on the selected algorithm
function sortQueue() {
  const algorithm = document.getElementById("scheduling-algorithm").value

  switch (algorithm) {
    case "fcfs":
      // First Come First Served - sort by arrival time
      customers.sort((a, b) => a.arrivalTime - b.arrivalTime)
      break
    case "sjf":
      // Shortest Job First - sort by remaining time
      customers.sort((a, b) => a.remainingTime - b.remainingTime)
      break
    case "priority":
      // Priority Based - sort by priority (higher number = higher priority)
      customers.sort((a, b) => b.priority - a.priority)
      break
    case "round-robin":
      // Round Robin - keep FCFS order
      customers.sort((a, b) => a.arrivalTime - b.arrivalTime)
      break
  }
}

// Update the queue display in the UI
function updateQueueUI() {
  const queueContainer = document.getElementById("waiting-queue")
  queueContainer.innerHTML = ""

  if (customers.length === 0) {
    queueContainer.innerHTML = '<div class="empty-queue-message">No customers in queue</div>'
    return
  }

  customers.forEach((customer) => {
    const queueItem = document.createElement("div")
    queueItem.className = "queue-item"

    const priorityLabels = {
      1: "Regular",
      2: "Premium",
      3: "VIP",
    }

    queueItem.innerHTML = `
            <div class="queue-item-info">
                <div class="queue-item-name">${customer.name}</div>
                <div class="queue-item-details">
                    ${customer.serviceType.charAt(0).toUpperCase() + customer.serviceType.slice(1)} • 
                    Est. Time: ${customer.estimatedTime} min • 
                    Remaining: ${customer.remainingTime} min
                </div>
            </div>
            <div class="queue-item-priority priority-${customer.priority}">
                ${priorityLabels[customer.priority]}
            </div>
        `

    queueContainer.appendChild(queueItem)
  })

  // Update waiting count
  document.getElementById("customers-waiting").textContent = customers.length
}

// Update the number of service counters
function updateCounters() {
  const counterCount = Number.parseInt(document.getElementById("counter-count").value)
  const countersContainer = document.getElementById("counters-container")

  // Clear existing counters
  countersContainer.innerHTML = ""
  serviceCounters = []

  // Create new counters
  for (let i = 1; i <= counterCount; i++) {
    const counter = new ServiceCounter(i)
    serviceCounters.push(counter)

    const counterElement = document.createElement("div")
    counterElement.className = "counter idle"
    counterElement.id = `counter-${i}`
    counterElement.innerHTML = `
            <div class="counter-header">
                <div class="counter-title">Counter ${i}</div>
                <div class="counter-status status-idle">Idle</div>
            </div>
            <div class="counter-customer">
                <div class="no-customer">No customer being served</div>
            </div>
        `

    countersContainer.appendChild(counterElement)
  }
}

// Update a specific counter in the UI
function updateCounterUI(counter) {
  const counterElement = document.getElementById(`counter-${counter.id}`)

  if (counter.status === "busy" && counter.customer) {
    counterElement.className = "counter active"

    const statusElement = counterElement.querySelector(".counter-status")
    statusElement.className = "counter-status status-active"
    statusElement.textContent = "Active"

    const customerElement = counterElement.querySelector(".counter-customer")
    customerElement.innerHTML = `
            <div><strong>${counter.customer.name}</strong></div>
            <div>${counter.customer.serviceType.charAt(0).toUpperCase() + counter.customer.serviceType.slice(1)}</div>
            <div>Remaining: ${counter.customer.remainingTime} min</div>
            ${
              document.getElementById("scheduling-algorithm").value === "round-robin"
                ? `<div>Quantum left: ${counter.timeQuantumRemaining} min</div>`
                : ""
            }
        `
  } else {
    counterElement.className = "counter idle"

    const statusElement = counterElement.querySelector(".counter-status")
    statusElement.className = "counter-status status-idle"
    statusElement.textContent = "Idle"

    const customerElement = counterElement.querySelector(".counter-customer")
    customerElement.innerHTML = '<div class="no-customer">No customer being served</div>'
  }
}

// Start the service simulation
function startService() {
  if (isPaused) {
    isPaused = false
    document.getElementById("start-service").textContent = "Continue Service"

    // Start the time interval if not already running
    if (!timeInterval) {
      timeInterval = setInterval(processTimeUnit, 1000) // 1 second = 1 minute in simulation
    }
  }
}

// Pause the service simulation
function pauseService() {
  isPaused = true
  document.getElementById("start-service").textContent = "Start Service"
}

// Reset the entire simulation
function resetService() {
  if (confirm("Are you sure you want to reset the entire simulation? All data will be lost.")) {
    // Clear interval
    clearInterval(timeInterval)
    timeInterval = null

    // Reset variables
    customers = []
    currentTime = 0
    isPaused = true
    customersServed = 0
    totalWaitTime = 0
    totalTurnaroundTime = 0
    ganttData = []

    // Reset UI
    document.getElementById("start-service").textContent = "Start Service"
    updateCounters()
    updateQueueUI()
    updateStatistics()
    initializeTimeAxis()
    document.getElementById("gantt-chart").innerHTML = ""
  }
}

// Process one time unit in the simulation
function processTimeUnit() {
  if (isPaused) return

  // Increment time
  currentTime++

  // Process each counter
  serviceCounters.forEach((counter) => {
    counter.processTimeUnit()
  })

  // Assign customers to idle counters
  assignCustomersToCounters()

  // Update the time axis
  updateTimeAxis()

  // Update statistics
  updateStatistics()
}

// Assign waiting customers to idle counters
function assignCustomersToCounters() {
  // First, sort the queue based on the selected algorithm
  sortQueue()

  // Then, find idle counters and assign customers
  const idleCounters = serviceCounters.filter((counter) => counter.status === "idle")

  while (idleCounters.length > 0 && customers.length > 0) {
    const counter = idleCounters.shift()
    const customer = customers.shift()
    counter.assignCustomer(customer)
  }

  // Update the queue display
  updateQueueUI()
}

// Update statistics display
function updateStatistics() {
  const avgWaitTime = customersServed > 0 ? totalWaitTime / customersServed : 0
  const avgTurnaroundTime = customersServed > 0 ? totalTurnaroundTime / customersServed : 0

  document.getElementById("avg-wait-time").textContent = `${avgWaitTime.toFixed(1)} min`
  document.getElementById("avg-turnaround-time").textContent = `${avgTurnaroundTime.toFixed(1)} min`
  document.getElementById("customers-served").textContent = customersServed
  document.getElementById("customers-waiting").textContent = customers.length
}

// Initialize the time axis for the Gantt chart
function initializeTimeAxis() {
  const timeAxis = document.getElementById("time-axis")
  timeAxis.innerHTML = ""

  // Create time markers for the next 30 minutes
  for (let i = 0; i <= 30; i += 5) {
    const marker = document.createElement("div")
    marker.className = "time-marker"
    marker.textContent = `${i} min`
    timeAxis.appendChild(marker)
  }
}

// Update the time axis as time progresses
function updateTimeAxis() {
  const timeAxis = document.getElementById("time-axis")

  // If current time is approaching the end of the visible axis, extend it
  if (currentTime >= 25) {
    timeAxis.innerHTML = ""

    const startTime = Math.floor(currentTime / 5) * 5
    for (let i = 0; i <= 30; i += 5) {
      const marker = document.createElement("div")
      marker.className = "time-marker"
      marker.textContent = `${startTime + i} min`
      timeAxis.appendChild(marker)
    }
  }
}

// Update Gantt chart data when a customer completes service
function updateGanttData(customer) {
  ganttData.push({
    id: customer.id,
    name: customer.name,
    arrivalTime: customer.arrivalTime,
    startTime: customer.startTime,
    endTime: customer.endTime,
    waitTime: customer.waitTime,
    serviceTime: customer.estimatedTime,
    counter: customer.counterAssigned,
  })

  // Update the Gantt chart visualization
  updateGanttChart()
}

// Update the Gantt chart visualization
function updateGanttChart() {
  const ganttChart = document.getElementById("gantt-chart")
  ganttChart.innerHTML = ""

  // Create a row for each customer in the Gantt data
  ganttData.forEach((data) => {
    const row = document.createElement("div")
    row.className = "gantt-row"

    const label = document.createElement("div")
    label.className = "gantt-label"
    label.textContent = data.name

    const timeline = document.createElement("div")
    timeline.className = "gantt-timeline"

    // Calculate positions and widths as percentages
    const timeScale = 100 / 30 // 30 minutes visible at a time

    // Waiting block
    if (data.waitTime > 0) {
      const waitingBlock = document.createElement("div")
      waitingBlock.className = "gantt-block waiting"
      waitingBlock.style.left = `${data.arrivalTime * timeScale}%`
      waitingBlock.style.width = `${data.waitTime * timeScale}%`
      waitingBlock.textContent = "Wait"
      timeline.appendChild(waitingBlock)
    }

    // Processing block
    const processingBlock = document.createElement("div")
    processingBlock.className = "gantt-block completed"
    processingBlock.style.left = `${data.startTime * timeScale}%`
    processingBlock.style.width = `${data.serviceTime * timeScale}%`
    processingBlock.textContent = `Counter ${data.counter}`
    timeline.appendChild(processingBlock)

    row.appendChild(label)
    row.appendChild(timeline)
    ganttChart.appendChild(row)
  })

  // Add rows for active customers
  serviceCounters.forEach((counter) => {
    if (counter.status === "busy" && counter.customer) {
      const customer = counter.customer

      const row = document.createElement("div")
      row.className = "gantt-row"

      const label = document.createElement("div")
      label.className = "gantt-label"
      label.textContent = customer.name

      const timeline = document.createElement("div")
      timeline.className = "gantt-timeline"

      // Calculate positions and widths
      const timeScale = 100 / 30 // 30 minutes visible at a time

      // Waiting block
      const waitTime = customer.startTime - customer.arrivalTime
      if (waitTime > 0) {
        const waitingBlock = document.createElement("div")
        waitingBlock.className = "gantt-block waiting"
        waitingBlock.style.left = `${customer.arrivalTime * timeScale}%`
        waitingBlock.style.width = `${waitTime * timeScale}%`
        waitingBlock.textContent = "Wait"
        timeline.appendChild(waitingBlock)
      }

      // Processing block
      const processingBlock = document.createElement("div")
      processingBlock.className = "gantt-block processing"
      processingBlock.style.left = `${customer.startTime * timeScale}%`
      processingBlock.style.width = `${(currentTime - customer.startTime) * timeScale}%`
      processingBlock.textContent = `Counter ${customer.counterAssigned}`
      timeline.appendChild(processingBlock)

      row.appendChild(label)
      row.appendChild(timeline)
      ganttChart.appendChild(row)
    }
  })
}

// Initialize the price chart using Chart.js
function initializeChart() {
  const ctx = document.getElementById("price-chart").getContext("2d")

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: `${selectedCrypto}/USD`,
          data: [],
          borderColor: "#6c5ce7",
          backgroundColor: "rgba(108, 92, 231, 0.1)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#6c5ce7",
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 2,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: {
              hour: "HH:mm",
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
            text: "Price (USD)",
          },
          position: "right",
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (context) => `Price: $${context.parsed.y.toFixed(2)}`,
          },
        },
        annotation: {
          annotations: {},
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
    },
  })
}

// Generate simulated price data
function generateSimulatedData() {
  // Clear existing data
  priceData = []

  // Set base price based on selected cryptocurrency
  let basePrice
  switch (selectedCrypto) {
    case "BTC":
      basePrice = 50000 + Math.random() * 10000
      break
    case "ETH":
      basePrice = 3000 + Math.random() * 500
      break
    case "SOL":
      basePrice = 100 + Math.random() * 30
      break
    case "BNB":
      basePrice = 400 + Math.random() * 50
      break
    case "XRP":
      basePrice = 0.5 + Math.random() * 0.2
      break
    default:
      basePrice = 1000 + Math.random() * 200
  }

  // Generate data points based on selected timeframe
  let dataPoints
  let timeIncrement

  switch (selectedTimeframe) {
    case "1h":
      dataPoints = 60
      timeIncrement = 60 * 1000 // 1 minute
      break
    case "4h":
      dataPoints = 48
      timeIncrement = 5 * 60 * 1000 // 5 minutes
      break
    case "1d":
      dataPoints = 96
      timeIncrement = 15 * 60 * 1000 // 15 minutes
      break
    case "1w":
      dataPoints = 168
      timeIncrement = 60 * 60 * 1000 // 1 hour
      break
    default:
      dataPoints = 60
      timeIncrement = 60 * 1000 // 1 minute
  }

  // Generate random price movements with some trend
  const currentTime = new Date()
  let price = basePrice
  const trend = Math.random() > 0.5 ? 1 : -1
  const trendStrength = Math.random() * 0.01
  const volatility = basePrice * 0.005 // 0.5% volatility

  // Generate support and resistance levels
  supportLevels = [basePrice * 0.95, basePrice * 0.97, basePrice * 0.99]

  resistanceLevels = [basePrice * 1.01, basePrice * 1.03, basePrice * 1.05]

  // Generate price data
  for (let i = 0; i < dataPoints; i++) {
    // Calculate time for this data point
    const time = new Date(currentTime.getTime() - (dataPoints - i) * timeIncrement)

    // Add some randomness to the price
    const randomFactor = (Math.random() - 0.5) * 2
    const trendFactor = trend * trendStrength * i
    let priceDelta = randomFactor * volatility + basePrice * trendFactor

    // Check if price is near support or resistance levels
    const nearSupport = supportLevels.some((level) => Math.abs(price - level) < volatility)
    const nearResistance = resistanceLevels.some((level) => Math.abs(price - level) < volatility)

    // Adjust price based on support and resistance
    if (nearSupport && price < basePrice) {
      priceDelta = Math.abs(priceDelta) * 0.7 // Bounce from support
    } else if (nearResistance && price > basePrice) {
      priceDelta = -Math.abs(priceDelta) * 0.7 // Bounce from resistance
    }

    price += priceDelta

    // Ensure price doesn't go negative
    price = Math.max(price, 0.01)

    // Add data point
    priceData.push({
      x: time,
      y: price,
    })
  }

  // Set current price to the last data point
  currentPrice = priceData[priceData.length - 1].y

  // Calculate technical indicators
  calculateIndicators()

  // Generate trading signal
  generateSignal()
}

// Calculate technical indicators based on price data
function calculateIndicators() {
  // Extract prices array for calculations
  const prices = priceData.map((point) => point.y)
  const lastPrice = prices[prices.length - 1]

  // Simple Moving Average (SMA)
  const sma20 = calculateSMAFunc(prices, 20)
  indicators.sma.value = sma20
  indicators.sma.signal = lastPrice > sma20 ? "bullish" : "bearish"

  // Exponential Moving Average (EMA)
  const ema12 = calculateEMAFunc(prices, 12)
  const ema26 = calculateEMAFunc(prices, 26)
  indicators.ema.value = ema12
  indicators.ema.signal = ema12 > ema26 ? "bullish" : "bearish"

  // Relative Strength Index (RSI)
  const rsi = calculateRSI(prices, 14)
  indicators.rsi.value = rsi
  if (rsi > 70) {
    indicators.rsi.signal = "bearish" // Overbought
  } else if (rsi < 30) {
    indicators.rsi.signal = "bullish" // Oversold
  } else {
    indicators.rsi.signal = "neutral"
  }

  // Moving Average Convergence Divergence (MACD)
  const macd = calculateMACD(prices)
  indicators.macd.value = macd.macd
  indicators.macd.signal = macd.macd > macd.signal ? "bullish" : "bearish"

  // Bollinger Bands
  const bb = calculateBollingerBands(prices, 20, 2)
  indicators.bb.value = bb.middle
  if (lastPrice > bb.upper) {
    indicators.bb.signal = "bearish" // Price above upper band
  } else if (lastPrice < bb.lower) {
    indicators.bb.signal = "bullish" // Price below lower band
  } else {
    indicators.bb.signal = "neutral"
  }

  // Stochastic Oscillator
  const stoch = calculateStochastic(prices, 14, 3)
  indicators.stoch.value = stoch.k
  if (stoch.k > 80) {
    indicators.stoch.signal = "bearish" // Overbought
  } else if (stoch.k < 20) {
    indicators.stoch.signal = "bullish" // Oversold
  } else {
    indicators.stoch.signal = "neutral"
  }

  // Fibonacci Retracement
  const fib = calculateFibonacciLevels(prices)
  indicators.fib.value = fib.level_0_5
  if (lastPrice < fib.level_0_382) {
    indicators.fib.signal = "bullish" // Price below 38.2% level
  } else if (lastPrice > fib.level_0_618) {
    indicators.fib.signal = "bearish" // Price above 61.8% level
  } else {
    indicators.fib.signal = "neutral"
  }

  // Volume Weighted Average Price (VWAP)
  // Simulating VWAP since we don't have volume data
  const vwap = calculateSMAFunc(prices, 10)
  indicators.vwap.value = vwap
  indicators.vwap.signal = lastPrice > vwap ? "bullish" : "bearish"

  // Average True Range (ATR)
  const atr = calculateATR(prices, 14)
  indicators.atr.value = atr
  indicators.atr.signal = "neutral" // ATR is a volatility indicator, not directional

  // Support and Resistance
  indicators.sr.value = 0
  if (isNearLevel(lastPrice, supportLevels, atr)) {
    indicators.sr.signal = "bullish" // Near support
  } else if (isNearLevel(lastPrice, resistanceLevels, atr)) {
    indicators.sr.signal = "bearish" // Near resistance
  } else {
    indicators.sr.signal = "neutral"
  }
}

// Generate trading signal based on technical indicators
function generateSignal() {
  // Count bullish and bearish signals
  let bullishCount = 0
  let bearishCount = 0
  let totalIndicators = 0

  for (const key in indicators) {
    if (indicators[key].signal === "bullish") {
      bullishCount++
    } else if (indicators[key].signal === "bearish") {
      bearishCount++
    }
    totalIndicators++
  }

  // Calculate confidence scores
  const bullishConfidence = Math.round((bullishCount / totalIndicators) * 100)
  const bearishConfidence = Math.round((bearishCount / totalIndicators) * 100)

  // Determine signal
  let signal = "neutral"
  let confidence = 0

  if (bullishConfidence > bearishConfidence && bullishConfidence >= 60) {
    signal = "buy"
    confidence = bullishConfidence
  } else if (bearishConfidence > bullishConfidence && bearishConfidence >= 60) {
    signal = "sell"
    confidence = bearishConfidence
  } else {
    signal = "neutral"
    confidence = 100 - Math.abs(bullishConfidence - bearishConfidence)
  }

  // Add random delay to simulate analysis time (1-3 seconds)
  setTimeout(
    () => {
      // Update UI with signal
      updateSignalUI(signal, confidence)

      // Send alert if signal changed and meets threshold
      if (signal !== lastSignal && confidence >= alertSettings.minConfidence) {
        if ((signal === "buy" && alertSettings.alertOnBuy) || (signal === "sell" && alertSettings.alertOnSell)) {
          sendAlert(signal, confidence)

          // Add to signal history
          addSignalToHistory(signal, confidence)
        }
      }

      // Update last signal
      lastSignal = signal
      lastSignalTime = new Date()
    },
    Math.random() * 2000 + 1000,
  )
}

// Update the UI with current data
function updateUI() {
  // Update price chart
  priceChart.data.datasets[0].data = priceData
  priceChart.data.datasets[0].label = `${selectedCrypto}/USD`

  // Update chart annotations for support and resistance levels
  updateChartAnnotations()

  priceChart.update()

  // Update current price display
  document.getElementById("current-price").textContent = `$${currentPrice.toFixed(2)}`

  // Calculate price change
  const startPrice = priceData[0].y
  const priceChange = ((currentPrice - startPrice) / startPrice) * 100
  const priceChangeElement = document.getElementById("price-change")
  priceChangeElement.textContent = `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`
  priceChangeElement.className = priceChange >= 0 ? "positive" : "negative"

  // Update technical indicators display
  updateIndicatorsUI()

  // Update last updated time
  document.getElementById("last-updated").textContent = new Date().toLocaleTimeString()

  // Update statistics
  updateStatistics()
}

// Update chart annotations for support and resistance levels
function updateChartAnnotations() {
  // Clear existing annotations
  priceChart.options.plugins.annotation.annotations = {}

  // Add support levels
  supportLevels.forEach((level, index) => {
    priceChart.options.plugins.annotation.annotations[`support${index}`] = {
      type: "line",
      scaleID: "y",
      value: level,
      borderColor: "rgba(0, 184, 148, 0.5)",
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        content: `Support: $${level.toFixed(2)}`,
        enabled: true,
        position: "start",
        backgroundColor: "rgba(0, 184, 148, 0.8)",
      },
    }
  })

  // Add resistance levels
  resistanceLevels.forEach((level, index) => {
    priceChart.options.plugins.annotation.annotations[`resistance${index}`] = {
      type: "line",
      scaleID: "y",
      value: level,
      borderColor: "rgba(214, 48, 49, 0.5)",
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        content: `Resistance: $${level.toFixed(2)}`,
        enabled: true,
        position: "start",
        backgroundColor: "rgba(214, 48, 49, 0.8)",
      },
    }
  })
}

// Update the technical indicators display
function updateIndicatorsUI() {
  const indicatorsGrid = document.getElementById("indicators-grid")
  indicatorsGrid.innerHTML = ""

  // Map of indicator keys to display names
  const indicatorNames = {
    sma: "SMA (20)",
    ema: "EMA (12/26)",
    rsi: "RSI (14)",
    macd: "MACD",
    bb: "Bollinger Bands",
    stoch: "Stochastic",
    fib: "Fibonacci",
    vwap: "VWAP",
    atr: "ATR",
    sr: "Support/Resistance",
  }

  // Create indicator items
  for (const key in indicators) {
    const indicator = indicators[key]
    const indicatorItem = document.createElement("div")
    indicatorItem.className = "indicator-item"

    const nameSpan = document.createElement("span")
    nameSpan.className = "indicator-name"
    nameSpan.textContent = indicatorNames[key] || key

    const valueSpan = document.createElement("span")
    valueSpan.className = `indicator-value ${indicator.signal}`

    // Format value based on indicator type
    let valueText
    switch (key) {
      case "rsi":
      case "stoch":
        valueText = `${indicator.value.toFixed(1)}`
        break
      case "atr":
        valueText = `$${indicator.value.toFixed(2)}`
        break
      case "sr":
        valueText = indicator.signal.toUpperCase()
        break
      default:
        if (indicator.value > 1000) {
          valueText = `$${indicator.value.toFixed(0)}`
        } else if (indicator.value > 100) {
          valueText = `$${indicator.value.toFixed(1)}`
        } else {
          valueText = `$${indicator.value.toFixed(2)}`
        }
    }

    valueSpan.textContent = valueText

    indicatorItem.appendChild(nameSpan)
    indicatorItem.appendChild(valueSpan)
    indicatorsGrid.appendChild(indicatorItem)
  }
}

// Update the signal UI
function updateSignalUI(signal, confidence) {
  const signalIndicator = document.getElementById("signal-indicator")
  const signalBadge = signalIndicator.querySelector(".signal-badge")
  const confidenceFill = document.getElementById("confidence-fill")

  // Update signal badge
  signalBadge.className = `signal-badge ${signal}`
  signalBadge.textContent = signal.toUpperCase()

  // Update confidence bar
  confidenceFill.style.width = `${confidence}%`
  confidenceFill.textContent = `${confidence}%`

  // Update entry price, stop loss, and take profit
  if (signal !== "neutral") {
    const entryPrice = currentPrice
    let stopLoss, takeProfit

    if (signal === "buy") {
      stopLoss = entryPrice * 0.95 // 5% below entry
      takeProfit = entryPrice * 1.1 // 10% above entry
    } else {
      // sell
      stopLoss = entryPrice * 1.05 // 5% above entry
      takeProfit = entryPrice * 0.9 // 10% below entry
    }

    document.getElementById("entry-price").textContent = `$${entryPrice.toFixed(2)}`
    document.getElementById("stop-loss").textContent = `$${stopLoss.toFixed(2)}`
    document.getElementById("take-profit").textContent = `$${takeProfit.toFixed(2)}`
  } else {
    document.getElementById("entry-price").textContent = "--"
    document.getElementById("stop-loss").textContent = "--"
    document.getElementById("take-profit").textContent = "--"
  }

  // Update last updated time
  document.getElementById("last-updated").textContent = new Date().toLocaleTimeString()
}

// Generate simulated order book
function generateOrderBook() {
  const asks = document.getElementById("order-book-asks")
  const bids = document.getElementById("order-book-bids")
  const spread = document.getElementById("order-book-spread")

  asks.innerHTML = ""
  bids.innerHTML = ""

  // Generate 10 ask orders above current price
  const askPrices = []
  let askTotal = 0
  for (let i = 0; i < 10; i++) {
    const price = currentPrice * (1 + (i + 1) * 0.001)
    const size = Math.random() * 10 + 0.5
    askTotal += size
    askPrices.push({ price, size, total: askTotal })
  }

  // Generate 10 bid orders below current price
  const bidPrices = []
  let bidTotal = 0
  for (let i = 0; i < 10; i++) {
    const price = currentPrice * (1 - (i + 1) * 0.001)
    const size = Math.random() * 10 + 0.5
    bidTotal += size
    bidPrices.push({ price, size, total: bidTotal })
  }

  // Calculate max total for depth visualization
  const maxTotal = Math.max(askTotal, bidTotal)

  // Render asks (in reverse order - highest to lowest)
  askPrices.reverse().forEach((ask) => {
    const row = document.createElement("div")
    row.className = "ask-row"

    const priceCell = document.createElement("div")
    priceCell.textContent = ask.price.toFixed(2)

    const sizeCell = document.createElement("div")
    sizeCell.textContent = ask.size.toFixed(4)

    const totalCell = document.createElement("div")
    totalCell.textContent = ask.total.toFixed(4)

    // Add depth visualization
    const depthBar = document.createElement("div")
    depthBar.className = "depth-bar ask-depth"
    depthBar.style.width = `${(ask.total / maxTotal) * 100}%`

    row.appendChild(priceCell)
    row.appendChild(sizeCell)
    row.appendChild(totalCell)
    row.appendChild(depthBar)
    row.style.position = "relative"

    asks.appendChild(row)
  })

  // Calculate spread
  const lowestAsk = askPrices[0].price
  const highestBid = bidPrices[0].price
  const spreadValue = lowestAsk - highestBid
  const spreadPercentage = (spreadValue / lowestAsk) * 100

  spread.textContent = `Spread: $${spreadValue.toFixed(2)} (${spreadPercentage.toFixed(2)}%)`

  // Render bids (highest to lowest)
  bidPrices.forEach((bid) => {
    const row = document.createElement("div")
    row.className = "bid-row"

    const priceCell = document.createElement("div")
    priceCell.textContent = bid.price.toFixed(2)

    const sizeCell = document.createElement("div")
    sizeCell.textContent = bid.size.toFixed(4)

    const totalCell = document.createElement("div")
    totalCell.textContent = bid.total.toFixed(4)

    // Add depth visualization
    const depthBar = document.createElement("div")
    depthBar.className = "depth-bar bid-depth"
    depthBar.style.width = `${(bid.total / maxTotal) * 100}%`

    row.appendChild(priceCell)
    row.appendChild(sizeCell)
    row.appendChild(totalCell)
    row.appendChild(depthBar)
    row.style.position = "relative"

    bids.appendChild(row)
  })
}

// Start auto-refresh interval
function startAutoRefresh() {
  // Clear any existing interval
  stopAutoRefresh()

  // Set new interval based on timeframe
  let refreshInterval
  switch (selectedTimeframe) {
    case "1h":
      refreshInterval = 10000 // 10 seconds
      break
    case "4h":
      refreshInterval = 30000 // 30 seconds
      break
    case "1d":
      refreshInterval = 60000 // 1 minute
      break
    case "1w":
      refreshInterval = 300000 // 5 minutes
      break
    default:
      refreshInterval = 10000 // 10 seconds
  }

  autoRefreshInterval = setInterval(() => {
    // Update price data with new point
    updatePriceData()

    // Update order book
    generateOrderBook()

    // Update UI
    updateUI()
  }, refreshInterval)
}

// Stop auto-refresh interval
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
}

// Update price data with a new data point
function updatePriceData() {
  // Remove oldest data point
  priceData.shift()

  // Get last price
  const lastPrice = priceData[priceData.length - 1].y

  // Calculate time for new data point
  let timeIncrement
  switch (selectedTimeframe) {
    case "1h":
      timeIncrement = 60 * 1000 // 1 minute
      break
    case "4h":
      timeIncrement = 5 * 60 * 1000 // 5 minutes
      break
    case "1d":
      timeIncrement = 15 * 60 * 1000 // 15 minutes
      break
    case "1w":
      timeIncrement = 60 * 60 * 1000 // 1 hour
      break
    default:
      timeIncrement = 60 * 1000 // 1 minute
  }

  const newTime = new Date(priceData[priceData.length - 1].x.getTime() + timeIncrement)

  // Calculate new price with some randomness
  const volatility = lastPrice * 0.005 // 0.5% volatility
  const randomFactor = (Math.random() - 0.5) * 2
  let priceDelta = randomFactor * volatility

  // Check if price is near support or resistance levels
  const nearSupport = supportLevels.some((level) => Math.abs(lastPrice - level) < volatility)
  const nearResistance = resistanceLevels.some((level) => Math.abs(lastPrice - level) < volatility)

  // Adjust price based on support and resistance
  if (nearSupport && lastPrice < supportLevels[0]) {
    priceDelta = Math.abs(priceDelta) * 0.7 // Bounce from support
  } else if (nearResistance && lastPrice > resistanceLevels[0]) {
    priceDelta = -Math.abs(priceDelta) * 0.7 // Bounce from resistance
  }

  let newPrice = lastPrice + priceDelta

  // Ensure price doesn't go negative
  newPrice = Math.max(newPrice, 0.01)

  // Add new data point
  priceData.push({
    x: newTime,
    y: newPrice,
  })

  // Update current price
  currentPrice = newPrice

  // Calculate technical indicators
  calculateIndicators()

  // Generate trading signal
  generateSignal()
}

// Save alert settings
function saveAlertSettings() {
  alertSettings.email = document.getElementById("alert-email").value
  alertSettings.phone = document.getElementById("alert-phone").value
  alertSettings.alertOnBuy = document.getElementById("alert-buy-signals").checked
  alertSettings.alertOnSell = document.getElementById("alert-sell-signals").checked
  alertSettings.minConfidence = Number.parseInt(document.getElementById("min-confidence").value)

  // Save to localStorage
  localStorage.setItem("cryptoAlertSettings", JSON.stringify(alertSettings))

  // Show success message
  const alertStatus = document.getElementById("alert-status")
  alertStatus.textContent = "Alert settings saved successfully!"
  alertStatus.className = "alert-status success"

  // Hide message after 3 seconds
  setTimeout(() => {
    alertStatus.className = "alert-status"
  }, 3000)
}

// Load alert settings from localStorage
function loadAlertSettings() {
  const savedSettings = localStorage.getItem("cryptoAlertSettings")
  if (savedSettings) {
    const settings = JSON.parse(savedSettings)

    // Update global settings
    Object.assign(alertSettings, settings)

    // Update UI
    document.getElementById("alert-email").value = settings.email || ""
    document.getElementById("alert-phone").value = settings.phone || ""
    document.getElementById("alert-buy-signals").checked = settings.alertOnBuy !== false
    document.getElementById("alert-sell-signals").checked = settings.alertOnSell !== false
    document.getElementById("min-confidence").value = settings.minConfidence || 75
    document.getElementById("confidence-value").textContent = `${settings.minConfidence || 75}%`
  }
}

// Send alert when signal is generated
function sendAlert(signal, confidence) {
  if (!alertSettings.email && !alertSettings.phone) {
    console.log("No alert contact information provided")
    return
  }

  const signalType = signal.toUpperCase()
  const subject = `${signalType} Signal Alert for ${selectedCrypto}/USD`
  const message = `
        ${signalType} Signal detected for ${selectedCrypto}/USD
        
        Price: $${currentPrice.toFixed(2)}
        Confidence: ${confidence}%
        Time: ${new Date().toLocaleString()}
        
        Entry Price: $${currentPrice.toFixed(2)}
        Stop Loss: $${signal === "buy" ? (currentPrice * 0.95).toFixed(2) : (currentPrice * 1.05).toFixed(2)}
        Take Profit: $${signal === "buy" ? (currentPrice * 1.1).toFixed(2) : (currentPrice * 0.9).toFixed(2)}
        
        Technical Indicators:
        - SMA: ${indicators.sma.signal.toUpperCase()}
        - EMA: ${indicators.ema.signal.toUpperCase()}
        - RSI: ${indicators.rsi.value.toFixed(1)} (${indicators.rsi.signal.toUpperCase()})
        - MACD: ${indicators.macd.signal.toUpperCase()}
        - Bollinger Bands: ${indicators.bb.signal.toUpperCase()}
        
        This is an automated alert from your Crypto Trading Signal Bot.
    `

  // Send email alert using EmailJS
  if (alertSettings.email) {
    emailjs
      .send(
        "default_service", // Replace with your EmailJS service ID
        "template_crypto_alert", // Replace with your EmailJS template ID
        {
          to_email: alertSettings.email,
          subject: subject,
          message: message,
          crypto: selectedCrypto,
          price: `$${currentPrice.toFixed(2)}`,
          signal: signalType,
          confidence: `${confidence}%`,
        },
      )
      .then(
        (response) => {
          console.log("Email sent:", response)
        },
        (error) => {
          console.error("Email error:", error)
        },
      )
  }

  // For SMS alerts via Twilio (would require backend)
  if (alertSettings.phone) {
    console.log(`SMS would be sent to ${alertSettings.phone} with message: ${subject}`)

    // In a real implementation, you would make an API call to a serverless function
    // that would use Twilio to send the SMS

    /* Example of serverless function call:
        fetch('https://your-serverless-function.com/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: alertSettings.phone,
                message: `${signalType} Signal: ${selectedCrypto}/USD at $${currentPrice.toFixed(2)} (${confidence}% confidence)`
            })
        })
        .then(response => response.json())
        .then(data => console.log('SMS sent:', data))
        .catch(error => console.error('SMS error:', error));
        */
  }
}

// Add signal to history
function addSignalToHistory(signal, confidence) {
  const newSignal = {
    date: new Date(),
    signal: signal,
    crypto: selectedCrypto,
    price: currentPrice,
    confidence: confidence,
    result: "pending",
  }

  signalHistory.push(newSignal)
  saveSignalHistory()
  updateSignalHistoryUI()
}

// Save signal history to localStorage
function saveSignalHistory() {
  localStorage.setItem("cryptoSignalHistory", JSON.stringify(signalHistory))
}

// Load signal history from localStorage
function loadSignalHistoryFunc() {
  const savedHistory = localStorage.getItem("cryptoSignalHistory")
  if (savedHistory) {
    signalHistory = JSON.parse(savedHistory)
    updateSignalHistoryUI()
  }
}

// Update signal history UI
function updateSignalHistoryUI() {
  const historyTable = document.getElementById("signal-history")
  historyTable.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Signal</th>
            <th>Crypto</th>
            <th>Price</th>
            <th>Confidence</th>
            <th>Result</th>
        </tr>
    `

  signalHistory.forEach((signal) => {
    const row = document.createElement("tr")

    const dateCell = document.createElement("td")
    dateCell.textContent = signal.date.toLocaleString()

    const signalCell = document.createElement("td")
    signalCell.textContent = signal.signal.toUpperCase()

    const cryptoCell = document.createElement("td")
    cryptoCell.textContent = signal.crypto

    const priceCell = document.createElement("td")
    priceCell.textContent = `$${signal.price.toFixed(2)}`

    const confidenceCell = document.createElement("td")
    confidenceCell.textContent = `${signal.confidence}%`

    const resultCell = document.createElement("td")
    resultCell.textContent = signal.result

    row.appendChild(dateCell)
    row.appendChild(signalCell)
    row.appendChild(cryptoCell)
    row.appendChild(priceCell)
    row.appendChild(confidenceCell)
    row.appendChild(resultCell)

    historyTable.appendChild(row)
  })
}

// Helper function to calculate Simple Moving Average (SMA)
function calculateSMAFunc(data, period) {
  if (data.length < period) {
    return 0
  }

  let sum = 0
  for (let i = data.length - period; i < data.length; i++) {
    sum += data[i]
  }

  return sum / period
}

// Helper function to calculate Exponential Moving Average (EMA)
function calculateEMAFunc(data, period) {
  if (data.length < period) {
    return 0
  }

  const k = 2 / (period + 1)
  let ema = data[period - 1]

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }

  return ema
}

// Helper function to calculate Relative Strength Index (RSI)
function calculateRSI(data, period) {
  if (data.length < period + 1) {
    return 50
  }

  const gains = []
  const losses = []

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) {
      gains.push(change)
      losses.push(0)
    } else {
      losses.push(Math.abs(change))
      gains.push(0)
    }
  }

  const avgGain = calculateSMAFunc(gains.slice(data.length - period - 1), period)
  const avgLoss = calculateSMAFunc(losses.slice(data.length - period - 1), period)

  if (avgLoss === 0) {
    return 100
  }

  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// Helper function to calculate Moving Average Convergence Divergence (MACD)
function calculateMACD(data) {
  const ema12 = calculateEMAFunc(data, 12)
  const ema26 = calculateEMAFunc(data, 26)
  const macd = ema12 - ema26
  const signal = calculateEMAFunc(
    data.slice(data.length - 30).map(() => macd),
    9,
  )

  return { macd, signal }
}

// Helper function to calculate Bollinger Bands
function calculateBollingerBands(data, period, stdDev) {
  const sma = calculateSMAFunc(data, period)
  let sum = 0

  for (let i = data.length - period; i < data.length; i++) {
    sum += Math.pow(data[i] - sma, 2)
  }

  const variance = sum / period
  const standardDeviation = Math.sqrt(variance)

  const upper = sma + standardDeviation * stdDev
  const lower = sma - standardDeviation * stdDev

  return { upper, middle: sma, lower }
}

// Helper function to calculate Stochastic Oscillator
function calculateStochastic(data, periodK, periodD) {
  const lowest = Math.min(...data.slice(data.length - periodK))
  const highest = Math.max(...data.slice(data.length - periodK))

  const k = ((data[data.length - 1] - lowest) / (highest - lowest)) * 100
  const dValues = []
  for (let i = data.length - periodK; i < data.length; i++) {
    const lowestK = Math.min(...data.slice(i - periodK, i))
    const highestK = Math.max(...data.slice(i - periodK, i))
    dValues.push(((data[i] - lowestK) / (highestK - lowestK)) * 100)
  }
  const d = calculateSMAFunc(dValues, periodD)

  return { k, d }
}

// Helper function to calculate Fibonacci Retracement levels
function calculateFibonacciLevels(data) {
  const highest = Math.max(...data)
  const lowest = Math.min(...data)
  const diff = highest - lowest

  const level_0_0 = highest
  const level_0_236 = highest - diff * 0.236
  const level_0_382 = highest - diff * 0.382
  const level_0_5 = highest - diff * 0.5
  const level_0_618 = highest - diff * 0.618
  const level_0_786 = highest - diff * 0.786
  const level_1_0 = lowest

  return {
    level_0_0,
    level_0_236,
    level_0_382,
    level_0_5,
    level_0_618,
    level_0_786,
    level_1_0,
  }
}

// Helper function to calculate Average True Range (ATR)
function calculateATR(data, period) {
  const trueRanges = []

  for (let i = 1; i < data.length; i++) {
    const high = data[i]
    const low = data[i]
    const closePrev = data[i - 1]

    const highLow = high - low
    const highClose = Math.abs(high - closePrev)
    const lowClose = Math.abs(low - closePrev)

    const trueRange = Math.max(highLow, highClose, lowClose)
    trueRanges.push(trueRange)
  }

  return calculateSMAFunc(trueRanges, period)
}

// Helper function to check if price is near a level
function isNearLevel(price, levels, atr) {
  const atrThreshold = atr * 0.5 // Define threshold as 0.5x ATR
  return levels.some((level) => Math.abs(price - level) <= atrThreshold)
}

// Initialize EmailJS
var emailjs = {
  init: (userId) => {
    // Mock implementation for EmailJS initialization
    console.log("EmailJS initialized with user ID:", userId)
  },
  send: (serviceId, templateId, templateParams) => {
    // Mock implementation for EmailJS send function
    return new Promise((resolve, reject) => {
      console.log("EmailJS send called with:", serviceId, templateId, templateParams)
      resolve({ status: 200, text: "OK" })
    })
  },
}
