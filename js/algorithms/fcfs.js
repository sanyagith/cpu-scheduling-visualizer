/**
 * First-Come First-Served (FCFS) Scheduling Algorithm.
 * Non-preemptive algorithm that schedules processes in the order of their arrival.
 * 
 * @param {Array} processes - Array of Process objects
 * @returns {Object} { gantt, history, processes }
 */
export function scheduleFCFS(processes) {
    // Clone processes to avoid modifying originals
    const procs = processes.map(p => p.clone());
    const gantt = [];
    const history = [];
    
    // Sort processes by arrival time initially
    const upcoming = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const readyQueue = [];
    const completed = [];
    let currentProcess = null;
    let t = 0;
    let contextSwitches = 0;
    let lastRunningPid = null;

    // Run simulator tick by tick until all are completed
    while (upcoming.length > 0 || readyQueue.length > 0 || currentProcess !== null) {
        // 1. Check for newly arrived processes at time t
        // Sort by arrival time. If arrival times are equal, preserve original ID or insertion order.
        for (let i = 0; i < upcoming.length; i++) {
            if (upcoming[i].arrivalTime === t) {
                readyQueue.push(upcoming[i]);
                upcoming.splice(i, 1);
                i--; // adjust index after removal
            }
        }

        // 2. If no process is running, pull the first one from the ready queue
        if (currentProcess === null && readyQueue.length > 0) {
            currentProcess = readyQueue.shift();
            if (currentProcess.startTime === -1) {
                currentProcess.startTime = t;
                currentProcess.responseTime = t - currentProcess.arrivalTime;
            }

            // Track context switches
            if (lastRunningPid !== null && lastRunningPid !== currentProcess.id) {
                contextSwitches++;
            }
            lastRunningPid = currentProcess.id;

            // Start a new Gantt block
            gantt.push({
                pid: currentProcess.id,
                start: t,
                end: t
            });
        }

        // 3. Record history snapshot at the start of tick t
        history.push({
            time: t,
            runningPid: currentProcess ? currentProcess.id : "IDLE",
            readyQueue: readyQueue.map(p => ({ id: p.id, remainingTime: p.remainingTime, priority: p.priority })),
            upcomingPids: upcoming.map(p => p.id),
            completedPids: completed.map(p => p.id),
            contextSwitches: contextSwitches
        });

        // 4. Execute current process for 1 tick
        if (currentProcess !== null) {
            currentProcess.remainingTime--;
            
            // Update the end of the current Gantt block
            gantt[gantt.length - 1].end = t + 1;

            // Check if completed
            if (currentProcess.remainingTime === 0) {
                currentProcess.completionTime = t + 1;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                completed.push(currentProcess);
                currentProcess = null;
            }
        } else {
            // Idle time, record in Gantt if not already IDLE
            if (gantt.length === 0 || gantt[gantt.length - 1].pid !== "IDLE") {
                // If last was not IDLE, increment context switch if switching from process to idle?
                // Usually context switches do not count idle, but let's keep track of lastRunningPid
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

    // Add final history snapshot at the very end
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
