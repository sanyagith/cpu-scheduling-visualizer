/**
 * Shortest Remaining Time First (SRTF) Scheduling Algorithm (Preemptive SJF).
 * Preempts the running process if a newly arrived or waiting process has a shorter remaining burst time.
 * 
 * @param {Array} processes - Array of Process objects
 * @returns {Object} { gantt, history, processes }
 */
export function scheduleSRTF(processes) {
    const procs = processes.map(p => p.clone());
    const gantt = [];
    const history = [];
    
    const upcoming = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const readyQueue = [];
    const completed = [];
    let currentProcess = null;
    let t = 0;
    let contextSwitches = 0;
    let lastRunningPid = null;

    while (upcoming.length > 0 || readyQueue.length > 0 || currentProcess !== null) {
        // 1. Move arrived processes to the ready queue
        for (let i = 0; i < upcoming.length; i++) {
            if (upcoming[i].arrivalTime === t) {
                readyQueue.push(upcoming[i]);
                upcoming.splice(i, 1);
                i--;
            }
        }

        // If a process is running, we also include it in the comparison pool
        if (currentProcess !== null) {
            readyQueue.push(currentProcess);
            currentProcess = null;
        }

        // Sort ready queue by remainingTime. If remainingTime is equal, sort by arrivalTime.
        readyQueue.sort((a, b) => {
            if (a.remainingTime !== b.remainingTime) {
                return a.remainingTime - b.remainingTime;
            }
            return a.arrivalTime - b.arrivalTime;
        });

        // 2. Select the process with the shortest remaining time
        if (readyQueue.length > 0) {
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

            // Add or extend Gantt block
            if (gantt.length > 0 && gantt[gantt.length - 1].pid === currentProcess.id) {
                gantt[gantt.length - 1].end = t;
            } else {
                gantt.push({
                    pid: currentProcess.id,
                    start: t,
                    end: t
                });
            }
        }

        // 3. Record history snapshot at tick t (after determining the running process,
        // and readyQueue now contains the remaining processes)
        history.push({
            time: t,
            runningPid: currentProcess ? currentProcess.id : "IDLE",
            readyQueue: readyQueue.map(p => ({ id: p.id, remainingTime: p.remainingTime, priority: p.priority })),
            upcomingPids: upcoming.map(p => p.id),
            completedPids: completed.map(p => p.id),
            contextSwitches: contextSwitches
        });

        // 4. Run current process for 1 tick
        if (currentProcess !== null) {
            currentProcess.remainingTime--;
            gantt[gantt.length - 1].end = t + 1;

            if (currentProcess.remainingTime === 0) {
                currentProcess.completionTime = t + 1;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                completed.push(currentProcess);
                currentProcess = null;
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
