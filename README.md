# CPU Scheduling Algorithm Visualizer

A professional, production-quality, and interactive web application designed to simulate, visualize, and compare CPU scheduling algorithms in real-time. Built entirely client-side with modern HTML5, CSS3 (glassmorphic styling, responsive layout, dark theme), and ES6+ JavaScript modules.

## Key Features

- **Algorithm Simulation**: Implements FCFS, SJF, SRTF, Round Robin, Priority (Preemptive/Non-Preemptive), and HRRN.
- **Interactive Scrubber**: Drag the timeline slider to any time step `t` to immediately see the ready queue, CPU, and completed states.
- **Side-by-Side Comparison**: Compare multiple scheduling strategies simultaneously with custom visual timelines, statistics dashboards, and comparative metrics graphs using Chart.js.
- **Pipeline Animation**: Visual representation of the Ready Queue (FIFO), CPU Execution status (with running progress bar), and Completed list.
- **Data Management**: Add, edit, or delete processes; generate random workloads; or load textbook example datasets.
- **Repository Support**: Save, search, load, and delete simulations from Local Storage.
- **Import/Export**: Export statistics as CSV, import workloads from CSV, and export the Gantt Chart as a PNG image.
- **Accessible Design**: Premium glassmorphic interface with a toggleable Dark/Light mode.

---

## Supported Algorithms

1. **First-Come First-Served (FCFS)**: Non-preemptive scheduling in order of arrival.
2. **Shortest Job First (SJF)**: Non-preemptive scheduling based on shortest burst time.
3. **Shortest Remaining Time First (SRTF)**: Preemptive SJF based on shortest remaining runtime.
4. **Priority Scheduling**: Non-preemptive and preemptive versions, with support for customizable priority directions.
5. **Round Robin (RR)**: Circular queue time-slicing using a customizable Time Quantum.
6. **Highest Response Ratio Next (HRRN)**: Non-preemptive algorithm that balances waiting time and burst time to prevent starvation.

---

## Folder Structure

```
cpu-scheduling-simulator/
├── index.html
├── package.json
├── README.md
├── css/
│   ├── style.css
│   └── dashboard.css
└── js/
    ├── test_suite.js
    ├── algorithms/
    │   ├── fcfs.js
    │   ├── sjf.js
    │   ├── srtf.js
    │   ├── priority.js
    │   ├── roundRobin.js
    │   └── hrrn.js
    ├── core/
    │   ├── process.js
    │   ├── scheduler.js
    │   └── simulator.js
    ├── ui/
    │   ├── animation.js
    │   ├── ganttChart.js
    │   ├── charts.js
    │   └── controls.js
    └── utils/
        ├── calculations.js
        └── helpers.js
```

---

## Installation & Running Locally

1. Clone the repository and navigate into the project folder:
   ```bash
   git clone [https://github.com/sanyagith/cpu-scheduling-visualizer.git](https://github.com/sanyagith/cpu-scheduling-visualizer.git)
   cd cpu-scheduling-visualizer
   ```

2. Install dependencies (standard tools only, like `serve` to bypass CORS rules on local ES modules):
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the address listed in your terminal (usually `http://localhost:3000` or `http://localhost:5000`).

5. To run the automated algorithm verification tests, run:
   ```bash
   npm run test
   ```

---

## Technical Architecture

The codebase strictly adheres to the **Separation of Concerns (SoC)** principle:

- **Model Layer (`js/core/process.js`)**: Encapsulates process properties, runtime states, and state-clearing helpers.
- **Engine Layer (`js/core/scheduler.js`, `js/algorithms/`)**: Calculates execution intervals and history snapshots. Schedulers are completely decoupled from DOM operations and return pure JS objects.
- **Simulation Driver (`js/core/simulator.js`)**: Coordinates tick steps, play/pause cycles, playback speed, timeline scrubbing seek operations, and maintains an undo/redo stack.
- **UI Controller (`js/ui/`)**: Binds events, drives views, updates Chart.js figures, handles responsive sidebar triggers, and manages dialog layers.
- **Graphics/Animation (`js/ui/ganttChart.js`, `js/ui/animation.js`)**: Renders Gantt timelines onto a high-DPI canvas (enabling simple PNG exports) and updates pipeline DOM configurations.
