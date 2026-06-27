/**
 * Helper utilities for storage, export, random generation, and notifications.
 */

// --- Local Storage Management ---

export function saveSimulationsToStorage(simulations) {
    localStorage.setItem("cpu_scheduler_simulations", JSON.stringify(simulations));
}

export function loadSimulationsFromStorage() {
    try {
        const stored = localStorage.getItem("cpu_scheduler_simulations");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load simulations from localStorage", e);
        return [];
    }
}

// --- CSV Import & Export ---

/**
 * Converts process execution metrics to a CSV string.
 */
export function exportToCSV(processes) {
    const headers = [
        "Process ID", 
        "Arrival Time", 
        "Burst Time", 
        "Priority", 
        "Start Time", 
        "Completion Time", 
        "Waiting Time", 
        "Turnaround Time", 
        "Response Time"
    ];
    
    const rows = processes.map(p => [
        p.id,
        p.arrivalTime,
        p.burstTime,
        p.priority,
        p.startTime,
        p.completionTime,
        p.waitingTime,
        p.turnaroundTime,
        p.responseTime
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `scheduling_metrics_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Parses processes from CSV content.
 * Expected format: 
 * Process ID, Arrival Time, Burst Time, Priority (Optional)
 */
export function parseCSV(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error("CSV file is empty or missing header.");

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const pidIdx = headers.findIndex(h => h.includes("id") || h.includes("process"));
    const arrIdx = headers.findIndex(h => h.includes("arrival"));
    const burstIdx = headers.findIndex(h => h.includes("burst"));
    const prioIdx = headers.findIndex(h => h.includes("priority"));

    if (pidIdx === -1 || arrIdx === -1 || burstIdx === -1) {
        throw new Error("CSV must contain 'Process ID', 'Arrival Time', and 'Burst Time' columns.");
    }

    const processes = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (cols.length < 3) continue;

        const id = cols[pidIdx];
        const arrivalTime = parseInt(cols[arrIdx]);
        const burstTime = parseInt(cols[burstIdx]);
        const priority = prioIdx !== -1 && cols[prioIdx] !== undefined ? parseInt(cols[prioIdx]) : 0;

        if (isNaN(arrivalTime) || isNaN(burstTime) || burstTime <= 0 || arrivalTime < 0) {
            throw new Error(`Invalid process values on row ${i + 1}.`);
        }

        processes.push({ id, arrivalTime, burstTime, priority });
    }

    return processes;
}

// --- Random Process Generator ---

/**
 * Generates an array of randomized process configurations.
 */
export function generateRandomProcesses(count = 5) {
    const processes = [];
    for (let i = 1; i <= count; i++) {
        const id = `P${i}`;
        // Random arrival time between 0 and 10
        const arrivalTime = Math.floor(Math.random() * 11);
        // Random burst time between 1 and 12
        const burstTime = Math.floor(Math.random() * 12) + 1;
        // Random priority between 1 and 10
        const priority = Math.floor(Math.random() * 10) + 1;
        
        processes.push({ id, arrivalTime, burstTime, priority });
    }
    return processes;
}

// --- Toast Notifications ---

export function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        // Inline styles in js to guarantee appearance, will be styled in css as well
        container.style.position = "fixed";
        container.style.bottom = "24px";
        container.style.right = "24px";
        container.style.zIndex = "9999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "8px";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Trigger animation via class in next paint
    setTimeout(() => toast.classList.add("show"), 10);

    // Dismiss automatically
    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
