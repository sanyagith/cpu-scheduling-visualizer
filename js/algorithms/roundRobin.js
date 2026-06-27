/**
 * Round Robin (RR) CPU Scheduling Algorithm.
 * Schedules processes using a circular queue and a set time quantum.
 * 
 * @param {Array} processes - Array of Process objects
 * @param {Object} options - { timeQuantum: number }
 * @returns {Object} { gantt, history, processes }
 */
export function scheduleRoundRobin(processes, options = {}) {
    const timeQuantum = parseInt(options.timeQuantum) || 2;
    const procs = processes.map(p => p.clone());
    const gantt = [];
    const history = [];

    // Sort by arrival time initially
    const upcoming = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const readyQueue = [];
    const completed = [];
    let currentProcess = null;
    let quantumElapsed = 0;
    let t = 0;
    let contextSwitches = 0;
    let lastRunningPid = null;

    // Helper: list of processes arriving at tick t
    const getArrivedProcesses = (time) => {
        const arrived = [];
        for (let i = 0; i < upcoming.length; i++) {
            if (upcoming[i].arrivalTime === time) {
                arrived.push(upcoming[i]);
                upcoming.splice(i, 1);
                i--;
            }
        }
        // Sort arrived by original placement/id if needed, they are already sorted
        return arrived;
    };

    while (upcoming.length > 0 || readyQueue.length > 0 || currentProcess !== null) {
        // 1. Check for arrivals at current tick t
        const arrivals = getArrivedProcesses(t);
        for (const p of arrivals) {
            readyQueue.push(p);
        }

        // 2. If quantum is up or process is completed, cycle the process
        if (currentProcess !== null) {
            // Check if completed at previous tick (already done below, but let's handle context transitions)
            if (currentProcess.remainingTime === 0) {
                // Done, clean up
                currentProcess.completionTime = t;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                completed.push(currentProcess);
                currentProcess = null;
                quantumElapsed = 0;
            } else if (quantumElapsed >= timeQuantum) {
                // Quantum expired. Requeue the preempted process.
                readyQueue.push(currentProcess);
                currentProcess = null;
                quantumElapsed = 0;
            }
        }

        // 3. Select next process if idle
        if (currentProcess === null && readyQueue.length > 0) {
            currentProcess = readyQueue.shift();
            quantumElapsed = 0;

            if (currentProcess.startTime === -1) {
                currentProcess.startTime = t;
                currentProcess.responseTime = t - currentProcess.arrivalTime;
            }

            // Context switch tracking
            if (lastRunningPid !== null && lastRunningPid !== currentProcess.id) {
                contextSwitches++;
            }
            lastRunningPid = currentProcess.id;

            gantt.push({
                pid: currentProcess.id,
                start: t,
                end: t
            });
        }

        // 4. Record history snapshot at the current tick t
        history.push({
            time: t,
            runningPid: currentProcess ? currentProcess.id : "IDLE",
            readyQueue: readyQueue.map(p => ({ id: p.id, remainingTime: p.remainingTime, priority: p.priority })),
            upcomingPids: upcoming.map(p => p.id),
            completedPids: completed.map(p => p.id),
            contextSwitches: contextSwitches
        });

        // 5. Execute 1 tick
        if (currentProcess !== null) {
            currentProcess.remainingTime--;
            quantumElapsed++;
            gantt[gantt.length - 1].end = t + 1;

            // Check if it completes at this step
            if (currentProcess.remainingTime === 0) {
                // We'll clean it up at the start of the next tick
            }
        } else {
            // Idle state
            if (gantt.length === 0 || gantt[gantt.length - 1].pid !== "IDLE") {
                gantt.push({
                    pid: "IDLE",
                    start: t,
                    end: t + 1
                });
            } else {
                gantt[gantt.length - 1].end = t + 1;
            }
        }

        t++;
    }

    // Final clean up for last running process completion metrics
    if (currentProcess !== null) {
        currentProcess.completionTime = t;
        currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
        currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
        completed.push(currentProcess);
        currentProcess = null;
    }

    history.push({
        time: t,
        runningPid: "IDLE",
        readyQueue: [],
        upcomingPids: [],
        completedPids: completed.map(p => p.id),
        contextSwitches: contextSwitches
    });

    return {
        gantt,
        history,
        processes: procs.map(p => {
            const comp = completed.find(c => c.id === p.id);
            if (comp) {
                p.startTime = comp.startTime;
                p.completionTime = comp.completionTime;
                p.waitingTime = comp.waitingTime;
                p.turnaroundTime = comp.turnaroundTime;
                p.responseTime = comp.responseTime;
            }
            return p;
        })
    };
}
