# CPU Scheduling Algorithms Simulator

## 📌 Project Title
**Operating System Project: CPU Scheduling Algorithm Visualizer**

## 📋 Description
This project is a simulation tool for visualizing and understanding various **CPU scheduling algorithms** such as:

- FCFS (First-Come, First-Served)
- SJF (Shortest Job First - Non-preemptive and Preemptive)
- Priority Scheduling (Non-preemptive and Preemptive)
- Round Robin

The simulator takes input such as arrival time, burst time, priority (if applicable), and time quantum (for Round Robin) to calculate:
- Gantt Chart
- Waiting Time
- Turnaround Time
- Average Waiting and Turnaround Times

## 🎯 Objective
To help students understand how different CPU scheduling algorithms work and their effect on system performance.

---

## ⚙️ Features

- 📈 Graphical or tabular Gantt chart representation
- ⏱️ Dynamic calculation of waiting and turnaround time
- ⛏️ Support for both preemptive and non-preemptive versions (SJF and Priority)
- 💡 User-friendly input method
- 📊 Comparison of average metrics across algorithms

---

## 🚀 Technologies Used

- **Frontend**: HTML, CSS 
- **Backend/Logic**: = JavaScript 
-
---

## 📥 Inputs

| Parameter        | Description                         |
|------------------|-------------------------------------|
| Arrival Time     | Time at which process arrives       |
| Burst Time       | CPU time required for execution     |
| Priority         | (For Priority Scheduling only)      |
| Time Quantum     | (For Round Robin only)              |

---

## 📤 Outputs

- Gantt Chart
- Waiting Time per process
- Turnaround Time per process
- Average Waiting Time
- Average Turnaround Time

---

## 🧪 Sample Output

```bash
Process    Waiting Time    Turnaround Time
P1              0                 4
P2              4                 7
P3              7                 11
Average Waiting Time: 3.67
Average Turnaround Time: 7.33

📚 References
	•	Operating System Concepts - Galvin
	•	GeeksforGeeks - CPU Scheduling
	•	Wikipedia - Scheduling Algorithms

⸻

🧑‍🏫 Authors
	•	Punit Jadhav – Full Stack & Logic Implementation
	•	[Add other contributors here]

⸻

✅ Future Scope
	•	Add support for multi-level queues
	•	Include I/O-bound process handling
	•	Performance visualization graphs

⸻
