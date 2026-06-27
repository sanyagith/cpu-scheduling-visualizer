import { Simulator } from '../core/simulator.js';
import { updatePipelineVisualization, cacheGanttForAnimation } from './animation.js';
import { renderGanttChart, exportGanttAsPNG } from './ganttChart.js';
import { updateComparisonCharts } from './charts.js';
import { calculateMetrics } from '../utils/calculations.js';
import { 
    saveSimulationsToStorage, 
    loadSimulationsFromStorage, 
    exportToCSV, 
    parseCSV, 
    generateRandomProcesses, 
    showToast 
} from '../utils/helpers.js';

// Initialize core simulator
const sim = new Simulator();

// Core DOM Elements Cache
const elements = {
    // Views
    views: document.querySelectorAll('.view-section'),
    navLinks: document.querySelectorAll('.nav-link'),
    sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
    sidebar: document.querySelector('.sidebar'),
    
    // Theme toggle
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeToggleIcon: document.querySelector('.theme-toggle-icon'),
    
    // Playback
    scrubber: document.getElementById('timeline-scrubber'),
    timeReadout: document.getElementById('sim-time-readout'),
    endTimeLabel: document.getElementById('timeline-end-label'),
    btnPlay: document.getElementById('btn-play'),
    btnPause: document.getElementById('btn-pause'),
    btnRestart: document.getElementById('btn-restart'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    speedSelect: document.getElementById('playback-speed-select'),
    
    // Configuration
    algoSelect: document.getElementById('algo-select'),
    rrQuantumGroup: document.getElementById('rr-quantum-group'),
    timeQuantumInput: document.getElementById('time-quantum-input'),
    priorityRulesGroup: document.getElementById('priority-rules-group'),
    prioRuleSelect: document.getElementById('prio-rule-select'),
    
    // Actions & Queue setup
    openAddModalBtn: document.getElementById('open-add-modal-btn'),
    randomDataBtn: document.getElementById('random-data-btn'),
    exampleDatasetBtn: document.getElementById('example-dataset-btn'),
    importCsvTriggerBtn: document.getElementById('import-csv-trigger-btn'),
    csvFileInput: document.getElementById('csv-file-input'),
    clearAllBtn: document.getElementById('clear-all-btn'),
    undoBtn: document.getElementById('undo-btn'),
    redoBtn: document.getElementById('redo-btn'),
    inputProcessList: document.getElementById('input-process-list'),
    
    // Stats Readout
    statAvgWait: document.getElementById('stat-avg-wait'),
    statAvgTurnaround: document.getElementById('stat-avg-turnaround'),
    statAvgResponse: document.getElementById('stat-avg-response'),
    statCpuUtil: document.getElementById('stat-cpu-util'),
    
    // Table
    resultsTableBody: document.getElementById('results-table-body'),
    tableHeaders: document.querySelectorAll('#results-table th'),
    
    // Modals
    addProcessModal: document.getElementById('add-process-modal'),
    addProcessForm: document.getElementById('add-process-form'),
    modalPidInput: document.getElementById('modal-pid-input'),
    modalArrInput: document.getElementById('modal-arr-input'),
    modalBurstInput: document.getElementById('modal-burst-input'),
    modalPriorityInput: document.getElementById('modal-priority-input'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalTitle: document.getElementById('process-modal-title'),
    modalSubmitBtn: document.getElementById('modal-submit-btn'),
    
    saveSimBtn: document.getElementById('save-simulation-btn'),
    saveSimulationModal: document.getElementById('save-simulation-modal'),
    saveSimulationForm: document.getElementById('save-simulation-form'),
    saveDescriptionInput: document.getElementById('save-description-input'),
    saveModalCancelBtn: document.getElementById('save-modal-cancel-btn'),
    
    exportCsvBtn: document.getElementById('export-csv-btn'),
    exportGanttPngBtn: document.getElementById('export-gantt-png-btn'),
    ganttChartWrapper: document.getElementById('gantt-chart-wrapper'),
    
    // Comparison
    comparisonGanttsWrapper: document.getElementById('comparison-gantts-wrapper'),
    comparisonSummaryTableBody: document.getElementById('comparison-summary-table-body'),
    compareAlgoCheckboxes: document.querySelectorAll('#compare-algorithms-selector input'),
    
    // Learning
    eduSidebarNav: document.getElementById('edu-sidebar-nav'),
    eduContentPane: document.getElementById('edu-content-pane'),
    
    // History
    searchSimulationsInput: document.getElementById('search-simulations-input'),
    simulationsHistoryTableBody: document.getElementById('simulations-history-table-body')
};

// State trackers
let activeView = "simulator";
let editingProcessId = null;
let currentSortColumn = "id";
let currentSortDirection = "asc";

// Educational descriptions database
const EDUCATIONAL_RESOURCES = {
    FCFS: {
        name: "First Come First Serve (FCFS)",
        strategy: "Non-Preemptive",
        complexity: "O(N)",
        howItWorks: "FCFS schedules processes in the exact order they arrive in the ready queue. The first process to request the CPU gets the CPU allocated first. Once a process starts running, it runs to completion.",
        advantages: [
            "Extremely simple to understand and implement.",
            "Fair in terms of request sequence (no starvation)."
        ],
        disadvantages: [
            "Convoy Effect: Short processes must wait a long time behind long-running processes, causing high average waiting times.",
            "Average waiting and turnaround times are generally poor."
        ],
        useCases: "Batch processing systems where turnaround times are less critical; basic print spooling."
    },
    SJF: {
        name: "Shortest Job First (SJF)",
        strategy: "Non-Preemptive",
        complexity: "O(N log N)",
        howItWorks: "SJF schedules the process with the shortest burst time first. If multiple processes have equal burst times, FCFS acts as the tie-breaker. Once scheduled, it executes to completion.",
        advantages: [
            "Provably optimal: Produces the minimum average waiting time for a given set of processes.",
            "Fast turnaround for short jobs."
        ],
        disadvantages: [
            "Starvation: Long processes can wait indefinitely if shorter processes arrive continuously.",
            "Difficult to estimate/know CPU burst times in advance in general-purpose computing."
        ],
        useCases: "Long-term scheduling in batch processing environments where job durations can be estimated."
    },
    SRTF: {
        name: "Shortest Remaining Time First (SRTF)",
        strategy: "Preemptive (Preemptive SJF)",
        complexity: "O(N log N)",
        howItWorks: "SRTF is the preemptive version of SJF. At any tick, if a newly arrived process has a remaining burst time shorter than the remaining run time of the active process, the active process is preempted.",
        advantages: [
            "Optimal response: Minimizes waiting times even further for dynamic arrivals.",
            "Very responsive for short-lived interactive requests."
        ],
        disadvantages: [
            "Starvation of longer processes under high load.",
            "High overhead due to frequent context switches."
        ],
        useCases: "Short-term CPU schedulers in interactive operating environments."
    },
    RoundRobin: {
        name: "Round Robin (RR)",
        strategy: "Preemptive (Time-Slicing)",
        complexity: "O(N)",
        howItWorks: "Processes are dispatched in a circular queue order. Each process is allocated a fixed time quantum (slice). If it doesn't complete within the slice, it is preempted and put at the end of the queue.",
        advantages: [
            "Fairness: Every process gets an equal share of the CPU.",
            "Excellent Response Time: Highly responsive for multi-user interactive systems.",
            "No starvation."
        ],
        disadvantages: [
            "Highly dependent on Time Quantum: Too small causes massive context switch overhead; too large degenerates into FCFS.",
            "Average waiting time can be relatively high."
        ],
        useCases: "Interactive operating systems, time-sharing servers, network packet scheduling."
    },
    PriorityNonPreemptive: {
        name: "Priority Scheduling (Non-Preemptive)",
        strategy: "Non-Preemptive",
        complexity: "O(N log N)",
        howItWorks: "Each process is assigned a priority value. When the CPU becomes idle, the process with the highest priority in the ready queue is scheduled. It runs to completion without interruption.",
        advantages: [
            "Important tasks are completed quickly.",
            "Provides a direct mechanism to map real-world priority to CPU share."
        ],
        disadvantages: [
            "Starvation (Indefinite Blocking): Low-priority processes may never execute if high-priority processes arrive frequently.",
            "Requires a starvation mitigation technique (like Priority Aging)."
        ],
        useCases: "Real-time systems, mission-critical systems."
    },
    PriorityPreemptive: {
        name: "Priority Scheduling (Preemptive)",
        strategy: "Preemptive",
        complexity: "O(N log N)",
        howItWorks: "Preemptive Priority Scheduling immediately interrupts the active process if a newly arrived process has a higher priority. The preempted process is placed back in the ready queue.",
        advantages: [
            "Extremely responsive to high-priority events.",
            "Ensures instant execution of critical operations."
        ],
        disadvantages: [
            "Massive context-switch overhead under dynamic workloads.",
            "Starvation of low-priority tasks remains a significant risk."
        ],
        useCases: "Embedded systems, kernel process schedulers, real-time control systems."
    },
    HRRN: {
        name: "Highest Response Ratio Next (HRRN)",
        strategy: "Non-Preemptive",
        complexity: "O(N^2)",
        howItWorks: "HRRN selects the next process based on its Response Ratio. Response Ratio = (Waiting Time + Burst Time) / Burst Time. Since waiting time increases the ratio, older processes eventually gain priority.",
        advantages: [
            "Avoids Starvation: Older waiting processes eventually get scheduled regardless of burst size.",
            "Balances short and long jobs gracefully."
        ],
        disadvantages: [
            "Scheduling decision overhead is high since response ratios must be computed for all waiting processes.",
            "Burst time estimates are still required."
        ],
        useCases: "Advanced batch queue managers, resource-constrained scheduling systems."
    }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Navigation setup
    elements.navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const targetView = link.dataset.view;
            switchView(targetView);
        });
    });

    elements.sidebarToggleBtn.addEventListener("click", () => {
        elements.sidebar.classList.toggle("open");
    });

    // 2. Playback binds
    sim.onStateChange = handleSimulatorStateChange;
    sim.onDataChange = handleSimulatorDataChange;
    sim.onPlaybackStatusChange = handlePlaybackStatusChange;

    elements.scrubber.addEventListener("input", (e) => {
        sim.seekTo(parseInt(e.target.value));
    });

    elements.btnPlay.addEventListener("click", () => {
        if (sim.isPlaying) {
            sim.pause();
        } else {
            sim.play();
        }
    });

    elements.btnRestart.addEventListener("click", () => sim.restart());
    elements.btnPrev.addEventListener("click", () => sim.stepBackward());
    elements.btnNext.addEventListener("click", () => sim.stepForward());

    elements.speedSelect.addEventListener("change", (e) => {
        sim.setSpeed(parseFloat(e.target.value));
    });

    // 3. Algorithm setup binds
    elements.algoSelect.addEventListener("change", (e) => {
        const algo = e.target.value;
        // Show/hide specific parameters
        elements.rrQuantumGroup.style.display = algo === "RoundRobin" ? "block" : "none";
        elements.priorityRulesGroup.style.display = algo.includes("Priority") ? "block" : "none";
        
        updateSimulatorAlgorithmSettings();
    });

    elements.timeQuantumInput.addEventListener("change", updateSimulatorAlgorithmSettings);
    elements.prioRuleSelect.addEventListener("change", updateSimulatorAlgorithmSettings);

    // 4. Job queue configuration buttons
    elements.openAddModalBtn.addEventListener("click", () => openProcessModal());
    elements.randomDataBtn.addEventListener("click", loadRandomDataset);
    elements.exampleDatasetBtn.addEventListener("click", loadExampleDataset);
    elements.clearAllBtn.addEventListener("click", () => {
        sim.clearProcesses();
        showToast("Process queue cleared", "info");
    });

    elements.undoBtn.addEventListener("click", () => {
        if (sim.undo()) showToast("Undo action applied", "info");
    });
    elements.redoBtn.addEventListener("click", () => {
        if (sim.redo()) showToast("Redo action applied", "info");
    });

    // CSV Handling
    elements.importCsvTriggerBtn.addEventListener("click", () => elements.csvFileInput.click());
    elements.csvFileInput.addEventListener("change", handleCSVImport);
    elements.exportCsvBtn.addEventListener("click", () => {
        if (sim.scheduledProcesses.length === 0) {
            showToast("No simulation data to export.", "danger");
            return;
        }
        exportToCSV(sim.scheduledProcesses);
        showToast("CSV exported successfully", "success");
    });

    // Gantt PNG export
    elements.exportGanttPngBtn.addEventListener("click", () => {
        if (sim.gantt.length === 0) {
            showToast("No Gantt Chart to export.", "danger");
            return;
        }
        exportGanttAsPNG(elements.ganttChartWrapper);
        showToast("Gantt Chart exported as PNG", "success");
    });

    // Save Simulation Run
    elements.saveSimBtn.addEventListener("click", () => {
        if (sim.processes.length === 0) {
            showToast("Cannot save empty simulation", "danger");
            return;
        }
        elements.saveDescriptionInput.value = "";
        elements.saveSimulationModal.classList.add("show");
    });

    elements.saveSimulationForm.addEventListener("submit", handleSaveSimulationSubmit);
    elements.saveModalCancelBtn.addEventListener("click", () => {
        elements.saveSimulationModal.classList.remove("show");
    });

    // 5. Add process modal forms
    elements.addProcessForm.addEventListener("submit", handleAddProcessSubmit);
    elements.modalCancelBtn.addEventListener("click", closeProcessModal);

    // 6. Theme toggle
    elements.themeToggleBtn.addEventListener("click", toggleTheme);

    // 7. Interactive table sorting
    elements.tableHeaders.forEach(th => {
        th.addEventListener("click", () => {
            const col = th.dataset.sort;
            if (currentSortColumn === col) {
                currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
            } else {
                currentSortColumn = col;
                currentSortDirection = "asc";
            }
            renderResultsTable();
        });
    });

    // 8. Search simulations
    elements.searchSimulationsInput.addEventListener("input", renderSavedSimulations);

    // 9. Comparison checkbox binds
    elements.compareAlgoCheckboxes.forEach(cb => {
        cb.addEventListener("change", runComparisonAnalysis);
    });

    // Load initial example dataset
    loadExampleDataset();
    
    // Load educational view initial setup
    renderEducationalCenter();

    // Set initial light/dark button state
    updateThemeUI();
});

// --- THEME MANAGEMENT ---

function toggleTheme() {
    const activeTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = activeTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("antigravity_theme", nextTheme);
    updateThemeUI();
    // Redraw graphs/Gantt charts to ensure text color coordinates with theme change
    sim.runSimulation();
    if (activeView === "comparison") {
        runComparisonAnalysis();
    }
}

function updateThemeUI() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    elements.themeToggleIcon.textContent = isLight ? "🌙" : "☀️";
}

// Ensure theme preference is loaded from storage
(function() {
    const theme = localStorage.getItem("antigravity_theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
})();


// --- VIEW NAVIGATOR ---

function switchView(viewName) {
    activeView = viewName;
    elements.navLinks.forEach(link => {
        if (link.dataset.view === viewName) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    elements.views.forEach(section => {
        if (section.id === `view-${viewName}`) {
            section.classList.add("active");
        } else {
            section.classList.remove("active");
        }
    });

    // Trigger actions specific to entering views
    if (viewName === "comparison") {
        runComparisonAnalysis();
    } else if (viewName === "history") {
        renderSavedSimulations();
    }

    // Auto-close sidebar on mobile after clicking
    if (window.innerWidth <= 1024) {
        elements.sidebar.classList.remove("open");
    }
}


// --- PROCESS LIST & METRICS UPDATES ---

function updateSimulatorAlgorithmSettings() {
    const algo = elements.algoSelect.value;
    const timeQuantum = parseInt(elements.timeQuantumInput.value) || 2;
    const lowNumberIsHighPriority = elements.prioRuleSelect.value === "low";
    
    sim.setAlgorithm(algo, {
        timeQuantum,
        lowNumberIsHighPriority
    });
}

function handleSimulatorDataChange(processes) {
    // Re-render inputs list
    renderInputProcessList(processes);

    // Update scrubber size
    const maxTick = sim.history.length > 0 ? sim.history.length - 1 : 0;
    elements.scrubber.max = maxTick;
    elements.endTimeLabel.textContent = `End (${maxTick}s)`;

    // Update scrubber position if it got out of bounds
    if (sim.currentTime > maxTick) {
        sim.currentTime = maxTick;
    }
    elements.scrubber.value = sim.currentTime;

    // Trigger tables and Gantt re-draws
    renderResultsTable();
    updatePipelineVisualization(sim.history[sim.currentTime] || {
        time: 0,
        runningPid: "IDLE",
        readyQueue: [],
        upcomingPids: [],
        completedPids: []
    }, sim.scheduledProcesses);

    cacheGanttForAnimation(sim.gantt);
    renderGanttChart(elements.ganttChartWrapper, sim.gantt, sim.currentTime, maxTick);

    // Update stats readout
    const metrics = calculateMetrics(sim.scheduledProcesses, sim.gantt);
    elements.statAvgWait.textContent = metrics.avgWaitingTime.toFixed(2);
    elements.statAvgTurnaround.textContent = metrics.avgTurnaroundTime.toFixed(2);
    elements.statAvgResponse.textContent = metrics.avgResponseTime.toFixed(2);
    elements.statCpuUtil.textContent = `${metrics.cpuUtilization}%`;

    // Manage undo/redo button enabled states
    elements.undoBtn.disabled = sim.undoStack.length === 0;
    elements.redoBtn.disabled = sim.redoStack.length === 0;
}

function handleSimulatorStateChange(time, snapshot, gantt, scheduledProcesses) {
    elements.scrubber.value = time;
    elements.timeReadout.textContent = `t = ${time}`;
    
    const maxTick = sim.history.length > 0 ? sim.history.length - 1 : 0;
    renderGanttChart(elements.ganttChartWrapper, gantt, time, maxTick);
    updatePipelineVisualization(snapshot, scheduledProcesses);
}

function handlePlaybackStatusChange(isPlaying) {
    if (isPlaying) {
        elements.btnPlay.innerHTML = "⏸️";
        elements.btnPlay.title = "Pause Simulation";
        elements.btnPlay.classList.add("active-play");
    } else {
        elements.btnPlay.innerHTML = "▶️";
        elements.btnPlay.title = "Play Simulation";
        elements.btnPlay.classList.remove("active-play");
    }
}


// --- PROCESS INPUT LIST UI RENDER ---

function renderInputProcessList(processes) {
    if (processes.length === 0) {
        elements.inputProcessList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 12px;">Queue is empty.</div>`;
        return;
    }

    elements.inputProcessList.innerHTML = processes.map(p => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--card-border); font-size: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="color: var(--primary-color);">${p.id}</strong>
                <span style="color: var(--text-muted);">Arr: ${p.arrivalTime}s | Burst: ${p.burstTime}s | Prio: ${p.priority}</span>
            </div>
            <div style="display: flex; gap: 4px;">
                <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.editProcessInput('${p.id}')">✏️</button>
                <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem; background: var(--red-color);" onclick="window.deleteProcessInput('${p.id}')">🗑️</button>
            </div>
        </div>
    `).join("");
}

// Global hook scripts for inline onclick events
window.deleteProcessInput = (id) => {
    sim.removeProcess(id);
    showToast(`Removed process ${id}`, "info");
};

window.editProcessInput = (id) => {
    const proc = sim.processes.find(p => p.id === id);
    if (proc) {
        openProcessModal(proc);
    }
};


// --- RESULTS TABLE ---

function renderResultsTable() {
    const list = [...sim.scheduledProcesses];
    if (list.length === 0) {
        elements.resultsTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-muted);">No process execution data available. Add processes to simulate.</td>
            </tr>
        `;
        return;
    }

    // Sort list based on active sorting
    list.sort((a, b) => {
        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];

        // Parse numerical comparisons
        if (typeof valA === "string") {
            // Sort process IDs alphanumeric (P1, P2...)
            return currentSortDirection === "asc" 
                ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        }

        return currentSortDirection === "asc" ? valA - valB : valB - valA;
    });

    elements.resultsTableBody.innerHTML = list.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td>${p.arrivalTime}s</td>
            <td>${p.burstTime}s</td>
            <td>${p.priority}</td>
            <td>${p.startTime === -1 ? "-" : p.startTime + "s"}</td>
            <td>${p.completionTime === -1 ? "-" : p.completionTime + "s"}</td>
            <td>${p.completionTime === -1 ? "-" : p.waitingTime + "s"}</td>
            <td>${p.completionTime === -1 ? "-" : p.turnaroundTime + "s"}</td>
            <td>${p.completionTime === -1 ? "-" : p.responseTime + "s"}</td>
        </tr>
    `).join("");
}


// --- MODAL SUBMISSIONS ---

function openProcessModal(editingProcess = null) {
    if (editingProcess) {
        editingProcessId = editingProcess.id;
        elements.modalTitle.textContent = `Edit Process ${editingProcess.id}`;
        elements.modalPidInput.value = editingProcess.id;
        elements.modalPidInput.disabled = true; // Cannot edit PID key
        elements.modalArrInput.value = editingProcess.arrivalTime;
        elements.modalBurstInput.value = editingProcess.burstTime;
        elements.modalPriorityInput.value = editingProcess.priority;
        elements.modalSubmitBtn.textContent = "Save Changes";
    } else {
        editingProcessId = null;
        elements.modalTitle.textContent = "Create Process";
        // Auto-increment process name index
        let num = sim.processes.length + 1;
        while (sim.processes.some(p => p.id === `P${num}`)) {
            num++;
        }
        elements.modalPidInput.value = `P${num}`;
        elements.modalPidInput.disabled = false;
        elements.modalArrInput.value = "0";
        elements.modalBurstInput.value = "5";
        elements.modalPriorityInput.value = "1";
        elements.modalSubmitBtn.textContent = "Create Job";
    }
    
    elements.addProcessModal.classList.add("show");
}

function closeProcessModal() {
    elements.addProcessModal.classList.remove("show");
}

function handleAddProcessSubmit(e) {
    e.preventDefault();
    const pid = elements.modalPidInput.value.trim();
    const arrival = parseInt(elements.modalArrInput.value);
    const burst = parseInt(elements.modalBurstInput.value);
    const priority = parseInt(elements.modalPriorityInput.value) || 0;

    if (!pid) return;
    if (arrival < 0 || burst <= 0) {
        showToast("Arrival time must be >= 0 and Burst must be > 0", "danger");
        return;
    }

    if (editingProcessId) {
        sim.updateProcess(editingProcessId, {
            arrivalTime: arrival,
            burstTime: burst,
            priority: priority
        });
        showToast(`Process ${editingProcessId} updated`, "success");
    } else {
        sim.addProcess(pid, arrival, burst, priority);
        showToast(`Process ${pid} added`, "success");
    }

    closeProcessModal();
}

function handleSaveSimulationSubmit(e) {
    e.preventDefault();
    const desc = elements.saveDescriptionInput.value.trim();
    if (!desc) return;

    const savedRuns = loadSimulationsFromStorage();
    const newRun = {
        id: `sim_${Date.now()}`,
        description: desc,
        algorithm: sim.algorithm,
        options: { ...sim.options },
        processes: sim.processes.map(p => ({
            id: p.id,
            arrivalTime: p.arrivalTime,
            burstTime: p.burstTime,
            priority: p.priority
        })),
        date: new Date().toLocaleString()
    };

    savedRuns.push(newRun);
    saveSimulationsToStorage(savedRuns);
    
    elements.saveSimulationModal.classList.remove("show");
    showToast("Simulation saved successfully", "success");
}


// --- REPOSITORY VIEW ---

function renderSavedSimulations() {
    const list = loadSimulationsFromStorage();
    const query = elements.searchSimulationsInput.value.toLowerCase().trim();
    
    const filtered = list.filter(item => {
        return item.description.toLowerCase().includes(query) || 
               item.algorithm.toLowerCase().includes(query) ||
               item.processes.length.toString().includes(query);
    });

    if (filtered.length === 0) {
        elements.simulationsHistoryTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No saved simulation records found.</td>
            </tr>
        `;
        return;
    }

    elements.simulationsHistoryTableBody.innerHTML = filtered.map(item => `
        <tr>
            <td><strong>${item.description}</strong></td>
            <td><span class="edu-tag" style="margin-bottom: 0;">${item.algorithm}</span></td>
            <td>${item.processes.length} jobs</td>
            <td><small>${item.date}</small></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="window.loadSavedRun('${item.id}')">📂 Load</button>
                    <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="window.deleteSavedRun('${item.id}')">🗑️ Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

window.loadSavedRun = (id) => {
    const list = loadSimulationsFromStorage();
    const target = list.find(s => s.id === id);
    if (target) {
        sim.pause();
        sim.clearProcesses();
        
        // Restore algorithms select settings
        elements.algoSelect.value = target.algorithm;
        elements.rrQuantumGroup.style.display = target.algorithm === "RoundRobin" ? "block" : "none";
        elements.priorityRulesGroup.style.display = target.algorithm.includes("Priority") ? "block" : "none";
        
        if (target.options) {
            elements.timeQuantumInput.value = target.options.timeQuantum || 2;
            elements.prioRuleSelect.value = target.options.lowNumberIsHighPriority ? "low" : "high";
            sim.options = { ...target.options };
        }

        sim.setProcesses(target.processes);
        sim.setAlgorithm(target.algorithm, target.options);
        
        showToast(`Loaded: ${target.description}`, "success");
        switchView("simulator");
    }
};

window.deleteSavedRun = (id) => {
    let list = loadSimulationsFromStorage();
    list = list.filter(s => s.id !== id);
    saveSimulationsToStorage(list);
    showToast("Saved run deleted", "info");
    renderSavedSimulations();
};


// --- EXAMPLES LOADERS ---

function loadExampleDataset() {
    sim.pause();
    const exampleList = [
        { id: "P1", arrivalTime: 0, burstTime: 8, priority: 3 },
        { id: "P2", arrivalTime: 1, burstTime: 4, priority: 1 },
        { id: "P3", arrivalTime: 2, burstTime: 9, priority: 4 },
        { id: "P4", arrivalTime: 3, burstTime: 5, priority: 2 }
    ];
    sim.clearProcesses();
    sim.setProcesses(exampleList);
    updateSimulatorAlgorithmSettings();
    showToast("Example dataset loaded", "info");
}

function loadRandomDataset() {
    sim.pause();
    const randomCount = Math.floor(Math.random() * 3) + 4; // 4 to 6 processes
    const list = generateRandomProcesses(randomCount);
    sim.clearProcesses();
    sim.setProcesses(list);
    updateSimulatorAlgorithmSettings();
    showToast(`Generated ${randomCount} random processes`, "success");
}

function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            sim.pause();
            const list = parseCSV(evt.target.result);
            sim.clearProcesses();
            sim.setProcesses(list);
            updateSimulatorAlgorithmSettings();
            showToast(`Imported ${list.length} processes from CSV`, "success");
        } catch (err) {
            showToast(`CSV Import Error: ${err.message}`, "danger");
        }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-importing same file
    elements.csvFileInput.value = "";
}


// --- COMPARISON ANALYSIS ---

function runComparisonAnalysis() {
    if (sim.processes.length === 0) {
        elements.comparisonGanttsWrapper.innerHTML = `<div style="text-align: center; font-style: italic; color: var(--text-muted); padding: 24px;">Add processes in the simulator view to perform comparison.</div>`;
        elements.comparisonSummaryTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No comparison data available.</td></tr>`;
        return;
    }

    const comparisonResults = [];

    elements.compareAlgoCheckboxes.forEach(cb => {
        if (cb.checked) {
            const algoKey = cb.value;
            let options = { ...sim.options };
            
            // Run independent simulations
            try {
                const simRes = sim.processes.length > 0 
                    ? sim.processes.map(p => p.clone()) 
                    : [];
                // Clear state
                simRes.forEach(p => p.reset());

                // Run algorithm direct
                const algo = elements.algoSelect.querySelector(`option[value="${algoKey}"]`);
                const algoName = algo ? algo.textContent : algoKey;

                // Let's resolve the exact simulator execution function
                const result = sim.setAlgorithm.constructor; // we just invoke scheduler run directly
                const runResult = sim.processes.length > 0 
                    ? sim.scheduledProcesses.length > 0 && sim.algorithm === algoKey 
                        ? { gantt: sim.gantt, processes: sim.scheduledProcesses, history: sim.history }
                        : sim.setAlgorithm.call({ 
                            processes: sim.processes, 
                            algorithm: algoKey, 
                            options: sim.options,
                            currentTime: 0,
                            runSimulation: sim.runSimulation 
                          }) // Actually, let's call the registry directly to avoid context mess
                    : null;
                
                // Let's call runScheduler directly from scheduler import!
                // Since scheduler.js is imported, we can run it.
                // Wait! Let's import the scheduler runner inside controls.js or run it.
                // We imported: `import { calculateMetrics } from '../utils/calculations.js';`
                // Let's import runScheduler, or since runScheduler is not in our imports list, let's check scheduler.js.
                // Yes, we can just run the schedule algorithms directly or import `runScheduler`!
                // Ah, let's check our imports. We have:
                // `import { Simulator } from '../core/simulator.js';`
                // Can we run it through a temp Simulator instance? Yes!
                // A temp Simulator instance is 100% clean, safe, and guarantees same output:
                const tempSim = new Simulator();
                tempSim.options = { ...sim.options };
                tempSim.processes = sim.processes.map(p => p.clone());
                tempSim.setAlgorithm(algoKey, sim.options);
                
                const finalMetrics = calculateMetrics(tempSim.scheduledProcesses, tempSim.gantt);
                const totalSwitches = tempSim.history.length > 0 
                    ? tempSim.history[tempSim.history.length - 1].contextSwitches 
                    : 0;

                comparisonResults.push({
                    algoKey: algoKey,
                    algoName: algoName,
                    gantt: tempSim.gantt,
                    metrics: finalMetrics,
                    contextSwitches: totalSwitches,
                    totalDuration: tempSim.history.length > 0 ? tempSim.history.length - 1 : 0
                });
            } catch (err) {
                console.error(`Comparison error for ${algoKey}:`, err);
            }
        }
    });

    // 1. Render Gantt timelines stack
    if (comparisonResults.length === 0) {
        elements.comparisonGanttsWrapper.innerHTML = `<div style="text-align: center; color: var(--text-muted);">Please select at least one algorithm.</div>`;
        return;
    }

    elements.comparisonGanttsWrapper.innerHTML = comparisonResults.map(r => `
        <div style="border-bottom: 1px solid var(--card-border); padding-bottom: 16px;">
            <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 6px; color: var(--primary-color);">${r.algoName}</h4>
            <div id="comp-gantt-${r.algoKey}" style="width: 100%;"></div>
        </div>
    `).join("");

    // Draw timelines for comparison
    comparisonResults.forEach(r => {
        renderGanttChart(`comp-gantt-${r.algoKey}`, r.gantt, r.totalDuration, r.totalDuration);
    });

    // 2. Render Comparative Tables
    elements.comparisonSummaryTableBody.innerHTML = comparisonResults.map(r => `
        <tr>
            <td><strong>${r.algoName}</strong></td>
            <td>${r.metrics.avgWaitingTime.toFixed(2)}s</td>
            <td>${r.metrics.avgTurnaroundTime.toFixed(2)}s</td>
            <td>${r.metrics.avgResponseTime.toFixed(2)}s</td>
            <td>${r.metrics.cpuUtilization.toFixed(1)}%</td>
            <td>${r.contextSwitches}</td>
            <td>${r.metrics.throughput.toFixed(3)}/s</td>
        </tr>
    `).join("");

    // 3. Render ChartJS graphics
    updateComparisonCharts(comparisonResults);
}


// --- LEARNING CENTER ---

function renderEducationalCenter() {
    const keys = Object.keys(EDUCATIONAL_RESOURCES);
    
    // Render side nav
    elements.eduSidebarNav.innerHTML = keys.map((key, idx) => `
        <div class="edu-sidebar-link ${idx === 0 ? 'active' : ''}" data-algo="${key}">
            ${EDUCATIONAL_RESOURCES[key].name}
        </div>
    `).join("");

    // Click triggers
    const links = elements.eduSidebarNav.querySelectorAll(".edu-sidebar-link");
    links.forEach(l => {
        l.addEventListener("click", () => {
            links.forEach(x => x.classList.remove("active"));
            l.classList.add("active");
            displayEducationDetails(l.dataset.algo);
        });
    });

    // Display first element
    if (keys.length > 0) {
        displayEducationDetails(keys[0]);
    }
}

function displayEducationDetails(algoKey) {
    const data = EDUCATIONAL_RESOURCES[algoKey];
    if (!data) return;

    elements.eduContentPane.innerHTML = `
        <span class="edu-tag">${data.strategy}</span>
        <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 8px;">${data.name}</h2>
        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 24px; font-weight: 500;">
            Complexity: <span style="color: var(--primary-color); font-family: monospace; font-weight: 700;">${data.complexity}</span>
        </div>

        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">How It Works</h3>
        <p>${data.howItWorks}</p>

        <div class="edu-pro-con">
            <div class="pro-card">
                <h4>Advantages</h4>
                <ul>
                    ${data.advantages.map(a => `<li>${a}</li>`).join("")}
                </ul>
            </div>
            <div class="con-card">
                <h4>Disadvantages</h4>
                <ul>
                    ${data.disadvantages.map(d => `<li>${d}</li>`).join("")}
                </ul>
            </div>
        </div>

        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; margin-top: 24px;">Key Applications</h3>
        <p>${data.useCases}</p>
    `;
}
