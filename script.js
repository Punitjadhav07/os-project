document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const queueForm = document.getElementById("queue-form")
    const nameInput = document.getElementById("name")
    const serviceSelect = document.getElementById("service")
    const priorityCheckbox = document.getElementById("priority")
    const queueList = document.getElementById("queue-list")
    const currentServing = document.getElementById("current-serving")
    const currentServiceType = document.getElementById("current-service-type")
    const nextBtn = document.getElementById("next-btn")
    const callAgainBtn = document.getElementById("call-again-btn")
    const clearBtn = document.getElementById("clear-btn")
    const totalWaiting = document.getElementById("total-waiting")
    const avgWaitTime = document.getElementById("avg-wait-time")
    const servedToday = document.getElementById("served-today")
    const priorityCount = document.getElementById("priority-count")
    const themeSwitch = document.getElementById("theme-switch")
    const settingsBtn = document.getElementById("settings-btn")
    const settingsPanel = document.getElementById("settings-panel")
    const saveSettingsBtn = document.getElementById("save-settings")
    const avgServiceTimeInput = document.getElementById("avg-service-time")
    const soundEnabledCheckbox = document.getElementById("sound-enabled")
    const autoNextCheckbox = document.getElementById("auto-next")
    const displayModeBtn = document.getElementById("display-mode-btn")
    const displayModeScreen = document.getElementById("display-mode-screen")
    const exitDisplayModeBtn = document.getElementById("exit-display-mode")
    const displayCurrentNumber = document.getElementById("display-current-number")
    const displayCurrentName = document.getElementById("display-current-name")
    const displayCurrentService = document.getElementById("display-current-service")
    const displayNextList = document.getElementById("display-next-list")
    const ticketContainer = document.getElementById("ticket-container")
    const ticketNumber = document.getElementById("ticket-number")
    const ticketName = document.getElementById("ticket-name")
    const ticketService = document.getElementById("ticket-service")
    const ticketWait = document.getElementById("ticket-wait")
    const closeTicketBtn = document.getElementById("close-ticket")
    const notification = document.getElementById("notification")
    const notificationMessage = document.getElementById("notification-message")
    const notificationSound = document.getElementById("notification-sound")
  
    // Queue data structure
    let queue = []
    let currentPerson = null
    let servedCount = 0
    let settings = {
      avgServiceTime: 5, // minutes
      soundEnabled: true,
      autoNext: false,
    }
    let autoNextTimer = null
    let ticketCounter = 1000 // Starting ticket number
  
    // Service type labels
    const serviceLabels = {
      general: "General Inquiry",
      deposit: "Deposit/Withdrawal",
      account: "Account Services",
      loan: "Loan Application",
    }
  
    // Load data from localStorage
    function loadData() {
      const savedQueue = localStorage.getItem("smartQueue")
      const savedCurrent = localStorage.getItem("currentPerson")
      const savedServed = localStorage.getItem("servedCount")
      const savedTicketCounter = localStorage.getItem("ticketCounter")
      const savedSettings = localStorage.getItem("queueSettings")
      const savedTheme = localStorage.getItem("theme")
  
      if (savedQueue) {
        queue = JSON.parse(savedQueue)
      }
  
      if (savedCurrent) {
        currentPerson = JSON.parse(savedCurrent)
      }
  
      if (savedServed) {
        servedCount = Number.parseInt(savedServed)
      }
  
      if (savedTicketCounter) {
        ticketCounter = Number.parseInt(savedTicketCounter)
      }
  
      if (savedSettings) {
        settings = JSON.parse(savedSettings)
        avgServiceTimeInput.value = settings.avgServiceTime
        soundEnabledCheckbox.checked = settings.soundEnabled
        autoNextCheckbox.checked = settings.autoNext
      }
  
      if (savedTheme === "dark") {
        document.body.classList.add("dark-mode")
        themeSwitch.checked = true
      }
  
      updateDisplay()
      updateStats()
      initializeChart()
    }
  
    // Save data to localStorage
    function saveData() {
      localStorage.setItem("smartQueue", JSON.stringify(queue))
      localStorage.setItem("currentPerson", JSON.stringify(currentPerson))
      localStorage.setItem("servedCount", servedCount.toString())
      localStorage.setItem("ticketCounter", ticketCounter.toString())
      localStorage.setItem("queueSettings", JSON.stringify(settings))
    }
  
    // Add person to queue
    function addToQueue(name, service, isPriority) {
      ticketCounter++
  
      const person = {
        id: Date.now().toString(),
        ticketNumber: ticketCounter,
        name: name,
        service: service,
        isPriority: isPriority,
        timestamp: new Date().toISOString(),
        estimatedWait: calculateEstimatedWait(),
      }
  
      // Add to front of queue if priority, otherwise to the end
      if (isPriority) {
        // Find the last priority person in the queue
        const lastPriorityIndex = [...queue].reverse().findIndex((p) => p.isPriority)
        if (lastPriorityIndex === -1) {
          // No priority people, add to front
          queue.unshift(person)
        } else {
          // Add after the last priority person
          queue.splice(queue.length - lastPriorityIndex, 0, person)
        }
      } else {
        queue.push(person)
      }
  
      // If no one is currently being served, serve the first person
      if (currentPerson === null && queue.length === 1) {
        serveNextPerson()
      } else {
        saveData()
        updateDisplay()
        updateStats()
        updateChart()
      }
  
      // Show ticket
      showTicket(person)
    }
  
    // Calculate estimated wait time
    function calculateEstimatedWait() {
      const peopleAhead = queue.length
      const avgTime = settings.avgServiceTime
      return peopleAhead * avgTime
    }
  
    // Update wait times for everyone in queue
    function updateWaitTimes() {
      queue.forEach((person, index) => {
        person.estimatedWait = (index + 1) * settings.avgServiceTime
      })
    }
  
    // Format minutes to readable time
    function formatWaitTime(minutes) {
      if (minutes < 1) {
        return "Less than a minute"
      } else if (minutes === 1) {
        return "1 minute"
      } else if (minutes < 60) {
        return `${minutes} minutes`
      } else {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (mins === 0) {
          return `${hours} hour${hours > 1 ? "s" : ""}`
        } else {
          return `${hours} hour${hours > 1 ? "s" : ""} ${mins} min`
        }
      }
    }
  
    // Serve next person in queue
    function serveNextPerson() {
      // Clear any existing auto-next timer
      if (autoNextTimer) {
        clearTimeout(autoNextTimer)
        autoNextTimer = null
      }
  
      if (queue.length > 0) {
        currentPerson = queue.shift()
        servedCount++
  
        // Play notification sound
        if (settings.soundEnabled) {
          notificationSound.play()
        }
  
        // Show notification
        showNotification(`Now serving ${currentPerson.name} (${currentPerson.ticketNumber})`)
  
        // Set auto-next timer if enabled
        if (settings.autoNext) {
          autoNextTimer = setTimeout(() => {
            serveNextPerson()
          }, 30000) // 30 seconds
        }
      } else {
        currentPerson = null
      }
  
      updateWaitTimes()
      saveData()
      updateDisplay()
      updateStats()
      updateChart()
      updateDisplayMode()
    }
  
    // Call the current person again
    function callAgain() {
      if (currentPerson) {
        // Play notification sound
        if (settings.soundEnabled) {
          notificationSound.play()
        }
  
        // Show notification
        showNotification(`Calling again: ${currentPerson.name} (${currentPerson.ticketNumber})`)
  
        // Visual effect - flash the current serving display
        currentServing.classList.add("pulse")
        setTimeout(() => {
          currentServing.classList.remove("pulse")
        }, 2000)
      }
    }
  
    // Clear the entire queue
    function clearQueue() {
      queue = []
      currentPerson = null
  
      // Clear auto-next timer if it exists
      if (autoNextTimer) {
        clearTimeout(autoNextTimer)
        autoNextTimer = null
      }
  
      saveData()
      updateDisplay()
      updateStats()
      updateChart()
      updateDisplayMode()
    }
  
    // Show notification
    function showNotification(message) {
      notificationMessage.textContent = message
      notification.classList.add("show")
  
      setTimeout(() => {
        notification.classList.remove("show")
      }, 5000)
    }
  
    // Show ticket
    function showTicket(person) {
      ticketNumber.textContent = person.ticketNumber
      ticketName.textContent = person.name
      ticketService.textContent = serviceLabels[person.service]
      ticketWait.textContent = formatWaitTime(person.estimatedWait)
      ticketContainer.classList.remove("hidden")
    }
  
    // Update the display
    function updateDisplay() {
      // Update current serving
      if (currentPerson) {
        currentServing.textContent = `${currentPerson.name} (${currentPerson.ticketNumber})`
        currentServiceType.textContent = serviceLabels[currentPerson.service]
        currentServing.classList.add("pulse")
      } else {
        currentServing.textContent = "No one currently"
        currentServiceType.textContent = ""
        currentServing.classList.remove("pulse")
      }
  
      // Update queue list
      queueList.innerHTML = ""
      if (queue.length === 0) {
        const emptyItem = document.createElement("li")
        emptyItem.textContent = "Queue is empty"
        emptyItem.style.textAlign = "center"
        emptyItem.style.color = "var(--gray-color)"
        queueList.appendChild(emptyItem)
      } else {
        queue.forEach((person, index) => {
          const li = document.createElement("li")
          li.className = `fade-in ${person.service} ${person.isPriority ? "priority" : ""}`
  
          const infoDiv = document.createElement("div")
          infoDiv.className = "queue-info"
  
          const nameSpan = document.createElement("div")
          nameSpan.className = "queue-name"
          nameSpan.textContent = person.name
  
          const serviceSpan = document.createElement("div")
          serviceSpan.className = "queue-service"
          serviceSpan.textContent = serviceLabels[person.service]
  
          const waitSpan = document.createElement("div")
          waitSpan.className = "queue-wait"
          waitSpan.textContent = `Est. wait: ${formatWaitTime(person.estimatedWait)}`
  
          infoDiv.appendChild(nameSpan)
          infoDiv.appendChild(serviceSpan)
          infoDiv.appendChild(waitSpan)
  
          const numberSpan = document.createElement("div")
          numberSpan.className = "queue-number"
          numberSpan.textContent = `#${person.ticketNumber}`
  
          li.appendChild(infoDiv)
          li.appendChild(numberSpan)
          queueList.appendChild(li)
  
          // Add staggered animation delay
          li.style.animationDelay = `${index * 0.1}s`
        })
      }
    }
  
    // Update statistics
    function updateStats() {
      totalWaiting.textContent = queue.length
  
      // Calculate average wait time
      if (queue.length > 0) {
        const totalWaitTime = queue.reduce((sum, person) => sum + person.estimatedWait, 0)
        const avgWait = Math.round(totalWaitTime / queue.length)
        avgWaitTime.textContent = formatWaitTime(avgWait)
      } else {
        avgWaitTime.textContent = "0 min"
      }
  
      servedToday.textContent = servedCount
  
      // Count priority cases
      const priorityPeople = queue.filter((person) => person.isPriority).length
      priorityCount.textContent = priorityPeople
    }
  
    // Initialize simple chart (placeholder)
    function initializeChart() {
      // This is a placeholder for a real chart library
      // In a real implementation, you would use Chart.js or similar
      const canvas = document.getElementById("queue-chart")
      const ctx = canvas.getContext("2d")
  
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
  
      // Set canvas dimensions
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
  
      // Draw simple bar chart
      const data = [
        { label: "General", value: queue.filter((p) => p.service === "general").length, color: "#3a7bd5" },
        { label: "Deposit", value: queue.filter((p) => p.service === "deposit").length, color: "#2ecc71" },
        { label: "Account", value: queue.filter((p) => p.service === "account").length, color: "#00d2ff" },
        { label: "Loan", value: queue.filter((p) => p.service === "loan").length, color: "#6c5ce7" },
      ]
  
      const maxValue = Math.max(...data.map((d) => d.value), 1)
      const barWidth = canvas.width / (data.length * 2)
      const spacing = barWidth / 2
  
      data.forEach((item, index) => {
        const x = spacing + index * (barWidth + spacing) * 2
        const barHeight = (item.value / maxValue) * (canvas.height - 40)
  
        // Draw bar
        ctx.fillStyle = item.color
        ctx.fillRect(x, canvas.height - barHeight - 20, barWidth, barHeight)
  
        // Draw label
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text-color")
        ctx.font = "10px Poppins"
        ctx.textAlign = "center"
        ctx.fillText(item.label, x + barWidth / 2, canvas.height - 5)
  
        // Draw value
        ctx.fillText(item.value.toString(), x + barWidth / 2, canvas.height - barHeight - 25)
      })
    }
  
    // Update chart
    function updateChart() {
      initializeChart()
    }
  
    // Update display mode screen
    function updateDisplayMode() {
      if (currentPerson) {
        displayCurrentNumber.textContent = `#${currentPerson.ticketNumber}`
        displayCurrentName.textContent = currentPerson.name
        displayCurrentService.textContent = serviceLabels[currentPerson.service]
      } else {
        displayCurrentNumber.textContent = "--"
        displayCurrentName.textContent = "--"
        displayCurrentService.textContent = "--"
      }
  
      // Update next in line
      displayNextList.innerHTML = ""
  
      // Show up to 3 next people
      const nextPeople = queue.slice(0, 3)
  
      if (nextPeople.length === 0) {
        const emptyDiv = document.createElement("div")
        emptyDiv.className = "next-item"
        emptyDiv.innerHTML = '<div class="next-number">--</div><div class="next-name">No one waiting</div>'
        displayNextList.appendChild(emptyDiv)
      } else {
        nextPeople.forEach((person) => {
          const div = document.createElement("div")
          div.className = "next-item"
  
          const numberDiv = document.createElement("div")
          numberDiv.className = "next-number"
          numberDiv.textContent = `#${person.ticketNumber}`
  
          const nameDiv = document.createElement("div")
          nameDiv.className = "next-name"
          nameDiv.textContent = person.name
  
          const serviceDiv = document.createElement("div")
          serviceDiv.className = "next-service"
          serviceDiv.textContent = serviceLabels[person.service]
  
          div.appendChild(numberDiv)
          div.appendChild(nameDiv)
          div.appendChild(serviceDiv)
  
          displayNextList.appendChild(div)
        })
      }
    }
  
    // Event Listeners
    queueForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const name = nameInput.value.trim()
      const service = serviceSelect.value
      const isPriority = priorityCheckbox.checked
  
      if (name) {
        addToQueue(name, service, isPriority)
        nameInput.value = ""
        nameInput.focus()
      }
    })
  
    nextBtn.addEventListener("click", serveNextPerson)
    callAgainBtn.addEventListener("click", callAgain)
  
    clearBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear the entire queue?")) {
        clearQueue()
      }
    })
  
    themeSwitch.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode")
      localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light")
      updateChart() // Redraw chart with new theme colors
    })
  
    settingsBtn.addEventListener("click", () => {
      settingsPanel.classList.toggle("hidden")
    })
  
    saveSettingsBtn.addEventListener("click", () => {
      settings.avgServiceTime = Number.parseInt(avgServiceTimeInput.value) || 5
      settings.soundEnabled = soundEnabledCheckbox.checked
      settings.autoNext = autoNextCheckbox.checked
  
      saveData()
      updateWaitTimes()
      updateDisplay()
      updateStats()
  
      settingsPanel.classList.add("hidden")
      showNotification("Settings saved successfully")
    })
  
    displayModeBtn.addEventListener("click", () => {
      displayModeScreen.classList.remove("hidden")
      updateDisplayMode()
    })
  
    exitDisplayModeBtn.addEventListener("click", () => {
      displayModeScreen.classList.add("hidden")
    })
  
    closeTicketBtn.addEventListener("click", () => {
      ticketContainer.classList.add("hidden")
    })
  
    // Initialize
    loadData()
  
    // Set up auto-refresh for display mode
    setInterval(updateDisplayMode, 5000)
  
    // Window resize event for chart
    window.addEventListener("resize", updateChart)
  })
  
  